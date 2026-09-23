/**
 * The @unit arms of @SCN-CLI-056 and @SCN-CLI-057 — the host's answer to a command it does not know (3F-3634).
 * The @e2e arm in tests/steps/cliBalance.steps.ts proves the same answer through the real binary.
 *
 * The statement's WORDING is never asserted (features/message-catalogue.feature): the status is the
 * contract, and the statement is checked through its exported constant.
 */

import { describe, it, expect } from "vitest";
import { answerUnknownCommand, NO_VERDICT_EXIT_CODE, NO_VERDICT_STATEMENT, parseHostInvocation } from "./host.js";

const HELP = "spec-controller — the top-level help, as rendered from the registry";

describe("[SCN-CLI-056] an unknown command reaches no verdict about the corpus", () => {
  it("answers with the no-verdict status, 6, never the out-of-balance 1", () => {
    expect(NO_VERDICT_EXIT_CODE).toBe(6);
    expect(answerUnknownCommand("blance", HELP).exitCode).toBe(6);
  });

  it("says it reached no verdict, names the command, and still gives the help", () => {
    expect(NO_VERDICT_STATEMENT.trim().length).toBeGreaterThan(0);
    const { stderr } = answerUnknownCommand("nosuchcommand", HELP);
    expect(stderr).toContain(NO_VERDICT_STATEMENT);
    expect(stderr).toContain('"nosuchcommand"');
    expect(stderr).toContain(HELP);
  });
});

describe("[SCN-CLI-057] --exit-zero never moves an unknown command's no-verdict status", () => {
  it("answers 6 with the flag after the command, where it reaches only the command's args", () => {
    const inv = parseHostInvocation(["nosuchcommand", "--exit-zero"]);
    expect(inv.commandArgs).toEqual(["--exit-zero"]);
    expect(answerUnknownCommand(inv.command ?? "", HELP).exitCode).toBe(6);
  });

  it("answers 6 with the flag before the command, where the host reads the flag as the command", () => {
    const inv = parseHostInvocation(["--exit-zero", "nosuchcommand"]);
    expect(inv.command).toBe("--exit-zero");
    expect(answerUnknownCommand(inv.command ?? "", HELP).exitCode).toBe(6);
  });
});
