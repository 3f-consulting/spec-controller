import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { checkMisplacedHostModifiers } from "./cli-args.js";

describe("[SCN-CLI-061] a host modifier given after the command is refused as out of place, with no pin advice", () => {
  for (const { name: modifier } of cliRegistry.global) {
    it(`refuses ${modifier} after the command, naming it as going before the command`, () => {
      const refusal = checkMisplacedHostModifiers({ features: "f", [modifier.slice(2)]: "x" }, cliRegistry, "balance");
      expect(refusal).not.toBeNull();
      expect(refusal).toContain(modifier);
      expect(refusal).toMatch(/before the command/i);
      expect(refusal).not.toMatch(/\bpin\b/i);
    });
  }
});
