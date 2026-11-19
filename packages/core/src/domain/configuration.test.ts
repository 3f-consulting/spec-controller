import { describe, expect, it } from "vitest";
import { configurationSettingsNamed, type SettingsNamed } from "../inputs/commandLineSettings.js";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { targetConfigurationFrom, whereManifestBreaks } from "../inputs/manifest.js";
import manifestVariants from "../inputs/manifest.variants.json" with { type: "json" };
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import { targetConfigurationOf, type TargetConfiguration } from "./configuration.js";
import { NO_RUNNERS } from "./configuration.test-utils.js";
import { runVerdictOf } from "./evidenceReconciliation.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { disposedStepsOf, fitnessObservationsOf, stepDispositionOf } from "./postEvidenceObservation.js";
import type { CiStep } from "./workflowSteps.js";

const NONE: TargetConfiguration = { runners: NO_RUNNERS, nonChecks: [], deferralTags: [] };

// The configuration balance takes from the settings a run names, with the steps it read.
const takenFrom = (named: Partial<SettingsNamed>, steps: readonly CiStep[] = []): TargetConfiguration =>
  targetConfigurationOf(configurationSettingsNamed({ runners: {}, nonChecks: [], deferralTags: [], ...named }), steps, []).configuration;

describe("balance takes each configuration setting it can use as the runner, non-check or deferral tag it names", () => {
  it.each<[string, string, Partial<SettingsNamed>, TargetConfiguration]>([
    ["CLM-CFG-008", "--unit vitest", { runners: { unit: ["vitest"] } }, { ...NONE, runners: { ...NO_RUNNERS, unit: [{ name: "vitest" }] } }],
    ["CLM-CFG-008", "--unit with spaces around vitest", { runners: { unit: [" vitest "] } }, { ...NONE, runners: { ...NO_RUNNERS, unit: [{ name: "vitest" }] } }],
    ["CLM-CFG-026", "--unit vitest and --unit pytest", { runners: { unit: ["vitest", "pytest"] } }, { ...NONE, runners: { ...NO_RUNNERS, unit: [{ name: "vitest" }, { name: "pytest" }] } }],
    [
      "CLM-CFG-026",
      "--not-check nightly:build.yml:ci:Install dependencies and --not-check nightly:build.yml:ci:Build",
      { nonChecks: ["nightly:build.yml:ci:Install dependencies", "nightly:build.yml:ci:Build"] },
      {
        ...NONE,
        nonChecks: [
          { workflow: "nightly:build.yml", job: "ci", step: "Install dependencies" },
          { workflow: "nightly:build.yml", job: "ci", step: "Build" },
        ],
      },
    ],
    ["CLM-CFG-026", "--deferral-tag deferred and --deferral-tag blocked", { deferralTags: ["deferred", "blocked"] }, { ...NONE, deferralTags: ["deferred", "blocked"] }],
    [
      "CLM-CFG-024",
      "--e2e playwright:junit:out/playwright.xml",
      { runners: { e2e: ["playwright:junit:out/playwright.xml"] } },
      { ...NONE, runners: { ...NO_RUNNERS, e2e: [{ name: "playwright", report: { path: "out/playwright.xml", format: "junit" } }] } },
    ],
    [
      "CLM-CFG-024",
      "--e2e playwright:junit:C:\\out\\playwright.xml, its report's path holding a colon",
      { runners: { e2e: ["playwright:junit:C:\\out\\playwright.xml"] } },
      { ...NONE, runners: { ...NO_RUNNERS, e2e: [{ name: "playwright", report: { path: "C:\\out\\playwright.xml", format: "junit" } }] } },
    ],
    [
      "CLM-CFG-011",
      "--not-check nightly:build.yml:ci:Install dependencies",
      { nonChecks: ["nightly:build.yml:ci:Install dependencies"] },
      { ...NONE, nonChecks: [{ workflow: "nightly:build.yml", job: "ci", step: "Install dependencies" }] },
    ],
    ["CLM-CFG-012", "--deferral-tag deferred", { deferralTags: ["deferred"] }, { ...NONE, deferralTags: ["deferred"] }],
    ["CLM-CFG-013", "--deferral-tag @blocked", { deferralTags: ["@blocked"] }, { ...NONE, deferralTags: ["blocked"] }],
    ["CLM-CFG-014", "--deferral-tag with spaces around deferred", { deferralTags: [" deferred "] }, { ...NONE, deferralTags: ["deferred"] }],
    ["CLM-CFG-006", "nothing", {}, NONE],
  ])("[%s] a run named %s is taken as what it sets", (_clm, _named, named, configuration) => {
    expect(takenFrom(named)).toEqual(configuration);
  });

  it('[CLM-CFG-009] a specController block with "performance": null under runners takes the performance layer as having no runner', () => {
    expect(targetConfigurationFrom({ specController: { runners: { performance: null } } }, [], [])).toEqual({ configuration: NONE, errors: [] });
  });

  it("[CLM-CFG-024] a run named --e2e playwright:junit:out/playwright.xml takes playwright as the e2e layer's runner, so a step running it is a runner", () => {
    const configuration = takenFrom({ runners: { e2e: ["playwright:junit:out/playwright.xml"] } });
    const steps = workflowStepsFrom("ci.yml", "jobs:\n  ci:\n    steps:\n      - run: playwright test\n");

    expect(stepDispositionOf(steps[0]!, configuration, {}, shellAnswers)).toBe("runner");
  });

  it("[CLM-CFG-010] a run named --not-check ci.yml:ci:Install dependencies, with ci.yml read, whose job ci had the step Install dependencies, takes that step as a non-check", () => {
    const ciRead = [
      { workflow: "ci.yml", job: "ci", name: "Build", identity: "Build", plumbing: false, writesStepRecord: false },
      { workflow: "ci.yml", job: "ci", name: "Install dependencies", identity: "Install dependencies", plumbing: false, writesStepRecord: false },
    ];

    expect(takenFrom({ nonChecks: ["ci.yml:ci:Install dependencies"] }, ciRead)).toEqual({ ...NONE, nonChecks: [{ workflow: "ci.yml", job: "ci", step: "Install dependencies" }] });
  });

  it("[CLM-CFG-010] a run named --not-check ci.yaml:ci:Install dependencies, with ci.yaml read, whose job ci had the step Install dependencies, takes that step as a non-check", () => {
    const ciRead = [{ workflow: "ci.yaml", job: "ci", name: "Install dependencies", identity: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(takenFrom({ nonChecks: ["ci.yaml:ci:Install dependencies"] }, ciRead)).toEqual({ ...NONE, nonChecks: [{ workflow: "ci.yaml", job: "ci", step: "Install dependencies" }] });
  });

  it("[CLM-CFG-023] a run named --not-check nightly.yml:ci:Install dependencies, with only ci.yml read, takes that step as a non-check", () => {
    const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", identity: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(takenFrom({ nonChecks: ["nightly.yml:ci:Install dependencies"] }, ciRead)).toEqual({ ...NONE, nonChecks: [{ workflow: "nightly.yml", job: "ci", step: "Install dependencies" }] });
  });
});

describe("balance leaves out a configuration setting it cannot use, naming the error", () => {
  it.each([
    ["CLM-CFG-004", '"unit": 3 under runners', { runners: { unit: 3 } }, { kind: "configuration-wrong-kind", entry: "runners.unit" }],
    ["CLM-CFG-003", '"unittest": "vitest" under runners', { runners: { unittest: "vitest" } }, { kind: "runner-key-not-a-layer", entry: "runners.unittest" }],
    ["CLM-CFG-005", '"runer": {} beside runners', { runners: {}, runer: {} }, { kind: "configuration-unknown-key", entry: "runer" }],
    [
      "CLM-CFG-015",
      '"ci.yml:ci:No such step" in notChecks, with ci.yml read',
      { notChecks: ["ci.yml:ci:No such step"] },
      { kind: "not-checks-entry-matches-no-step", entry: "ci.yml:ci:No such step" },
    ],
    [
      "CLM-CFG-022",
      '"ci.yml:lint:Install dependencies" in notChecks, with ci.yml read, whose job ci had the step Install dependencies and whose job lint had none',
      { notChecks: ["ci.yml:lint:Install dependencies"] },
      { kind: "not-checks-entry-matches-no-step", entry: "ci.yml:lint:Install dependencies" },
    ],
    ["CLM-CFG-016", '"Install dependencies" in notChecks', { notChecks: ["Install dependencies"] }, { kind: "not-checks-entry-not-a-step-name", entry: "Install dependencies" }],
    ["CLM-CFG-019", '"notChecks": "Install"', { notChecks: "Install" }, { kind: "configuration-wrong-kind", entry: "notChecks" }],
    ["CLM-CFG-020", "3 in deferralTags", { deferralTags: [3] }, { kind: "configuration-wrong-kind", entry: "deferralTags[0]" }],
  ] as const)("[%s] a specController block with %s leaves it out, finding its error naming the setting", (_clm, _setting, block, error) => {
    const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", identity: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(targetConfigurationFrom({ specController: block }, ciRead, [])).toEqual({ configuration: NONE, errors: [error] });
  });

  // Each variant of a malformed runner entry, as the entry is written.
  const malformedEntry: Readonly<Record<string, unknown>> = {
    "an entry with no runner": { reports: ["playwright.xml"] },
    "an entry with no reports": { runner: "playwright" },
    "an entry whose reports are not a list": { runner: "playwright", reports: "playwright.xml" },
    "an entry whose reports hold something other than a file name": { runner: "playwright", reports: ["playwright.xml", 3] },
  };

  it.each(manifestVariants["malformed-runner-entries"].variants)("[CLM-CFG-004] a specController block with %s as the e2e runner leaves it out, finding its error naming the setting", (variant) => {
    expect(targetConfigurationFrom({ specController: { runners: { e2e: malformedEntry[variant] } } }, [], ["playwright.xml"])).toEqual({
      configuration: NONE,
      errors: [{ kind: "configuration-wrong-kind", entry: "runners.e2e" }],
    });
  });

  it('[CLM-CFG-025] a specController block with "e2e": { "runner": "playwright", "reports": ["playwright.xml"] } under runners, with no report named playwright.xml read, leaves the report name out, finding its error naming it, and keeps the runner', () => {
    const steps = workflowStepsFrom("ci.yml", "jobs:\n  ci:\n    steps:\n      - run: playwright test\n");
    const { configuration, errors } = targetConfigurationFrom({ specController: { runners: { e2e: { runner: "playwright", reports: ["playwright.xml"] } } } }, [], ["junit.xml"]);

    expect({ configuration, errors, playwrightStep: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers) }).toEqual({
      configuration: { ...NONE, runners: { ...NO_RUNNERS, e2e: [{ name: "playwright", reports: [] }] } },
      errors: [{ kind: "runner-report-not-read", entry: "playwright.xml" }],
      playwrightStep: "runner",
    });
  });

  // Each variant of a report name that matches no report's file name, as the entry writes it.
  const unreadReport: Readonly<Record<string, string>> = { "a report name with a folder in it": "out/playwright.xml" };

  it.each(manifestVariants["report-names-matching-no-report-read"].variants)("[CLM-CFG-025] a specController block naming %s as the e2e runner's report, with playwright.xml read, leaves the report name out, finding its error naming it", (variant) => {
    const report = unreadReport[variant]!;

    expect(targetConfigurationFrom({ specController: { runners: { e2e: { runner: "playwright", reports: [report] } } } }, [], ["playwright.xml"])).toEqual({
      configuration: { ...NONE, runners: { ...NO_RUNNERS, e2e: [{ name: "playwright", reports: [] }] } },
      errors: [{ kind: "runner-report-not-read", entry: report }],
    });
  });

  // Each variant of a notChecks entry beside a line break, as the entry is written.
  const withALineBreak: Readonly<Record<string, string>> = {
    "a line break before it": "\nci.yml:ci:Install dependencies",
    "a line break after it": "ci.yml:ci:Install dependencies\n",
  };

  it.each(manifestVariants["line-breaks-around-a-non-check"].variants)('[CLM-CFG-016] a specController block with "ci.yml:ci:Install dependencies" with %s in notChecks leaves it out, finding its error naming the entry', (variant) => {
    const entry = withALineBreak[variant]!;
    const ciRead = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", identity: "Install dependencies", plumbing: false, writesStepRecord: false }];

    expect(targetConfigurationFrom({ specController: { notChecks: [entry] } }, ciRead, [])).toEqual({ configuration: NONE, errors: [{ kind: "not-checks-entry-not-a-step-name", entry }] });
  });
});

describe("the run will still reach its run verdict, using the configuration settings it could use", () => {
  it('[CLM-CFG-017] a specController block with "unit": 3 and "integration": "cucumber-js" under runners reaches its run verdict, cucumber-js running the integration layer', () => {
    const manifest = { specController: { runners: { unit: 3, integration: "cucumber-js" } } };
    const { configuration } = targetConfigurationFrom(manifest, [], []);
    const steps = workflowStepsFrom("ci.yml", "jobs:\n  ci:\n    steps:\n      - run: cucumber-js\n");
    const claims = executableClaimsOf([featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: s\n    Given a step\n")], {
      deferralTags: configuration.deferralTags,
      strict: false,
    });
    const passingUnitTest = { cites: [{ featureCode: "ONE", number: "001" }], result: "passed", kind: "unit", place: "one.test.ts" } as const;

    const runVerdict = runVerdictOf(claimReconciliationsOf(claims, [passingUnitTest, ...fitnessObservationsOf(disposedStepsOf(steps, configuration, {}, shellAnswers, []), [])]), []);

    expect({ manifestBreaksAt: whereManifestBreaks(manifest), runVerdict, integrationStep: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers) }).toEqual({
      manifestBreaksAt: undefined,
      runVerdict: { verdict: "balanced" },
      integrationStep: "runner",
    });
  });
});

// Each way a specController block can be other than an object, as a value.
const notAnObject: Readonly<Record<string, unknown>> = { null: null, "a number": 5, "a string": "vitest", "a list": ["vitest"] };

describe("a runners setting that is not an object is left out", () => {
  it.each(manifestVariants["runners-settings-not-objects"].variants)("[CLM-CFG-018] a specController block whose runners is %s leaves runners out, as the wrong kind", (variant) => {
    expect(targetConfigurationFrom({ specController: { runners: notAnObject[variant] } }, [], [])).toEqual({ configuration: NONE, errors: [{ kind: "configuration-wrong-kind", entry: "runners" }] });
  });
});

describe("a specController block that is not an object stops the run", () => {
  it.each(manifestVariants["spec-controller-blocks-not-objects"].variants)("[CLM-CFG-021] a specController block that is %s stops the run as a usage error: the manifest is refused at the block", (variant) => {
    expect(whereManifestBreaks({ specController: notAnObject[variant] })).toBe("$.specController");
  });
});
