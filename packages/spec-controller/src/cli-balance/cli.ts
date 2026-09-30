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
import { namesStdout, refuse, settlingRefusal, stdoutIdentity } from "../outputLocation.js";
import { identifiedInputs, inputsReadBy, NODE_INPUT_READER } from "./inputsRead.js";
import { checkReRenderFlags } from "./reRender.js";
import {
  checkInputPaths,
  checkInputShapes,
  checkSavedReconciliation,
  jsonInputsOf,
  reRenderOrRefusal,
} from "./unreadableInputs.js";
import { statusFor } from "./exitStatus.js";
import {
  verdictCode,
} from "@3f-consulting/spec-controller-core";
import { resolveSourceSha, resolveTargetRoot, resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { cliRegistry, renderCommandHelp } from "../cli-registry.js";
// THE ARGV READING AND ITS REGISTRY BOUNDING, SHARED WITH EVERY OTHER COMMAND. Both
// lived here while `balance` was the only command; a second command needs them, and a second
// copy of "what did the operator type" is the one thing this tree least wants two of.
import {
  asksForHelp,
  parseArgs,
  checkArgvShape,
  checkUnknownFlags,
  checkMissingValues,
  checkMisplacedHostModifiers,
} from "../cli-args.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";

/**
 * Collect the `--format <spec>` values from argv in order (the flag is REPEATABLE, unlike
 * the single-valued flags `parseArgs` records) — the raw specs `planOutput` parses. Empty
 * when no `--format` was given, which `planOutput` reads as the md→stdout default.
 * Several specs route in one invocation.
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
 * The legacy-`--json` guard at the CLI edge. The earlier
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
 * Source the provenance "Target repo:" name for a run. The
 * operator's `--target` is recorded VERBATIM — no resolution — defaulting to
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
 * Guard the supplied input-file/dir flags at the CLI edge. A
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
 * The JSON-BEARING input flags — the ones whose content is `JSON.parse`d. `--features` and `--ci`
 * are read as Gherkin and YAML files on disk, and whether they can be read is `checkInputPaths`'s.
 */
const JSON_INPUT_FLAGS = [
  "vitest", "cucumber", "package-json", "ci-steps",
] as const;

/**
 * Guard the READABILITY of the supplied JSON inputs at the CLI edge.
 * `checkInputsExist` already guards their PRESENCE — but a path that is present yet
 * UNPARSEABLE fell straight through it: the reader threw mid-parse, nothing caught it, and
 * the process hit Node's default exit 1 — the code reserved for a genuine OUT-OF-BALANCE
 * verdict. A crashed invocation was therefore indistinguishable, by exit code, from an
 * honest disagreement. An input the tool cannot read is a USAGE fault: exit 2,
 * sibling to a missing path and an unrecognised flag.
 *
 * PURE and `@unit`-testable like its sibling guards: reads the parsed args + an injected
 * `read` fn (no fs), returns the FIRST supplied-but-unparseable `(flag, path, failure)` as
 * a typed error naming all three — routed to stderr + exit 2 by `refuseUnreadableInputs` — else null.
 * An omitted flag is not an error, and a file that cannot be read at all (a race after the
 * existence check, a permission refused) is refused as one that could not be read, never as JSON
 * that did not parse.
 */
export function checkInputsParse(
  args: Record<string, string>,
  read: (path: string) => string,
): string | null {
  for (const flag of JSON_INPUT_FLAGS) {
    const path = args[flag];
    if (path === undefined) continue;

    let text: string;
    try {
      text = read(path);
    } catch (err) {
      return `The --${flag} file could not be read: ${path} (${failureOf(err)})`;
    }
    try {
      JSON.parse(text);
    } catch (err) {
      // Anything that escapes this catch lands on Node's default exit 1 — the collision itself.
      return `The --${flag} report is not valid JSON: ${path} (${failureOf(err)})`;
    }
  }
  return null;
}

function failureOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Guard the readability of `--render-from-json` at the CLI edge. The
 * render-from-saved-JSON branch RETURNS before the input guards ever run, so it honoured
 * NEITHER: a missing path crashed to `ENOENT` and a malformed file to `SyntaxError`, both
 * landing on Node's default exit 1 — the out-of-balance code.
 *
 * The missing-path case was a live violation of the missing-input rule's own shipped principle: a
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
 * The `balance` command. A refusal leaves on the usage code and answers that no report was written,
 * after everything already written has drained.
 */
export function runBalance(argv: string[]): boolean {
  return settlingRefusal(() => balance(argv), false);
}

function balance(argv: string[]): boolean {
  // Answer `--help`/`-h` from the command/flag registry BEFORE any
  // parse or reconcile: render the balance command's per-command scope (a line per
  // registered flag — name + arg + description), leave process.exitCode at its default 0,
  // and return. This intercepts --help so it never falls through parseArgs as a stray flag
  // while balance runs anyway. The registry is the single source, so a flag that exists is
  // a flag that appears in help — no hand-kept list to drift.
  if (asksForHelp(argv)) {
    process.stdout.write(renderCommandHelp(cliRegistry, "balance") + "\n");
    return false;
  }

  // Capture the run-start instant up front — the run provenance's UTC timestamp,
  // threaded through ctx.runStart to the renderers.
  const runStart = new Date();
  const args = parseArgs(argv);

  // Legacy-`--json` guard: the earlier `--json <path>` flag is
  // removed. Reject it fast — before any reconcile or write — with a migration hint to
  // `--format json:<path>`, so the removed flag never silently no-ops and drops output. The
  // guard's typed error is routed to stderr + a non-zero exit, exactly as planOutput's error
  // is below (the shared typed-error surface).
  const legacyJsonError = checkLegacyJson(args);
  if (legacyJsonError) refuse(legacyJsonError);

  // A host modifier after the command is out of place, not unknown, so it is
  // refused before the drift advice.
  const misplacedModifierError = checkMisplacedHostModifiers(args, cliRegistry, "balance");
  if (misplacedModifierError) refuse(misplacedModifierError);

  // Every token is a flag or the value of the flag before it, refused before the unknown-flag
  // check below.
  const shapeError = checkArgvShape(argv, cliRegistry, "balance");
  if (shapeError) refuse(shapeError);

  // Registry-bounded flag NAMES: `balance` accepts ONLY the flags its registry
  // scope LISTS. An unregistered flag — a typo `--strcit`, a stray `--bogus` — is a USAGE error:
  // name it on stderr, set process.exitCode = 2 (the enumerated usage code, the 0/1/2
  // taxonomy — never 1, never 0), and RETURN before any reconcile. It bounds names only; that every
  // other token is read or refused is the argv-shape check above.
  // Runs AFTER the legacy-`--json` guard so `--json` keeps its specific migration hint, after the
  // misplaced-modifier refusal, so a `--store` / `--run-id` written after the command is named as
  // out of place rather than given pin advice, and after the argv-shape check, so `--format=json` is
  // refused as a form and never given pin advice. This is the structural teeth behind "accepted =
  // registry = help" — a flag can't affect behaviour without a registry entry.
  const unknownFlagError = checkUnknownFlags(args, cliRegistry, "balance", resolveToolIdentity().toolVersion);
  if (unknownFlagError) {
    process.stderr.write(unknownFlagError + "\n");
    process.exitCode = 2;
    return false;
  }

  // A flag that takes a value, given none, refused before anything reads
  // the value `parseArgs` made up for it.
  const missingValueError = checkMissingValues(argv, cliRegistry, "balance");
  if (missingValueError) refuse(missingValueError);

  if (renderSavedReport(args)) return false;
  refuseUnreadableInputs(args);

  const inputs = reconcileInputsOf(args);

  // Reconcile the obligation-vs-observation evidence into the Ledger. The runtime evidence-observation
  // views (Test volume, the evidence grid) are FOLDS the renderers derive off this Ledger's posted
  // credits (the census is retired), so they cannot drift from the
  // reconciler's verdict: they ARE the same rows. `withRuntimeObservations: true` (below) tells the
  // renderers the axis is in play.
  const balance = runReconcile(inputs);

  // Read the scenario-corpus census alongside the balance —
  // the raw-vs-parsed @SCN-occurrence delta over the same discovered feature corpus.
  // A sibling to the balance, threaded to the renderers via writeOutputs like ctx.
  const evidenceObligations = readEvidenceObligations(args["features"]);

  // The static-check kind-counts are a FOLD OVER THE LEDGER — the
  // renderers count the balance's own posted static-check credits (`staticObservationTally`), so
  // they cannot drift from the reconciler's verdict: they ARE the same rows. The parallel static
  // census is RETIRED; `withStaticChecks: true` (below) tells the renderers the axis is in play.

  // Read the target's feature-code→slug map alongside the balance
  // — the by-feature cut's full-name labels. The 5th sibling, threaded to the MARKDOWN
  // renderer via writeOutputs only (markdown-only; the by-feature cut isn't on JSON).
  const featureNames = readFeatureNames(args["features"]);

  const ctx = runContextOf(args, inputs, runStart);

  // Plan the outputs from the --format specs (no flag → md→stdout) and write them via
  // the writer — the pure plan / impure writer split. The plan
  // parse+validate is pure; the writer is the only IO for the emitted report. This is
  // the SOLE output path: the tool emits via --format and holds no storage opinion — the
  // legacy runs/<target>/<ISO>/ auto-archive was removed, the
  // caller now routes stored runs (spec-controller's run-management layer).
  const planResult = planOutput(collectFormatSpecs(argv), namesStdout);
  if (!planResult.ok) refuse(planResult.error);
  const payloads = { balance, ctx, evidenceObligations, withRuntimeObservations: true, withStaticChecks: true, featureNames };
  writeOutputs(planResult.plan, payloads, stdoutIdentity, identifiedInputs(inputsReadBy(args, NODE_INPUT_READER)));

  // Set after the report is written in full, never `process.exit`, so the buffered report is
  // flushed intact rather than truncated mid-write.
  const verdict = verdictCode({ ...balance, strict: ctx.strict === true });
  const code = statusFor(verdict, args["exit-zero"] !== undefined);
  // Assigned only when NON-ZERO, so a balanced run still LEAVES process.exitCode at its default
  // rather than writing a 0 over it — the distinction the balanced-exit scenarios rest on.
  if (code !== 0) process.exitCode = code;
  return true;
}

/**
 * Render-from-saved-JSON mode: the markdown a banked spec-reconciliation.json renders to, on
 * stdout, and the exit its saved verdict names — no reconcile, no live inputs. True when it
 * answered the run, so `runBalance` returns before any reconcile.
 */
function renderSavedReport(args: Record<string, string>): boolean {
  // Here rather than with the live-input guards, because this mode returns before they run.
  const ignoredFlagError = checkReRenderFlags(args);
  if (ignoredFlagError) refuse(ignoredFlagError);
  const unreadableSavedReportError = checkRenderFromJson(args, (path) =>
    readFileSync(path, "utf8"),
  );
  if (unreadableSavedReportError) refuse(unreadableSavedReportError);

  const rehydratePath = args["render-from-json"];
  if (rehydratePath === undefined) return false;
  const savedJson = readFileSync(rehydratePath, "utf8");
  const notSavedError = checkSavedReconciliation(rehydratePath, savedJson);
  if (notSavedError) refuse(notSavedError);
  const saved = reRenderOrRefusal(rehydratePath, savedJson, args["strict"] !== undefined);
  if (typeof saved === "string") refuse(saved);
  process.stdout.write(saved.markdown + "\n");
  const code = statusFor(saved.code, args["exit-zero"] !== undefined);
  if (code !== 0) process.exitCode = code;
  return true;
}

/**
 * The live-input guards, in the order they run: each halts at exit 2 BEFORE any reconcile,
 * because an input the tool cannot read is a usage error, never a verdict.
 */
function refuseUnreadableInputs(args: Record<string, string>): void {
  // Input-existence guard: a supplied input-file/dir flag pointing at a
  // non-existent path is a HARD ERROR — halt BEFORE reconciling, with a typed message
  // naming the flag + path, never the silent zero-evidence all-red report a mistyped
  // path used to produce (the dogfooding fault). Routed to stderr + a non-zero exit,
  // exactly as the legacy-`--json` guard (the shared typed-error surface). An
  // omitted flag is legitimately optional and passes through untouched.
  const missingInputError = checkInputsExist(args, existsSync);
  if (missingInputError) refuse(missingInputError);

  // Input-READABILITY guard: existence is not enough. A report that is
  // PRESENT but UNPARSEABLE (`--vitest /dev/null`, truncated JSON, non-JSON) used to throw
  // mid-parse inside reconcileWithCensus, uncaught — and Node's default exit code is 1, the
  // code reserved for a genuine OUT-OF-BALANCE verdict. So a tool that
  // CRASHED before reconciling was indistinguishable, by exit code, from an honest
  // disagreement. Runs immediately after the existence guard and BEFORE any
  // reconcile, routing to the same stderr + exit 2 lane: an input the tool cannot read is a
  // usage fault, sibling to a missing path and an unrecognised flag — never a verdict.
  const unparseableInputError = checkInputsParse(args, (path) => readFileSync(path, "utf8"));
  if (unparseableInputError) refuse(unparseableInputError);

  // A corpus or workflow path that is not the kind its flag reads, or may not be read, cannot be read at all.
  const unreadablePathError = checkInputPaths(args);
  if (unreadablePathError) refuse(unreadablePathError);

  // Parsing is not reading: a report that parses but is not in the shape its reader expects would
  // be read as nothing, or read until it threw, so it is refused here with where its shape is wrong.
  const misshapenInputError = checkInputShapes(jsonInputsOf(args, existsSync), (path) => readFileSync(path, "utf8"));
  if (misshapenInputError) refuse(misshapenInputError);

  // The FEATURE-CORPUS integrity checkpoint. The feature corpus is an
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
  // the unparseable-report and unreadable-saved-report guards ("an input the tool cannot read is a usage error, never a
  // verdict"), now on the obligation side. Never a verdict, and never a green.
  //
  // The corpus is EXTRACTED from the same real AST, so what the tool reconciles is
  // what cucumber runs — Feature/Rule tag inheritance included. This guard decides whether the file
  // can be read at all; parseScenarios then reads it exactly as cucumber would.
  const featureParseErrors = featureCorpusParseErrors(args["features"]);
  if (featureParseErrors.length > 0) {
    refuse(
      featureParseErrors
        .map(({ file, message }) => `The --features corpus contains a feature file that could not be parsed: ${file}\n${message}`)
        .join("\n"),
    );
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
    // the target root, not the run cwd) — the SAME
    // root readEvidenceObservations passes to countRuntimeEvidenceObservationKinds, derived from
    // --features, so a cross-repo reconcile records inputs relative (`features`) rather
    // than leaking the target's absolute path.
    root: resolveTargetRoot({ features: inputs.features }),
    // The TOOL's own identity — which spec-controller produced
    // this run, distinct from the target's sourceSha. Read from the tool's OWN dir, never
    // cwd (which is the target). One call, spread into the ctx; the same identity feeds
    // the run.yaml manifest.
    ...resolveToolIdentity(),
    strict: args["strict"] !== undefined,
  };
}

// Only run the balance command when this module is executed directly
// (`tsx cli-balance/cli.ts`), NOT when imported by the top-level `spec-controller`
// bin dispatcher or by a test that exercises the pure edge guards.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) runBalance(process.argv.slice(2));
