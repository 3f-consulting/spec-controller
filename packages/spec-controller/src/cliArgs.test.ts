import { beforeEach, describe, it, expect } from "vitest";
import { cliRegistry, type CommandSpec } from "./cliRegistry.js";
import { checkUnknownFlags } from "./cliArgs.js";
import { errorText } from "./standardError.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { errorCodesShown, shownText } from "./shownText.test-utils.js";

const REFUSING_TOOL_VERSION = "9.9.9-test";

const MEASUREMENTS_RETIRED_IN = "0.1.0-alpha.5";

describe("[CLM-CLI-023] checkUnknownFlags refuses a flag balance has retired as retired, offering no pin", () => {
  let refusal: string | null;
  let balance: CommandSpec | undefined;
  let retiredFlags: NonNullable<CommandSpec["retiredFlags"]>;

  beforeEach(() => {
    refusal = shownText(checkUnknownFlags({ measurements: "x.json" }, cliRegistry, "balance", REFUSING_TOOL_VERSION));
    balance = cliRegistry.commands.find((command) => command.name === "balance");
    retiredFlags = balance?.retiredFlags ?? [];
  });

  it("refuses the flag, naming it as retired with the version that retired it", () => {
    expect(refusal).not.toBeNull();
    expect(refusal).toContain("--measurements");
    expect(refusal).toMatch(/retired/i);
    expect(refusal).toContain(MEASUREMENTS_RETIRED_IN);
  });

  it("names what replaced it: the check's own CI step outcome, read through --ci-steps", () => {
    expect(refusal).toContain("--ci-steps");
    expect(refusal).toMatch(/outcome/i);
  });

  it("leaves the drift advice on a flag that is merely unregistered", () => {
    const unregistered = shownText(checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION));
    expect(unregistered).toMatch(/bump the pin/i);
    expect(unregistered).not.toMatch(/retired/i);
  });

  const BALANCE_SCOPE = "spec-controller balance";
  const retiredRefusal = (flag: { name: string; retiredIn: string; replacement: string }): string =>
    `${message(AppError.RetiredFlag, { flag: flag.name, scope: BALANCE_SCOPE, retiredIn: flag.retiredIn, toolVersion: REFUSING_TOOL_VERSION })}\n` +
    `${message(AppMessage.DoNotPinRetired)} ${flag.replacement}\n` +
    message(AppMessage.SeeFlags, { scope: BALANCE_SCOPE });

  it("refuses each retired flag with exactly the catalogue's retired refusal at balance's scope, naming its replacement", () => {
    for (const flag of retiredFlags) {
      const given = { [flag.name.replace(/^-+/, "")]: "x.json" };
      expect(shownText(checkUnknownFlags(given, cliRegistry, "balance", REFUSING_TOOL_VERSION))).toBe(retiredRefusal(flag));
    }
  });

  it("refuses balance's retired flag given to allocate, which retires none, as unregistered, not retired", () => {
    const toAllocate = shownText(checkUnknownFlags({ measurements: "x.json" }, cliRegistry, "allocate", REFUSING_TOOL_VERSION));
    expect(toAllocate).toContain("--measurements");
    expect(toAllocate).not.toMatch(/retired/i);
  });
});

describe("[CLM-MSG-010] an error shows its reader the error code of what went wrong — a flag the command has retired", () => {
  it("prints balance's refusal of a retired flag with [retired-flag] once, after the usage-error prefix, and no code on its pointer lines", () => {
    const retired = checkUnknownFlags({ measurements: "x.json" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);
    expect(retired).not.toBeNull();
    const shown = retired === null ? "" : errorText(retired, "balance");
    const words = message(AppError.RetiredFlag, {
      flag: "--measurements",
      scope: "spec-controller balance",
      retiredIn: MEASUREMENTS_RETIRED_IN,
      toolVersion: REFUSING_TOOL_VERSION,
    });
    expect(errorCodesShown(shown)).toEqual({ opening: ["retired-flag"], after: [] });
    expect(shown.split("\n")[0]).toBe(`spec-controller balance: usage error [retired-flag] — ${words}`);
  });
});
