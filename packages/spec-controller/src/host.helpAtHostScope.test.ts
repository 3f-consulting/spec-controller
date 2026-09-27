/**
 * The host's own tokens are those before the command it hands the rest to, or every token when it
 * hands them to none; a help token handed to a command stays the command's. The modifiers, the
 * commands and the command flags are read from the registry, never listed.
 */

import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

const HELP = ["--help", "-h"];
const modifiers = cliRegistry.global.map((flag) => flag.name);
const commands = cliRegistry.commands.map((command) => command.name);
const commandFlags = [
  ...new Set(cliRegistry.commands.flatMap((command) => command.flags.map((flag) => flag.name))),
].filter((name) => !HELP.includes(name));

/** Each way the host refuses its own tokens, with the help token placed beside the refused one. */
function refusedWithHelp(help: string): string[][] {
  return [
    ...commandFlags.map((flag) => [flag, help]),
    ...commandFlags.map((flag) => ["--store", "/s", flag, "balance", help]),
    ...modifiers.flatMap((modifier) => commands.map((command) => [modifier, command, "--features", "f", help])),
    ...modifiers.flatMap((modifier) => commands.map((command) => [modifier, command, help, "--features", "f"])),
    ...modifiers.map((modifier) => [modifier, help]),
    ...modifiers.map((modifier) => [modifier, "v", modifier, "v", help]),
    ...modifiers.map((modifier) => [`${modifier}=v`, help]),
    ...modifiers.flatMap((modifier) => commands.map((command) => [modifier, help, command])),
  ];
}

describe("[SCN-CLI-073] a --help or -h among the host's own tokens answers the top-level help ahead of any refusal of the tokens beside it, and writes nothing", () => {
  it("reads the modifiers, the commands and the command flags from the registry", () => {
    expect(modifiers).toEqual(["--store", "--run-id"]);
    expect(commands).toContain("balance");
    expect(commandFlags).toContain("--exit-zero");
  });

  for (const help of HELP) {
    for (const argv of refusedWithHelp(help)) {
      it(`answers ${argv.join(" ")} with the top-level help, taking no store and no run id`, () => {
        expect(parseHostInvocation(argv)).toEqual({ command: help, commandArgs: [] });
      });
    }

    it(`leaves ${help} after a command the host hands it to as that command's`, () => {
      expect(parseHostInvocation(["--store", "/s", "balance", help])).toMatchObject({
        store: "/s",
        command: "balance",
        commandArgs: [help],
      });
      expect(parseHostInvocation(["nosuchcommand", help])).toMatchObject({ command: "nosuchcommand", commandArgs: [help] });
    });
  }

  it("still refuses the same tokens when no help token is among them", () => {
    for (const argv of refusedWithHelp("--help").map((tokens) => tokens.filter((token) => token !== "--help"))) {
      expect(parseHostInvocation(argv).refusal, argv.join(" ")).toBeDefined();
    }
  });
});
