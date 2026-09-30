import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

const modifiers = cliRegistry.global.map((flag) => flag.name);
const commands = cliRegistry.commands.map((command) => command.name);

function namesBoth(refusal: string | undefined, modifier: string, command: string): boolean {
  return (refusal ?? "")
    .split("\n")
    .some((line) => line.includes(modifier) && line.includes(command) && /as its value/i.test(line));
}

describe("[SCN-CLI-066] the host refuses a modifier that took the command as its value, naming both, and stores nothing", () => {
  it("reads the commands from the registry, and finds balance", () => {
    expect(commands).toContain("balance");
  });

  for (const modifier of modifiers) {
    for (const command of commands) {
      it(`refuses ${modifier} ${command} followed by the command's flags, naming both`, () => {
        const inv = parseHostInvocation([modifier, command, "--features", "f"]);
        expect(namesBoth(inv.refusal, modifier, command)).toBe(true);
        expect(inv.refusal).not.toMatch(/before the command/i);
      });

      it(`refuses ${modifier} ${command} with nothing after it`, () => {
        expect(namesBoth(parseHostInvocation([modifier, command]).refusal, modifier, command)).toBe(true);
      });

      it(`reads ${command} as ${modifier}'s value when the command follows it`, () => {
        const inv = parseHostInvocation([modifier, command, command, "--features", "f"]);
        expect(inv.refusal).toBeUndefined();
        expect(inv.command).toBe(command);
      });
    }
  }
});
