/**
 * The host's @unit arm of @SCN-CLI-065 — a modifier written --flag=value before the command is refused
 * as a form that is not read, naming the spelling that is, never as a flag out of place (3F-3672). The
 * balance arm is in cli-args.argvShape.test.ts; the @e2e arm in tests/steps/cliBalance.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

describe("[SCN-CLI-065] a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice", () => {
  for (const modifier of cliRegistry.global.map((flag) => flag.name)) {
    it(`refuses ${modifier}=v before the command, giving '${modifier} v'`, () => {
      const { refusal } = parseHostInvocation([`${modifier}=v`, "balance"]);
      expect(
        (refusal ?? "").split("\n").some((line) => line.includes(`${modifier}=v`) && /not read/i.test(line)),
      ).toBe(true);
      expect(refusal).toContain(`'${modifier} v'`);
      expect(refusal).not.toMatch(/before the command|unknown/i);
    });
  }
});
