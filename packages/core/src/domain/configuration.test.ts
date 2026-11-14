import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { targetConfigurationFrom, whereManifestBreaks } from "../inputs/manifest.js";
import manifestVariants from "../inputs/manifest.variants.json" with { type: "json" };
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import type { TargetConfiguration } from "./configuration.js";
import { runVerdictOf } from "./evidenceReconciliation.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { fitnessObservationsOf, stepDispositionOf } from "./postEvidenceObservation.js";

const NONE: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

// Each way a specController block or a runners setting can be other than an object, as a value.
const notAnObject: Readonly<Record<string, unknown>> = { null: null, "a number": 5, "a string": "vitest", 'a text such as "vitest"': "vitest", "a list": ["vitest"] };

describe("balance uses each configuration setting it can, and leaves out any it cannot, naming the error", () => {
  it.each([
    ["CLM-CFG-008", '"unit": "vitest" under runners', "vitest as what runs the unit layer", { runners: { unit: "vitest" } }, { ...NONE, runners: { unit: "vitest" } }],
    ["CLM-CFG-009", '"performance": null under runners', "no performance runner", { runners: { performance: null } }, { ...NONE, runners: { performance: null } }],
    [
      "CLM-CFG-011",
      '"nightly:build.yml:ci:Install" in notChecks',
      "the step Install, in job ci, in nightly:build.yml, as a non-check",
      { notChecks: ["nightly:build.yml:ci:Install"] },
      { ...NONE, nonChecks: [{ workflow: "nightly:build.yml", job: "ci", step: "Install" }] },
    ],
    ["CLM-CFG-013", '"@blocked" in deferralTags', "@blocked as a deferral tag", { deferralTags: ["@blocked"] }, { ...NONE, deferralTags: ["blocked"] }],
    ["CLM-CFG-006", "nothing", "no setting from the block", undefined, NONE],
  ] as const)("[%s] the specController block had %s: when balance reads it, the run will use %s", (_clm, _setting, _uses, block, configuration) => {
    expect(targetConfigurationFrom(block === undefined ? {} : { specController: block }, [])).toEqual({ configuration, errors: [] });
  });

  // The deferral tag each variant writes, without its @.
  const WRITTEN: Readonly<Record<string, string>> = { "without spaces around it": "deferred", "with spaces around it": " deferred " };

  it.each(manifestVariants["CLM-CFG-012"].variants)(
    '[CLM-CFG-012] the specController block had "deferred" in deferralTags, %s: when balance reads it, the run will use @deferred as a deferral tag',
    (variant) => {
      const written = WRITTEN[variant];
      if (written === undefined) throw new Error(`no deferral tag for the variant ${variant}`);

      expect(targetConfigurationFrom({ specController: { deferralTags: [written] } }, [])).toEqual({ configuration: { ...NONE, deferralTags: ["deferred"] }, errors: [] });
    },
  );

  it('[CLM-CFG-010] the specController block had "ci.yml:ci:Install dependencies" in notChecks, with ci.yml read, whose job ci had the step Install dependencies: when balance reads it, the run will use the step Install dependencies, in job ci, in ci.yml, as a non-check', () => {
    const ciRead = [
      { workflow: "ci.yml", job: "ci", name: "Build", plumbing: false, writesStepRecord: false },
      { workflow: "ci.yml", job: "ci", name: "Install dependencies", plumbing: false, writesStepRecord: false },
    ];

    expect(targetConfigurationFrom({ specController: { notChecks: ["ci.yml:ci:Install dependencies"] } }, ciRead)).toEqual({
      configuration: { ...NONE, nonChecks: [{ workflow: "ci.yml", job: "ci", step: "Install dependencies" }] },
      errors: [],
    });
  });

  it('[CLM-CFG-023] the specController block had "nightly.yml:ci:Install" in notChecks, with only ci.yml read: when balance reads it, the run will use the step Install, in job ci, in nightly.yml, as a non-check', () => {
    const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(targetConfigurationFrom({ specController: { notChecks: ["nightly.yml:ci:Install"] } }, ciRead)).toEqual({
      configuration: { ...NONE, nonChecks: [{ workflow: "nightly.yml", job: "ci", step: "Install" }] },
      errors: [],
    });
  });

  it.each([
    ["CLM-CFG-004", '"unit": 3 under runners', "configuration-wrong-kind", "runners.unit", { runners: { unit: 3 } }],
    ["CLM-CFG-003", '"unittest": "vitest" under runners', "runner-key-not-a-layer", "runners.unittest", { runners: { unittest: "vitest" } }],
    ["CLM-CFG-005", '"runer": {} beside runners', "configuration-unknown-key", "runer", { runners: {}, runer: {} }],
    ["CLM-CFG-015", '"ci.yml:ci:No such step" in notChecks, with ci.yml read', "not-checks-entry-matches-no-step", "ci.yml:ci:No such step", { notChecks: ["ci.yml:ci:No such step"] }],
    [
      "CLM-CFG-022",
      '"ci.yml:lint:Install dependencies" in notChecks, with ci.yml read, whose job ci had the step Install dependencies and whose job lint had none',
      "not-checks-entry-matches-no-step",
      "ci.yml:lint:Install dependencies",
      { notChecks: ["ci.yml:lint:Install dependencies"] },
    ],
    ["CLM-CFG-016", '"Install dependencies" in notChecks', "not-checks-entry-not-a-step-name", "Install dependencies", { notChecks: ["Install dependencies"] }],
    ["CLM-CFG-019", '"notChecks": "Install"', "configuration-wrong-kind", "notChecks", { notChecks: "Install" }],
    ["CLM-CFG-020", "3 in deferralTags", "configuration-wrong-kind", "deferralTags[0]", { deferralTags: [3] }],
  ] as const)("[%s] the specController block had %s: when balance validates it, the run will not use it, and balance will find the error %s, naming %s", (_clm, _setting, kind, entry, block) => {
    const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(targetConfigurationFrom({ specController: block }, ciRead)).toEqual({ configuration: NONE, errors: [{ kind, entry }] });
  });

  it.each([
    ["after", "\nci.yml:ci:Install dependencies"],
    ["before", "ci.yml:ci:Install dependencies\n"],
  ] as const)(
    '[CLM-CFG-016] the specController block had "ci.yml:ci:Install dependencies", %s a line break, in notChecks: when balance validates it, the run will not use it, and balance will find the error not-checks-entry-not-a-step-name, naming the entry as written',
    (_where, entry) => {
      const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", plumbing: false, writesStepRecord: false }];

      expect(targetConfigurationFrom({ specController: { notChecks: [entry] } }, ciRead)).toEqual({ configuration: NONE, errors: [{ kind: "not-checks-entry-not-a-step-name", entry }] });
    },
  );

  it.each(manifestVariants["CLM-CFG-018"].variants)(
    "[CLM-CFG-018] the specController block had a runners setting that is %s: when balance validates it, the run will not use it, and balance will find the error configuration-wrong-kind, naming runners",
    (variant) => {
      expect(targetConfigurationFrom({ specController: { runners: notAnObject[variant] } }, [])).toEqual({ configuration: NONE, errors: [{ kind: "configuration-wrong-kind", entry: "runners" }] });
    },
  );

  it('[CLM-CFG-017] the specController block had "unit": 3 and "integration": "cucumber-js" under runners: when balance reconciles the target, the run will reach its run verdict, and cucumber-js will be what runs the integration layer', () => {
    const manifest = { specController: { runners: { unit: 3, integration: "cucumber-js" } } };
    const { configuration } = targetConfigurationFrom(manifest, []);
    const steps = workflowStepsFrom("ci.yml", "jobs:\n  ci:\n    steps:\n      - run: cucumber-js\n");
    const claims = executableClaimsOf([featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: s\n    Given a step\n")], {
      deferralTags: configuration.deferralTags,
      strict: false,
    });
    const passingUnitTest = { cites: [{ featureCode: "ONE", number: "001" }], result: "passed", kind: "unit", place: "one.test.ts", notes: [] } as const;

    const runVerdict = runVerdictOf(claimReconciliationsOf(claims, [passingUnitTest, ...fitnessObservationsOf(steps, [], configuration, {}, shellAnswers)]), []);

    expect({ manifestBreaksAt: whereManifestBreaks(manifest), runVerdict, integrationStep: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers) }).toEqual({
      manifestBreaksAt: undefined,
      runVerdict: { verdict: "balanced" },
      integrationStep: "runner",
    });
  });
});

describe("a specController block that is not an object stops the run", () => {
  it.each(manifestVariants["CLM-CFG-021"].variants)("[CLM-CFG-021] a specController block that was %s: when balance reads it, the run will stop, give no verdict and exit 2, and complain, naming the specController block", (variant) => {
    expect(whereManifestBreaks({ specController: notAnObject[variant] })).toBe("$.specController");
  });
});
