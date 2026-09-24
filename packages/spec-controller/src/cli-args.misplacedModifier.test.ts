/**
 * The @unit arm of @SCN-CLI-061 — a host modifier given after the command is refused as out of
 * place, naming where it goes, with none of the pin advice an unregistered flag gets (3F-3639). The
 * @e2e arm in tests/steps/cliBalance.steps.ts proves it through the real binary.
 *
 * The modifiers are read from the registry's global scope, never listed; the wording is never pinned
 * (features/message-catalogue.feature).
 */

import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { checkMisplacedHostModifiers } from "./cli-args.js";

const modifiers = cliRegistry.global.map((flag) => flag.name);

describe("[SCN-CLI-061] a host modifier given after the command is refused as out of place, with no pin advice", () => {
  for (const modifier of modifiers) {
    it(`refuses ${modifier} after the command, naming it as going before the command`, () => {
      const refusal = checkMisplacedHostModifiers({ features: "f", [modifier.slice(2)]: "x" }, cliRegistry, "balance");
      expect(refusal).not.toBeNull();
      expect(refusal).toContain(modifier);
      expect(refusal).toMatch(/before the command/i);
      expect(refusal).not.toMatch(/\bpin\b/i);
    });
  }

  it("leaves a flag no scope names to the drift advice", () => {
    expect(checkMisplacedHostModifiers({ bogus: "true" }, cliRegistry, "balance")).toBeNull();
  });

  it("leaves the command's own flags alone", () => {
    expect(checkMisplacedHostModifiers({ features: "f", format: "md" }, cliRegistry, "balance")).toBeNull();
  });
});
