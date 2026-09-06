/**
 * The SELF-RECONCILIATION gate — `balance:self` (@SCN-SLF-001, 3F-2354).
 *
 * spec-controller's own tree, put through spec-controller. The reconciler could always
 * report this repository's own one-way evidence claims; nothing ever ran it, so the
 * defect class the tool exists to catch had to be found twice by accident in this very
 * repo. This gate makes the tool's own verdict load-bearing: the build depends on it.
 *
 * NOT A SECOND IMPLEMENTATION. This wrapper computes no verdict of its own — it resolves
 * the scan scope and hands the argv to the product's own `runBalance`, so the exit code
 * is the CLI's (@SCN-CLI-004 / 3F-1414: 0 balanced, 1 out-of-balance, 2 usage). A wrapper
 * that re-derived the answer would agree with the product by diligence and then drift —
 * the shape `no-parallel-store.feature` exists to forbid.
 *
 * THE SCAN SCOPE IS THE POINT. `SELF_BALANCE_SCOPE` below is the whole of what this gate
 * reaches, stated once, and the @unit arm asserts it EXHAUSTIVELY so a later silent
 * narrowing reds. The boundary is therefore deliberate, not inherited from whatever the
 * caller happened to pass.
 *
 * WHY THE NAME CARRIES `balance:` AND NOT `lint:`, WHICH IS NOT COSMETIC — AND WHY IT IS THE
 * ONE FILE HERE THAT CANNOT BE ON THE BOOKS AT ALL. `runningStaticChecks` observes a
 * package.json script as a RUNNING static check when its name starts with an observed prefix
 * (`lint:` / `guard:`) and a CI `run:` step invokes it. This is not a check: it is the
 * product's own `balance` command invoked with fixed arguments, which is why the handle sits
 * beside `balance` in the manifest rather than among the `lint:`-prefixed scripts. Spelled
 * `lint:` it would be observed, and the reconciliation's own verdict would become an entry in
 * the ledger that verdict is about — a second arbiter for a fact this file's exit code
 * already settles.
 * `balance:` is deliberately outside the observed set for that reason (3F-3113).
 *
 * NOT A DODGE, AND THE TEETH ARE WHERE TO LOOK. Canon names "renaming a script to become an
 * uncited check" as a watermelon's hiding place, and the discriminator is not the rename — it
 * is whether anything still needs to reconcile the thing. Nothing does: `ci.yml` invokes this
 * step, it exits on the verdict, and `pnpm verify`'s ladder is DERIVED from `ci.yml`
 * (`localLadder.ts`, prefix-agnostic by construction), so `pnpm ladder` still lists this gate
 * and `pnpm verify` still gates on it — at the same position, under the new handle, with no
 * edit to the ladder. What left is the ROW asserting that the ledger balances, which the
 * stepless @SCN-SLF-003 used to carry; the stepped scenarios stay, because the gate is still
 * specified — it is simply no longer reconciled.
 *
 * THE RESIDUAL, STATED RATHER THAN ENGINEERED AWAY. Nothing pins this handle out of the
 * observed set: re-prefix it `lint:` and the tree returns silently to the arrangement 3F-3113
 * retired, because the mechanism that would notice is the one being re-entered. `verify` and
 * `ladder` stand outside that set on the same terms, held by a header comment and nothing else.
 * The one other RED-CAPABLE handle that sat beside them under a `hygiene:` prefix went at
 * 3F-3099 — its CONDITION was removed rather than its guard replaced — so this is now the only
 * gate in the tree that can red while standing outside the observed set on a comment alone.
 *
 * Parent: 3F-2351.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { runBalance } from "../../packages/spec-controller/src/cli-balance/cli.js";
import { MEASUREMENT_ARTEFACT_PATH, resolveEvidenceRoot } from "./measurementArtefact.js";

/**
 * The seven surfaces the gate reconciles, as paths relative to the base each belongs to — the
 * target root for the three SOURCE surfaces, the evidence root for the four this run OUTPUTS.
 *
 * There is no eighth. A path enters the gate only by entering one of these — which is the
 * answer to "is `packages/fixture-pkg/` in scope?" (3F-2351, Scan-scope ruling): that
 * path is a string inside a step definition's temporary fixture tree, it exists on none
 * of these surfaces, and so it is out of scope by construction. No exclusion list
 * is built, because an exclusion guarding an input that cannot arrive is a rule left to
 * rot the first time the fixture is renamed.
 */
export interface SelfBalanceScope {
  /** The Gherkin corpus — the OBLIGATION side of every reconciliation. */
  features: string;
  /** The Vitest JSON report — the observed `@unit` stream. */
  vitest: string;
  /** The BEHAVIOURAL Cucumber JSON report — the observed `@integration` / `@e2e` stream. */
  cucumber: string;
  /**
   * The FITNESS pass's Cucumber JSON report (@SCN-LNT-021, 3F-3145) — the observed CONVERTED
   * static-check stream, written by a SECOND cucumber call over its own profile.
   *
   * A SURFACE OF ITS OWN RATHER THAN A SECOND READING OF `cucumber`. The two documents have the
   * same shape and opposite meanings: the behavioural pass's scenarios are runtime results
   * levelled by a tier tag, the fitness pass's are static-check credits named by a configured
   * row. One file read both ways would have the gate guessing which half of it was which.
   */
  fitness: string;
  /**
   * The measurement artefact — the observed MEASURED stream, which the FITNESS PASS posts into
   * (3F-3166).
   *
   * IT USED TO BE THE TIMED STEPS' OWN FILE, and the change is the last measured check converting.
   * `timeStepCli` now writes a TIMINGS RECORD and the fitness pass reads it, so every credit on
   * this stream — the two timings and the mutation score alike — arrives from the pass that
   * enumerates the scenarios owing them. A producer writing here directly would settle an
   * obligation whether or not anything enumerated it.
   */
  measurements: string;
  /** The CI configs — where a static check is observed to FIRE, not merely to exist. */
  ci: string;
  /** The package manifest — where a static check is observed to EXIST. */
  packageJson: string;
}

/**
 * The gate's scan scope, as paths relative to the base each surface belongs to.
 *
 * TWO BASES, AND WHICH ONE SEPARATES SOURCE FROM OUTPUT (3F-3099). `features`, `ci` and
 * `packageJson` are the TREE BEING JUDGED, so they resolve against the target root: `--root`
 * moves the whole scan to another tree and never narrows which surfaces are read. The four
 * evidence reports are THIS RUN'S OUTPUT, so they resolve against the EVIDENCE ROOT instead —
 * the named target root where a target was named, a temporary directory where none was.
 *
 * THE STRINGS ARE UNCHANGED, AND THAT IS THE POINT OF THE SPLIT BEING IN THE RESOLUTION RATHER
 * THAN IN THE VALUES. A planted tree under `--root` reads its evidence at exactly the path it
 * always did, so every planted arm in this repository's suite keeps working with no edit; what
 * moved is where a run naming NO target writes and reads, which used to be the working tree —
 * spec-controller writing its output into its own source.
 */
export const SELF_BALANCE_SCOPE: SelfBalanceScope = {
  features: "features",
  vitest: "runs/self-balance/vitest.json",
  cucumber: "runs/self-balance/cucumber.json",
  fitness: "runs/self-balance/fitness.json",
  // The producer's own constant rather than a second spelling of it. The fitness pass posting to
  // one path while this gate read another would not be loud: the reader would find nothing and
  // every measured row would reconcile missing, which reads as a suite that never ran.
  measurements: MEASUREMENT_ARTEFACT_PATH,
  ci: ".github/workflows",
  packageJson: "package.json",
};

/** The report's "Target repo:" name — the tree being judged is this product itself. */
const SELF_TARGET = "spec-controller";

/** Report-path overrides: CI points these at wherever the run emitted the streams. */
type ReportOverrides = Partial<Pick<SelfBalanceScope, "vitest" | "cucumber">>;

/**
 * Resolve each scope surface against the base it belongs to, honouring the two report overrides.
 *
 * THE SOURCE SURFACES TAKE `root` AND THE EVIDENCE SURFACES TAKE `evidenceRoot`, and the two are
 * one value whenever a target was named. Handing both in — rather than deriving the second here —
 * is what keeps the rule in one place: this function reconciles a tree, it does not decide where a
 * run's output lives.
 */
export function resolveScope(
  root: string,
  evidenceRoot: string,
  overrides: ReportOverrides,
  scope: SelfBalanceScope,
): SelfBalanceScope {
  return {
    features: join(root, scope.features),
    vitest: overrides.vitest ?? join(evidenceRoot, scope.vitest),
    cucumber: overrides.cucumber ?? join(evidenceRoot, scope.cucumber),
    fitness: join(evidenceRoot, scope.fitness),
    measurements: join(evidenceRoot, scope.measurements),
    ci: join(root, scope.ci),
    packageJson: join(root, scope.packageJson),
  };
}

/**
 * The argv handed to the product's `balance` command — every scope surface resolved
 * against `root`, plus the target name that titles the report.
 *
 * Reports may be overridden (CI writes them where the run wrote them); the SURFACES may
 * not. Pure, so the @unit arm can assert the gate passes all seven and cannot quietly
 * drop one.
 *
 * THE MEASUREMENT ARTEFACT AND THE FITNESS REPORT ARE PASSED ONLY WHERE THEY EXIST, WHICH IS THE
 * OPPOSITE OF THE TREATMENT THE TWO SUITE REPORTS GET (@SCN-CIP-006, and 3F-3145 for the
 * second). A `--measurements` path the balance command is handed and
 * cannot find is a usage fault to it and exits 2 (@SCN-CLI-002) — the wrong verdict here. An
 * absent artefact leaves exactly the measured rows unanswered, and those rows reconciling
 * missing is the honest reading: a step that never ran is never balanced (@SCN-CIP-006). Exit 2
 * would take that verdict away from the ledger and rebuild, inside the gate, the hiding place
 * the gate exists to close — unwrap a timed script and the build would report a broken run
 * rather than an unmeasured suite.
 *
 * THE FITNESS REPORT TAKES THAT TREATMENT FOR THE SAME REASON, ONE STEP FURTHER OUT. A target
 * that has converted no check runs no fitness pass and writes no report, so exit 2 there would
 * call an unconverted consumer's set-up broken over a file it has no reason to own. Absent, it
 * leaves exactly the converted rows unanswered — which is a verdict, not a fault.
 */
export function selfBalanceArgv(
  root: string,
  evidenceRoot: string,
  overrides: ReportOverrides,
  exists: (path: string) => boolean,
  scope: SelfBalanceScope = SELF_BALANCE_SCOPE,
): string[] {
  const resolved = resolveScope(root, evidenceRoot, overrides, scope);
  return [
    "--features",
    resolved.features,
    "--vitest",
    resolved.vitest,
    "--cucumber",
    resolved.cucumber,
    ...(exists(resolved.measurements) ? ["--measurements", resolved.measurements] : []),
    ...(exists(resolved.fitness) ? ["--fitness", resolved.fitness] : []),
    "--ci",
    resolved.ci,
    "--package-json",
    resolved.packageJson,
    "--target",
    SELF_TARGET,
  ];
}

/**
 * The precondition check on the two runtime reports (@SCN-CLI-002's rule, applied one
 * level up). The gate cannot reconcile a stream that was never emitted, and an absent
 * report is a USAGE fault — the run was set up wrong — never an out-of-balance verdict.
 * Reporting it as a verdict is the false all-red the dogfooding fault produced.
 *
 * THE MEASUREMENT ARTEFACT AND THE FITNESS REPORT ARE DELIBERATELY NOT CHECKED HERE, and the
 * asymmetry is the whole of @SCN-CIP-006's care. An unemitted suite report leaves EVERY obligation
 * unobserved, which means the suite did not run; an absent measurement artefact or fitness report
 * leaves exactly the measured or converted rows unanswered, and those reconciling missing is a
 * verdict the ledger is entitled to reach.
 *
 * Pure: the resolved paths + an injected `exists`, returning a message naming the absent
 * report AND how to emit it, else null.
 */
export function checkEvidenceReportsPresent(
  evidenceRoot: string,
  overrides: ReportOverrides,
  exists: (path: string) => boolean,
  scope: SelfBalanceScope = SELF_BALANCE_SCOPE,
): string | null {
  // THE TARGET ROOT IS NOT TAKEN, AND ITS ABSENCE IS THE ASSERTION (3F-3099). Both streams this
  // guards are OUTPUT, so neither is reachable from the tree being judged; a parameter for a root
  // nothing here resolves against would be an invitation to reach for it.
  const resolved = resolveScope(evidenceRoot, evidenceRoot, overrides, scope);
  const streams = [
    { path: resolved.vitest, named: scope.vitest, emit: `pnpm test --reporter=json --outputFile=${scope.vitest}` },
    { path: resolved.cucumber, named: scope.cucumber, emit: `pnpm cucumber --format json:${scope.cucumber}` },
  ];

  for (const stream of streams) {
    if (!exists(stream.path)) {
      return (
        `balance:self: the evidence report ${stream.named} was never emitted ` +
        `(looked in ${stream.path}).\n` +
        `This is a setup fault, not a verdict — reconciling against a report that does ` +
        `not exist would report every obligation as unobserved, which means "the suite ` +
        `did not run", never "the code is wrong".\n` +
        `Emit it with: ${stream.emit}`
      );
    }
  }
  return null;
}

/** Read a `--flag value` pair from argv, or undefined when the flag is absent. */
function flag(argv: string[], name: string): string | undefined {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  const value = argv[at + 1];
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

/**
 * The gate. Resolves the source surfaces against `--root` (default the working directory, i.e. the
 * repository in CI) and the evidence surfaces against the evidence root, guards the two runtime
 * streams, and delegates the verdict to the product's own balance command — whose exit code
 * becomes the build's.
 */
export function runSelfBalance(argv: string[]): void {
  // NAMED, NOT DEFAULTED, AND THE TWO ARE READ SEPARATELY ON PURPOSE (3F-3099). `root` keeps its
  // default of the working directory, because the TREE BEING JUDGED with no `--root` is this
  // repository. Whether a root was NAMED is a different fact, and it is the one that decides where
  // this run's output lands: defaulting first and then comparing against `"."` would make "no root
  // given" indistinguishable from "the root given is the working tree".
  const namedRoot = flag(argv, "root");
  const root = namedRoot ?? ".";
  const evidenceRoot = resolveEvidenceRoot(namedRoot);
  const overrides: ReportOverrides = {};
  const vitest = flag(argv, "vitest");
  const cucumber = flag(argv, "cucumber");
  if (vitest !== undefined) overrides.vitest = vitest;
  if (cucumber !== undefined) overrides.cucumber = cucumber;

  const missing = checkEvidenceReportsPresent(evidenceRoot, overrides, existsSync);
  if (missing !== null) {
    process.stderr.write(missing + "\n");
    // Exit 2 — the usage code, kept distinct from the out-of-balance verdict (1) so a
    // mis-set-up run can never be mistaken for an honest disagreement.
    process.exitCode = 2;
    return;
  }

  runBalance(selfBalanceArgv(root, evidenceRoot, overrides, existsSync));
}

// Run only when invoked as the script, so the @unit arm can import the pure helpers
// above without the gate reconciling a tree as a side effect of the import
// (the lintScnSubIssuesCli convention).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runSelfBalance(process.argv.slice(2));
