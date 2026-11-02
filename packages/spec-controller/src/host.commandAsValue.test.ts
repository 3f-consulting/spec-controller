import { describe, it, expect } from "vitest";
import { cliRegistry, type FlagSpec } from "./cliRegistry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const modifiers = cliRegistry.global;
const tookCommand = (modifier: FlagSpec, command: string): string =>
  `${APP_MESSAGES[AppMessage.ModifierTookCommand](modifier.name, command)}\n` +
  `${APP_MESSAGES[AppMessage.GiveModifierItsOwnValue](modifier.name, modifier.arg ?? "", command)} ` +
  APP_MESSAGES[AppMessage.SeeCommandsAndModifiers]();

const valueKey = (modifier: FlagSpec): "store" | "runId" => (modifier.name === "--store" ? "store" : "runId");

describe("[SCN-CLI-066] the host refuses a modifier that took the command as its value, naming both, and stores nothing", () => {

  for (const modifier of modifiers) {
    for (const { name: command } of cliRegistry.commands) {
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
});
