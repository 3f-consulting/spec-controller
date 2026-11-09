import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cliRegistry.js";
import { parseHostInvocation } from "./host.js";

const HELP = "--help";
const commands = cliRegistry.commands.map((command) => command.name);
const commandFlags = [
  ...new Set(cliRegistry.commands.flatMap((command) => command.flags.map((flag) => flag.name))),
].filter((name) => name !== HELP);

const refusedWithHelp: string[][] = [
  ...commandFlags.map((flag) => [flag, HELP]),
  ...commandFlags.flatMap((flag) => commands.map((command) => [flag, command, HELP])),
];

describe("[CLM-CLI-073] a --help before the command answers the top-level help ahead of any refusal of the tokens beside it, and writes nothing", () => {
  for (const argv of refusedWithHelp) {
    it(`answers ${argv.join(" ")} with the top-level help`, () => {
      expect(parseHostInvocation(argv)).toEqual({ command: HELP, commandArgs: [] });
    });
  }

  it(`leaves ${HELP} after a command the host hands it to as that command's`, () => {
    expect(parseHostInvocation(["balance", HELP])).toEqual({ command: "balance", commandArgs: [HELP] });
    expect(parseHostInvocation(["nosuchcommand", HELP])).toMatchObject({ command: "nosuchcommand", commandArgs: [HELP] });
  });

  it("still refuses the same tokens when no help token is among them", () => {
    for (const argv of refusedWithHelp.map((tokens) => tokens.filter((token) => token !== HELP))) {
      expect(parseHostInvocation(argv).refusal, argv.join(" ")).toBeDefined();
    }
  });
});
