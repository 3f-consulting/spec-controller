import { chmodSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
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
  "--features",
  "--vitest",
  "--jest",
  "--pytest",
  "--junit",
  "--rspec",
  "--cucumber",
  "--ci",
  "--ci-steps",
  "--package-json",
  "--target",
  "--source-sha",
  "--format",
  "--strict",
  "--exit-zero",
  "--help",
];

// A line holding the flag, then at least two spaces, then its description.
const FLAG_BESIDE_ITS_DESCRIPTION = { "--strict": /^\s+--strict\s{2,}\S/, "--exit-zero": /^\s+--exit-zero\s{2,}\S/ };

// The flags help lists, each at the start of a line of its own.
const flagsListed = (help: string): string[] => help.split("\n").flatMap((line) => /^\s+(-h, )?(--[a-z-]+)/.exec(line)?.[2] ?? []);

describe("help will list what you can ask for", () => {
  it.each([
    ["CLM-CLI-115", ["balance", "--help"]],
    ["CLM-CLI-116", ["balance", "-h"]],
  ] as const)("[%s] %j lists balance's flags, and the run succeeds", (_clm, args) => {
    const { exitCode, output } = ran(args);

    expect({ exitCode, flags: flagsListed(output) }).toEqual({ exitCode: 0, flags: BALANCE_FLAGS });
  });

  it("[CLM-CLI-117] allocate --help lists the feature code it takes and its flags, and the run succeeds", () => {
    const { exitCode, output } = ran(["allocate", "--help"]);

    expect({ exitCode, takesAFeatureCode: output.includes("allocate <feature code>"), flags: flagsListed(output) }).toEqual({
      exitCode: 0,
      takesAFeatureCode: true,
      flags: ["--new", "--help"],
    });
  });

  it.each([
    ["CLM-CLI-118", ["--help"]],
    ["CLM-CLI-119", ["help"]],
    ["CLM-CLI-120", []],
  ] as const)("[%s] %j lists the commands, and the run succeeds", (_clm, args) => {
    const { exitCode, output } = ran(args);

    expect({ exitCode, commands: output.split("\n").flatMap((line) => /^\s+(balance|allocate)\s/.exec(line)?.[1] ?? []) }).toEqual({
      exitCode: 0,
      commands: ["balance", "allocate"],
    });
  });
});

describe("a command's help gives each flag it takes beside what the flag does", () => {
  it("[CLM-CLI-189] --strict and --exit-zero are each on a line of their own, followed by its description", () => {
    const lines = ran(["balance", "--help"]).output.split("\n");

    expect(Object.values(FLAG_BESIDE_ITS_DESCRIPTION).map((flagLine) => lines.filter((line) => flagLine.test(line)).length)).toEqual([1, 1]);
  });
});

describe("help will answer, and nothing will run", () => {
  it.each([
    ["CLM-CLI-112", "a request for help beside an argument that fails validation", ["balance", "--features", "absent", "--bogus", "--help"], "--features"],
    ["CLM-CLI-113", "allocate's help beside a flag allocate does not take", ["allocate", "ABC", "--vitest", "--help"], "--new"],
  ] as const)("[%s] %s: help answers, it exits 0, and nothing runs or is written", (_clm, _given, args, aFlagListed) => {
    const folder = temporaryDirectory("help-first-");

    const { exitCode, output, error } = ran(args, folder);

    expect({ exitCode, helped: flagsListed(output).includes(aFlagListed), error, written: readdirSync(folder) }).toEqual({
      exitCode: 0,
      helped: true,
      error: "",
      written: [],
    });
  });

  it("[CLM-CLI-114] help after a command the tool does not have will not answer: it exits 2", () => {
    const { exitCode, output, error } = ran(["frobnicate", "--help"]);

    expect({ exitCode, output, unknownCommand: error.includes("[unknown-command]") }).toEqual({ exitCode: 2, output: "", unknownCommand: true });
  });
});

describe("an argument the tool does not accept will stop the run", () => {
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
  ] as const)("[%s] %s: no verdict, exit 2, and a complaint with its facts", (_clm, _error, args, facts) => {
    const { exitCode, output, error } = ran(args);

    expect({ exitCode, output, facts: facts.filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("a refusal points to the help that lists what was allowed", () => {
  it.each([
    ["CLM-CLI-187", "a flag balance does not take", ["balance", "--bogus"], "spec-controller balance --help"],
    ["CLM-CLI-188", "a flag before the command", ["--features", "specs", "balance"], "spec-controller --help"],
  ] as const)("[%s] %s: the complaint ends by pointing to its help", (_clm, _given, args, help) => {
    expect(ran(args).error.trimEnd().endsWith(help)).toBe(true);
  });
});

describe("an error will be shown with its error code", () => {
  it("[CLM-ERC-001] a flag the command does not take is shown with the error code unknown-flag, once", () => {
    expect(ran(["balance", "--bogus"]).error.split("[unknown-flag]").length - 1).toBe(1);
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

describe("an input that is not valid will stop the run", () => {
  it.each([
    ["CLM-CLI-147", "a named input that does not exist", {}, ["--vitest", "absent.json"], ["absent.json", "Vitest evidence report", "[input-absent]"]],
    ["CLM-CLI-160", "a named path that is not the kind of path its flag reads", { "one.feature": "@ONE\nFeature: one\n" }, ["--features", "one.feature"], ["one.feature", "feature corpus", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-148", "a JSON evidence report that does not parse", { "vitest.json": "{" }, ["--vitest", "vitest.json"], ["vitest.json", "JSON", "[input-does-not-parse]"]],
    ["CLM-CLI-186", "a JUnit evidence report that does not parse", { "junit.xml": "<testsuite" }, ["--junit", "junit.xml"], ["junit.xml", "JUnit evidence report", "[input-does-not-parse]"]],
    ["CLM-CLI-149", "a feature file that does not parse", { "features/bad.feature": "not Gherkin\n" }, ["--features", "features"], ["bad.feature", "feature file", "[input-does-not-parse]"]],
    ["CLM-CLI-150", "a workflow that does not parse", { "workflows/ci.yml": "jobs: [\n" }, ["--ci", "workflows"], ["ci.yml", "workflow", "[input-does-not-parse]"]],
    ["CLM-CLI-151", "a Vitest evidence report not in Vitest's shape", { "vitest.json": '{"testResults":"none"}' }, ["--vitest", "vitest.json"], ["vitest.json", "testResults", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-151",
      "a Vitest evidence report with one test file in its shape, and one not",
      { "vitest.json": '{"testResults":[{"name":"/work/a.test.ts","status":"passed","message":"","assertionResults":[]},3]}' },
      ["--vitest", "vitest.json"],
      ["vitest.json", "$.testResults[1]", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-152", "a Cucumber evidence report not in Cucumber's shape", { "cucumber.json": '{"features":[]}' }, ["--cucumber", "cucumber.json"], ["cucumber.json", "Cucumber", "[input-not-in-its-shape]"]],
    ["CLM-CLI-153", "a Jest evidence report not in Jest's shape", { "jest.json": "{}" }, ["--jest", "jest.json"], ["jest.json", "testResults", "[input-not-in-its-shape]"]],
    ["CLM-CLI-154", "a pytest evidence report not in pytest's shape", { "pytest.xml": "<html/>" }, ["--pytest", "pytest.xml"], ["pytest.xml", "pytest", "[input-not-in-its-shape]"]],
    ["CLM-CLI-155", "a JUnit evidence report not in JUnit's shape", { "junit.xml": "<html/>" }, ["--junit", "junit.xml"], ["junit.xml", "JUnit", "[input-not-in-its-shape]"]],
    ["CLM-CLI-156", "a file in a JUnit directory not in JUnit's shape", { "junit/one.xml": "<testsuite/>", "junit/two.xml": "<html/>" }, ["--junit", "junit"], ["two.xml", "JUnit", "[input-not-in-its-shape]"]],
    ["CLM-CLI-157", "an RSpec evidence report not in RSpec's shape", { "rspec.json": '{"examples":3}' }, ["--rspec", "rspec.json"], ["rspec.json", "examples", "[input-not-in-its-shape]"]],
    ["CLM-CLI-158", "a step record not in the shape of a record of step outcomes", { "steps.json": '{"test":"passed"}' }, ["--ci-steps", "steps.json"], ["steps.json", "step outcomes", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-158",
      "a step record with one step's outcomes, and one step not in their shape",
      { "steps.json": '{"lint":{"outcome":"success","conclusion":"success"},"test":"passed"}' },
      ["--ci-steps", "steps.json"],
      ["steps.json", "step outcomes", "$.test", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-159", "a manifest not in a manifest's shape", { "package.json": "[]" }, ["--package-json", "package.json"], ["package.json", "manifest", "[input-not-in-its-shape]"]],
  ] as const)("[%s] %s: no verdict, exit 2, and a complaint with its facts", (_clm, _error, files, args, facts) => {
    const { exitCode, output, error } = ran(["balance", ...args], folderWith(files));

    expect({ exitCode, output, facts: facts.filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });

  it("[CLM-CLI-161] a named input that the tool is not permitted to read: no verdict, exit 2, and a complaint with its facts", () => {
    const folder = folderWith({ "vitest.json": VITEST_SHAPED });
    chmodSync(join(folder, "vitest.json"), 0o000);

    const { exitCode, output, error } = ran(["balance", "--vitest", "vitest.json"], folder);

    expect({ exitCode, output, facts: ["vitest.json", "[input-not-permitted]"].filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("a corpus with several feature files that do not parse will be refused, naming each of them", () => {
  it("[CLM-CLI-185] two feature files that do not parse: no verdict, exit 2, and a complaint about each, with what is wrong in each", () => {
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
