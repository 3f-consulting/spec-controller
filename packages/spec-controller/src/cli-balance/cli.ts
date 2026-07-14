/**
 * The balance CLI — thin wiring over the reconciler seams. The orchestration half of
 * the old cli.ts: arg parsing, the render-from-JSON mode, and the reconcile →
 * census → provenance → plan → write sequence. The impure file reads it calls
 * (runReconcile + the read* siblings) live in ingest/ingestQualityChecks.ts; the output
 * plan/write in ./emit; the git-derived run inputs in run-management/resolveRunInputs.ts.
 *
 * Usage:
 *   pnpm reconcile [--features <dir>] [--vitest <report.json>]
 *                  [--cucumber <report.json>] [--ci <ci.yml>]
 *                  [--format <fmt>[:<path>]]
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  reconcileWithCensus,
  readEvidenceObligations,
  readStaticEvidenceObservationCounts,
  readFeatureNames,
} from "../ingest/ingestQualityChecks.js";
import { planOutput } from "./emit/format.js";
import { writeOutputs } from "./emit/writer.js";
import {
  renderReportFromJson,
  isBalanced,
  hasPendingItems,
  hasBrokenEvidence,
} from "@3f-consulting/spec-controller-core";
import { resolveSourceSha, resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { cliRegistry, renderBalanceHelp } from "../cli-registry.js";
import type { CliRegistry } from "../cli-registry.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";

/** Parse `--flag value` pairs from argv into a record. */
function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a !== undefined && a.startsWith("--")) {
      const key = a.slice(2);
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        args[key] = value;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

/**
 * Collect the `--format <spec>` values from argv in order (the flag is REPEATABLE, unlike
 * the single-valued flags `parseArgs` records) — the raw specs `planOutput` parses. Empty
 * when no `--format` was given, which `planOutput` reads as the md→stdout default
 * (@SCN-FMT-001). Later sub-issues (FMT-004) route several specs in one invocation.
 */
function collectFormatSpecs(argv: string[]): string[] {
  const specs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--format") {
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        specs.push(value);
        i++;
      }
    }
  }
  return specs;
}

/**
 * The legacy-`--json` guard at the CLI edge (@SCN-FMT-006). The earlier
 * `--json <path>` flag is removed; supplying it must fail fast with a migration hint to
 * `--format json:<path>`, so the removed flag never silently no-ops and drops output. PURE
 * and `@unit`-testable: the removed flag is NOT a `--format` spec (planOutput never sees
 * it), so the guard reads the parsed args directly and returns the typed migration-hint
 * error message when `--json` is present — routed to stderr + a non-zero exit by main(),
 * the same handling planOutput's typed error gets (the shared error surface) — else null.
 */
export function checkLegacyJson(args: Record<string, string>): string | null {
  if (args["json"] !== undefined) {
    return (
      "The --json <path> flag has been removed. " +
      "Use --format json:<path> to write the JSON report to a file " +
      "(e.g. --format json:spec-reconciliation.json)."
    );
  }
  return null;
}

/**
 * Source the provenance "Target repo:" name for a run (@SCN-RPT-001 Update —
 * Fork A). The operator's `--target` is recorded VERBATIM — no resolution — defaulting to
 * `"unknown-target"` when omitted (parallel to `sourceSha`'s `"unknown"`; the facts
 * artefact is self-describing, so the line always renders). PURE and `@unit`-testable at
 * the CLI edge, like `checkLegacyJson`. It never inspects `--features`: the prior
 * `basename(dirname(--features))` resolution (the deleted `resolveTarget`) and its
 * degenerate `.` are impossible now — the target is only ever the given value or the
 * explicit default.
 */
export function sourceTarget(args: Record<string, string>): string {
  return args["target"] ?? "unknown-target";
}

/**
 * Guard the supplied input-file/dir flags at the CLI edge (@SCN-CLI-002). A
 * mistyped `--vitest` / `--cucumber` / `--features` / `--ci` / `--package-json`
 * pointing at a non-existent path used to reconcile silently against ZERO evidence —
 * a terrifying false all-red report meaning "you forgot the reports", not "your code
 * is broken" (the dogfooding fault). The five flags are Examples of ONE boundary
 * rule: a supplied-but-absent input path is a hard error. Scope is existence only
 * (readability / file-vs-dir type-correctness out of scope; `exists` covers the dir
 * flag and the file flags alike).
 *
 * PURE and `@unit`-testable like `checkLegacyJson` / `sourceTarget`: reads the parsed
 * args + an injected `exists` fn (no fs), returns the FIRST supplied-but-absent
 * `(flag, path)` as a typed error naming both — routed to stderr + a non-zero exit by
 * `runBalance` (the shared typed-error surface) — else null. An OMITTED flag is not an
 * error (legitimately optional: simply no evidence of that kind).
 */
export function checkInputsExist(
  args: Record<string, string>,
  exists: (path: string) => boolean,
): string | null {
  // The five input flags in declared order — the FIRST supplied-but-absent one is the
  // reported error (deterministic; the operator fixes and re-runs). Keys are the
  // parseArgs form (the `--` stripped); the message names the flag WITH its dashes.
  const flags = ["vitest", "cucumber", "features", "ci", "package-json"] as const;
  for (const flag of flags) {
    const path = args[flag];
    if (path !== undefined && !exists(path)) {
      return `The --${flag} path does not exist: ${path}`;
    }
  }
  return null;
}

/**
 * The JSON-BEARING input flags — the ones whose content is `JSON.parse`d, and so the only
 * ones whose content can throw. `--features` is Gherkin (parsed tolerantly) and `--ci` is
 * read as raw TEXT and scanned for `run:` steps — neither is JSON, neither can crash the
 * process, and on garbage both reconcile normally (verified, 3F-1742 Discovery).
 */
const JSON_INPUT_FLAGS = ["vitest", "cucumber", "package-json"] as const;

/**
 * Guard the READABILITY of the supplied JSON inputs at the CLI edge (@SCN-CLI-014).
 * `checkInputsExist` already guards their PRESENCE — but a path that is present yet
 * UNPARSEABLE fell straight through it: the reader threw mid-parse, nothing caught it, and
 * the process hit Node's default exit 1 — the code reserved for a genuine OUT-OF-BALANCE
 * verdict. A crashed invocation was therefore indistinguishable, by exit code, from an
 * honest disagreement (3F-1742). An input the tool cannot read is a USAGE fault: exit 2,
 * sibling to a missing path (@SCN-CLI-002) and an unrecognised flag (@SCN-CLI-009).
 *
 * PURE and `@unit`-testable like its sibling guards: reads the parsed args + an injected
 * `read` fn (no fs), returns the FIRST supplied-but-unparseable `(flag, path, failure)` as
 * a typed error naming all three — routed to stderr + exit 2 by `runBalance` — else null.
 * An omitted flag is not an error, and an unreadable file (a race after the existence
 * check) reports as the same input fault rather than escaping as a crash.
 */
export function checkInputsParse(
  args: Record<string, string>,
  read: (path: string) => string,
): string | null {
  for (const flag of JSON_INPUT_FLAGS) {
    const path = args[flag];
    if (path === undefined) continue;

    try {
      JSON.parse(read(path));
    } catch (err) {
      // Both a parse failure and an unreadable file are the SAME input fault. Anything
      // that escapes this catch lands on Node's default exit 1 — the collision itself.
      const failure = err instanceof Error ? err.message : String(err);
      return `The --${flag} report is not valid JSON: ${path} (${failure})`;
    }
  }
  return null;
}

/**
 * Guard the readability of `--render-from-json` at the CLI edge (@SCN-CLI-015). The
 * render-from-saved-JSON branch RETURNS before the input guards ever run, so it honoured
 * NEITHER: a missing path crashed to `ENOENT` and a malformed file to `SyntaxError`, both
 * landing on Node's default exit 1 — the out-of-balance code (3F-1764).
 *
 * The missing-path case was a live violation of @SCN-CLI-002's own shipped principle: a
 * supplied input path that does not exist is a hard error at exit 2, enforced for the five
 * evidence flags and not for this one. The CLI shipped a guard that half-honoured its Rule.
 *
 * MISSING and UNPARSEABLE are two Examples of one boundary rule — an input the tool cannot
 * read is a usage error, never a verdict — so one guard covers both. PURE and
 * `@unit`-testable like its siblings: the parsed args + an injected `read` (no fs), which
 * throws for an absent/unreadable path exactly as `readFileSync` does. An OMITTED flag is
 * not an error (the ordinary reconcile path).
 */
export function checkRenderFromJson(
  args: Record<string, string>,
  read: (path: string) => string,
): string | null {
  const path = args["render-from-json"];
  if (path === undefined) return null;

  try {
    JSON.parse(read(path));
  } catch (err) {
    // MISSING (read throws ENOENT) and UNPARSEABLE (JSON.parse throws) are the same input
    // fault, caught in the same place. Anything escaping here lands on Node's default
    // exit 1 — the out-of-balance code — which is the collision this closes.
    const failure = err instanceof Error ? err.message : String(err);
    return `The --render-from-json saved report could not be read: ${path} (${failure})`;
  }
  return null;
}

/**
 * The registry-bounded flag check at the CLI edge (@SCN-CLI-009). `balance` accepts ONLY
 * the flags its per-command registry scope declares (by `name` or `alias`); an unregistered
 * flag — a typo like `--strcit`, a stray `--bogus` — is a usage error, NOT silently
 * swallowed the way the old permissive `parseArgs` did. This is the structural teeth behind
 * "accepted = registry = help": a flag can't affect behaviour without a registry entry (and
 * so, by CLI-008's guard, without appearing in help).
 *
 * PURE and `@unit`-testable like `checkLegacyJson` / `checkInputsExist`: reads the parsed
 * args (keys are the `--`-stripped flag names) + the registry, returns the FIRST unregistered
 * flag as a typed usage error naming it WITH its dashes — routed to stderr + exit 2 by
 * `runBalance` (per 3F-1414's `0` balanced / `1` out-of-balance / `2` usage taxonomy),
 * never exit 1, never a silent reconcile — else null. The global `--store`/`--run-id`
 * modifiers never reach here: the top-level dispatcher (`parseHostInvocation`) consumes them
 * BEFORE `balance` is dispatched, so the bounded parser sees only the command's own args.
 */
export function checkUnknownFlags(args: Record<string, string>, registry: CliRegistry): string | null {
  // The accepted set: every balance-scope flag name AND alias, with the leading dashes
  // stripped so it compares against parseArgs's `--`-stripped keys (e.g. "--features" and
  // "-h" become "features" and "h"). Built from the registry alone — the single source — so
  // "accepted = registry" holds by construction.
  const balance = registry.commands.find((command) => command.name === "balance");
  const accepted = new Set<string>();
  for (const flag of balance?.flags ?? []) {
    accepted.add(flag.name.replace(/^-+/, ""));
    for (const alias of flag.aliases ?? []) accepted.add(alias.replace(/^-+/, ""));
  }
  // The FIRST parsed flag not in the accepted set is the reported error (Object.keys is
  // argv order, so this is deterministic). The message names the flag WITH its dashes.
  for (const key of Object.keys(args)) {
    if (!accepted.has(key)) {
      return `Unknown flag --${key} for 'spec-controller balance'. Run 'spec-controller balance --help' to see the accepted flags.`;
    }
  }
  return null;
}

export function runBalance(argv: string[]): void {
  // Answer `--help`/`-h` from the command/flag registry (@SCN-CLI-006) BEFORE any
  // parse or reconcile: render the balance command's per-command scope (a line per
  // registered flag — name + arg + description), leave process.exitCode at its default 0,
  // and return. This intercepts --help so it never falls through parseArgs as a stray flag
  // while balance runs anyway. The registry is the single source, so a flag that exists is
  // a flag that appears in help — no hand-kept list to drift.
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(renderBalanceHelp(cliRegistry) + "\n");
    return;
  }

  // Capture the run-start instant up front — the run provenance's UTC timestamp,
  // threaded through ctx.runStart to the renderers.
  const runStart = new Date();
  const args = parseArgs(argv);

  // Legacy-`--json` guard (@SCN-FMT-006): the earlier `--json <path>` flag is
  // removed. Reject it fast — before any reconcile or write — with a migration hint to
  // `--format json:<path>`, so the removed flag never silently no-ops and drops output. The
  // guard's typed error is routed to stderr + a non-zero exit, exactly as planOutput's error
  // is below (the shared typed-error surface).
  const legacyJsonError = checkLegacyJson(args);
  if (legacyJsonError) {
    process.stderr.write(legacyJsonError + "\n");
    // Usage/config error → exit 2 (the enumerated usage code, @SCN-CLI-002), distinct
    // from the out-of-balance verdict code 1 (@SCN-CLI-004): an out-of-balance run must
    // never masquerade as a usage error, nor the reverse.
    process.exit(2);
  }

  // Registry-bounded parse (@SCN-CLI-009): `balance` accepts ONLY the flags its registry
  // scope declares. An unregistered flag — a typo `--strcit`, a stray `--bogus` — is a
  // USAGE error: name it on stderr, set process.exitCode = 2 (the enumerated usage code,
  // 3F-1414's 0/1/2 taxonomy — never 1, never a silent swallow), and RETURN before any
  // reconcile. Runs AFTER the legacy-`--json` guard so `--json` keeps its specific migration
  // hint; the global `--store`/`--run-id` modifiers were consumed by the dispatcher before
  // balance, so they never reach here. This is the structural teeth behind "accepted =
  // registry = help" — a flag can't affect behaviour without a registry entry.
  const unknownFlagError = checkUnknownFlags(args, cliRegistry);
  if (unknownFlagError) {
    process.stderr.write(unknownFlagError + "\n");
    process.exitCode = 2;
    return;
  }

  // Render-from-saved-JSON mode (@SCN-RMD-007): regenerate the human markdown from a
  // banked spec-reconciliation.json ALONE — no reconcile, no live inputs, no RunContext. Reads
  // the file, JSON.parses it back into the whole-document report model, renders the markdown via
  // renderReport, and writes it to stdout (the same trailing-newline convention as the writer's
  // stdout path). The load-bearing proof that the JSON IS the model — returns before any reconcile.
  // Saved-report READABILITY guard (@SCN-CLI-015). This branch RETURNS before the input
  // guards below ever run, so it honoured NEITHER: a missing path crashed to ENOENT and a
  // malformed file to SyntaxError, both landing on Node's default exit 1 — the
  // out-of-balance code. The missing-path case was a live violation of @SCN-CLI-002's own
  // shipped principle, which the CLI enforced for the five evidence flags and not for this
  // one. The guard therefore runs INSIDE this branch, ahead of the read (3F-1764).
  const unreadableSavedReportError = checkRenderFromJson(args, (path) =>
    readFileSync(path, "utf8"),
  );
  if (unreadableSavedReportError) {
    process.stderr.write(unreadableSavedReportError + "\n");
    process.exit(2);
  }

  const rehydratePath = args["render-from-json"];
  if (rehydratePath !== undefined) {
    const savedReport = readFileSync(rehydratePath, "utf8");
    process.stdout.write(renderReportFromJson(savedReport) + "\n");
    return;
  }

  // Input-existence guard (@SCN-CLI-002): a supplied input-file/dir flag pointing at a
  // non-existent path is a HARD ERROR — halt BEFORE reconciling, with a typed message
  // naming the flag + path, never the silent zero-evidence all-red report a mistyped
  // path used to produce (the dogfooding fault). Routed to stderr + a non-zero exit,
  // exactly as the legacy-`--json` guard above (the shared typed-error surface). An
  // omitted flag is legitimately optional and passes through untouched.
  const missingInputError = checkInputsExist(args, existsSync);
  if (missingInputError) {
    process.stderr.write(missingInputError + "\n");
    // Usage/input error → exit 2 (@SCN-CLI-002), distinct from the out-of-balance
    // verdict code 1 (@SCN-CLI-004).
    process.exit(2);
  }

  // Input-READABILITY guard (@SCN-CLI-014): existence is not enough. A report that is
  // PRESENT but UNPARSEABLE (`--vitest /dev/null`, truncated JSON, non-JSON) used to throw
  // mid-parse inside reconcileWithCensus, uncaught — and Node's default exit code is 1, the
  // code reserved for a genuine OUT-OF-BALANCE verdict (@SCN-CLI-004). So a tool that
  // CRASHED before reconciling was indistinguishable, by exit code, from an honest
  // disagreement (3F-1742). Runs immediately after the existence guard and BEFORE any
  // reconcile, routing to the same stderr + exit 2 lane: an input the tool cannot read is a
  // usage fault, sibling to a missing path and an unrecognised flag — never a verdict.
  const unparseableInputError = checkInputsParse(args, (path) => readFileSync(path, "utf8"));
  if (unparseableInputError) {
    process.stderr.write(unparseableInputError + "\n");
    process.exit(2);
  }

  const inputs = {
    features: args["features"],
    vitest: args["vitest"],
    cucumber: args["cucumber"],
    ci: args["ci"],
    packageJson: args["package-json"],
  };

  // Parse the runtime observations ONCE and feed the SAME set to both the reconciler and the
  // runtime census (@SCN-RPT-017 / 3F-1452 FULL UNIFY): the census is a PROJECTION of the one
  // ledger, so the evidence-observation views (Test volume, attributed, E2e cell) can never drift
  // from the reconciler's verdict. `evidenceObservations` is the by-kind census whose balancing
  // identity holds by construction; threaded to the renderers via writeOutputs like ctx/corpus.
  const { balance, evidenceObservations } = reconcileWithCensus(inputs);

  // Read the declared-corpus census alongside the balance (@SCN-RPT-008) —
  // the raw-vs-declared @SCN-occurrence delta over the same discovered feature corpus.
  // A sibling to the balance, threaded to the renderers via writeOutputs like ctx.
  const evidenceObligations = readEvidenceObligations(args["features"]);

  // Read the static-guard kind-counts alongside the balance (@SCN-USG-001) —
  // the guard observations COUNTED by kind (a guard that runs in CI with no @lint is an
  // unattributed static-guard). A 6th sibling, threaded to the renderers via writeOutputs like
  // ctx/evidenceObligations/evidenceObservations.
  const guards = readStaticEvidenceObservationCounts(inputs);

  // Read the target's feature-code→slug map alongside the balance (@SCN-RPT-006)
  // — the by-feature cut's full-name labels. The 5th sibling, threaded to the MARKDOWN
  // renderer via writeOutputs only (markdown-only; the by-feature cut isn't on JSON).
  const featureNames = readFeatureNames(args["features"]);

  // Build the run provenance ONCE (project design §1) — a sibling RunContext, the
  // EvidenceReconciliation staying pure — reusing the existing runStart. The target is the
  // operator's --target VERBATIM (unknown-target on omit; Fork A — no
  // resolution, no basename guessing). Source SHA via the read-only target read, with
  // --source-sha as the override (resolveSourceSha).
  const ctx: RunContext = {
    target: sourceTarget(args),
    inputs,
    runStart,
    sourceSha: resolveSourceSha({
      sourceSha: args["source-sha"],
      targetDir: args["features"] !== undefined ? dirname(args["features"]) : undefined,
    }),
    // The TARGET repo root the recorded input paths are made portable against (fixed to
    // the target root, not the run cwd, by @SCN-RPT-016) — the SAME
    // root readEvidenceObservations passes to countRuntimeEvidenceObservationKinds, derived from
    // --features, so a cross-repo reconcile records inputs relative (`features`) rather
    // than leaking the target's absolute path.
    root: resolveTargetRoot({ features: inputs.features }),
  };

  // Plan the outputs from the --format specs (no flag → md→stdout) and write them via
  // the writer — the pure plan / impure writer split (@SCN-FMT-001). The plan
  // parse+validate is pure; the writer is the only IO for the emitted report. This is
  // the SOLE output path: the tool emits via --format and holds no storage opinion — the
  // legacy runs/<target>/<ISO>/ auto-archive was removed with @SCN-RUN-001, the
  // caller now routes stored runs (spec-controller's run-management layer).
  const planResult = planOutput(collectFormatSpecs(argv));
  if (!planResult.ok) {
    process.stderr.write(planResult.error + "\n");
    // Usage/config error (bad --format spec) → exit 2 (@SCN-CLI-002), distinct from the
    // out-of-balance verdict code 1 (@SCN-CLI-004).
    process.exit(2);
  }
  writeOutputs(planResult.plan, { balance, ctx, evidenceObligations, evidenceObservations, guards, featureNames });

  // The CI gate (@SCN-CLI-004): `balance` is a GATE, not just a reporter. AFTER the report
  // is written in full, map the whole-run verdict to the process exit code. Out-of-balance
  // (ANY reconciling item anywhere: an out-of-balance scenario OR a suspense-row item such
  // as an undemanded static-guard watermelon) sets process.exitCode = 1 and RETURNS — set,
  // never `process.exit(1)`, so the buffered report is flushed intact rather than truncated
  // mid-write. It exits EXACTLY 1 so it reds a CI build and can't masquerade as the usage
  // error (2, above). An ENUMERATED status, never a count (8-bit wrap → false pass). A
  // balanced run leaves process.exitCode at its default 0 and returns.
  //
  // The --strict escalation (@SCN-CLI-011): Pending Items are run-neutral by DEFAULT
  // (@SCN-PND-008 — they never red a build), but `--strict` is the OPT-IN that fails an
  // OTHERWISE-BALANCED run carrying them, exiting the DISTINCT code 3 (taxonomy 0 balanced /
  // 1 out-of-balance / 2 usage / 3 pending-under-strict — a Pending Item is not out-of-balance,
  // so it must NEVER share code 1). Out-of-balance DOMINATES: the escalation is checked ONLY in
  // the `isBalanced` branch, so an out-of-balance run exits 1 regardless of --strict. Like the
  // CLI-004 gate this SETS process.exitCode (never process.exit) AFTER writeOutputs, so the
  // buffered report is flushed intact. `--strict` is a registry-declared boolean, recorded by
  // parseArgs as the string "true" — presence is what matters, so `!== undefined` reads it.
  //
  // The UNSOUND pre-emption (@SCN-CLI-012): a run carrying BROKEN evidence — a proving suite
  // that failed to COLLECT, so the behaviour was never exercised — exits the DISTINCT code 4
  // (taxonomy 0 balanced / 1 out-of-balance / 2 usage / 3 pending-under-strict / 4 unsound).
  // Exit 1 says "the ledger disagrees"; exit 4 says "the ledger could not be TRUSTED to
  // disagree" — you cannot trust a reconciliation whose evidence never materialised, so
  // unsound DOMINATES.
  //
  // THE ORDER IS LOAD-BEARING, NOT COSMETIC. A broken run is ALWAYS out-of-balance: its
  // `broken` item sits on the SUSPENSE row, so `isBalanced` is already false. Check it AFTER
  // `isBalanced` and the branch is UNREACHABLE — every broken run would exit 1 and the
  // collection failure would stay masked as an honest disagreement (an adopter's repository dogfood fault,
  // 3F-1642). So `hasBrokenEvidence` is checked FIRST, PRE-EMPTING the balance verdict it
  // would otherwise be swallowed by. @SCN-CLI-004 is a BYSTANDER, not an Update: its fixture
  // is a SOUND out-of-balance run (no broken item), so it falls through this branch and still
  // exits exactly 1 — the pre-emption fires only when evidence genuinely failed to collect.
  const strict = args["strict"] !== undefined;
  if (hasBrokenEvidence(balance)) {
    process.exitCode = 4;
  } else if (!isBalanced(balance)) {
    process.exitCode = 1;
  } else if (strict && hasPendingItems(balance)) {
    process.exitCode = 3;
  }
}

// Only run the balance command when this module is executed directly
// (`tsx cli-balance/cli.ts`), NOT when imported by the top-level `spec-controller`
// bin dispatcher or by a test that exercises the pure edge guards.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) runBalance(process.argv.slice(2));
