import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const commandFlags = cliRegistry.commands
  .flatMap((command) => command.flags.map((flag) => flag.name))
  .filter((name) => name !== "--help");

const HOST_MODIFIERS = "--store, --run-id";

const flagBeforeCommand = (flag: string): string =>
  `${APP_MESSAGES[AppMessage.FlagBeforeCommand](flag, HOST_MODIFIERS)}\n` +
  APP_MESSAGES[AppMessage.SeeCommandsAndModifiers]();

const EXAMPLES: Record<string, { flag: string; argv: string[] }> = {
  "the report-only option, before balance": { flag: "--exit-zero", argv: ["--exit-zero", "balance"] },
  "the format option given md, before balance": { flag: "--format", argv: ["--format", "md", "balance"] },
  "an unknown flag, before balance": { flag: "--bogus", argv: ["--bogus", "balance"] },
  "the report-only option, before no known command": { flag: "--exit-zero", argv: ["--exit-zero", "nosuchcommand"] },
};

describe("[SCN-CLI-060] a flag given before the command is refused as a flag out of place", () => {
  it("lists the host's modifiers as the registry's global flags give them, in order", () => {
    expect(cliRegistry.global.map((flag) => flag.name).join(", ")).toBe(HOST_MODIFIERS);
  });

  for (const [row, { flag, argv }] of Object.entries(EXAMPLES)) {
    it(`refuses ${row} as a flag before the command, listing the host's modifiers, and takes no command arguments`, () => {
      expect(parseHostInvocation(argv)).toEqual({ commandArgs: [], refusal: flagBeforeCommand(flag) });
    });
  }

  for (const flag of [...commandFlags, "--bogus"]) {
    it(`refuses ${flag} before the command, naming it, and takes no command`, () => {
      const inv = parseHostInvocation([flag, "balance", "--features", "f"]);
      expect(inv).toEqual({ commandArgs: [], refusal: flagBeforeCommand(flag) });
      expect(inv.refusal).not.toMatch(/unknown command/i);
    });
  }

  it("refuses it after a modifier too, before any store is taken", () => {
    const inv = parseHostInvocation(["--store", "/s", "--exit-zero", "balance"]);
    expect(inv).toEqual({ commandArgs: [], refusal: flagBeforeCommand("--exit-zero") });
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
