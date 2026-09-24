/**
 * The @unit arms of @SCN-CLI-056 and @SCN-CLI-057 — the host's answer to a command it does not know (3F-3649).
 * The @e2e arm in tests/steps/cliBalance.steps.ts proves the same answer through the real binary.
 *
 * The WORDING is never asserted (features/message-catalogue.feature): the status is the contract, and
 * stderr is pinned by its shape — the line naming the command, then the help, and nothing between.
 */

import { describe, it, expect } from "vitest";
import { answerUnknownCommand, parseHostInvocation } from "./host.js";

const HELP = "spec-controller — the top-level help, as rendered from the registry";

describe("[SCN-CLI-056] an unknown command is a usage fault", () => {
  it("answers with the usage status, 2, never the out-of-balance 1", () => {
    expect(answerUnknownCommand("blance", HELP).exitCode).toBe(2);
  });

  it("names the command, then gives the help, with nothing between", () => {
    const { stderr } = answerUnknownCommand("nosuchcommand", HELP);
    const [naming, ...after] = stderr.split("\n");
    expect(naming).toContain('"nosuchcommand"');
    expect(after.join("\n").trim()).toBe(HELP);
  });
});

describe("[SCN-CLI-057] --exit-zero after an unknown command never moves its usage status", () => {
  it("answers 2 with the flag after the command, where it reaches only the command's args", () => {
    const inv = parseHostInvocation(["nosuchcommand", "--exit-zero"]);
    expect(inv.command).toBe("nosuchcommand");
    expect(inv.commandArgs).toEqual(["--exit-zero"]);
    expect(answerUnknownCommand(inv.command ?? "", HELP).exitCode).toBe(2);
  });
});
