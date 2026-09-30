import { describe, it, expect } from "vitest";
import { recognisedRunners, runningStaticChecks } from "./runningStaticChecks.js";
import { resolveRunners } from "./targetManifest.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};
const SUITE_RUNNERS: Readonly<Record<string, string | null>> = {
  unit: "vitest",
  integration: "cucumber-js",
};

describe("[SCN-USG-001] runningStaticChecks — the running-guard observer (emits a FitnessEvidenceObservation per running CI guard)", () => {
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
    "      - run: pnpm lint:foo",
    "      - run: pnpm lint:bar",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  it("emits a FitnessEvidenceObservation for each check step a CI run step invokes (test / cucumber excluded)", () => {
    expect(runningStaticChecks([usgCi], usgPkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("does not emit an observation for a script that exists but no CI step invokes", () => {
    const withUnwired: PackageJsonScripts = {
      scripts: { ...usgPkg.scripts, "lint:unwired": "echo unwired" },
    };
    expect(runningStaticChecks([usgCi], withUnwired, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-003] test and cucumber CI steps are not candidate fitness checks, because the manifest names their runners", () => {
  const manifest = {
    scripts: { "lint:foo": "echo x", test: "vitest run", cucumber: "cucumber-js" },
    specController: { runners: { unit: "vitest", integration: "cucumber-js" } },
  };
  const pkg2: PackageJsonScripts = { scripts: manifest.scripts };
  const ci2 = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm lint:foo",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  it("names a runner for each suite its CI runs — the Given, read rather than assumed", () => {
    const { tiers } = resolveRunners(manifest);
    expect(recognisedRunners([ci2], pkg2, tiers)).toEqual([
      { tier: "unit", runner: "vitest", step: "pnpm test" },
      { tier: "integration", runner: "cucumber-js", step: "pnpm cucumber" },
    ]);
  });

  it("emits an observation for the check step alone — the two runner steps are excluded", () => {
    expect(runningStaticChecks([ci2], pkg2, resolveRunners(manifest).tiers)).toEqual([
      { qualityCheck: "fitness", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("does not let the citation stamp widen membership — a cited runner step is still excluded", () => {
    expect(
      runningStaticChecks([ci2], pkg2, resolveRunners(manifest).tiers, () => ({
        scnId: "SCN-TGT-001",
      })).map(
        (o) => o.staticCheck,
      ),
    ).toEqual(["lint:foo"]);
  });
});

describe("[SCN-USG-004] runningStaticChecks observes a CI script matching no convention of ours", () => {
  const unprefixedManifest = {
    scripts: {
      "domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
    specController: { runners: { unit: "vitest", integration: "cucumber-js" } },
  };
  const unprefixedPkg: PackageJsonScripts = { scripts: unprefixedManifest.scripts };
  const unprefixedCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");
  const membership = SUITE_RUNNERS;

  it("emits a FitnessEvidenceObservation for a script no convention of ours reaches", () => {
    expect(
      runningStaticChecks([unprefixedCi], unprefixedPkg, membership)
    ).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "domain-purity",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("carries NO scnId key when the seam is asked and answers nothing — the uncited shape", () => {
    const observed = runningStaticChecks(
      [unprefixedCi],
      unprefixedPkg,
      membership,
      () => null
    );

    expect(observed).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "domain-purity",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
    expect(observed[0]).not.toHaveProperty("scnId");
  });
});

describe("[SCN-USG-007] a static check running in ANY of a target's workflows is observed", () => {
  const pkg: PackageJsonScripts = {
    scripts: { "lint:sweep": "echo sweep", test: "vitest run" },
  };
  const ci = ["jobs:", "  ci:", "    steps:", "      - run: pnpm test"].join("\n");
  const nightly = [
    "jobs:",
    "  nightly:",
    "    steps:",
    "      - run: pnpm lint:sweep",
  ].join("\n");

  it("emits the check invoked by the SECOND source, which reading the first alone would miss", () => {
    expect(runningStaticChecks([ci, nightly], pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "fitness", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("emits one observation per STEP when two workflows invoke the same check", () => {
    expect(runningStaticChecks([nightly, nightly], pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "fitness", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("keeps a malformed workflow from discarding the commands of the ones beside it", () => {
    const malformed = "jobs:\n  - this: [is not\n    valid yaml";

    expect(runningStaticChecks([malformed, nightly], pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "fitness", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-013] a `uses:` step is a candidate fitness check, reported by the action it uses", () => {
  const pkg: PackageJsonScripts = {
    scripts: { "domain-purity": "echo domain-purity", test: "vitest run" },
  };
  const ci = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - uses: github/codeql-action/analyze@v3",
    "      - name: Dependency review",
    "        uses: actions/dependency-review-action@v4",
    "      - run: pnpm domain-purity",
    "      - run: pnpm test",
  ].join("\n");

  it("observes an action step, named by the action it uses", () => {
    expect(runningStaticChecks([ci], pkg, SUITE_RUNNERS).map((o) => o.staticCheck)).toEqual([
      "Dependency review",
      "domain-purity",
      "github/codeql-action/analyze@v3",
    ]);
  });

  it("names an action step by its `name:` where it has one — GitHub's own order, not the reference", () => {
    const named = runningStaticChecks([ci], pkg, SUITE_RUNNERS).map((o) => o.staticCheck);
    expect(named).toContain("Dependency review");
    expect(named).not.toContain("actions/dependency-review-action@v4");
  });

  it("reads the action step's own `continue-on-error`, rather than vouching for it", () => {
    const severed = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - uses: github/codeql-action/analyze@v3",
      "        continue-on-error: true",
    ].join("\n");
    expect(runningStaticChecks([severed], pkg, SUITE_RUNNERS)).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "github/codeql-action/analyze@v3",
        exists: true,
        enforcedOverRealSource: false,
      },
    ]);
  });

  it("still leaves the runner step out, whatever form the steps beside it take", () => {
    expect(runningStaticChecks([ci], pkg, SUITE_RUNNERS).map((o) => o.staticCheck)).not.toContain(
      "pnpm test",
    );
  });
});

describe("[SCN-USG-001] runningStaticChecks — a step invoking two scripts is named by the first it invokes", () => {
  const pkg: PackageJsonScripts = {
    scripts: {
      "check:format": "prettier --check .",
      "check:types": "tsc --noEmit",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const ci = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: |",
    "          pnpm check:format",
    "          pnpm check:types",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  it("names the step by the first script it invokes, not the second", () => {
    expect(runningStaticChecks([ci], pkg, SUITE_RUNNERS)).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "check:format",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });
});
