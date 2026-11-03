import { describe, it, expect } from "vitest";
import { answerUnknownCommand, parseHostInvocation } from "./host.js";
import { errorText } from "./standardError.js";
import { errorCodesShown } from "./shownText.test-utils.js";

const HELP = "spec-controller — the top-level help, as rendered from the registry";

describe("[SCN-CLI-056] an unknown command is a usage fault", () => {

  it("names the command, then gives the help, with nothing between", () => {
    const stderr = errorText(answerUnknownCommand("nosuchcommand", HELP).refusal);
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

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — a command the tool does not have", () => {
  it("shows [unknown-command] once, on the naming line after the tool's usage-error prefix, and none on the help after it", () => {
    const stderr = errorText(answerUnknownCommand("nosuchcommand", HELP).refusal);
    expect(errorCodesShown(stderr)).toEqual({ opening: ["unknown-command"], after: [] });
    expect(stderr.split("\n")[0]).toBe('spec-controller: usage error [unknown-command] — unknown command "nosuchcommand".');
  });
});
