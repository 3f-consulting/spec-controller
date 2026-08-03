/**
 * Unit tests for the running-guard observer (src/ingest/ciGuards.ts) —
 * `runningStaticChecks` emits a GuardEvidenceObservation per running CI guard. The evidence-obligation
 * observer (`checkStaticEvidenceObligations`) is pinned in src/ingest/guard.test.ts; the shared CI-parse primitive both
 * use lives in src/ingest/ciCommands.ts. reconcile's folding of a no-evidence-obligation running static check onto
 * the suspense row is pinned in src/domain/evidenceReconciliation.test.ts.
 *
 * Parent: @SCN-USG-001 (the uncited static-check).
 */

import { describe, it, expect } from "vitest";
import { runningStaticChecks } from "./runningStaticChecks.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

// The guard-prefix set is DECLARED at the CLI edge (ingest/ingestQualityChecks.ts) and
// injected into the pure function. These tests inject the portfolio default explicitly.
const DEFAULT_PREFIXES = ["lint:", "guard:"] as const;

describe("[SCN-USG-001] runningStaticChecks — the running-guard observer (emits a GuardEvidenceObservation per running CI guard)", () => {
  const usgPkg: PackageJsonScripts = {
    scripts: {
      "lint:foo": "echo foo",
      "lint:bar": "echo bar",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const usgCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm lint:foo",
    "      - run: pnpm lint:bar",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  // A running CI static check is emitted as a GuardEvidenceObservation —
  // exists + enforcedOverRealSource are true by construction (a package.json script a CI
  // run: step invokes). The static analogue of the runner emitting a passing test result.
  it("emits a GuardEvidenceObservation for each lint:* script a CI run step invokes (test / cucumber / install excluded)", () => {
    // test + cucumber are the runtime axis's observed evidence; install is not a script.
    expect(runningStaticChecks(usgCi, usgPkg, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("does not emit an observation for a lint:* script that exists but no CI step invokes", () => {
    const withUnwired: PackageJsonScripts = {
      scripts: { ...usgPkg.scripts, "lint:unwired": "echo unwired" },
    };
    expect(runningStaticChecks(usgCi, withUnwired, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-003] non-lint CI steps are not observed as static checks", () => {
  it("emits observations only for lint:* scripts — test / cucumber / install CI steps are excluded", () => {
    const pkg2: PackageJsonScripts = {
      scripts: { "lint:foo": "echo x", test: "vitest run", cucumber: "cucumber-js" },
    };
    const ci2 = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm install --frozen-lockfile",
      "      - run: pnpm lint:foo",
      "      - run: pnpm test",
      "      - run: pnpm cucumber",
    ].join("\n");
    // Only lint:foo is a running static check; test + cucumber (the runtime axis's observed
    // evidence) and install (not a script) never enter the observed set.
    expect(runningStaticChecks(ci2, pkg2, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-004] runningStaticChecks observes guard:-prefixed CI scripts as static checks, not just lint:*", () => {
  // an adopter's repository-shaped case: a guard:domain-purity script (guard:*, not lint:*) a CI run: step
  // invokes must be observed as a running static check under the default prefix set, so the
  // reconciler can fold an undeclared one to the suspense row as an uncited static check.
  // test/cucumber (neither prefix) stay excluded by construction — preserving @SCN-USG-003.
  // `guard:domain-purity` is a script NAME — a value, not vocabulary — so the handle itself
  // is deliberately untouched by the static-check rename (3F-1929; 3F-1852 owns script names).
  const guardPkg: PackageJsonScripts = {
    scripts: {
      "guard:domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const guardCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm guard:domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  it("emits a GuardEvidenceObservation for a guard:* script a CI run step invokes", () => {
    expect(runningStaticChecks(guardCi, guardPkg, DEFAULT_PREFIXES)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "guard:domain-purity",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("observes both lint:* and guard:* running scripts together, still excluding test/cucumber", () => {
    const mixedPkg: PackageJsonScripts = {
      scripts: {
        "lint:foo": "echo foo",
        "guard:domain-purity": "echo dp",
        test: "vitest run",
        cucumber: "cucumber-js",
      },
    };
    const mixedCi = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm lint:foo",
      "      - run: pnpm guard:domain-purity",
      "      - run: pnpm test",
      "      - run: pnpm cucumber",
    ].join("\n");
    expect(runningStaticChecks(mixedCi, mixedPkg, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "guard:domain-purity", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});
