import { beforeEach, describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

let modifiers: string[];

beforeEach(() => {
  modifiers = cliRegistry.global.map((flag) => flag.name);
});

const HELP = ["--help", "-h", "help"];

describe("[SCN-CLI-068] help after a modifier, or nothing given at all, still answers the top-level help", () => {
  for (const { name: modifier } of cliRegistry.global) {
    for (const { name: value } of [{ name: "v" }, ...cliRegistry.commands]) {
      for (const help of HELP) {
        it(`reads ${help} after ${modifier} ${value} as the command, and refuses nothing`, () => {
          const inv = parseHostInvocation([modifier, value, help]);
          expect(inv.refusal).toBeUndefined();
          expect(inv.command).toBe(help);
        });
      }
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
