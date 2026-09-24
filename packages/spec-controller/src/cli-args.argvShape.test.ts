/**
 * The @unit arms of 3F-3672's Rule — every argument to a command is read as what it is, or refused.
 * The @e2e arms in tests/steps/cliBalance.steps.ts prove the same refusals through the real binary.
 *
 * Which flags take a value, which take none and which repeat are read from the registry, never
 * listed here, so a flag registered later is asserted without a new row. The wording is never
 * pinned (features/message-catalogue.feature): only the token named and the kind of fault.
 */

import { describe, it, expect } from "vitest";
import { cliRegistry, type CliRegistry, type FlagSpec } from "./cli-registry.js";
import { checkArgvShape } from "./cli-args.js";

const balanceFlags: readonly FlagSpec[] = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];

/** Every balance flag once, each value flag with a value: an argv with nothing wrong in it. */
const wellFormed: string[] = balanceFlags.flatMap((flag) => (flag.arg === undefined ? [flag.name] : [flag.name, "v"]));

/** The registry with one more balance flag, as a later version would register it. */
function withBalanceFlag(flag: FlagSpec): CliRegistry {
  return {
    ...cliRegistry,
    commands: cliRegistry.commands.map((command) =>
      command.name === "balance" ? { ...command, flags: [...command.flags, flag] } : command,
    ),
  };
}

/** True when one line of the refusal names the token together with the kind of fault. */
function namesOnOneLine(refusal: string | null, token: string, fault: RegExp): boolean {
  return (refusal ?? "").split("\n").some((line) => line.includes(token) && fault.test(line));
}

describe("[SCN-CLI-063] balance refuses an argument that is neither a flag nor a flag's value, naming it", () => {
  const NOT_A_FLAG: Record<string, { argv: string[]; token: string }> = {
    "a directory with no flag before it": { argv: ["features"], token: "features" },
    "a stray word after the flags": { argv: ["--features", "f", "extra", "--exit-zero"], token: "extra" },
    "a single-dash token": { argv: ["--features", "f", "-x"], token: "-x" },
    "the command given twice": { argv: ["balance", "--features", "f"], token: "balance" },
  };

  for (const [shape, { argv, token }] of Object.entries(NOT_A_FLAG)) {
    it(`refuses ${shape}, naming it as not a flag`, () => {
      const refusal = checkArgvShape(argv, cliRegistry, "balance");
      expect(refusal).not.toBeNull();
      expect(namesOnOneLine(refusal, token, /not a flag/i)).toBe(true);
    });
  }

  it("accepts every registered flag given once, each value flag with its value", () => {
    expect(wellFormed.length).toBeGreaterThan(balanceFlags.length);
    expect(checkArgvShape(wellFormed, cliRegistry, "balance")).toBeNull();
  });

  it("leaves an unregistered flag and the word after it to @SCN-CLI-009", () => {
    expect(checkArgvShape(["--bogus", "value"], cliRegistry, "balance")).toBeNull();
  });

  it("reads the value of a value flag registered later, with no new code", () => {
    const grown = withBalanceFlag({ name: "--later", arg: "<x>", description: "added later" });
    expect(checkArgvShape(["--later", "v"], grown, "balance")).toBeNull();
  });
});

describe("[SCN-CLI-062] balance refuses a value given to a flag that takes none, naming both", () => {
  const takesNoValue = balanceFlags.filter((flag) => flag.arg === undefined).map((flag) => flag.name);

  it("reads the flags that take no value from the registry, and finds --strict and --exit-zero among them", () => {
    expect(takesNoValue).toEqual(expect.arrayContaining(["--strict", "--exit-zero"]));
  });

  for (const flag of takesNoValue) {
    it(`refuses ${flag} given a value, naming the flag and the value on one line`, () => {
      const refusal = checkArgvShape(["--features", "f", flag, "foo"], cliRegistry, "balance");
      expect(namesOnOneLine(refusal, flag, /takes no value/i)).toBe(true);
      expect(namesOnOneLine(refusal, "foo", /takes no value/i)).toBe(true);
    });

    it(`accepts ${flag} followed by the next flag`, () => {
      expect(checkArgvShape([flag, "--features", "f"], cliRegistry, "balance")).toBeNull();
    });
  }

  it("refuses a value given to a flag registered later that takes none, with no new code", () => {
    const grown = withBalanceFlag({ name: "--later", description: "added later" });
    expect(namesOnOneLine(checkArgvShape(["--later", "foo"], grown, "balance"), "--later", /takes no value/i)).toBe(
      true,
    );
  });
});

describe("[SCN-CLI-064] a flag that does not repeat, given twice, is refused naming the flag, never read as its last value", () => {
  const once = balanceFlags.filter((flag) => flag.repeatable !== true);
  const repeatable = balanceFlags.filter((flag) => flag.repeatable === true).map((flag) => flag.name);

  it("reads the one repeatable flag from the registry: --format", () => {
    expect(repeatable).toEqual(["--format"]);
  });

  for (const flag of once) {
    const given = flag.arg === undefined ? [flag.name] : [flag.name, "v"];
    it(`refuses ${flag.name} given twice, equal values and all, naming it`, () => {
      const refusal = checkArgvShape([...given, "--features", "f", ...given], cliRegistry, "balance");
      expect(namesOnOneLine(refusal, flag.name, /more than once/i)).toBe(true);
    });
  }

  it("refuses a flag given by its name and then by its alias", () => {
    expect(namesOnOneLine(checkArgvShape(["--help", "-h"], cliRegistry, "balance"), "-h", /more than once/i)).toBe(true);
  });

  it("reads --format given twice as the list it is", () => {
    expect(checkArgvShape(["--format", "md", "--format", "json:r.json"], cliRegistry, "balance")).toBeNull();
  });

  it("reads repeatable from the registry, for a flag registered later", () => {
    const repeats = withBalanceFlag({ name: "--later", arg: "<x>", repeatable: true, description: "added later" });
    const once = withBalanceFlag({ name: "--later", arg: "<x>", description: "added later" });
    expect(checkArgvShape(["--later", "a", "--later", "b"], repeats, "balance")).toBeNull();
    expect(namesOnOneLine(checkArgvShape(["--later", "a", "--later", "b"], once, "balance"), "--later", /more than once/i)).toBe(
      true,
    );
  });
});

describe("[SCN-CLI-065] a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice", () => {
  /** True when the refusal names the form as not read, gives the spelling, and gives no other advice. */
  function refusesTheForm(refusal: string | null, written: string, spelling: string): boolean {
    return (
      namesOnOneLine(refusal, written, /not read/i) &&
      (refusal ?? "").includes(`'${spelling}'`) &&
      !/\bpin\b|unknown|before the command/i.test(refusal ?? "")
    );
  }

  for (const flag of balanceFlags) {
    const written = `${flag.name}=v`;
    const spelling = flag.arg === undefined ? flag.name : `${flag.name} v`;
    it(`refuses ${written}, giving '${spelling}'`, () => {
      expect(refusesTheForm(checkArgvShape(["--features", "f", written], cliRegistry, "balance"), written, spelling)).toBe(
        true,
      );
    });
  }

  it("gives the registry's value placeholder for a form written with no value", () => {
    expect(refusesTheForm(checkArgvShape(["--features="], cliRegistry, "balance"), "--features=", "--features <dir>")).toBe(
      true,
    );
  });

  it("refuses the form of a flag the scope does not have, before the unknown-flag check can advise a pin", () => {
    expect(refusesTheForm(checkArgvShape(["--store=/s"], cliRegistry, "balance"), "--store=/s", "--store /s")).toBe(true);
  });
});
