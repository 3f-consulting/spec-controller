/**
 * @SCN-SLF-001 (3F-2354) — the @unit arm of the self-reconciliation gate.
 *
 * Two halves, and they are different in kind:
 *
 *   THE SCOPE — what the gate reaches, asserted EXHAUSTIVELY. The gate's whole value is
 *   that spec-controller's own tree cannot hide from it, so a surface silently dropped
 *   from the scan is the failure that would matter most and show least. `toEqual` (never
 *   `toMatchObject`) is what makes a narrowing red.
 *
 *   THE SELF-CITATION — read over the REAL tree with the SAME production readers the
 *   reconciler uses, never a hand-rolled grep, which would agree with the reconciler by
 *   coincidence and drift the moment either changed. A guard that runs while no scenario
 *   names it is an uncited static check, i.e. an instance on the tool's own books of the
 *   class `uncited-static-checks.feature` exists to name.
 *
 * The gate's VERDICT — reds an out-of-balance tree, passes a balanced one — is the
 * @integration arm's (tests/steps/selfReconciliation.steps.ts), which runs the real
 * guard end-to-end over two planted trees. Asserting a verdict here would only re-run
 * the reconciler in isolation.
 *
 * Titles are PLAIN strings, not template literals: `parseTestBlocks` brace-tracks to find
 * where a block closes, and a `${…}` interpolation's own closing brace pops the block on
 * its opening line, so every `it` beneath reads as an UNCITED top-level block (observed
 * on 3F-2366).
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SELF_BALANCE_SCOPE,
  selfBalanceArgv,
  checkEvidenceReportsPresent,
} from "./lintSelfBalanceCli.js";
import {
  parseScenarios,
  checkStaticEvidenceObligations,
  runningStaticChecks,
} from "@3f-consulting/spec-controller-core";
import { staticCheckEvidenceObligationsOf } from "@3f-consulting/spec-controller-core/internal";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepoFile = (relative: string): string =>
  fs.readFileSync(path.join(repoRoot, relative), "utf8");

/** The static check this scenario both DECLARES and IS. */
const OWN_STATIC_CHECK = "lint:self-balance";

/** The guard-prefix set the balance CLI declares at its edge and injects into the core. */
const GUARD_PREFIXES = ["lint:", "guard:"] as const;

describe("[SCN-SLF-001] the self-balance gate's scan scope is stated, whole, in one place", () => {
  it("reaches exactly the five surfaces a reconciliation reads — declared, observed, and wired", () => {
    // EXHAUSTIVE by design. A sixth surface, or a fifth quietly removed, must red here:
    // this object is the only statement of what spec-controller's own tree is judged on.
    expect(SELF_BALANCE_SCOPE).toEqual({
      features: "features",
      vitest: "runs/self-balance/vitest.json",
      cucumber: "runs/self-balance/cucumber.json",
      ci: ".github/workflows/ci.yml",
      packageJson: "package.json",
    });
  });

  it("keeps the two runtime reports under the never-committed runs/ tree", () => {
    // Not incidental: a reconciliation report enumerates this codebase's gaps, so it is
    // more sensitive than the code. runs/** is gitignored with no re-includes and
    // lint:no-committed-reports enforces it, so writing the streams there is what keeps
    // the gate's own inputs off the record.
    expect(SELF_BALANCE_SCOPE.vitest.startsWith("runs/")).toBe(true);
    expect(SELF_BALANCE_SCOPE.cucumber.startsWith("runs/")).toBe(true);
  });

  it("hands every scope surface to the product's balance command, resolved against the root", () => {
    // The gate cannot narrow what it reconciles by omitting a flag: each surface appears
    // with its value, so dropping one from the argv reds even if the scope object is intact.
    const argv = selfBalanceArgv("/tmp/target");

    expect(argv).toEqual([
      "--features",
      path.join("/tmp/target", "features"),
      "--vitest",
      path.join("/tmp/target", "runs/self-balance/vitest.json"),
      "--cucumber",
      path.join("/tmp/target", "runs/self-balance/cucumber.json"),
      "--ci",
      path.join("/tmp/target", ".github/workflows/ci.yml"),
      "--package-json",
      path.join("/tmp/target", "package.json"),
      "--target",
      "spec-controller",
    ]);
  });

  it("lets a caller relocate the emitted reports without relocating the surfaces read", () => {
    // CI writes the streams where the run wrote them, so the report PATHS are an override;
    // WHICH surfaces are read is not. The three tree surfaces stay pinned to the root.
    const argv = selfBalanceArgv("/tmp/target", {
      vitest: "/elsewhere/vitest.json",
      cucumber: "/elsewhere/cucumber.json",
    });

    expect(argv).toContain("/elsewhere/vitest.json");
    expect(argv).toContain("/elsewhere/cucumber.json");
    expect(argv).toContain(path.join("/tmp/target", "features"));
    expect(argv).toContain(path.join("/tmp/target", ".github/workflows/ci.yml"));
    expect(argv).toContain(path.join("/tmp/target", "package.json"));
  });
});

describe("[SCN-SLF-001] an evidence stream that was never emitted is a usage fault, not a verdict", () => {
  it("names the absent report and how to emit it, rather than reconciling against zero evidence", () => {
    // The dogfooding fault @SCN-CLI-002 closed, one level up: reconciling against a report
    // that does not exist yields a terrifying all-red meaning "you forgot to run the suite",
    // not "your code is broken". The gate must never let a setup mistake wear a verdict.
    const message = checkEvidenceReportsPresent("/tmp/target", {}, () => false);

    expect(message).not.toBeNull();
    expect(message).toContain("runs/self-balance/vitest.json");
    expect(message).toContain("pnpm test");
  });

  it("passes the precondition once both streams are present", () => {
    expect(checkEvidenceReportsPresent("/tmp/target", {}, () => true)).toBeNull();
  });
});

describe("[SCN-SLF-001] the gate is reconciled on spec-controller's own Ledger", () => {
  const ciSource = readRepoFile(".github/workflows/ci.yml");
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
  };
  const featureSource = readRepoFile("features/self-reconciliation.feature");

  it("is named by a scenario, so its run has an Evidence Obligation to settle against", () => {
    const named = staticCheckEvidenceObligationsOf(parseScenarios(featureSource));

    expect([...named]).toContain(OWN_STATIC_CHECK);
  });

  it("exists as a script AND is enforced over real source — it fires, it is not merely present", () => {
    // Exists-without-enforcement is the WATERMELON: a gate present in package.json that no
    // CI step invokes reds nothing while reading as a check. Both halves, or neither.
    expect(checkStaticEvidenceObligations([OWN_STATIC_CHECK], ciSource, packageJson)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: OWN_STATIC_CHECK,
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("is one of the running static checks the observer emits into the evidence stream", () => {
    // The `lint:` prefix is load-bearing on the other side of the same pairing:
    // runningStaticChecks observes a CI script only when its name carries an observed
    // prefix, so a name outside that set would run in CI while being invisible to
    // spec-controller's own ledger — a real gate kept off the books.
    const running = runningStaticChecks(ciSource, packageJson, GUARD_PREFIXES).map(
      (observation) => observation.staticCheck,
    );

    expect(running).toContain(OWN_STATIC_CHECK);
  });
});
