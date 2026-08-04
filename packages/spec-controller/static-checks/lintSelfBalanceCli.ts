/**
 * The SELF-RECONCILIATION gate — `lint:self-balance` (@SCN-SLF-001, 3F-2354).
 *
 * spec-controller's own tree, put through spec-controller. The reconciler could always
 * report this repository's own one-way evidence claims; nothing ever ran it, so the
 * defect class the tool exists to catch had to be found twice by accident in this very
 * repo. This gate makes the tool's own verdict load-bearing: the build depends on it.
 *
 * NOT A SECOND IMPLEMENTATION. This wrapper computes no verdict of its own — it resolves
 * the scan scope and hands the argv to the product's own `runBalance`, so the exit code
 * is the CLI's (@SCN-CLI-004 / 3F-1414: 0 balanced, 1 out-of-balance, 2 usage). A lint
 * script that re-derived the answer would agree with the product by diligence and then
 * drift — the shape `no-parallel-store.feature` exists to forbid.
 *
 * THE SCAN SCOPE IS THE POINT. `SELF_BALANCE_SCOPE` below is the whole of what this gate
 * reaches, stated once, and the @unit arm asserts it EXHAUSTIVELY so a later silent
 * narrowing reds. The boundary is therefore deliberate, not inherited from whatever the
 * caller happened to pass.
 *
 * Parent: 3F-2351.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { runBalance } from "../src/cli-balance/cli.js";

/**
 * The five surfaces the gate reconciles, as paths relative to a target root.
 *
 * There is no sixth. A path enters the gate only by entering one of these — which is the
 * answer to "is `packages/fixture-pkg/` in scope?" (3F-2351, Scan-scope ruling): that
 * path is a string inside a step definition's temporary fixture tree, it exists on none
 * of these five surfaces, and so it is out of scope by construction. No exclusion list
 * is built, because an exclusion guarding an input that cannot arrive is a rule left to
 * rot the first time the fixture is renamed.
 */
export interface SelfBalanceScope {
  /** The Gherkin corpus — the DECLARED side of every evidence obligation. */
  features: string;
  /** The Vitest JSON report — the observed `@unit` stream. */
  vitest: string;
  /** The Cucumber JSON report — the observed `@integration` / `@e2e` stream. */
  cucumber: string;
  /** The CI config — where a static check is observed to FIRE, not merely to exist. */
  ci: string;
  /** The package manifest — where a static check is observed to EXIST. */
  packageJson: string;
}

/**
 * The gate's scan scope. Paths are relative to the target root (`--root`, default the
 * working directory), so the same fixed scope reconciles the repository in CI and a
 * planted tree under test — `--root` moves the whole scope to another tree, it never
 * narrows which surfaces are read.
 *
 * The two runtime reports live under `runs/`, which `.gitignore` excludes with no
 * re-includes and `lint:no-committed-reports` enforces: a reconciliation report
 * enumerates a codebase's gaps and is never committed.
 */
export const SELF_BALANCE_SCOPE: SelfBalanceScope = {
  features: "features",
  vitest: "runs/self-balance/vitest.json",
  cucumber: "runs/self-balance/cucumber.json",
  ci: ".github/workflows/ci.yml",
  packageJson: "package.json",
};

/** The report's "Target repo:" name — the tree being judged is this product itself. */
const SELF_TARGET = "spec-controller";

/** Report-path overrides: CI points these at wherever the run emitted the streams. */
type ReportOverrides = Partial<Pick<SelfBalanceScope, "vitest" | "cucumber">>;

/** Resolve each scope surface against the root, honouring the two report overrides. */
function resolveScope(
  root: string,
  overrides: ReportOverrides,
  scope: SelfBalanceScope,
): SelfBalanceScope {
  return {
    features: join(root, scope.features),
    vitest: overrides.vitest ?? join(root, scope.vitest),
    cucumber: overrides.cucumber ?? join(root, scope.cucumber),
    ci: join(root, scope.ci),
    packageJson: join(root, scope.packageJson),
  };
}

/**
 * The argv handed to the product's `balance` command — every scope surface resolved
 * against `root`, plus the target name that titles the report.
 *
 * Reports may be overridden (CI writes them where the run wrote them); the SURFACES may
 * not. Pure, so the @unit arm can assert the gate passes all five and cannot quietly
 * drop one.
 */
export function selfBalanceArgv(
  root: string,
  overrides: ReportOverrides = {},
  scope: SelfBalanceScope = SELF_BALANCE_SCOPE,
): string[] {
  const resolved = resolveScope(root, overrides, scope);
  return [
    "--features",
    resolved.features,
    "--vitest",
    resolved.vitest,
    "--cucumber",
    resolved.cucumber,
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
 * Pure: the resolved paths + an injected `exists`, returning a message naming the absent
 * report AND how to emit it, else null.
 */
export function checkEvidenceReportsPresent(
  root: string,
  overrides: ReportOverrides,
  exists: (path: string) => boolean,
  scope: SelfBalanceScope = SELF_BALANCE_SCOPE,
): string | null {
  const resolved = resolveScope(root, overrides, scope);
  const streams = [
    { path: resolved.vitest, declared: scope.vitest, emit: `pnpm test --reporter=json --outputFile=${scope.vitest}` },
    { path: resolved.cucumber, declared: scope.cucumber, emit: `pnpm cucumber --format json:${scope.cucumber}` },
  ];

  for (const stream of streams) {
    if (!exists(stream.path)) {
      return (
        `lint:self-balance: the evidence report ${stream.declared} was never emitted ` +
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
 * The gate. Resolves the scope against `--root` (default the working directory, i.e. the
 * repository in CI), guards the two runtime streams, and delegates the verdict to the
 * product's own balance command — whose exit code becomes the build's.
 */
export function runSelfBalance(argv: string[]): void {
  const root = flag(argv, "root") ?? ".";
  const overrides: ReportOverrides = {};
  const vitest = flag(argv, "vitest");
  const cucumber = flag(argv, "cucumber");
  if (vitest !== undefined) overrides.vitest = vitest;
  if (cucumber !== undefined) overrides.cucumber = cucumber;

  const missing = checkEvidenceReportsPresent(root, overrides, existsSync);
  if (missing !== null) {
    process.stderr.write(missing + "\n");
    // Exit 2 — the usage code, kept distinct from the out-of-balance verdict (1) so a
    // mis-set-up run can never be mistaken for an honest disagreement.
    process.exitCode = 2;
    return;
  }

  runBalance(selfBalanceArgv(root, overrides));
}

// Run only when invoked as the script, so the @unit arm can import the pure helpers
// above without the gate reconciling a tree as a side effect of the import
// (the lintScnSubIssuesCli convention).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runSelfBalance(process.argv.slice(2));
