import { describe, expect, it } from "vitest";
import { configurationSettingsNamed, type SettingsNamed } from "../inputs/commandLineSettings.js";
import commandLineSettingsVariants from "../inputs/commandLineSettings.variants.json" with { type: "json" };
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import { reportsLocatedOf, targetConfigurationOf, type ConfigurationError, type TargetConfiguration } from "./configuration.js";
import { NO_RUNNERS } from "./configuration.test-utils.js";
import { runVerdictOf } from "./evidenceReconciliation.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { disposedStepsOf, fitnessObservationsOf, stepDispositionOf } from "./postEvidenceObservation.js";
import type { CiStep } from "./workflowSteps.js";

const NONE: TargetConfiguration = { runners: NO_RUNNERS, nonChecks: [], deferralTags: [] };

// The configuration balance takes from the settings a run names, with the steps it read.
const takenFrom = (named: Partial<SettingsNamed>, steps: readonly CiStep[] = []): TargetConfiguration =>
  targetConfigurationOf(configurationSettingsNamed({ runners: {}, nonChecks: [], deferralTags: [], ...named }), steps).configuration;

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

// Install dependencies, in job ci, in ci.yml: the one step read.
const CI_READ: readonly CiStep[] = [{ workflow: "ci.yml", job: "ci", name: "Install dependencies", identity: "Install dependencies", plumbing: false, writesStepRecord: false }];

// The configuration and the errors balance finds in the settings a run names, with ci.yml read and no file at each report path given.
const checkedFrom = (named: Partial<SettingsNamed>, reportsNotFound: readonly string[] = []) =>
  targetConfigurationOf(configurationSettingsNamed({ runners: {}, nonChecks: [], deferralTags: [], ...named }), CI_READ, reportsNotFound);

describe("balance leaves out a configuration setting it cannot use, naming the error", () => {
  it.each<[string, string, Partial<SettingsNamed>, ConfigurationError]>([
    ["CLM-CFG-004", "--unit vitest:vitest, a long form with no report", { runners: { unit: ["vitest:vitest"] } }, { kind: "configuration-wrong-kind", entry: "vitest:vitest" }],
    ["CLM-CFG-015", "--not-check ci.yml:ci:No such step, with ci.yml read", { nonChecks: ["ci.yml:ci:No such step"] }, { kind: "not-checks-entry-matches-no-step", entry: "ci.yml:ci:No such step" }],
    [
      "CLM-CFG-022",
      "--not-check ci.yml:lint:Install dependencies, with ci.yml read, whose job ci had the step Install dependencies and whose job lint had none",
      { nonChecks: ["ci.yml:lint:Install dependencies"] },
      { kind: "not-checks-entry-matches-no-step", entry: "ci.yml:lint:Install dependencies" },
    ],
    ["CLM-CFG-016", "--not-check Install dependencies", { nonChecks: ["Install dependencies"] }, { kind: "not-checks-entry-not-a-step-name", entry: "Install dependencies" }],
  ])("[%s] a run named %s leaves it out, finding its error naming it", (_clm, _named, named, error) => {
    expect(checkedFrom(named)).toEqual({ configuration: NONE, errors: [error] });
  });

  // Each variant of a setting balance cannot use, as the run names it, with the value its error names.
  const cannotUse: Readonly<Record<string, readonly [Partial<SettingsNamed>, string]>> = {
    "a long form whose format is not one balance reads": [{ runners: { unit: ["vitest:tap:out/vitest.tap"] } }, "vitest:tap:out/vitest.tap"],
    "a long form with no runner": [{ runners: { e2e: [":junit:out/playwright.xml"] } }, ":junit:out/playwright.xml"],
    "a long form with an empty report": [{ runners: { unit: ["vitest:vitest:"] } }, "vitest:vitest:"],
    "an empty runner": [{ runners: { unit: [""] } }, ""],
    "an empty non-check": [{ nonChecks: [""] }, ""],
    "an empty deferral tag": [{ deferralTags: [""] }, ""],
    "a deferral tag that is @ alone": [{ deferralTags: ["@"] }, "@"],
  };

  it.each(commandLineSettingsVariants["settings-it-cannot-use"].variants)("[CLM-CFG-004] a run naming %s leaves it out, finding the error configuration-wrong-kind naming it as written", (variant) => {
    const [named, entry] = cannotUse[variant]!;

    expect(checkedFrom(named)).toEqual({ configuration: NONE, errors: [{ kind: "configuration-wrong-kind", entry }] });
  });

  // Each variant of a non-check beside a line break, as the run names it.
  const withALineBreak: Readonly<Record<string, string>> = {
    "a line break before it": "\nci.yml:ci:Install dependencies",
    "a line break after it": "ci.yml:ci:Install dependencies\n",
  };

  it.each(commandLineSettingsVariants["line-breaks-around-a-non-check"].variants)("[CLM-CFG-016] a run named --not-check ci.yml:ci:Install dependencies with %s leaves it out, finding its error naming the non-check", (variant) => {
    const entry = withALineBreak[variant]!;

    expect(checkedFrom({ nonChecks: [entry] })).toEqual({ configuration: NONE, errors: [{ kind: "not-checks-entry-not-a-step-name", entry }] });
  });
});

// The configuration and the errors balance finds for a run naming one unit runner, with the steps of ci.yml as given and no file at each report path given.
const locatedFrom = (runner: string, ciYml: string, reportsNotFound: readonly string[]) => {
  const steps = workflowStepsFrom("ci.yml", ciYml);
  const settings = reportsLocatedOf(configurationSettingsNamed({ runners: { unit: [runner] }, nonChecks: [], deferralTags: [] }), steps, {}, shellAnswers.reportsNamed);
  return targetConfigurationOf(settings, steps, reportsNotFound);
};

describe("balance reads no evidence report for a runner whose report it cannot find, naming the error", () => {
  it.each<[string, string, string, string, readonly string[], ConfigurationError]>([
    [
      "CLM-CFG-025",
      "playwright, with out/playwright.xml as its JUnit evidence report, and no file at out/playwright.xml",
      "playwright:junit:out/playwright.xml",
      "jobs:\n  ci:\n    steps:\n      - run: playwright test\n",
      ["out/playwright.xml"],
      { kind: "runner-report-not-read", entry: "out/playwright.xml" },
    ],
    [
      "CLM-CFG-027",
      "vitest, where a step ran vitest run --reporter=json --outputFile=out/vitest.json, and no file was at out/vitest.json",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=out/vitest.json\n",
      ["out/vitest.json"],
      { kind: "runner-report-not-read", entry: "out/vitest.json" },
    ],
    [
      "CLM-CFG-027",
      "vitest, where a step of another job wrote out/vitest.json, which the run did not download to the same path",
      "vitest",
      "jobs:\n  test:\n    steps:\n      - run: vitest run --reporter=json --outputFile=out/vitest.json\n  balance:\n    steps:\n      - run: spec-controller balance --unit vitest\n",
      ["out/vitest.json"],
      { kind: "runner-report-not-read", entry: "out/vitest.json" },
    ],
    [
      "CLM-CFG-028",
      "my-tool, a runner balance does not know, where a step ran my-tool",
      "my-tool",
      "jobs:\n  ci:\n    steps:\n      - run: my-tool --reporter=json --outputFile=out/my-tool.json\n",
      [],
      { kind: "runner-report-not-named", entry: "my-tool" },
    ],
    ["CLM-CFG-029", "vitest, where a step ran vitest run, naming no report", "vitest", "jobs:\n  ci:\n    steps:\n      - run: vitest run\n", [], { kind: "runner-report-not-named", entry: "vitest" }],
    [
      "CLM-CFG-029",
      "vitest, where a step ran vitest run, its report named only in vitest.config.ts",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - run: vitest run --config vitest.config.ts\n",
      [],
      { kind: "runner-report-not-named", entry: "vitest" },
    ],
    [
      "CLM-CFG-029",
      "vitest, where a step ran vitest run --reporter=json --outputFile=${{ env.OUT }}/vitest.json",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=${{ env.OUT }}/vitest.json\n",
      [],
      { kind: "runner-report-not-named", entry: "vitest" },
    ],
    [
      "CLM-CFG-029",
      "vitest, where a step ran vitest run --outputFile=out/vitest.json, naming no reporter",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - run: vitest run --outputFile=out/vitest.json\n",
      [],
      { kind: "runner-report-not-named", entry: "vitest" },
    ],
    [
      "CLM-CFG-029",
      "vitest, where a step ran vitest run --reporter=json --outputFile=, naming an empty path",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=\n",
      [],
      { kind: "runner-report-not-named", entry: "vitest" },
    ],
    [
      "CLM-CFG-030",
      "vitest, where no step ran vitest, though one wrote out/vitest.json",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - run: my-tool --reporter=json --outputFile=out/vitest.json\n",
      [],
      { kind: "runner-report-not-named", entry: "vitest" },
    ],
  ])("[%s] a run named %s reads no evidence report for it, finding its error naming it, and keeps the runner", (_clm, _named, runner, ciYml, reportsNotFound, error) => {
    expect(locatedFrom(runner, ciYml, reportsNotFound)).toEqual({
      configuration: { ...NONE, runners: { ...NO_RUNNERS, unit: [{ name: runner.split(":")[0] }] } },
      errors: [error],
    });
  });
});

describe("the run will still reach its run verdict, using the configuration settings it could use", () => {
  it("[CLM-CFG-017] a run named --unit vitest:vitest and --integration cucumber-js reaches its run verdict, cucumber-js running the integration layer", () => {
    const steps = workflowStepsFrom("ci.yml", "jobs:\n  ci:\n    steps:\n      - run: cucumber-js\n");
    const configuration = takenFrom({ runners: { unit: ["vitest:vitest"], integration: ["cucumber-js"] } }, steps);
    const claims = executableClaimsOf([featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: s\n    Given a step\n")], {
      deferralTags: configuration.deferralTags,
      strict: false,
    });
    const passingUnitTest = { cites: [{ featureCode: "ONE", number: "001" }], result: "passed", kind: "unit", place: "one.test.ts" } as const;

    const runVerdict = runVerdictOf(claimReconciliationsOf(claims, [passingUnitTest, ...fitnessObservationsOf(disposedStepsOf(steps, configuration, {}, shellAnswers, []), [])]), []);

    expect({ runVerdict, integrationStep: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers) }).toEqual({
      runVerdict: { verdict: "balanced" },
      integrationStep: "runner",
    });
  });
});
