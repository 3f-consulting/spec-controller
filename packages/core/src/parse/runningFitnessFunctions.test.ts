import { describe, it, expect, beforeEach } from "vitest";
import { recognisedRunners, runningFitnessFunctions } from "./runningFitnessFunctions.js";
import { resolveRunners } from "./targetManifest.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};
const SUITE_RUNNERS: Readonly<Record<string, string | null>> = {
  unit: "vitest",
  integration: "cucumber-js",
};

describe("[SCN-USG-001] runningFitnessFunctions — the running-guard observer (emits a FitnessEvidenceObservation per running CI guard)", () => {
  const usgPkg: PackageJsonScripts = {
    scripts: {
      "lint:foo": "echo foo",
      "lint:bar": "echo bar",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  let usgCi: string;
  beforeEach(() => {
    usgCi = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm lint:foo",
      "      - run: pnpm lint:bar",
      "      - run: pnpm test",
      "      - run: pnpm cucumber",
    ].join("\n");
  });

  it("emits a FitnessEvidenceObservation for each check step a CI run step invokes (test / cucumber excluded)", () => {
    expect(runningFitnessFunctions([usgCi], usgPkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", fitnessFunction: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  const unscriptedCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    '      - run: "\\n  ./scripts/check.sh  \\n  ./scripts/report.sh\\n"',
    '      - run: "   \\r\\n  ./scripts/audit.sh\\r\\n"',
  ];

  it("reports an unnamed step that invokes no script by its first non-blank command, trimmed, whatever its line endings", () => {
    expect(
      runningFitnessFunctions([unscriptedCi.join("\n")], usgPkg, SUITE_RUNNERS).map((o) => o.fitnessFunction)
    ).toEqual(["./scripts/audit.sh", "./scripts/check.sh"]);
  });

  it("still reports the checks beside a step whose command is blank", () => {
    const withBlank = [...unscriptedCi, '      - run: ""'].join("\n");
    expect(runningFitnessFunctions([withBlank], usgPkg, SUITE_RUNNERS).map((o) => o.fitnessFunction)).toEqual(
      expect.arrayContaining(["./scripts/audit.sh", "./scripts/check.sh"])
    );
  });
});

describe("[SCN-USG-003] test and cucumber CI steps are not candidate fitness functions, because the manifest names their runners", () => {
  const manifest = {
    scripts: { "lint:foo": "echo x", test: "vitest run", cucumber: "cucumber-js" },
    specController: { runners: { unit: "vitest", integration: "cucumber-js" } },
  };
  const pkg2: PackageJsonScripts = { scripts: manifest.scripts };
  let ci2: string;
  beforeEach(() => {
    ci2 = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm lint:foo",
      "      - run: pnpm test",
      "      - run: pnpm cucumber",
    ].join("\n");
  });

  it("names a runner for each suite its CI runs — the Given, read rather than assumed", () => {
    const { tiers } = resolveRunners(manifest);
    expect(recognisedRunners([ci2], pkg2, tiers)).toEqual([
      { tier: "unit", runner: "vitest", step: "pnpm test" },
      { tier: "integration", runner: "cucumber-js", step: "pnpm cucumber" },
    ]);
  });
});

describe("[SCN-USG-004] runningFitnessFunctions observes a CI script matching no convention of ours", () => {
  const checkPkg: PackageJsonScripts = { scripts: { check: "echo check" } };
  const reportedAs = (run: string): string[] =>
    runningFitnessFunctions(
      [["jobs:", "  ci:", "    steps:", `      - run: ${JSON.stringify(run)}`].join("\n")],
      checkPkg,
      NO_RUNNERS
    ).map((o) => o.fitnessFunction);

  it.each([
    ["pnpm check", "check"],
    ["pnpm run check", "check"],
    ["yarn check", "check"],
    ["npm run check", "check"],
    ["pnpm  check", "check"],
    ["echo start\npnpm check", "check"],
    ["npm check", "npm check"],
    ["echo check", "echo check"],
    ["pnpm run", "pnpm run"],
    ["npm run", "npm run"],
    ["npm exec check", "npm exec check"],
    ["bun run check", "bun run check"],
    ["pnpm\ncheck", "pnpm"],
  ])("reports a step running %j as %j", (run, expected) => {
    expect(reportedAs(run)).toEqual([expected]);
  });
});

describe("[SCN-USG-007] a fitness function running in ANY of a target's workflows is observed", () => {
  const pkg: PackageJsonScripts = {
    scripts: { "lint:sweep": "echo sweep", test: "vitest run" },
  };
  let ci: string;
  beforeEach(() => {
    ci = ["jobs:", "  ci:", "    steps:", "      - run: pnpm test"].join("\n");
  });
  let nightly: string;
  beforeEach(() => {
    nightly = [
      "jobs:",
      "  nightly:",
      "    steps:",
      "      - run: pnpm lint:sweep",
    ].join("\n");
  });

  it("emits the check invoked by the SECOND source, which reading the first alone would miss", () => {
    expect(runningFitnessFunctions([ci, nightly], pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "fitness", fitnessFunction: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-013] a `uses:` step is a candidate fitness function, reported by the action it uses", () => {
  const pkg: PackageJsonScripts = {
    scripts: { "domain-purity": "echo domain-purity", test: "vitest run" },
  };
  let ci: string;
  beforeEach(() => {
    ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - uses: github/codeql-action/analyze@v3",
      "      - name: Dependency review",
      "        uses: actions/dependency-review-action@v4",
      "      - run: pnpm domain-purity",
      "      - run: pnpm test",
    ].join("\n");
  });

  it("observes an action step, named by the action it uses", () => {
    expect(runningFitnessFunctions([ci], pkg, SUITE_RUNNERS).map((o) => o.fitnessFunction)).toEqual([
      "Dependency review",
      "domain-purity",
      "github/codeql-action/analyze@v3",
    ]);
  });

  it("names an action step by the action it uses where its `name:` is blank, and by its trimmed `name:` where padded", () => {
    const shapes = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - uses: github/codeql-action/analyze@v3",
      '      - name: "   "',
      "        uses: actions/dependency-review-action@v4",
      '      - name: "  Lint  "',
      "        uses: super-linter/super-linter@v7",
    ].join("\n");
    expect(runningFitnessFunctions([shapes], pkg, SUITE_RUNNERS).map((o) => o.fitnessFunction)).toEqual([
      "actions/dependency-review-action@v4",
      "github/codeql-action/analyze@v3",
      "Lint",
    ]);
  });

  it("reads the action step's own `continue-on-error`, rather than vouching for it", () => {
    const severed = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - uses: github/codeql-action/analyze@v3",
      "        continue-on-error: true",
    ].join("\n");
    expect(runningFitnessFunctions([severed], pkg, SUITE_RUNNERS)).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: "github/codeql-action/analyze@v3",
        exists: true,
        enforcedOverRealSource: false,
      },
    ]);
  });
});
