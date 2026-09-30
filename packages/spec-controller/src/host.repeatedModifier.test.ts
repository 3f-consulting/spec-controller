import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

describe("[SCN-CLI-064] a flag that does not repeat, given twice, is refused naming the flag, never read as its last value", () => {
  for (const modifier of cliRegistry.global.map((flag) => flag.name)) {
    it(`refuses ${modifier} given twice, equal values and all, naming it`, () => {
      const inv = parseHostInvocation([modifier, "a", modifier, "a", "balance"]);
      expect(
        (inv.refusal ?? "").split("\n").some((line) => line.includes(modifier) && /more than once/i.test(line)),
      ).toBe(true);
      expect(inv.command).toBeUndefined();
    });
  }

  it("takes each modifier given once, as before", () => {
    const inv = parseHostInvocation(["--store", "s", "--run-id", "r1", "balance", "--features", "f"]);
    expect(inv).toEqual({ store: "s", runId: "r1", command: "balance", commandArgs: ["--features", "f"] });
  });
});
