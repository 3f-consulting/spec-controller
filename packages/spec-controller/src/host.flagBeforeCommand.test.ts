/**
 * The @unit arm of @SCN-CLI-060 — a flag given before the command is refused as a flag out of place,
 * never read as a command (3F-3639). The @e2e arm in tests/steps/cliBalance.steps.ts proves it
 * through the real binary, and that nothing is stored.
 *
 * Every command flag the registry lists is tried in that place, so a flag added later is covered.
 * The wording is never pinned (features/message-catalogue.feature).
 */

import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

/** Every flag a command takes, except the help the host answers itself in the same place. */
const commandFlags = cliRegistry.commands
  .flatMap((command) => command.flags.map((flag) => flag.name))
  .filter((name) => name !== "--help");

describe("[SCN-CLI-060] a flag given before the command is refused as a flag out of place", () => {
  for (const flag of [...commandFlags, "--bogus"]) {
    it(`refuses ${flag} before the command, naming it, and takes no command`, () => {
      const inv = parseHostInvocation([flag, "balance", "--features", "f"]);
      expect(inv.refusal).toBeDefined();
      expect(inv.refusal).toContain(flag);
      expect(inv.refusal).not.toMatch(/unknown command/i);
      expect(inv.command).toBeUndefined();
    });
  }

  it("refuses it after a modifier too, before any store is taken", () => {
    const inv = parseHostInvocation(["--store", "/s", "--exit-zero", "balance"]);
    expect(inv.refusal).toContain("--exit-zero");
    expect(inv.store).toBeUndefined();
  });

  it("refuses it before a command the host does not know, naming the flag and not the command", () => {
    const inv = parseHostInvocation(["--exit-zero", "nosuchcommand"]);
    expect(inv.refusal).toContain("--exit-zero");
    expect(inv.refusal).not.toContain("nosuchcommand");
  });

  it("leaves the top-level help where it was", () => {
    for (const help of ["--help", "-h"]) {
      expect(parseHostInvocation([help]).refusal).toBeUndefined();
      expect(parseHostInvocation([help]).command).toBe(help);
    }
  });
});
