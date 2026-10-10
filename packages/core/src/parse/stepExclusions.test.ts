import { describe, it, expect, beforeEach } from "vitest";
import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import { stepExclusions } from "./stepExclusions.js";
import { runningFitnessFunctions } from "./runningFitnessFunctions.js";
import { resolveNotChecks } from "./targetManifest.js";

let CI_YML: string;
beforeEach(() => {
  CI_YML = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - run: pnpm install --frozen-lockfile",
    "      - name: Rule check",
    "        run: pnpm lint:rules",
    "      - name: Sweep check",
    "        run: pnpm lint:sweep",
  ].join("\n");
});

let RELEASE_YML: string;
beforeEach(() => {
  RELEASE_YML = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - name: Rule check",
    "        run: pnpm lint:rules",
  ].join("\n");
});

const SCRIPTS = {
  scripts: {
    "lint:rules": "eslint . --format json",
    "lint:sweep": "madge --circular",
  },
};

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

describe("[SCN-USG-015] stepExclusions — an entry naming a step of the pipeline", () => {
  it("excludes the step the entry names, and no other", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], ["ci.yml:ci:Rule check"]);
    expect(resolved.excluded).toEqual(["ci.yml:ci:Rule check"]);
    expect(resolved.unmatchedEntries).toEqual([]);
    const named = ciWorkflowSteps([CI_YML]).filter((step) => resolved.isExcluded(step));
    expect(named.map((step) => step.identity)).toEqual(["Rule check"]);
  });

  it("names a `uses:` step by the action it uses, which is the identity the walk carries", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], ["ci.yml:ci:actions/checkout@v4"]);
    expect(resolved.excluded).toEqual(["ci.yml:ci:actions/checkout@v4"]);
    const named = ciWorkflowSteps([CI_YML]).filter((step) => resolved.isExcluded(step));
    expect(named.map((step) => step.identity)).toEqual(["actions/checkout@v4"]);
  });

  it("names an unnamed `run:` step by the first line of its command", () => {
    const entry = "ci.yml:ci:pnpm install --frozen-lockfile";
    expect(stepExclusions([CI_YML], ["ci.yml"], [entry]).excluded).toEqual([entry]);
  });

  it("excludes nothing when the target names nothing", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], []);
    expect(resolved.excluded).toEqual([]);
    expect(resolved.unmatchedEntries).toEqual([]);
    expect(ciWorkflowSteps([CI_YML]).some((step) => resolved.isExcluded(step))).toBe(false);
  });
});

describe("[SCN-USG-015] stepExclusions — the match is exact and fully qualified", () => {
  const nothingMatches = (entry: string): void => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], [entry]);
    expect(resolved.excluded).toEqual([]);
    expect(resolved.unmatchedEntries).toEqual([entry]);
    expect(ciWorkflowSteps([CI_YML]).some((step) => resolved.isExcluded(step))).toBe(false);
  };

  it.each([
    ["matches no step on a bare step name", "Rule check"],
    ["matches no step on a job-and-step form", "ci:Rule check"],
    ["matches no step on a file-and-step form", "ci.yml:Rule check"],
    ["matches no step on a prefix of the qualified name", "ci.yml:ci:Rule"],
    ["matches no step on a trailing wildcard", "ci.yml:ci:Rule*"],
    ["matches no step on a whole-job wildcard", "ci.yml:ci:*"],
    ["matches no step on a different case", "ci.yml:ci:rule check"],
    ["matches no step on surrounding whitespace", " ci.yml:ci:Rule check "],
  ] as const)("%s", (_title, entry) => nothingMatches(entry));
});

describe("[SCN-USG-015] stepExclusions — two steps of one name in two workflows", () => {
  let sources: string[];
  beforeEach(() => {
    sources = [CI_YML, RELEASE_YML];
  });
  const names = ["ci.yml", "release.yml"];

  it("excludes the one the entry's workflow names, and leaves its namesake alone", () => {
    const resolved = stepExclusions(sources, names, ["release.yml:ci:Rule check"]);
    expect(resolved.excluded).toEqual(["release.yml:ci:Rule check"]);
    const excluded = ciWorkflowSteps(sources).filter((step) => resolved.isExcluded(step));
    expect(excluded.map((step) => step.sourceIndex)).toEqual([1]);
  });

  it("excludes both only when the target writes both entries", () => {
    const resolved = stepExclusions(sources, names, [
      "ci.yml:ci:Rule check",
      "release.yml:ci:Rule check",
    ]);
    expect(resolved.excluded).toEqual(["ci.yml:ci:Rule check", "release.yml:ci:Rule check"]);
    expect(ciWorkflowSteps(sources).filter((step) => resolved.isExcluded(step))).toHaveLength(2);
  });

  it("excludes no step of a source this run was given no name for", () => {
    const resolved = stepExclusions(sources, ["ci.yml"], ["ci.yml:ci:Rule check"]);
    const excluded = ciWorkflowSteps(sources).filter((step) => resolved.isExcluded(step));
    expect(excluded.map((step) => step.sourceIndex)).toEqual([0]);
  });
});

describe("[SCN-USG-015] stepExclusions — an entry naming no step", () => {
  it("reports the entry rather than dropping it", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], ["ci.yml:ci:Circular-import check"]);
    expect(resolved.unmatchedEntries).toEqual(["ci.yml:ci:Circular-import check"]);
    expect(resolved.excluded).toEqual([]);
  });

  it("partitions every entry into exactly one of the two halves", () => {
    const entries = [
      "ci.yml:ci:Rule check",
      "ci.yml:ci:Circular-import check",
      "ci.yml:ci:Sweep check",
      "Rule check",
    ];
    const resolved = stepExclusions([CI_YML], ["ci.yml"], entries);
    expect([...resolved.excluded, ...resolved.unmatchedEntries].sort()).toEqual([...entries].sort());
    expect(resolved.excluded).toEqual(["ci.yml:ci:Rule check", "ci.yml:ci:Sweep check"]);
  });
});

describe("[SCN-USG-015] runningFitnessFunctions — a check whose every step the target excluded", () => {
  const PLUMBING = ["ci.yml:ci:actions/checkout@v4", "ci.yml:ci:pnpm install --frozen-lockfile"];
  const observed = (notChecks: readonly string[]): string[] =>
    runningFitnessFunctions(
      [CI_YML],
      SCRIPTS,
      NO_RUNNERS,
      () => null,
      stepExclusions([CI_YML], ["ci.yml"], [...PLUMBING, ...notChecks]).isExcluded
    ).map((observation) => observation.fitnessFunction);

  it("observes both checks when the target excludes neither of them", () => {
    expect(observed([])).toEqual(["lint:rules", "lint:sweep"]);
  });

  it("stops observing the check whose only step the target named a non-check", () => {
    expect(observed(["ci.yml:ci:Rule check"])).toEqual(["lint:sweep"]);
  });

  it("goes on observing a check a second, unexcluded step also runs", () => {
    const twice = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Rule check",
      "        run: pnpm lint:rules",
      "      - name: Sweep check",
      "        run: pnpm lint:sweep",
      "  nightly:",
      "    steps:",
      "      - name: Nightly rules",
      "        run: pnpm lint:rules",
    ].join("\n");
    const resolved = stepExclusions([twice], ["ci.yml"], ["ci.yml:ci:Rule check"]);
    const checks = runningFitnessFunctions([twice], SCRIPTS, NO_RUNNERS, () => null, resolved.isExcluded);
    expect(checks.map((observation) => observation.fitnessFunction)).toEqual(["lint:rules", "lint:sweep"]);
  });
});

describe("[SCN-USG-015] resolveNotChecks — the target's specController.notChecks list", () => {
  it("reads the entries the target wrote, in the order it wrote them", () => {
    expect(
      resolveNotChecks({
        specController: { notChecks: ["ci.yml:ci:Rule check", "ci.yml:ci:Install"] },
      })
    ).toEqual(["ci.yml:ci:Rule check", "ci.yml:ci:Install"]);
  });

  it("resolves empty for a manifest that names none", () => {
    expect(resolveNotChecks({})).toEqual([]);
    expect(resolveNotChecks({ specController: {} })).toEqual([]);
  });

  it("resolves empty for a value that is not a list", () => {
    expect(resolveNotChecks({ specController: { notChecks: "ci.yml:ci:Rule check" } })).toEqual([]);
    expect(resolveNotChecks({ specController: { notChecks: { "ci.yml": "ci" } } })).toEqual([]);
  });

  it("drops an entry that is not a name, rather than throwing over it", () => {
    expect(
      resolveNotChecks({ specController: { notChecks: ["ci.yml:ci:Rule check", 7, null] } })
    ).toEqual(["ci.yml:ci:Rule check"]);
  });

  it("keeps one entry where the target wrote it twice", () => {
    expect(
      resolveNotChecks({
        specController: { notChecks: ["ci.yml:ci:Rule check", "ci.yml:ci:Rule check"] },
      })
    ).toEqual(["ci.yml:ci:Rule check"]);
  });
});
