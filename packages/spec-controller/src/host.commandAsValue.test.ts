import { describe, it, expect } from "vitest";
import { cliRegistry, type FlagSpec } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const modifiers = cliRegistry.global;
const commands = cliRegistry.commands.map((command) => command.name);

const tookCommand = (modifier: FlagSpec, command: string): string =>
  `${APP_MESSAGES[AppMessage.ModifierTookCommand](modifier.name, command)}\n` +
  `${APP_MESSAGES[AppMessage.GiveModifierItsOwnValue](modifier.name, modifier.arg ?? "", command)} ` +
  APP_MESSAGES[AppMessage.SeeCommandsAndModifiers]();

function modifierNamed(name: string): FlagSpec {
  const modifier = modifiers.find((flag) => flag.name === name);
  if (modifier === undefined) throw new Error(`no host modifier ${name} in the registry`);
  return modifier;
}

const valueKey = (modifier: FlagSpec): "store" | "runId" => (modifier.name === "--store" ? "store" : "runId");

describe("[SCN-CLI-066] the host refuses a modifier that took the command as its value, naming both, and stores nothing", () => {
  it("reads the commands from the registry, and finds balance and allocate", () => {
    expect(commands).toEqual(expect.arrayContaining(["balance", "allocate"]));
  });

  it("reads each host modifier's value placeholder from the registry", () => {
    expect(modifiers.map((modifier) => [modifier.name, modifier.arg])).toEqual([
      ["--store", "<root>"],
      ["--run-id", "<id>"],
    ]);
  });

  for (const modifier of modifiers) {
    for (const command of commands) {
      it(`refuses ${modifier.name} ${command} followed by the command's flags, naming both, and takes no command`, () => {
        expect(parseHostInvocation([modifier.name, command, "--features", "f"])).toEqual({
          commandArgs: [],
          refusal: tookCommand(modifier, command),
        });
      });

      it(`refuses ${modifier.name} ${command} with nothing after it, and takes no command`, () => {
        expect(parseHostInvocation([modifier.name, command])).toEqual({
          commandArgs: [],
          refusal: tookCommand(modifier, command),
        });
      });

      it(`reads ${command} as ${modifier.name}'s value when the command follows it`, () => {
        expect(parseHostInvocation([modifier.name, command, command, "--features", "f"])).toEqual({
          [valueKey(modifier)]: command,
          command,
          commandArgs: ["--features", "f"],
        });
      });
    }
  }

  it("refuses --store balance, naming --store, balance and the store's <root>", () => {
    const refusal = parseHostInvocation(["--store", "balance"]).refusal;
    expect(refusal).toBe(tookCommand(modifierNamed("--store"), "balance"));
    expect(refusal).toContain("'spec-controller --store <root> balance …'");
  });

  it("refuses --store allocate, the other registered command, naming both", () => {
    expect(parseHostInvocation(["--store", "allocate"])).toEqual({
      commandArgs: [],
      refusal: tookCommand(modifierNamed("--store"), "allocate"),
    });
  });

  it("refuses --run-id balance after the store modifier, with the target's flags after it, reading nothing", () => {
    expect(parseHostInvocation(["--store", "s", "--run-id", "balance", "--features", "x"])).toEqual({
      commandArgs: [],
      refusal: tookCommand(modifierNamed("--run-id"), "balance"),
    });
  });

  it("refuses a modifier whose command-named value is followed by a single-dash flag", () => {
    expect(parseHostInvocation(["--store", "balance", "-x"])).toEqual({
      commandArgs: [],
      refusal: tookCommand(modifierNamed("--store"), "balance"),
    });
  });

  it("reads a value that is not a command as the modifier's value", () => {
    expect(parseHostInvocation(["--store", "balanced", "balance"])).toEqual({
      store: "balanced",
      command: "balance",
      commandArgs: [],
    });
  });
});
