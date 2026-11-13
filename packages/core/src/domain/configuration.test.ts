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

describe("balance turns each configuration setting into its internal setting", () => {
  it.each([
    ["CLM-CFG-008", '"unit": "vitest" under runners', { runners: { unit: "vitest" } }, { ...NONE, runners: { unit: "vitest" } }],
    ["CLM-CFG-009", '"performance": null under runners', { runners: { performance: null } }, { ...NONE, runners: { performance: null } }],
    [
      "CLM-CFG-010",
      '"ci.yml:ci:Install dependencies" in notChecks',
      { notChecks: ["ci.yml:ci:Install dependencies"] },
      { ...NONE, nonChecks: [{ workflow: "ci.yml", job: "ci", step: "Install dependencies" }] },
    ],
    [
      "CLM-CFG-011",
      '"nightly:build.yml:ci:Install" in notChecks',
      { notChecks: ["nightly:build.yml:ci:Install"] },
      { ...NONE, nonChecks: [{ workflow: "nightly:build.yml", job: "ci", step: "Install" }] },
    ],
    ["CLM-CFG-012", '"deferred" in deferralTags', { deferralTags: ["deferred"] }, { ...NONE, deferralTags: ["deferred"] }],
    ["CLM-CFG-013", '"@blocked" in deferralTags', { deferralTags: ["@blocked"] }, { ...NONE, deferralTags: ["blocked"] }],
    ["CLM-CFG-014", '" deferred " in deferralTags', { deferralTags: [" deferred "] }, { ...NONE, deferralTags: ["deferred"] }],
    ["CLM-CFG-006", "nothing", undefined, NONE],
  ] as const)("[%s] a specController block with %s gives that internal setting", (_clm, _setting, block, configuration) => {
    expect(targetConfigurationFrom(block === undefined ? {} : { specController: block }, [])).toEqual({ configuration, errors: [] });
  });

  it('[CLM-CFG-010] a specController block with "ci.yml:ci:Install dependencies" in notChecks, with ci.yml read, gives that step', () => {
    const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(targetConfigurationFrom({ specController: { notChecks: ["ci.yml:ci:Install dependencies"] } }, ciRead)).toEqual({
      configuration: { ...NONE, nonChecks: [{ workflow: "ci.yml", job: "ci", step: "Install dependencies" }] },
      errors: [],
    });
  });
});

describe("a configuration setting balance cannot use will be left out", () => {
  it.each([
    ["CLM-CFG-004", '"unit": 3 under runners', { runners: { unit: 3 } }, { kind: "configuration-wrong-kind", entry: "runners.unit" }],
    ["CLM-CFG-003", '"unittest": "vitest" under runners', { runners: { unittest: "vitest" } }, { kind: "runner-key-not-a-layer", entry: "runners.unittest" }],
    ["CLM-CFG-018", '"runners": null', { runners: null }, { kind: "configuration-wrong-kind", entry: "runners" }],
    ["CLM-CFG-005", '"runer": {} beside runners', { runners: {}, runer: {} }, { kind: "configuration-unknown-key", entry: "runer" }],
    [
      "CLM-CFG-015",
      '"ci.yml:ci:No such step" in notChecks, with ci.yml read',
      { notChecks: ["ci.yml:ci:No such step"] },
      { kind: "not-checks-entry-matches-no-step", entry: "ci.yml:ci:No such step" },
    ],
    ["CLM-CFG-016", '"Install dependencies" in notChecks', { notChecks: ["Install dependencies"] }, { kind: "not-checks-entry-not-a-step-name", entry: "Install dependencies" }],
    ["CLM-CFG-019", '"notChecks": "Install"', { notChecks: "Install" }, { kind: "configuration-wrong-kind", entry: "notChecks" }],
    ["CLM-CFG-020", "3 in deferralTags", { deferralTags: [3] }, { kind: "configuration-wrong-kind", entry: "deferralTags[0]" }],
  ] as const)("[%s] a specController block with %s leaves it out, with its error", (_clm, _setting, block, error) => {
    const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(targetConfigurationFrom({ specController: block }, ciRead)).toEqual({ configuration: NONE, errors: [error] });
  });
});

describe("the run will still reach its run verdict, using the configuration settings it could use", () => {
  it('[CLM-CFG-017] a specController block with "unit": 3 and "integration": "cucumber-js" under runners reaches its run verdict, cucumber-js running the integration layer', () => {
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

// Each way a specController block can be other than an object, as a value.
const notAnObject: Readonly<Record<string, unknown>> = { null: null, "a number": 5, "a string": "vitest", "a list": ["vitest"] };

describe("a specController block that is not an object stops the run", () => {
  it.each(manifestVariants["CLM-CFG-021"].variants)("[CLM-CFG-021] a specController block that is %s stops the run as an unexpected error", (variant) => {
    expect(() => targetConfigurationFrom({ specController: notAnObject[variant] }, [])).toThrow();
  });
});
