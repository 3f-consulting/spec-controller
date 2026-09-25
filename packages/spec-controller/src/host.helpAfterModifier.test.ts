/**
 * The @unit arm of @SCN-CLI-068 — help after a host modifier, or nothing given at all, still answers
 * the top-level help (3F-3686). Help counts as a command: it runs nothing, reaches no verdict and
 * writes nothing. This is the control that keeps @SCN-CLI-067's refusal from being a blanket one.
 * The @e2e arm in tests/steps/cliBalance.steps.ts proves the binary prints the help itself.
 *
 * The modifiers are read from the registry's global scope, never listed.
 */

import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

const modifiers = cliRegistry.global.map((flag) => flag.name);

/** The tokens the host answers with its own help, in the command's place. */
const HELP = ["--help", "-h", "help"];

describe("[SCN-CLI-068] help after a modifier, or nothing given at all, still answers the top-level help", () => {
  for (const modifier of modifiers) {
    for (const help of HELP) {
      it(`reads ${help} after ${modifier} as the command, and refuses nothing`, () => {
        const inv = parseHostInvocation([modifier, "v", help]);
        expect(inv.refusal).toBeUndefined();
        expect(inv.command).toBe(help);
      });
    }
  }

  it("reads --help after every modifier as the command, and refuses nothing", () => {
    const inv = parseHostInvocation([...modifiers.flatMap((modifier) => [modifier, "v"]), "--help"]);
    expect(inv.refusal).toBeUndefined();
    expect(inv.command).toBe("--help");
  });

  it("refuses nothing when nothing is given, which is the bare help", () => {
    expect(parseHostInvocation([])).toEqual({ store: undefined, runId: undefined, command: undefined, commandArgs: [] });
  });
});
