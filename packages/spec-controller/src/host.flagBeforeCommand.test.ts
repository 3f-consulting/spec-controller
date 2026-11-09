import { describe, it, expect } from "vitest";
import { parseHostInvocation } from "./host.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { withShownRefusal } from "./shownText.test-utils.js";

const HOST_MODIFIER = /--store|--run-id|host modifier/;

const flagBeforeCommand = (flag: string): string =>
  `${message(AppError.FlagBeforeCommand, { flag })}\n` + message(AppMessage.SeeCommands);

const EXAMPLES: [string, { flag: string; argv: string[] }][] = [
  ["the report-only option, before balance", { flag: "--exit-zero", argv: ["--exit-zero", "balance"] }],
  ["the format option given md, before balance", { flag: "--format", argv: ["--format", "md", "balance"] }],
  ["an unknown flag, before balance", { flag: "--bogus", argv: ["--bogus", "balance"] }],
  ["the report-only option, before no known command", { flag: "--exit-zero", argv: ["--exit-zero", "nosuchcommand"] }],
];

describe("[CLM-CLI-060] a flag given before the command is refused as a flag out of place", () => {

  for (const [row, { flag, argv }] of EXAMPLES) {
    it(`refuses ${row} as a flag before the command, naming where it belongs and no host modifier, and takes no command arguments`, () => {
      const inv = withShownRefusal(parseHostInvocation(argv));
      expect(inv.refusal).not.toMatch(HOST_MODIFIER);
      expect(inv).toEqual({ commandArgs: [], refusal: flagBeforeCommand(flag) });
    });
  }
});
