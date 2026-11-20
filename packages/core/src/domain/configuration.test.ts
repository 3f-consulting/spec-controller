import { describe, expect, it } from "vitest";
import { configurationSettingsNamed, type SettingsNamed } from "../inputs/commandLineSettings.js";
import commandLineSettingsVariants from "../inputs/commandLineSettings.variants.json" with { type: "json" };
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import runnersVariants from "../inputs/runners.variants.json" with { type: "json" };
import { settingsFileEntriesFrom, settingsMerged, settingsNamedOf, type SettingsGiven } from "../inputs/settingsFile.js";
import settingsFileVariants from "../inputs/settingsFile.variants.json" with { type: "json" };
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import { layersOfReportAt, reportsLocatedOf, runnersFoundOf, targetConfigurationOf, type ConfigurationError, type TargetConfiguration } from "./configuration.js";
import { NO_RUNNERS } from "./configuration.test-utils.js";
import { runVerdictOf } from "./evidenceReconciliation.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { stepDispositionOf } from "./postEvidenceObservation.js";
import type { CiStep } from "./workflowSteps.js";

const NONE: TargetConfiguration = { runners: NO_RUNNERS, nonChecks: [], deferralTags: [] };

// The configuration balance takes from the settings a run names, with the steps it read.
const takenFrom = (named: Partial<SettingsNamed>, steps: readonly CiStep[] = []): TargetConfiguration =>
  targetConfigurationOf(configurationSettingsNamed({ runners: {}, nonChecks: [], deferralTags: [], ...named }), steps).configuration;

// The settings balance takes from a settings file holding the YAML text given.
const settingsFrom = (yaml: string): SettingsGiven => settingsMerged(settingsFileEntriesFrom(yaml)).settings;

describe("balance takes each entry of the settings file as the command-line setting of the same name", () => {
  it("[CLM-CFG-031] a settings file that had unit: [vitest] is taken as vitest as the unit layer's runner", () => {
    const { configuration } = targetConfigurationOf(configurationSettingsNamed(settingsNamedOf(settingsFrom("unit: [vitest]\n"))), []);

    expect(configuration).toEqual({ ...NONE, runners: { ...NO_RUNNERS, unit: [{ name: "vitest" }] } });
  });

  it("[CLM-CFG-032] a settings file that had written-claims-only: true is taken as a run verdict that counts only the executable claims", () => {
    const settings = settingsFrom("written-claims-only: true\n");
    const claims = executableClaimsOf([featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: s\n    Given a step\n")], { deferralTags: [], strict: false });
    const passingTestCiting = (number: string) => ({ cites: [{ featureCode: "ONE", number }], result: "passed", kind: "unit", place: "one.test.ts" }) as const;
    // ONE-002 names no scenario, so its passing test is filed on a phantom claim.
    const claimReconciliations = claimReconciliationsOf(claims, [passingTestCiting("001"), passingTestCiting("002")]);

    expect(runVerdictOf(claimReconciliations, [], [], settings.on.includes("written-claims-only"))).toEqual({ verdict: "balanced" });
  });

  it.each([...settingsFileVariants["list-settings"].variants])("[CLM-CFG-031] a settings file that had %s: [one, two] is taken as that setting given one, then two, on the command line", (name) => {
    expect(settingsFrom(`${name}: [one, two]\n`)).toEqual({ values: { [name]: ["one", "two"] }, on: [] });
  });

  it.each([...settingsFileVariants["one-value-settings"].variants])("[CLM-CFG-031] a settings file that had %s: one is taken as that setting given one on the command line", (name) => {
    expect(settingsFrom(`${name}: one\n`)).toEqual({ values: { [name]: ["one"] }, on: [] });
  });

  it.each([...settingsFileVariants["no-value-settings"].variants])("[CLM-CFG-032] a settings file that had %s: true is taken as that setting given on the command line", (name) => {
    expect(settingsFrom(`${name}: true\n`)).toEqual({ values: {}, on: [name] });
  });
});

describe("a setting the command line gives replaces the settings file's setting of the same name", () => {
  it("[CLM-CFG-033] a runner the command line names replaces the settings file's runners for that layer alone", () => {
    const entries = settingsFileEntriesFrom("unit: [vitest]\ne2e: [playwright:junit:out/e2e.xml]\n");
    const { settings } = settingsMerged(entries, { values: { unit: ["pytest"] }, on: [] });
    const { configuration } = targetConfigurationOf(configurationSettingsNamed(settingsNamedOf(settings)), []);

    expect(configuration).toEqual({
      ...NONE,
      runners: { ...NO_RUNNERS, unit: [{ name: "pytest" }], e2e: [{ name: "playwright", report: { path: "out/e2e.xml", format: "junit" } }] },
    });
  });
});

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

// The runners balance takes for each layer when ci.yml's job ci had a step named Test running the command given, and the run named the settings given.
function runnersTakenFrom(command: string, named: Partial<SettingsNamed> = {}, scripts: Readonly<Record<string, string>> = {}): TargetConfiguration["runners"] {
  const steps = workflowStepsFrom("ci.yml", `jobs:\n  ci:\n    steps:\n      - name: Test\n        run: ${command}\n`);
  const settings = configurationSettingsNamed({ runners: {}, nonChecks: [], deferralTags: [], ...named });
  return targetConfigurationOf(runnersFoundOf(settings, steps, scripts, shellAnswers), steps).configuration.runners;
}

describe("balance finds a runner it knows in a workflow, at its usual layer", () => {
  it.each<[string, Readonly<Record<string, string>>]>([
    ["vitest run", {}],
    ["pnpm test", { test: "vitest run" }],
    ["CI=1 npx vitest run", {}],
  ])("[CLM-CFG-036] a workflow that had a step running %s, with a run that named no runner, takes vitest as the unit layer's runner", (command, scripts) => {
    expect(runnersTakenFrom(command, {}, scripts)).toEqual({ ...NO_RUNNERS, unit: [{ name: "vitest", found: true }] });
  });

  it.each([...runnersVariants["usual-layers"].variants])("[CLM-CFG-036] a workflow that had a step running $runner, with a run that named no runner, takes $runner as a runner", ({ runner }) => {
    expect(Object.values(runnersTakenFrom(runner)).flat()).toEqual([{ name: runner, found: true }]);
  });

  it.each<[string, string, string, Partial<SettingsNamed>, TargetConfiguration["runners"]]>([
    ["CLM-CFG-037", "cucumber-js", "no runner", {}, { ...NO_RUNNERS, integration: [{ name: "cucumber-js", found: true }] }],
    ["CLM-CFG-038", "vitest run", "pytest as the unit runner", { runners: { unit: ["pytest"] } }, { ...NO_RUNNERS, unit: [{ name: "pytest" }] }],
    ["CLM-CFG-039", "playwright test", "pytest as the unit runner", { runners: { unit: ["pytest"] } }, { ...NO_RUNNERS, unit: [{ name: "pytest" }], e2e: [{ name: "playwright", found: true }] }],
    ["CLM-CFG-040", "cucumber-js", "cucumber-js as the e2e runner", { runners: { e2e: ["cucumber-js"] } }, { ...NO_RUNNERS, e2e: [{ name: "cucumber-js" }] }],
    ["CLM-CFG-041", "vitest run", "that step as a non-check", { nonChecks: ["ci.yml:ci:Test"] }, NO_RUNNERS],
    ["CLM-CFG-042", "vitest run", "vitest:vitest as the unit runner, left out", { runners: { unit: ["vitest:vitest"] } }, { ...NO_RUNNERS, unit: [{ name: "vitest", found: true }] }],
    ["CLM-CFG-043", "my-tool test", "no runner", {}, NO_RUNNERS],
  ])("[%s] a workflow that had a step running %s, with a run that named %s, gives each layer the runners balance takes", (_clm, command, _named, named, runners) => {
    expect(runnersTakenFrom(command, named)).toEqual(runners);
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

describe("balance leaves out an entry of the settings file it cannot use, naming the error", () => {
  // A settings file holding the one entry given gives no setting, and an error of the kind given naming the entry's key.
  const expectLeftOut = (entry: string, kind: ConfigurationError["kind"]) =>
    expect(settingsMerged(settingsFileEntriesFrom(`${entry}\n`))).toEqual({
      settings: { values: {}, on: [] },
      errors: [{ kind, entry: entry.slice(0, entry.indexOf(":")) }],
    });

  it.each<[string, string, ConfigurationError["kind"]]>([
    ["CLM-CFG-034", "unitt: [vitest]", "configuration-unknown-key"],
    ["CLM-CFG-035", "unit: vitest", "configuration-wrong-kind"],
  ])("[%s] a settings file that had %s leaves it out, finding the error %s naming its key", (_clm, entry, kind) => {
    expectLeftOut(entry, kind);
  });

  it.each([...settingsFileVariants["keys-that-name-no-setting"].variants])("[CLM-CFG-034] a settings file that had %s leaves it out, finding the error configuration-unknown-key naming its key", (entry) => {
    expectLeftOut(entry, "configuration-unknown-key");
  });

  it.each([...settingsFileVariants["values-of-the-wrong-kind"].variants])("[CLM-CFG-035] a settings file that had %s leaves it out, finding the error configuration-wrong-kind naming its key", (entry) => {
    expectLeftOut(entry, "configuration-wrong-kind");
  });
});

// The configuration and the errors balance finds for a run naming one unit runner, with the steps of ci.yml as given and no file at each report path given.
const locatedFrom = (runner: string, ciYml: string, reportsNotFound: readonly string[]) => {
  const steps = workflowStepsFrom("ci.yml", ciYml);
  const settings = reportsLocatedOf(configurationSettingsNamed({ runners: { unit: [runner] }, nonChecks: [], deferralTags: [] }), steps, {}, shellAnswers.reportsNamed, shellAnswers.defaultReportsOf);
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
      "CLM-CFG-027",
      "cucumber-js, where a step ran cucumber-js -f progress --format json:out/cucumber.json, and no file was at out/cucumber.json",
      "cucumber-js",
      "jobs:\n  ci:\n    steps:\n      - run: cucumber-js -f progress --format json:out/cucumber.json\n",
      ["out/cucumber.json"],
      { kind: "runner-report-not-read", entry: "out/cucumber.json" },
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
      "vitest, where a step in the working directory ${{ matrix.pkg }} ran vitest run --reporter=json --outputFile=out/vitest.json",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=out/vitest.json\n        working-directory: ${{ matrix.pkg }}\n",
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
      "vitest, where no step ran vitest, though one wrote out/vitest.json and another ran an action",
      "vitest",
      "jobs:\n  ci:\n    steps:\n      - uses: actions/checkout@v4\n      - run: my-tool --reporter=json --outputFile=out/vitest.json\n",
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

describe("balance reads the evidence report a named runner's CI step writes, in that runner's format", () => {
  it.each([
    ["out/vitest.json", "web/out/vitest.json"],
    ["/work/out/vitest.json", "/work/out/vitest.json"],
  ])("[CLM-CLI-215] a run named vitest, where a step in the working directory web wrote %s, locates its report at %s", (written, located) => {
    const steps = workflowStepsFrom("ci.yml", `jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=${written}\n        working-directory: web\n`);
    const { runners } = reportsLocatedOf(configurationSettingsNamed({ runners: { unit: ["vitest"] }, nonChecks: [], deferralTags: [] }), steps, {}, shellAnswers.reportsNamed, shellAnswers.defaultReportsOf);
    expect(runners).toEqual([{ taken: ["unit", { name: "vitest", report: { path: located, format: "vitest" } }] }]);
  });
});

// A runner that also writes to out/default.json by default, so the order between a step's own report and the default shows.
const writesByDefault = (commandLine: string, runner: string, scripts: Readonly<Record<string, string>>) =>
  shellAnswers.invokesAsCommand(commandLine, runner, scripts) ? [{ path: "out/default.json", format: "vitest" }] : [];

describe("balance reads a named runner's evidence reports from where the runner writes them by default, when its step names none", () => {
  it.each<[string, string, readonly string[], string]>([
    ["mvn test", "mvn test, in the working directory web", ["web/target/surefire-reports"], "jobs:\n  ci:\n    steps:\n      - run: mvn test\n        working-directory: web\n"],
    ["mvn test", "mvn test, in the working directory ${{ matrix.pkg }}", [], "jobs:\n  ci:\n    steps:\n      - run: mvn test\n        working-directory: ${{ matrix.pkg }}\n"],
  ])("[CLM-CLI-216] a run named %s, where a step ran %s, locates its reports at %j", (runner, _ran, located, ciYml) => {
    const steps = workflowStepsFrom("ci.yml", ciYml);
    const { runners } = reportsLocatedOf(configurationSettingsNamed({ runners: { unit: [runner] }, nonChecks: [], deferralTags: [] }), steps, {}, shellAnswers.reportsNamed, shellAnswers.defaultReportsOf);
    expect(runners).toEqual(located.length === 0 ? [{ taken: ["unit", { name: runner }] }] : located.map((path) => ({ taken: ["unit", { name: runner, report: { path, format: "junit" } }] })));
  });

  it.each<[string, readonly string[], string]>([
    ["vitest run", ["out/default.json"], "jobs:\n  ci:\n    steps:\n      - run: vitest run\n"],
    [
      "vitest run --reporter=json --outputFile=out/vitest.json, and another vitest run",
      ["out/vitest.json"],
      "jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=out/vitest.json\n      - run: vitest run\n",
    ],
  ])("[CLM-CLI-216] a run named a runner that writes by default to out/default.json, where steps ran %s, locates its reports at %j", (_ran, located, ciYml) => {
    const steps = workflowStepsFrom("ci.yml", ciYml);
    const { runners } = reportsLocatedOf(configurationSettingsNamed({ runners: { unit: ["vitest"] }, nonChecks: [], deferralTags: [] }), steps, {}, shellAnswers.reportsNamed, writesByDefault);
    expect(runners).toEqual(located.map((path) => ({ taken: ["unit", { name: "vitest", report: { path, format: "vitest" } }] })));
  });
});

describe("balance still uses the configuration settings it can use beside one it cannot", () => {
  it("[CLM-CFG-017] a run named --unit vitest:vitest and --integration cucumber-js has cucumber-js run the integration layer", () => {
    const steps = workflowStepsFrom("ci.yml", "jobs:\n  ci:\n    steps:\n      - run: cucumber-js\n");
    const configuration = takenFrom({ runners: { unit: ["vitest:vitest"], integration: ["cucumber-js"] } }, steps);

    expect(stepDispositionOf(steps[0]!, configuration, {}, shellAnswers)).toBe("runner");
  });
});

describe("balance reads the evidence report the run names for a runner, at that path, as that runner's layer's evidence", () => {
  it.each<[string, string, readonly string[], Partial<SettingsNamed>, string]>([
    ["playwright:junit:out/playwright.xml as the e2e runner", "out/playwright.xml", ["e2e"], { runners: { e2e: ["playwright:junit:out/playwright.xml"] } }, ""],
    ["playwright:junit:out/playwright.xml as the e2e runner", "out/other.xml", [], { runners: { e2e: ["playwright:junit:out/playwright.xml"] } }, ""],
    [
      "cucumber-js:cucumber:out/cucumber.json as the e2e runner, then as the integration runner",
      "out/cucumber.json",
      ["e2e", "integration"],
      { runners: { e2e: ["cucumber-js:cucumber:out/cucumber.json"], integration: ["cucumber-js:cucumber:out/cucumber.json"] } },
      "",
    ],
    ["no runner, where a step ran vitest run --reporter=json --outputFile=out/vitest.json", "out/vitest.json", ["unit"], {}, "vitest run --reporter=json --outputFile=out/vitest.json"],
  ])("[CLM-CLI-212] a run that named %s reads a report at %s as the evidence of the layers %j", (_named, path, layers, named, command) => {
    const steps = command === "" ? [] : workflowStepsFrom("ci.yml", `jobs:\n  ci:\n    steps:\n      - run: ${command}\n`);
    const runners = runnersFoundOf(configurationSettingsNamed({ runners: {}, nonChecks: [], deferralTags: [], ...named }), steps, {}, shellAnswers);
    const settings = reportsLocatedOf(runners, steps, {}, shellAnswers.reportsNamed, shellAnswers.defaultReportsOf);

    expect(layersOfReportAt(settings, path)).toEqual(layers);
  });
});
