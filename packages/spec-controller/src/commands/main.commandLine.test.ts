import { readdirSync } from "node:fs";
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

    expect(["--strict", "--exit-zero"].map((flag) => lines.filter((line) => new RegExp(`^\\s+${flag}\\s{2,}\\S`).test(line)).length)).toEqual([1, 1]);
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
