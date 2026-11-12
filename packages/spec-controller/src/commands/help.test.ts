import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { message } from "../messages/appText.js";
import { allocateCommand, balanceCommand, cliRegistry, renderCommandHelp, renderTopLevelHelp } from "../runRequest/cliRegistry.js";
import { main } from "./main.js";
import { AppMessage } from "../messages/messages.js";
import { forgetWhatTheProgramWrote, recordWhatTheProgramWrites, whatTheProgramWrote } from "../programOutput.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

recordWhatTheProgramWrites();

const BALANCED = "tests/fixtures/balanced";

const balanceHelp = (): string => renderCommandHelp(balanceCommand) + "\n";
const allocateHelp = (): string => renderCommandHelp(allocateCommand) + "\n";
const topLevelHelp = (): string => renderTopLevelHelp(cliRegistry) + "\n";

describe("help will answer, and nothing will run", () => {
  it.each([
    [
      "CLM-CLI-112",
      "a request for help beside an argument that fails validation",
      (report: string): string[] => [
        "balance",
        "--features", `${BALANCED}/features`,
        "--vitest", `${BALANCED}/vitest.json`,
        "--package-json", `${BALANCED}/package.json`,
        "--ci", BALANCED,
        "--format", `json:${report}`,
        "stray",
        "--help",
      ],
      balanceHelp,
    ],
    [
      "CLM-CLI-112",
      "a request for help beside a flag before the command",
      (report: string): string[] => ["--format", `json:${report}`, "--help"],
      topLevelHelp,
    ],
    [
      "CLM-CLI-112",
      "a request for help, -h, beside a flag before the command",
      (report: string): string[] => ["--format", `json:${report}`, "-h"],
      topLevelHelp,
    ],
    [
      "CLM-CLI-113",
      "allocate's help beside a flag allocate does not take",
      (report: string): string[] => ["allocate", "AB", "--format", `json:${report}`, "--help"],
      allocateHelp,
    ],
  ])("[%s] %s", (_clm, _given, argvWritingTo, help) => {
    const report = join(temporaryDirectory("spec-controller-help-"), "report.json");

    main(argvWritingTo(report));

    expect(whatTheProgramWrote()).toEqual({ stdout: help(), stderr: "", exitCode: undefined });
    expect(existsSync(report)).toBe(false);
  });
});

describe("help after a command the tool does not have will not answer", () => {
  it("[CLM-CLI-114] a command the tool does not have, and a request for help after it", () => {
    main(["nosuchcommand"]);
    const unknownCommand = whatTheProgramWrote();
    forgetWhatTheProgramWrote();
    process.exitCode = undefined;

    main(["nosuchcommand", "--help"]);

    expect(unknownCommand.exitCode).toBe(2);
    expect(whatTheProgramWrote()).toEqual(unknownCommand);
  });
});

const BALANCE_LISTED = [
  ["--features <dir>", AppMessage.FeaturesFlag],
  ["--vitest <report.json>", AppMessage.VitestFlag],
  ["--pytest <report.xml>", AppMessage.PytestFlag],
  ["--jest <report.json>", AppMessage.JestFlag],
  ["--junit <report.xml>", AppMessage.JunitFlag],
  ["--rspec <report.json>", AppMessage.RspecFlag],
  ["--cucumber <report.json>", AppMessage.CucumberFlag],
  ["--ci <ci.yml>", AppMessage.CiFlag],
  ["--package-json <path>", AppMessage.PackageJsonFlag],
  ["--ci-steps <record.json>", AppMessage.CiStepsFlag],
  ["--target <name>", AppMessage.TargetFlag],
  ["--source-sha <sha>", AppMessage.SourceShaFlag],
  ["--format <fmt>[:<path>]", AppMessage.FormatFlag],
  ["--strict", AppMessage.StrictFlag],
  ["--exit-zero", AppMessage.ExitZeroFlag],
  ["--help, -h", AppMessage.HelpFlag],
] as const;

const ALLOCATE_LISTED = [
  ["<FFF>", AppMessage.FeatureCodeArgument],
  ["--new", AppMessage.NewFlag],
  ["--help, -h", AppMessage.HelpFlag],
] as const;

const COMMANDS_LISTED = [
  ["balance", AppMessage.BalanceSummary],
  ["allocate", AppMessage.AllocateSummary],
] as const;

// An entry is listed on a line of its own: its name, a gap of spaces, and what it does.
function listsEntry(lines: readonly string[], name: string, text: string): boolean {
  return lines.some((line) => {
    const gap = line.slice(`  ${name}`.length, line.length - text.length);
    return line.startsWith(`  ${name}  `) && line.endsWith(text) && gap.trim() === "";
  });
}

describe("help will list what you can ask for", () => {
  it.each([
    ["CLM-CLI-115", ["balance", "--help"], balanceHelp, BALANCE_LISTED],
    ["CLM-CLI-116", ["balance", "-h"], balanceHelp, BALANCE_LISTED],
    ["CLM-CLI-117", ["allocate", "--help"], allocateHelp, ALLOCATE_LISTED],
    ["CLM-CLI-118", ["--help"], topLevelHelp, COMMANDS_LISTED],
    ["CLM-CLI-118", ["-h"], topLevelHelp, COMMANDS_LISTED],
    ["CLM-CLI-119", ["help"], topLevelHelp, COMMANDS_LISTED],
    ["CLM-CLI-120", [], topLevelHelp, COMMANDS_LISTED],
  ])("[%s] the command line %j", (_clm, argv, help, listed) => {
    main(argv);

    const written = whatTheProgramWrote();
    expect(written).toEqual({ stdout: help(), stderr: "", exitCode: undefined });
    const lines = written.stdout.split("\n");
    for (const [name, text] of listed) expect(listsEntry(lines, name, message(text)), name).toBe(true);
  });
});

describe("a command's help gives each flag it takes beside what the flag does", () => {
  it.each([
    ["CLM-CLI-189", "--strict", AppMessage.StrictFlag],
    ["CLM-CLI-189", "--exit-zero", AppMessage.ExitZeroFlag],
  ] as const)("[%s] balance's help gives %s", (_clm, flag, description) => {
    main(["balance", "--help"]);

    const line = whatTheProgramWrote().stdout.split("\n").find((each) => each.trimStart().startsWith(`${flag} `));
    expect(line?.trimStart().slice(flag.length).trimStart()).toBe(message(description));
  });
});
