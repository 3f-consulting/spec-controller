import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { textFor } from "@3f-consulting/spec-controller-core";
import { describe, expect, it } from "vitest";
import catalogue from "../messages/messages.en.json" with { type: "json" };
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import flagsVariants from "../runRequest/flags.variants.json" with { type: "json" };
import runRequestVariants from "../runRequest/runRequest.variants.json" with { type: "json" };
import { helpText } from "../runRequest/help.js";
import { main } from "./main.js";

interface Ran {
  readonly exitCode: number;
  readonly output: string;
  readonly error: string;
}

// The command line run in a folder of its own, outside git, with what it wrote to each stream.
function ran(args: readonly string[], folder = temporaryDirectory("command-line-")): Ran {
  const written = { output: "", error: "" };
  const exitCode = main(args, folder, {
    output: { fd: 1, write: (text) => (written.output += text) },
    error: { fd: 2, write: (text) => (written.error += text) },
  });
  return { exitCode, ...written };
}

const BALANCE_FLAGS = [
  "--features <dir>",
  "--vitest <report.json>",
  "--jest <report.json>",
  "--pytest <report.xml>",
  "--junit <report.xml|dir>",
  "--rspec <report.json>",
  "--cucumber <report.json>",
  "--ci <workflow.yml|dir>",
  "--ci-steps <record.json>",
  "--package-json <path>",
  "--target <name>",
  "--source-sha <sha>",
  "--format <fmt>[:<path>]",
  "--strict",
  "--exit-zero",
  "-h, --help",
];

// A line holding the flag, then at least two spaces, then its description.
const FLAG_BESIDE_ITS_DESCRIPTION = { "--strict": /^\s+--strict\s{2,}\S/, "--exit-zero": /^\s+--exit-zero\s{2,}\S/ };

// The flags help lists, each at the start of a line of its own with what its value is.
const flagsListed = (help: string): string[] => help.split("\n").flatMap((line) => /^\s+((?:-h, )?--[a-z-]+(?: \S+)?)/.exec(line)?.[1] ?? []);

// Each way of asking for the commands, as the arguments after spec-controller.
const ASKING_FOR_THE_COMMANDS: Readonly<Record<string, readonly string[]>> = {
  "spec-controller --help": ["--help"],
  "spec-controller help": ["help"],
  "spec-controller alone": [],
};

describe("asking for help shows what can be asked for", () => {
  it.each(runRequestVariants["CLM-CLI-115"].variants)("[CLM-CLI-115] a command line had balance %s: when it is read, help will list balance's flags, and the run will succeed", (asked) => {
    const { exitCode, output } = ran(["balance", asked]);

    expect({ exitCode, heading: output.split("\n").slice(0, 3), flags: flagsListed(output) }).toEqual({
      exitCode: 0,
      heading: [catalogue["help-balance-usage"], "", catalogue["help-flags"]],
      flags: BALANCE_FLAGS,
    });
  });

  it("[CLM-CLI-117] a command line had allocate --help: when it is read, help will list the feature code it takes and its flags, and the run will succeed", () => {
    const { exitCode, output } = ran(["allocate", "--help"]);

    expect({ exitCode, takesAFeatureCode: output.includes("allocate <feature code>"), flags: flagsListed(output) }).toEqual({
      exitCode: 0,
      takesAFeatureCode: true,
      flags: ["--new", "-h, --help"],
    });
  });

  it.each(runRequestVariants["CLM-CLI-118"].variants)("[CLM-CLI-118] a command line had %s: when it is read, help will list the commands, and the run will succeed", (asked) => {
    const args = ASKING_FOR_THE_COMMANDS[asked];
    if (args === undefined) throw new Error(`no command line for the variant ${asked}`);

    const { exitCode, output } = ran(args);

    const lines = output.split("\n");

    expect({ exitCode, heading: lines.slice(0, 3), commands: lines.flatMap((line) => /^\s+(balance|allocate)\s{2,}(\S.*)$/.exec(line)?.slice(1) ?? []) }).toEqual({
      exitCode: 0,
      heading: [catalogue["help-usage"], "", catalogue["help-commands"]],
      commands: ["balance", catalogue["command-balance"], "allocate", catalogue["command-allocate"]],
    });
  });

  it("[CLM-CLI-189] balance took the flags --strict and --exit-zero: when its help is shown, each flag will be on a line of its own, followed by its description", () => {
    const lines = ran(["balance", "--help"]).output.split("\n");

    expect(Object.values(FLAG_BESIDE_ITS_DESCRIPTION).map((flagLine) => lines.filter((line) => flagLine.test(line)).length)).toEqual([1, 1]);
  });
});

describe("a command reads each argument as what it is, or refuses it", () => {
  it.each([
    ["CLM-CLI-125", "a command the tool does not have", ["frobnicate"], ["frobnicate", "[unknown-command]"]],
    ["CLM-CLI-126", "a flag the command does not take", ["balance", "--bogus"], ["--bogus", "[unknown-flag]"]],
    ["CLM-CLI-127", "a flag that takes a value, given none", ["balance", "--features"], ["--features", "[missing-value]"]],
    ["CLM-CLI-128", "a value given to a flag that takes none", ["balance", "--strict", "yes"], ["--strict", "yes", "[unwanted-value]"]],
    ["CLM-CLI-129", "an argument that is no flag and no value", ["balance", "stray"], ["stray", "[stray-argument]"]],
    ["CLM-CLI-130", "a flag that does not repeat, given twice", ["balance", "--target", "a", "--target", "b"], ["--target", "[repeated-flag]"]],
    ["CLM-CLI-131", "a flag and its value joined by an equals sign", ["balance", "--features=specs"], ["--features=specs", "--features specs", "[equals-form]"]],
    ["CLM-CLI-132", "a flag before the command", ["--features", "specs", "balance"], ["--features", "[flag-before-command]"]],
    ["CLM-CLI-133", "a report format the tool does not have", ["balance", "--format", "html"], ["html", "md", "json", "[unknown-format]"]],
    ["CLM-CLI-134", "no feature code given to allocate", ["allocate"], ["[no-feature-code]"]],
    ["CLM-CLI-135", "two feature codes given to allocate", ["allocate", "ABC", "DEF"], ["DEF", "[extra-argument]"]],
  ] as const)("[%s] a command line had %s: when it is read, the run will stop, give no verdict and exit 2, and it will complain, naming its facts", (_clm, _error, args, facts) => {
    const { exitCode, output, error } = ran(args);

    expect({ exitCode, output, facts: facts.filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("a usage error shows the help for what was asked for, whether or not help was asked for", () => {
  it.each([
    ["CLM-CLI-187", "a flag the command does not take, given to balance", "balance's help", ["balance", "--bogus"], "[unknown-flag]", "balance"],
    ["CLM-CLI-187", "a flag the command does not take, given to balance, and a request for help", "balance's help", ["balance", "--bogus", "--help"], "[unknown-flag]", "balance"],
    ["CLM-CLI-188", "a flag before the command", "the commands", ["--features", "specs", "balance"], "[flag-before-command]", undefined],
    ["CLM-CLI-114", "a command the tool does not have, and a request for help after it", "the commands", ["frobnicate", "--help"], "[unknown-command]", undefined],
  ] as const)("[%s] a command line had %s: when it is read, the complaint will be followed by %s, and it will exit 2", (_clm, _given, _help, args, refusal, about) => {
    const { exitCode, output, error } = ran(args);

    expect({ exitCode, output, complaintThenHelp: error.indexOf(refusal) >= 0 && error.endsWith(helpText(about)) && error.indexOf(refusal) < error.indexOf(helpText(about)) }).toEqual({
      exitCode: 2,
      output: "",
      complaintThenHelp: true,
    });
  });
});

describe("an error will be shown with its error code", () => {
  it("[CLM-ERC-001] balance did not take --colour: when a command line with --colour is read, it will show the error code unknown-flag, once", () => {
    expect(ran(["balance", "--colour"]).error.split("[unknown-flag]").length - 1).toBe(1);
  });
});

// A folder holding the files each input names, outside git.
function folderWith(files: Readonly<Record<string, string>>): string {
  const folder = temporaryDirectory("inputs-");
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true });
    writeFileSync(join(folder, path), contents);
  }
  return folder;
}

const VITEST_SHAPED = '{"testResults":[]}';

// A fact as the complaint shows it, each {code} in it the catalogue's text for that code.
const CATALOGUE_CODE = /\{([a-z-]+)\}/g;
const shown = (fact: string): string => fact.replace(CATALOGUE_CODE, (_code: string, code: string) => textFor(catalogue, code));

describe("a well-formed JUnit evidence report will be read, not refused", () => {
  it("[CLM-OBS-150] JUnit evidence reports were written well formed, as Maven Surefire writes them, a suite to a file beside its text summary: an Evidence Observation will be posted for each of their tests", () => {
    const suite = (name: string, test: string): string =>
      `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="example.${name}" tests="1" errors="0" skipped="0" failures="0">\n  <testcase name="${test}" classname="example.${name}" time="0.001"/>\n</testsuite>\n`;
    const folder = folderWith({
      "surefire-reports/TEST-example.AddsTest.xml": suite("AddsTest", "[CLM-ONE-001] adds one"),
      "surefire-reports/TEST-example.SubtractsTest.xml": suite("SubtractsTest", "[CLM-ONE-002] subtracts one"),
      "surefire-reports/example.AddsTest.txt": "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0\n",
    });

    const { exitCode, output } = ran(["balance", "--junit", "surefire-reports", "--format", "json"], folder);

    expect({ stopped: exitCode === 2, posted: ["adds one", "subtracts one"].filter((test) => output.includes(test)) }).toEqual({ stopped: false, posted: ["adds one", "subtracts one"] });
  });
});

describe("balance reads the feature corpus in path order", () => {
  it("[CLM-OBL-035] a corpus holding b.feature and a/x.feature: the report lists the claims of a/x.feature before those of b.feature", () => {
    const folder = folderWith({
      "features/b.feature": "@BBB\nFeature: b\n\n  @unit @CLM-BBB-001\n  Scenario: b\n",
      "features/a/x.feature": "@AAA\nFeature: x\n\n  @unit @CLM-AAA-001\n  Scenario: x\n",
    });

    const { output } = ran(["balance", "--format", "json"], folder);

    expect((JSON.parse(output) as { claimReconciliations: { claim: { file: string } }[] }).claimReconciliations.map(({ claim }) => claim.file)).toEqual(["a/x.feature", "b.feature"]);
  });
});

const BY_FILE_PASSING = '{"testResults":[{"name":"/work/one.test.ts","status":"passed","message":"","assertionResults":[{"title":"[CLM-ONE-001] one","fullName":"[CLM-ONE-001] one","status":"passed","ancestorTitles":[],"failureMessages":[]}]}]}';
const RSPEC_PASSING = '{"examples":[{"id":"./spec/one_spec.rb[1:1]","description":"[CLM-ONE-001] one","full_description":"[CLM-ONE-001] one","status":"passed","file_path":"./spec/one_spec.rb","line_number":1}],"summary":{}}';
const CUCUMBER_PASSING =
  '[{"uri":"features/one.feature","name":"one","elements":[{"keyword":"Scenario","name":"one","type":"scenario","line":5,"tags":[{"name":"@unit"},{"name":"@CLM-ONE-001"}],"steps":[{"keyword":"Given ","name":"one","result":{"status":"passed"}}]}]}]';

interface ClaimsReported {
  readonly claimReconciliations: readonly { readonly qualityCheckReconciliations: readonly { readonly observation?: { readonly result: string } }[] }[];
}

// Each runner's flag, with a report of one passing result citing the corpus's one claim, as that runner writes it.
const REPORT_OF: Readonly<Record<string, string>> = { "--vitest": BY_FILE_PASSING, "--jest": BY_FILE_PASSING, "--rspec": RSPEC_PASSING, "--cucumber": CUCUMBER_PASSING };

describe("a command reads each argument as what it is, or refuses it", () => {
  it.each(flagsVariants["CLM-CLI-196"].variants)("[CLM-CLI-196] a command line had %s report.json: when it is read, balance will read report.json as that runner's report", (flag) => {
    const report = REPORT_OF[flag];
    if (report === undefined) throw new Error(`no report for the variant ${flag}`);
    const folder = folderWith({ "features/one.feature": "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n", "report.json": report });

    const { output } = ran(["balance", flag, "report.json", "--format", "json"], folder);

    const { claimReconciliations } = JSON.parse(output) as ClaimsReported;
    expect(claimReconciliations.flatMap(({ qualityCheckReconciliations }) => qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [observation.result] : [])))).toEqual(["passed"]);
  });
});

describe("a command validates every input before it does its work", () => {
  it.each([
    ["CLM-CLI-147", "a named input that does not exist", {}, ["--vitest", "absent.json"], ["absent.json", "Vitest evidence report", "[input-absent]"]],
    ["CLM-CLI-147", "a named input under a path that runs through a file", { results: "not a folder\n" }, ["--vitest", "results/vitest.json"], ["{input-vitest} results/vitest.json", "[input-absent]"]],
    ["CLM-CLI-160", "a named path that is not the kind of path its flag reads", { "one.feature": "@ONE\nFeature: one\n" }, ["--features", "one.feature"], ["{input-features} one.feature is not {path-folder}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the Vitest evidence report", { "vitest/a.json": VITEST_SHAPED }, ["--vitest", "vitest"], ["{input-vitest} vitest is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the Jest evidence report", { "jest/a.json": VITEST_SHAPED }, ["--jest", "jest"], ["{input-jest} jest is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the pytest evidence report", { "pytest/a.xml": "<testsuites/>" }, ["--pytest", "pytest"], ["{input-pytest} pytest is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the RSpec evidence report", { "rspec/a.json": "{}" }, ["--rspec", "rspec"], ["{input-rspec} rspec is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the Cucumber evidence report", { "cucumber/a.json": "[]" }, ["--cucumber", "cucumber"], ["{input-cucumber} cucumber is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the CI step record", { "steps/a.json": "{}" }, ["--ci-steps", "steps"], ["{input-step-record} steps is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the manifest", { "manifest/package.json": "{}" }, ["--package-json", "manifest"], ["{input-manifest} manifest is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a device named as the CI workflows", {}, ["--ci", "/dev/null"], ["{input-workflows} /dev/null is not {path-file-or-folder}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a device named as the JUnit evidence report", {}, ["--junit", "/dev/null"], ["{input-junit} /dev/null is not {path-file-or-folder}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-148", "a JSON evidence report that does not parse", { "vitest.json": "{" }, ["--vitest", "vitest.json"], ["vitest.json", "JSON", "[input-does-not-parse]"]],
    ["CLM-CLI-186", "a JUnit evidence report that does not parse", { "junit.xml": "<testsuite" }, ["--junit", "junit.xml"], ["junit.xml", "JUnit evidence report", "[input-does-not-parse]"]],
    [
      "CLM-CLI-186",
      "a JUnit evidence report cut off before its suite closed",
      { "junit.xml": '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="example.AddsTest" tests="1">\n  <testcase name="adds one" classname="example.AddsTest"/>\n' },
      ["--junit", "junit.xml"],
      ["junit.xml", "JUnit evidence report", "Unclosed tag 'testsuite'. (2:1)", "[input-does-not-parse]"],
    ],
    ["CLM-CLI-149", "a feature file that does not parse", { "features/bad.feature": "not Gherkin\n" }, ["--features", "features"], ["bad.feature", "feature file", "[input-does-not-parse]"]],
    ["CLM-CLI-150", "a workflow that does not parse", { "workflows/ci.yml": "jobs: [\n" }, ["--ci", "workflows"], ["{input-workflow} workflows/ci.yml", "at line 2, column 1: jobs: [ ^\n", "[input-does-not-parse]"]],
    [
      "CLM-CLI-150",
      "a workflow with a step with only an id",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - id: x\n      - run: pnpm lint\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[0]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a step whose command is 42, not text",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: 42\n      - run: pnpm lint\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[0]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a step that is the text lint, not a mapping",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - lint\n      - run: pnpm lint\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[0]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a step written with nothing, not a mapping",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: pnpm lint\n      -\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[1]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a step whose command has no value",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run:\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[0]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a step whose action is 42, not text, and no command",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - uses: 42\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[0]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    ["CLM-CLI-151", "a Vitest evidence report that is not in the shape Vitest writes", { "vitest.json": '{"testResults":"none"}' }, ["--vitest", "vitest.json"], ["vitest.json", "$.testResults", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-151",
      "a Vitest evidence report with one test file in its shape, and one not",
      { "vitest.json": '{"testResults":[{"name":"/work/a.test.ts","status":"passed","message":"","assertionResults":[]},3]}' },
      ["--vitest", "vitest.json"],
      ["vitest.json", "$.testResults[1]", "[input-not-in-its-shape]"],
    ],
    [
      "CLM-CLI-151",
      "a Vitest evidence report with a test that has no failure messages",
      { "vitest.json": '{"testResults":[{"name":"/work/a.test.ts","status":"passed","message":"","assertionResults":[{"ancestorTitles":[],"title":"[CLM-ONE-001] it holds","status":"passed"}]}]}' },
      ["--vitest", "vitest.json"],
      ["vitest.json", "$.testResults[0].assertionResults[0].failureMessages", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-152", "a Cucumber evidence report that is not in the shape Cucumber writes", { "cucumber.json": '{"features":[]}' }, ["--cucumber", "cucumber.json"], ["cucumber.json", "Cucumber", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-152",
      "a Cucumber evidence report with one feature in its shape, and one not",
      { "cucumber.json": '[{"uri":"features/one.feature","elements":[]},3]' },
      ["--cucumber", "cucumber.json"],
      ["cucumber.json", "Cucumber", "$[1]", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-153", "a Jest evidence report that is not in the shape Jest writes", { "jest.json": "{}" }, ["--jest", "jest.json"], ["jest.json", "testResults", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-153",
      "a Jest evidence report with a test that has no failure messages",
      { "jest.json": '{"testResults":[{"name":"/work/a.test.js","status":"passed","message":"","assertionResults":[{"ancestorTitles":[],"title":"[CLM-ONE-001] it holds","status":"passed"}]}]}' },
      ["--jest", "jest.json"],
      ["jest.json", "$.testResults[0].assertionResults[0].failureMessages", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-154", "a pytest evidence report that is not in the shape pytest writes", { "pytest.xml": "<html/>" }, ["--pytest", "pytest.xml"], ["pytest.xml", "pytest", "[input-not-in-its-shape]"]],
    ["CLM-CLI-155", "a JUnit evidence report that is not in the shape JUnit writes", { "junit.xml": "<html/>" }, ["--junit", "junit.xml"], ["junit.xml", "JUnit", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-155",
      "a JUnit evidence report whose top is neither a suite nor the suites element",
      { "junit.xml": '<?xml version="1.0" encoding="UTF-8"?>\n<testrun name="all"><testcase name="adds one"/></testrun>\n' },
      ["--junit", "junit.xml"],
      ["junit.xml", "JUnit", "writes: $ is not", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-156", "a file in a JUnit directory that is not in the shape JUnit writes", { "junit/one.xml": "<testsuite/>", "junit/two.xml": "<html/>" }, ["--junit", "junit"], ["{input-junit-folder-file} junit/two.xml", "JUnit", "[input-not-in-its-shape]"]],
    ["CLM-CLI-157", "an RSpec evidence report that is not in the shape RSpec writes", { "rspec.json": '{"examples":3}' }, ["--rspec", "rspec.json"], ["rspec.json", "examples", "[input-not-in-its-shape]"]],
    ["CLM-CLI-157", "an RSpec evidence report whose messages are not all strings", { "rspec.json": '{"messages":["a",3],"examples":[],"summary":{}}' }, ["--rspec", "rspec.json"], ["rspec.json", "$.messages[1]", "[input-not-in-its-shape]"]],
    ["CLM-CLI-158", "a step record that is not in the shape of a record of step outcomes", { "steps.json": '{"test":"passed"}' }, ["--ci-steps", "steps.json"], ["steps.json", "step outcomes", "$.test", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-157",
      "an RSpec evidence report with its messages, its summary and one example in RSpec's shape, and one example not",
      { "rspec.json": '{"messages":["Run options: include {:focus=>true}"],"examples":[{"description":"adds one"},3],"summary":{}}' },
      ["--rspec", "rspec.json"],
      ["rspec.json", "$.examples[1]", "[input-not-in-its-shape]"],
    ],
    [
      "CLM-CLI-158",
      "a step record with one step's outcomes, and one step not in their shape",
      { "steps.json": '{"lint":{"outcome":"success","conclusion":"success"},"test":"passed"}' },
      ["--ci-steps", "steps.json"],
      ["steps.json", "step outcomes", "$.test", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-159", "a manifest that is not in a manifest's shape", { "package.json": "[]" }, ["--package-json", "package.json"], ["package.json", "manifest", "[input-not-in-its-shape]"]],
    ["CLM-CLI-159", "a manifest that is null", { "package.json": "null" }, ["--package-json", "package.json"], ["package.json", "manifest", "[input-not-in-its-shape]"]],
  ] as const)("[%s] the run named %s: when balance reads its inputs, the run will stop, give no verdict and exit 2, and it will complain, naming the input and what is wrong with it", (_clm, _error, files, args, facts) => {
    const { exitCode, output, error } = ran(["balance", ...args], folderWith(files));

    expect({ exitCode, output, complaints: error.trimEnd().split("\n").length, facts: facts.map(shown).filter((fact) => !error.includes(fact)) }).toEqual({
      exitCode: 2,
      output: "",
      complaints: 1,
      facts: [],
    });
  });

  it("[CLM-CLI-161] the run named a named input that the tool is not permitted to read, a Vitest evidence report: when balance reads its inputs, the run will stop, give no verdict and exit 2, and it will complain, naming the input and what is wrong with it", () => {
    const folder = folderWith({ "vitest.json": VITEST_SHAPED });
    chmodSync(join(folder, "vitest.json"), 0o000);

    const { exitCode, output, error } = ran(["balance", "--vitest", "vitest.json"], folder);

    expect({ exitCode, output, facts: ["vitest.json", "[input-not-permitted]"].filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });

  it("[CLM-CLI-161] the run named a named input that the tool is not permitted to read, a feature corpus's folder: when balance reads its inputs, the run will stop, give no verdict and exit 2, and it will complain, naming the input and what is wrong with it", () => {
    const folder = folderWith({ "features/one.feature": "@ONE\nFeature: one\n" });
    chmodSync(join(folder, "features"), 0o000);

    const { exitCode, output, error } = ran(["balance", "--features", "features"], folder);

    expect({ exitCode, output, facts: [shown("{input-features} features"), "[input-not-permitted]"].filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("an input left out takes its default", () => {
  it.each([
    ["the folder itself", ".github/workflows"],
    ["the folder that holds it", ".github"],
  ] as const)("[CLM-CLI-198] the run named no CI workflows, and the tool was not permitted to read the .github/workflows folder, closed at %s: when balance reads its inputs, the run will stop, give no verdict and exit 2, and it will complain, naming .github/workflows and that it may not read it", (_closed, path) => {
    const folder = folderWith({ ".github/workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: echo ci\n" });
    chmodSync(join(folder, path), 0o000);

    const { exitCode, output, error } = ran(["balance"], folder);

    expect({ exitCode, output, facts: [shown("{input-workflows} .github/workflows"), "[input-not-permitted]"].filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("a command validates every input before it does its work", () => {
  it("[CLM-CLI-185] the corpus had two feature files that did not parse: when balance reads it, the run will stop, give no verdict and exit 2, and it will complain, naming each file and what is wrong in it", () => {
    const folder = folderWith({ "features/one.feature": "not Gherkin\n", "features/two.feature": "@TWO\nFeature: two\n  Scenario: a\n    Given a table\n      | a | b |\n      | c |\n" });

    const { exitCode, output, error } = ran(["balance", "--features", "features"], folder);
    const complaints = error.split("\n").filter((line) => line.includes("[input-does-not-parse]"));

    expect({ exitCode, output, named: ["one.feature", "two.feature"].map((file) => complaints.filter((line) => line.includes(file) && /\(\d+:\d+\)/.test(line)).length) }).toEqual({
      exitCode: 2,
      output: "",
      named: [1, 1],
    });
  });
});
