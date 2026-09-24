/**
 * The balance CLI — thin wiring over the reconciler seams. The orchestration half of
 * the old cli.ts: arg parsing, the render-from-JSON mode, and the reconcile →
 * census → provenance → plan → write sequence. The impure file reads it calls
 * (runReconcile + the read* siblings) live in ingest/ingestQualityChecks.ts; the output
 * plan/write in ./emit; the git-derived run inputs in run-management/resolveRunInputs.ts.
 *
 * Usage:
 *   pnpm reconcile [--features <dir>] [--vitest <report.json>]
 *                  [--cucumber <report.json>] [--ci-steps <record.json>]
 *                  [--ci <ci.yml>]
 *                  [--format <fmt>[:<path>]]
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  runReconcile,
  readEvidenceObligations,
  readFeatureNames,
  featureCorpusParseErrors,
  type ReconcileOptions,
} from "../ingest/ingestQualityChecks.js";
import { planOutput } from "./emit/format.js";
import { writeOutputs } from "./emit/writer.js";
import {
  renderReportFromJson,
  isBalanced,
  hasPendingItems,
  hasBrokenEvidence,
  hasNothingToReconcile,
  hasScenarioCodeErrors,
} from "@3f-consulting/spec-controller-core";
import { resolveSourceSha, resolveTargetRoot, resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { cliRegistry, renderCommandHelp } from "../cli-registry.js";
// THE ARGV READING AND ITS REGISTRY BOUNDING, SHARED WITH EVERY OTHER COMMAND (3F-3300). Both
// lived here while `balance` was the only command; a second command needs them, and a second
// copy of "what did the operator type" is the one thing this tree least wants two of.
import {
  parseArgs,
  checkArgvShape,
  checkUnknownFlags,
  checkMissingValues,
  checkMisplacedHostModifiers,
} from "../cli-args.js";
import type { EvidenceReconciliation, RunContext } from "@3f-consulting/spec-controller-core";

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
 * The parsed args, as the reconciler's input paths — the one place a `--flag` name becomes a
 * `ReconcileOptions` key.
 *
 * Its own function rather than an object literal inside `runBalance`, which sits at the
 * `max-lines-per-function` standard: a flag is added here, not by growing the orchestration. The
 * mapping is also the only thing in that function with nothing to do with orchestration.
 */
function reconcileInputsOf(args: Record<string, string>): ReconcileOptions {
  return {
    features: args["features"],
    vitest: args["vitest"],
    cucumber: args["cucumber"],
    ci: args["ci"],
    packageJson: args["package-json"],
    ciSteps: args["ci-steps"],
  };
}

/**
 * Guard the supplied input-file/dir flags at the CLI edge (@SCN-CLI-002). A
 * mistyped `--vitest` / `--cucumber` / `--features` / `--ci` / `--package-json`
 * pointing at a non-existent path used to reconcile silently against ZERO evidence —
 * a terrifying false all-red report meaning "you forgot the reports", not "your code
 * is broken" (the dogfooding fault). These flags are Examples of ONE boundary
 * rule: a supplied-but-absent input path is a hard error, and a flag added to the set
 * inherits it rather than restating it. Scope is existence only
 * (readability / file-vs-dir type-correctness out of scope; `exists` covers the dir
 * flag and the file flags alike).
 *
 * PURE and `@unit`-testable like `checkLegacyJson` / `sourceTarget`: reads the parsed
 * args + an injected `exists` fn (no fs), returns the FIRST supplied-but-absent
 * `(flag, path)` as a typed error naming both — routed to stderr + a non-zero exit by
 * `refuseUnreadableInputs` (the shared typed-error surface) — else null. An OMITTED flag is not an
 * error (legitimately optional: simply no evidence of that kind).
 */
export function checkInputsExist(
  args: Record<string, string>,
  exists: (path: string) => boolean,
): string | null {
  // The input flags in a fixed order — the FIRST supplied-but-absent one is the
  // reported error (deterministic; the operator fixes and re-runs). Keys are the
  // parseArgs form (the `--` stripped); the message names the flag WITH its dashes.
  const flags = [
    "vitest", "cucumber", "features", "ci", "package-json", "ci-steps",
  ] as const;
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
const JSON_INPUT_FLAGS = [
  "vitest", "cucumber", "package-json", "ci-steps",
] as const;

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
 * a typed error naming all three — routed to stderr + exit 2 by `refuseUnreadableInputs` — else null.
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

export function runBalance(argv: string[]): void {
  // Answer `--help`/`-h` from the command/flag registry (@SCN-CLI-006) BEFORE any
  // parse or reconcile: render the balance command's per-command scope (a line per
  // registered flag — name + arg + description), leave process.exitCode at its default 0,
  // and return. This intercepts --help so it never falls through parseArgs as a stray flag
  // while balance runs anyway. The registry is the single source, so a flag that exists is
  // a flag that appears in help — no hand-kept list to drift.
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(renderCommandHelp(cliRegistry, "balance") + "\n");
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
  if (legacyJsonError) exitUsage(legacyJsonError);

  // A host modifier after the command is out of place, not unknown (@SCN-CLI-061, 3F-3639), so it is
  // refused before the drift advice, through `process.exit` so a stored run is never stamped.
  const misplacedModifierError = checkMisplacedHostModifiers(args, cliRegistry, "balance");
  if (misplacedModifierError) exitUsage(misplacedModifierError);

  // Every token is a flag or the value of the flag before it (3F-3672), refused through
  // `process.exit` so a stored run is never stamped, and before the unknown-flag check below.
  const shapeError = checkArgvShape(argv, cliRegistry, "balance");
  if (shapeError) exitUsage(shapeError);

  // Registry-bounded flag NAMES (@SCN-CLI-009): `balance` accepts ONLY the flags its registry
  // scope LISTS. An unregistered flag — a typo `--strcit`, a stray `--bogus` — is a USAGE error:
  // name it on stderr, set process.exitCode = 2 (the enumerated usage code, 3F-1414's 0/1/2
  // taxonomy — never 1, never 0), and RETURN before any reconcile. It bounds names only; that every
  // other token is read or refused is the argv-shape check above (@SCN-CLI-062–066, 3F-3672).
  // Runs AFTER the legacy-`--json` guard so `--json` keeps its specific migration hint, after the
  // misplaced-modifier refusal, so a `--store` / `--run-id` written after the command is named as
  // out of place rather than given pin advice, and after the argv-shape check, so `--format=json` is
  // refused as a form and never given pin advice. This is the structural teeth behind "accepted =
  // registry = help" — a flag can't affect behaviour without a registry entry.
  const unknownFlagError = checkUnknownFlags(args, cliRegistry, "balance", resolveToolIdentity().toolVersion);
  if (unknownFlagError) {
    process.stderr.write(unknownFlagError + "\n");
    process.exitCode = 2;
    return;
  }

  // A flag that takes a value, given none (@SCN-CLI-058, 3F-3639), refused before anything reads
  // the value `parseArgs` made up for it. `process.exit`, never a set status and a return: inside a
  // stored run the return would reach the kept-run scaffold, which stamps a run.yaml (3F-3650).
  const missingValueError = checkMissingValues(argv, cliRegistry, "balance");
  if (missingValueError) exitUsage(missingValueError);

  if (renderSavedReport(args)) return;
  refuseUnreadableInputs(args);

  const inputs = reconcileInputsOf(args);

  // Reconcile the obligation-vs-observation evidence into the Ledger. The runtime evidence-observation
  // views (Test volume, the evidence grid) are FOLDS the renderers derive off this Ledger's posted
  // credits (@SCN-RPT-010 / 3F-2103 — the census is retired), so they cannot drift from the
  // reconciler's verdict: they ARE the same rows. `withRuntimeObservations: true` (below) tells the
  // renderers the axis is in play.
  const balance = runReconcile(inputs);

  // Read the scenario-corpus census alongside the balance (@SCN-RPT-008) —
  // the raw-vs-parsed @SCN-occurrence delta over the same discovered feature corpus.
  // A sibling to the balance, threaded to the renderers via writeOutputs like ctx.
  const evidenceObligations = readEvidenceObligations(args["features"]);

  // The static-check kind-counts are a FOLD OVER THE LEDGER (@SCN-USG-001 / 3F-2118) — the
  // renderers count the balance's own posted static-check credits (`staticObservationTally`), so
  // they cannot drift from the reconciler's verdict: they ARE the same rows. The parallel static
  // census is RETIRED; `withStaticChecks: true` (below) tells the renderers the axis is in play.

  // Read the target's feature-code→slug map alongside the balance (@SCN-RPT-006)
  // — the by-feature cut's full-name labels. The 5th sibling, threaded to the MARKDOWN
  // renderer via writeOutputs only (markdown-only; the by-feature cut isn't on JSON).
  const featureNames = readFeatureNames(args["features"]);

  const ctx = runContextOf(args, inputs, runStart);

  // Plan the outputs from the --format specs (no flag → md→stdout) and write them via
  // the writer — the pure plan / impure writer split (@SCN-FMT-001). The plan
  // parse+validate is pure; the writer is the only IO for the emitted report. This is
  // the SOLE output path: the tool emits via --format and holds no storage opinion — the
  // legacy runs/<target>/<ISO>/ auto-archive was removed with @SCN-RUN-001, the
  // caller now routes stored runs (spec-controller's run-management layer).
  const planResult = planOutput(collectFormatSpecs(argv));
  if (!planResult.ok) exitUsage(planResult.error);
  writeOutputs(planResult.plan, { balance, ctx, evidenceObligations, withRuntimeObservations: true, withStaticChecks: true, featureNames });

  // The CI gate (@SCN-CLI-004): `balance` is a GATE, not just a reporter. AFTER the report
  // is written in full, map the whole-run verdict to the process exit code. Out-of-balance
  // (ANY reconciling item anywhere: an out-of-balance scenario OR a suspense-row item such
  // as a no-evidence-obligation static-check watermelon) sets process.exitCode = 1 and RETURNS — set,
  // never `process.exit(1)`, so the buffered report is flushed intact rather than truncated
  // mid-write. It exits EXACTLY 1 so it reds a CI build and can't masquerade as the usage
  // error (2, above). An ENUMERATED status, never a count (8-bit wrap → false pass). A
  // balanced run leaves process.exitCode at its default 0 and returns.
  //
  // The --strict escalation (@SCN-CLI-011): Pending Items are run-neutral by DEFAULT
  // (@SCN-PND-008 — they never red a build), but `--strict` is the OPT-IN that fails an
  // OTHERWISE-BALANCED run carrying them, exiting the DISTINCT code 3 (taxonomy 0 balanced /
  // 1 out-of-balance / 2 usage / 3 pending-under-strict / 4 unsound / 5 nothing to reconcile —
  // a Pending Item is not out-of-balance,
  // so it must NEVER share code 1). Out-of-balance DOMINATES: the escalation is checked ONLY in
  // the `isBalanced` branch, so an out-of-balance run exits 1 regardless of --strict. Like the
  // CLI-004 gate this SETS process.exitCode (never process.exit) AFTER writeOutputs, so the
  // buffered report is flushed intact. `--strict` is a registry-LISTED boolean, recorded by
  // parseArgs as the string "true" — presence is what matters, so `!== undefined` reads it.
  //
  // The UNSOUND pre-emption (@SCN-CLI-012): a run carrying BROKEN evidence — a proving suite
  // that failed to COLLECT, so the behaviour was never exercised — exits the DISTINCT code 4
  // (taxonomy 0 balanced / 1 out-of-balance / 2 usage / 3 pending-under-strict / 4 unsound /
  // 5 nothing to reconcile).
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
  //
  // THE NOTHING-TO-RECONCILE PRE-EMPTION (@SCN-CLI-019): a run whose ledger carries ZERO Scenario
  // Reconciliation rows — a target that declared nothing AND produced nothing — exits the DISTINCT
  // code 5. It is its own state: not balanced (no accounts to agree), not out-of-balance (nothing
  // disagrees), not a usage fault (the invocation was valid and `new-client` is a supported
  // adoption state), not unsound (no proof failed; none was owed).
  //
  // IT IS NOT THE UNSOUND PRE-EMPTION ONE CODE FURTHER ON, THOUGH IT LOOKS LIKE IT — measured,
  // because the ticket predicted it was. An empty ledger is MUTUALLY EXCLUSIVE with all three
  // predicates above: with no rows there is no row to carry a broken item, a reconciling item or a
  // Pending Item, so it fires none of them. Moved below `!isBalanced`, this branch STILL returns 5
  // (the prescribed plant stayed green). Its position among the predicates is free, and it is
  // first only so this ladder and `runVerdictSection` read in the SAME order — the shape
  // @SCN-CLI-013's invariant leans on.
  //
  // WHAT IS LOAD-BEARING is its position against the DEFAULT below. "Balanced" is not a branch
  // here, it is the `return 0` a run reaches by failing every test — so there is no "after the
  // balanced case" to append a fifth code to. Appended after that return the branch is dead code
  // and an empty run exits 0 (measured: the plant that DID red). That is why the fault survived a
  // taxonomy that had already grown twice: a fifth code cannot be ADDED to this chain, it has to
  // DISPLACE the default, and nothing about the other three says so.
  //
  // Keyed on the EMPTY LEDGER, never on the empty corpus: a corpus-less run carrying uncited
  // credits HAS a row — its suspense row — and is an ordinary out-of-balance report at exit 1
  // (@SCN-CLI-020). @SCN-CLI-004/005/010/012 are BYSTANDERS: every one of their fixtures carries
  // rows, so none reaches this branch.
  const verdict = verdictExitCode(balance, args["strict"] !== undefined);
  const code = args["exit-zero"] !== undefined ? exitZeroStatus(verdict) : verdict;
  // Assigned only when NON-ZERO, so a balanced run still LEAVES process.exitCode at its default
  // rather than writing a 0 over it — the distinction @SCN-CLI-005 and @SCN-CLI-010 both rest on.
  if (code !== 0) process.exitCode = code;
}

/**
 * A usage or input fault: the message on stderr, then exit 2 — the enumerated usage code
 * (@SCN-CLI-002), distinct from the out-of-balance verdict code 1 (@SCN-CLI-004). An
 * out-of-balance run must never masquerade as a usage error, nor the reverse.
 */
function exitUsage(message: string): never {
  process.stderr.write(message + "\n");
  process.exit(2);
}

/**
 * Render-from-saved-JSON mode (@SCN-RMD-007): regenerate the human markdown from a
 * banked spec-reconciliation.json ALONE — no reconcile, no live inputs, no RunContext. Reads
 * the file, JSON.parses it back into the whole-document report model, renders the markdown via
 * renderReport, and writes it to stdout (the same trailing-newline convention as the writer's
 * stdout path). The load-bearing proof that the JSON IS the model — true when it answered the
 * run, so `runBalance` returns before any reconcile.
 */
function renderSavedReport(args: Record<string, string>): boolean {
  // Saved-report READABILITY guard (@SCN-CLI-015). This mode RETURNS before
  // `refuseUnreadableInputs` ever runs, so it honoured NEITHER of its guards: a missing path
  // crashed to ENOENT and a malformed file to SyntaxError, both landing on Node's default exit 1
  // — the out-of-balance code. The missing-path case was a live violation of @SCN-CLI-002's own
  // shipped principle, which the CLI enforced for the five evidence flags and not for this
  // one. The guard therefore runs INSIDE this mode, ahead of the read (3F-1764).
  const unreadableSavedReportError = checkRenderFromJson(args, (path) =>
    readFileSync(path, "utf8"),
  );
  if (unreadableSavedReportError) exitUsage(unreadableSavedReportError);

  const rehydratePath = args["render-from-json"];
  if (rehydratePath === undefined) return false;
  const savedReport = readFileSync(rehydratePath, "utf8");
  process.stdout.write(renderReportFromJson(savedReport) + "\n");
  return true;
}

/**
 * The live-input guards, in the order they run: each halts at exit 2 BEFORE any reconcile,
 * because an input the tool cannot read is a usage error, never a verdict.
 */
function refuseUnreadableInputs(args: Record<string, string>): void {
  // Input-existence guard (@SCN-CLI-002): a supplied input-file/dir flag pointing at a
  // non-existent path is a HARD ERROR — halt BEFORE reconciling, with a typed message
  // naming the flag + path, never the silent zero-evidence all-red report a mistyped
  // path used to produce (the dogfooding fault). Routed to stderr + a non-zero exit,
  // exactly as the legacy-`--json` guard (the shared typed-error surface). An
  // omitted flag is legitimately optional and passes through untouched.
  const missingInputError = checkInputsExist(args, existsSync);
  if (missingInputError) exitUsage(missingInputError);

  // Input-READABILITY guard (@SCN-CLI-014): existence is not enough. A report that is
  // PRESENT but UNPARSEABLE (`--vitest /dev/null`, truncated JSON, non-JSON) used to throw
  // mid-parse inside reconcileWithCensus, uncaught — and Node's default exit code is 1, the
  // code reserved for a genuine OUT-OF-BALANCE verdict (@SCN-CLI-004). So a tool that
  // CRASHED before reconciling was indistinguishable, by exit code, from an honest
  // disagreement (3F-1742). Runs immediately after the existence guard and BEFORE any
  // reconcile, routing to the same stderr + exit 2 lane: an input the tool cannot read is a
  // usage fault, sibling to a missing path and an unrecognised flag — never a verdict.
  const unparseableInputError = checkInputsParse(args, (path) => readFileSync(path, "utf8"));
  if (unparseableInputError) exitUsage(unparseableInputError);

  // The FEATURE-CORPUS integrity checkpoint (@SCN-CLI-016, 3F-1767). The feature corpus is an
  // input too — the ledger's DEBIT side — and it was read by a hand-rolled TAG-LINE SCAN that
  // never consulted a parser. So a malformed tag line simply stopped being a tag line and its
  // scenario CEASED TO EXIST: one stray character deleted a failing row and turned an
  // out-of-balance run (exit 1) into a clean BALANCED (exit 0). A dropped scenario cannot even
  // reconcile `missing`, because it was never RAISED to be missing — the run read cleaner than
  // reality, the exact false-green this tool exists to prevent.
  //
  // Validated with the REAL Gherkin parser (cucumber's own), so a file the tool would reconcile is
  // at least a file cucumber would RUN. A file it rejects is an input we CANNOT READ: exit 2,
  // halting BEFORE any reconcile, naming the file and the parse failure — the same Rule as
  // @SCN-CLI-014 and @SCN-CLI-015 ("an input the tool cannot read is a usage error, never a
  // verdict"), now on the obligation side. Never a verdict, and never a green.
  //
  // The corpus is EXTRACTED from the same real AST (@SCN-LDG-020), so what the tool reconciles is
  // what cucumber runs — Feature/Rule tag inheritance included. This guard decides whether the file
  // can be read at all; parseScenarios then reads it exactly as cucumber would.
  const featureParseErrors = featureCorpusParseErrors(args["features"]);
  if (featureParseErrors.length > 0) {
    for (const { file, message } of featureParseErrors) {
      process.stderr.write(`The --features corpus contains a feature file that could not be parsed: ${file}\n${message}\n`);
    }
    process.exit(2);
  }
}

/**
 * Build the run provenance ONCE (project design §1) — a sibling RunContext, the
 * Ledger staying pure — reusing the existing runStart. The target is the
 * operator's --target VERBATIM (unknown-target on omit; Fork A — no
 * resolution, no basename guessing). Source SHA via the read-only target read, with
 * --source-sha as the override (resolveSourceSha).
 */
function runContextOf(
  args: Record<string, string>,
  inputs: ReconcileOptions,
  runStart: Date,
): RunContext {
  return {
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
    // The TOOL's own identity (@SCN-RPT-026, 3F-1916) — which spec-controller produced
    // this run, distinct from the target's sourceSha. Read from the tool's OWN dir, never
    // cwd (which is the target). One call, spread into the ctx; the same identity feeds
    // the run.yaml manifest.
    ...resolveToolIdentity(),
  };
}

/**
 * THE DOMINANCE LADDER — the whole-run verdict as the enumerated status a consumer's CI branches
 * on, and the ONE place the order argued for above is written down. Extracted from `runBalance`
 * (3F-3344) so the ladder is a named thing with its own reading rather than a tail the reader
 * arrives at, and so the pre-emption argument sits ON it.
 *
 * ENUMERATED, NEVER A COUNT — a count would 8-bit `& 0xFF` wrap into a false pass. Returns 0 for a
 * balanced run; the caller leaves the process's default alone rather than writing that 0 back.
 */
function verdictExitCode(balance: EvidenceReconciliation, strict: boolean): number {
  const { ledger } = balance;
  if (hasNothingToReconcile(ledger)) return 5;
  if (hasBrokenEvidence(ledger)) return 4;
  // A misfiled code (3F-3635): every account still reconciles, so `isBalanced` alone would pass it.
  if (hasScenarioCodeErrors(balance)) return 1;
  if (!isBalanced(ledger)) return 1;
  if (strict && hasPendingItems(ledger)) return 3;
  return 0;
}

/**
 * The codes `--exit-zero` moves to 0 (@SCN-CLI-021, 3F-3100): the two VERDICTS on the target —
 * out-of-balance and pending-under-`--strict`. Enumerated rather than "anything non-zero", because
 * unsound (4) and nothing-to-reconcile (5) are not verdicts but the absence of a trustworthy one,
 * and suppressing a verdict never suppresses that. Usage (2) exits before the ladder is reached.
 */
const VERDICT_CODES: ReadonlySet<number> = new Set([1, 3]);

function exitZeroStatus(code: number): number {
  return VERDICT_CODES.has(code) ? 0 : code;
}

// Only run the balance command when this module is executed directly
// (`tsx cli-balance/cli.ts`), NOT when imported by the top-level `spec-controller`
// bin dispatcher or by a test that exercises the pure edge guards.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) runBalance(process.argv.slice(2));
