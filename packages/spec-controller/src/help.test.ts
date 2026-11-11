import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allocateCommand, balanceCommand, cliRegistry, renderCommandHelp, renderTopLevelHelp, type CommandSpec } from "./cliRegistry.js";
import { main } from "./main.js";
import { forgetWhatTheProgramWrote, recordWhatTheProgramWrites, whatTheProgramWrote } from "./programOutput.test-utils.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";

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

describe("help will list what you can ask for", () => {
  const flagsOf = (command: CommandSpec): string[] => command.flags.map((flag) => flag.name);
  const balanceListed = (): string[] => flagsOf(balanceCommand);
  const allocateListed = (): string[] => [
    ...(allocateCommand.positionals ?? []).map((positional) => positional.name),
    ...flagsOf(allocateCommand),
  ];
  const commandsListed = (): string[] => cliRegistry.commands.map((command) => command.name);

  it.each([
    ["CLM-CLI-115", ["balance", "--help"], balanceHelp, balanceListed],
    ["CLM-CLI-116", ["balance", "-h"], balanceHelp, balanceListed],
    ["CLM-CLI-117", ["allocate", "--help"], allocateHelp, allocateListed],
    ["CLM-CLI-118", ["--help"], topLevelHelp, commandsListed],
    ["CLM-CLI-119", ["help"], topLevelHelp, commandsListed],
    ["CLM-CLI-120", [], topLevelHelp, commandsListed],
  ])("[%s] the command line %j", (_clm, argv, help, listed) => {
    main(argv);

    const written = whatTheProgramWrote();
    expect(written).toEqual({ stdout: help(), stderr: "", exitCode: undefined });
    const names = listed();
    expect(names.length).toBeGreaterThan(0);
    const lines = written.stdout.split("\n");
    for (const name of names) expect(lines.some((line) => line.startsWith(`  ${name} `) || line.startsWith(`  ${name},`)), name).toBe(true);
  });
});
