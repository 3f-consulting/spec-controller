import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const HOST_MODIFIERS = "--store, --run-id";

const flagBeforeCommand = (flag: string): string =>
  `${APP_MESSAGES[AppMessage.FlagBeforeCommand](flag, HOST_MODIFIERS)}\n` +
  APP_MESSAGES[AppMessage.SeeCommandsAndModifiers]();

const EXAMPLES: [string, { flag: string; argv: string[] }][] = [
  ["the report-only option, before balance", { flag: "--exit-zero", argv: ["--exit-zero", "balance"] }],
  ["the format option given md, before balance", { flag: "--format", argv: ["--format", "md", "balance"] }],
  ["an unknown flag, before balance", { flag: "--bogus", argv: ["--bogus", "balance"] }],
  ["the report-only option, before no known command", { flag: "--exit-zero", argv: ["--exit-zero", "nosuchcommand"] }],
];

describe("[SCN-CLI-060] a flag given before the command is refused as a flag out of place", () => {

  for (const [row, { flag, argv }] of EXAMPLES) {
    it(`refuses ${row} as a flag before the command, listing the host's modifiers, and takes no command arguments`, () => {
      expect(parseHostInvocation(argv)).toEqual({ commandArgs: [], refusal: flagBeforeCommand(flag) });
    });
  }

  for (const { flags } of [...cliRegistry.commands, { flags: [{ name: "--bogus" }] }]) {
    for (const { name: flag } of flags) {
      if (flag === "--help") continue;
    }
  }

  it("refuses it after a modifier too, before any store is taken", () => {
    const inv = parseHostInvocation(["--store", "/s", "--exit-zero", "balance"]);
    expect(inv).toEqual({ commandArgs: [], refusal: flagBeforeCommand("--exit-zero") });
  });
});
