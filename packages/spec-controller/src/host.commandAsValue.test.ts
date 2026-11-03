import { describe, it, expect } from "vitest";
import { cliRegistry, type FlagSpec } from "./cliRegistry.js";
import { parseHostInvocation } from "./host.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { withShownRefusal } from "./shownText.test-utils.js";

const modifiers = cliRegistry.global;
const tookCommand = (modifier: FlagSpec, command: string): string =>
  `${message(AppError.ModifierTookCommand, { modifier: modifier.name, command })}\n` +
  `${message(AppMessage.GiveModifierItsOwnValue, { modifier: modifier.name, arg: modifier.arg ?? "", command })} ` +
  message(AppMessage.SeeCommandsAndModifiers);

const valueKey = (modifier: FlagSpec): "store" | "runId" => (modifier.name === "--store" ? "store" : "runId");

describe("[SCN-CLI-066] the host refuses a modifier that took the command as its value, naming both, and stores nothing", () => {

  for (const modifier of modifiers) {
    for (const { name: command } of cliRegistry.commands) {
      it(`refuses ${modifier.name} ${command} followed by the command's flags, naming both, and takes no command`, () => {
        expect(withShownRefusal(parseHostInvocation([modifier.name, command, "--features", "f"]))).toEqual({
          commandArgs: [],
          refusal: tookCommand(modifier, command),
        });
      });

      it(`refuses ${modifier.name} ${command} with nothing after it, and takes no command`, () => {
        expect(withShownRefusal(parseHostInvocation([modifier.name, command]))).toEqual({
          commandArgs: [],
          refusal: tookCommand(modifier, command),
        });
      });

      it(`reads ${command} as ${modifier.name}'s value when the command follows it`, () => {
        expect(withShownRefusal(parseHostInvocation([modifier.name, command, command, "--features", "f"]))).toEqual({
          [valueKey(modifier)]: command,
          command,
          commandArgs: ["--features", "f"],
        });
      });
    }
  }
});
