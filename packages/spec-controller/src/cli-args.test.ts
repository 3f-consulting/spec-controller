import { beforeEach, describe, it, expect } from "vitest";
import { cliRegistry, type CliRegistry, type CommandSpec } from "./cli-registry.js";
import { checkUnknownFlags } from "./cli-args.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const REFUSING_TOOL_VERSION = "9.9.9-test";

const MEASUREMENTS_RETIRED_IN = "0.1.0-alpha.5";

describe("[SCN-CLI-023] checkUnknownFlags refuses a flag balance has retired as retired, offering no pin", () => {
  let refusal: ReturnType<typeof checkUnknownFlags>;
  let balance: CommandSpec | undefined;
  let retiredFlags: NonNullable<CommandSpec["retiredFlags"]>;

  beforeEach(() => {
    refusal = checkUnknownFlags({ measurements: "x.json" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);
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

  it("advises no pin toward a version that still accepts the flag", () => {
    expect(refusal).not.toMatch(/bump the pin/i);
    expect(refusal).not.toMatch(/accepts --measurements/);
  });

  it("leaves the drift advice on a flag that is merely unregistered", () => {
    const unregistered = checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);
    expect(unregistered).toMatch(/bump the pin/i);
    expect(unregistered).not.toMatch(/retired/i);
  });

  const BALANCE_SCOPE = "spec-controller balance";
  const retiredRefusal = (flag: { name: string; retiredIn: string; replacement: string }): string =>
    `${APP_MESSAGES[AppMessage.RetiredFlag](flag.name, BALANCE_SCOPE, flag.retiredIn, REFUSING_TOOL_VERSION)}\n` +
    `${APP_MESSAGES[AppMessage.DoNotPinRetired]()} ${flag.replacement}\n` +
    APP_MESSAGES[AppMessage.SeeFlags](BALANCE_SCOPE);

  it("reads the retired flags from balance's registry: --measurements", () => {
    expect(retiredFlags.map((flag) => flag.name)).toEqual(["--measurements"]);
  });

  it("refuses each retired flag with exactly the catalogue's retired refusal at balance's scope, naming its replacement", () => {
    for (const flag of retiredFlags) {
      const given = { [flag.name.replace(/^-+/, "")]: "x.json" };
      expect(checkUnknownFlags(given, cliRegistry, "balance", REFUSING_TOOL_VERSION)).toBe(retiredRefusal(flag));
    }
  });

  it("refuses a retired flag the registry writes with one dash, naming it as the registry writes it", () => {
    const old = { name: "-old", retiredIn: "0.0.1", replacement: "use --features" };
    const grown: CliRegistry = {
      ...cliRegistry,
      commands: cliRegistry.commands.map((command) =>
        command.name === "balance" ? { ...command, retiredFlags: [...retiredFlags, old] } : command,
      ),
    };
    expect(checkUnknownFlags({ old: "true" }, grown, "balance", REFUSING_TOOL_VERSION)).toBe(retiredRefusal(old));
  });

  it("refuses no flag balance still accepts", () => {
    for (const flag of balance?.flags ?? []) {
      expect(checkUnknownFlags({ [flag.name.replace(/^-+/, "")]: "x" }, cliRegistry, "balance", REFUSING_TOOL_VERSION)).toBeNull();
    }
  });

  it("refuses balance's retired flag given to allocate, which retires none, as unregistered, not retired", () => {
    const toAllocate = checkUnknownFlags({ measurements: "x.json" }, cliRegistry, "allocate", REFUSING_TOOL_VERSION);
    expect(toAllocate).toContain("--measurements");
    expect(toAllocate).not.toMatch(/retired/i);
  });
});
