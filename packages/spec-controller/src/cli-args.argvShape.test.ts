import { describe, it, expect } from "vitest";
import { cliRegistry, type CliRegistry, type FlagSpec } from "./cli-registry.js";
import { checkArgvShape, positionalArguments } from "./cli-args.js";
import { formatFilePaths } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";
import { runBalanceCaptured } from "../test-support/runBalance.js";

const balanceFlags: readonly FlagSpec[] = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];

const wellFormed: string[] = balanceFlags.flatMap((flag) => (flag.arg === undefined ? [flag.name] : [flag.name, "v"]));

function withBalanceFlag(flag: FlagSpec): CliRegistry {
  return {
    ...cliRegistry,
    commands: cliRegistry.commands.map((command) =>
      command.name === "balance" ? { ...command, flags: [...command.flags, flag] } : command,
    ),
  };
}

function namesOnOneLine(refusal: string | null, token: string, fault: RegExp): boolean {
  return (refusal ?? "").split("\n").some((line) => line.includes(token) && fault.test(line));
}

describe("[SCN-CLI-063] balance refuses an argument that is neither a flag nor a flag's value, naming it", () => {
  const BALANCE_SCOPE = "spec-controller balance";
  const notAFlag = (token: string): string =>
    `${APP_MESSAGES[AppMessage.NotAFlag](token, BALANCE_SCOPE)}\n${APP_MESSAGES[AppMessage.SeeFlags](BALANCE_SCOPE)}`;

  const NOT_A_FLAG: Record<string, { argv: string[]; token: string }> = {
    "a directory with no flag before it": { argv: ["features"], token: "features" },
    "a stray word after the flags": { argv: ["--features", "f", "extra", "--exit-zero"], token: "extra" },
    "a single-dash token": { argv: ["--features", "f", "-x"], token: "-x" },
    "the command given twice": { argv: ["balance", "--features", "f"], token: "balance" },
    "a stray word after a flag's value": { argv: ["--features", "dir", "stray"], token: "stray" },
  };

  for (const [shape, { argv, token }] of Object.entries(NOT_A_FLAG)) {
    it(`refuses ${shape} at balance's scope, naming it as not a flag`, () => {
      expect(checkArgvShape(argv, cliRegistry, "balance")).toBe(notAFlag(token));
    });
  }

  it("runBalance refuses a stray word after the target's flags under --exit-zero at exit 2, naming it alone, before it reconciles", () => {
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/balanced/features",
      "--vitest", "tests/fixtures/balanced/vitest.json",
      "--package-json", "tests/fixtures/balanced/package.json",
      "--ci", "tests/fixtures/balanced",
      "extra",
      "--exit-zero",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(notAFlag("extra") + "\n");
    expect(stdout).toBe("");
  });

  it("accepts every registered flag given once, each value flag with its value", () => {
    expect(wellFormed.length).toBeGreaterThan(balanceFlags.length);
    expect(checkArgvShape(wellFormed, cliRegistry, "balance")).toBeNull();
  });

  it("accepts --features dir --vitest r.json, each value consumed by its flag", () => {
    expect(checkArgvShape(["--features", "dir", "--vitest", "r.json"], cliRegistry, "balance")).toBeNull();
  });

  it("accepts a value that is a command's name, --target balance", () => {
    expect(checkArgvShape(["--target", "balance"], cliRegistry, "balance")).toBeNull();
  });

  it("refuses the stray word after a value flag given by its alias, and not the alias's value", () => {
    const grown = withBalanceFlag({ name: "--later", aliases: ["-l"], arg: "<x>", description: "added later" });
    expect(checkArgvShape(["-l", "v", "stray"], grown, "balance")).toBe(notAFlag("stray"));
  });

  it("reads as balance's arguments only the words no value flag consumed", () => {
    const argv = ["--features", "dir", "stray", "--strict", "--vitest", "r.json", "--bogus", "other"];
    expect(positionalArguments(argv, cliRegistry, "balance")).toEqual(["stray", "other"]);
  });

  it("walks past every value flag's value, so no value is read as an argument", () => {
    expect(positionalArguments(wellFormed, cliRegistry, "balance")).toEqual([]);
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

  const BALANCE_SCOPE = "spec-controller balance";
  const refusalFor = (flag: string, value: string): string =>
    `${APP_MESSAGES[AppMessage.TakesNoValue](flag, BALANCE_SCOPE, value)}\n` +
    APP_MESSAGES[AppMessage.SeeFlagsAndValues](BALANCE_SCOPE);

  it("reads the flags that take no value from the registry, and finds --strict and --exit-zero among them", () => {
    expect(takesNoValue).toEqual(expect.arrayContaining(["--strict", "--exit-zero"]));
  });

  for (const flag of takesNoValue) {
    it(`refuses ${flag} given a value at balance's scope, naming the flag and the value`, () => {
      expect(checkArgvShape(["--features", "f", flag, "foo"], cliRegistry, "balance")).toBe(refusalFor(flag, "foo"));
    });

    it(`accepts ${flag} followed by the next flag`, () => {
      expect(checkArgvShape([flag, "--features", "f"], cliRegistry, "balance")).toBeNull();
    });

    it(`accepts ${flag} as the last argument`, () => {
      expect(checkArgvShape(["--features", "f", flag], cliRegistry, "balance")).toBeNull();
    });
  }

  it("refuses --strict yes, naming --strict and yes", () => {
    expect(checkArgvShape(["--strict", "yes"], cliRegistry, "balance")).toBe(refusalFor("--strict", "yes"));
  });

  it("accepts --strict --exit-zero, reading the flag after --strict as a flag", () => {
    expect(checkArgvShape(["--strict", "--exit-zero"], cliRegistry, "balance")).toBeNull();
  });

  it("reads a flag after a value flag as a flag, so --features --strict yes refuses the value given to --strict", () => {
    expect(checkArgvShape(["--features", "--strict", "yes"], cliRegistry, "balance")).toBe(refusalFor("--strict", "yes"));
  });

  it("refuses a value given to a flag registered later that takes none, with no new code", () => {
    const grown = withBalanceFlag({ name: "--later", description: "added later" });
    expect(checkArgvShape(["--later", "foo"], grown, "balance")).toBe(refusalFor("--later", "foo"));
  });
});

describe("[SCN-CLI-064] a flag that does not repeat, given twice, is refused naming the flag, never read as its last value", () => {
  const once = balanceFlags.filter((flag) => flag.repeatable !== true);
  const repeatable = balanceFlags.filter((flag) => flag.repeatable === true).map((flag) => flag.name);

  it("reads the one repeatable flag from the registry: --format", () => {
    expect(repeatable).toEqual(["--format"]);
  });

  const BALANCE_SCOPE = "spec-controller balance";
  const givenTwice = (flag: string): string =>
    `${APP_MESSAGES[AppMessage.GivenTwice](flag, BALANCE_SCOPE)}\n${APP_MESSAGES[AppMessage.SeeFlags](BALANCE_SCOPE)}`;

  for (const flag of once) {
    const given = flag.arg === undefined ? [flag.name] : [flag.name, "v"];
    it(`refuses ${flag.name} given twice, equal values and all, naming it at balance's scope`, () => {
      expect(checkArgvShape([...given, "--features", "f", ...given], cliRegistry, "balance")).toBe(givenTwice(flag.name));
    });
  }

  it("refuses --features given twice with two values at balance's scope, reading neither", () => {
    expect(checkArgvShape(["--features", "x", "--features", "y"], cliRegistry, "balance")).toBe(givenTwice("--features"));
  });

  it("refuses a flag given by its name and then by its alias", () => {
    expect(checkArgvShape(["--help", "-h"], cliRegistry, "balance")).toBe(givenTwice("-h"));
  });

  it("reads --format given twice as the list it is, both values read", () => {
    const argv = ["--format", "json:a.json", "--format", "md:b.md"];
    expect(checkArgvShape(argv, cliRegistry, "balance")).toBeNull();
    expect(formatFilePaths(argv)).toEqual(["a.json", "b.md"]);
  });

  it("reads repeatable from the registry, for a flag registered later", () => {
    const repeats = withBalanceFlag({ name: "--later", arg: "<x>", repeatable: true, description: "added later" });
    const once = withBalanceFlag({ name: "--later", arg: "<x>", description: "added later" });
    expect(checkArgvShape(["--later", "a", "--later", "b"], repeats, "balance")).toBeNull();
    expect(checkArgvShape(["--later", "a", "--later", "b"], once, "balance")).toBe(givenTwice("--later"));
  });
});

describe("[SCN-CLI-065] a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice", () => {
  const BALANCE_SCOPE = "spec-controller balance";
  const equalsForm = (written: string, spelling: string): string =>
    `${APP_MESSAGES[AppMessage.EqualsForm](written, BALANCE_SCOPE, spelling)}\n${APP_MESSAGES[AppMessage.SeeFlags](BALANCE_SCOPE)}`;

  for (const flag of balanceFlags) {
    const written = `${flag.name}=v`;
    const spelling = flag.arg === undefined ? flag.name : `${flag.name} v`;
    it(`refuses ${written} at balance's scope, giving '${spelling}'`, () => {
      expect(checkArgvShape(["--features", "f", written], cliRegistry, "balance")).toBe(equalsForm(written, spelling));
    });
  }

  it("refuses --features=dir, giving the value flag and its value as '--features dir'", () => {
    expect(checkArgvShape(["--features=dir"], cliRegistry, "balance")).toBe(equalsForm("--features=dir", "--features dir"));
  });

  it("refuses --strict=true, giving the switch alone as '--strict'", () => {
    expect(checkArgvShape(["--features", "f", "--strict=true"], cliRegistry, "balance")).toBe(
      equalsForm("--strict=true", "--strict"),
    );
  });

  it("gives the registry's value placeholder for a form written with no value", () => {
    expect(checkArgvShape(["--features="], cliRegistry, "balance")).toBe(equalsForm("--features=", "--features <dir>"));
  });

  it("refuses --unknown=x, a flag no scope registers, giving '--unknown x'", () => {
    expect(checkArgvShape(["--features", "f", "--unknown=x"], cliRegistry, "balance")).toBe(
      equalsForm("--unknown=x", "--unknown x"),
    );
  });

  it("gives a generic value placeholder for an unregistered flag written with no value", () => {
    expect(checkArgvShape(["--features", "f", "--unknown="], cliRegistry, "balance")).toBe(
      equalsForm("--unknown=", "--unknown <value>"),
    );
  });

  it("refuses the form of a flag the scope does not have, before the unknown-flag check can advise a pin", () => {
    expect(checkArgvShape(["--store=/s"], cliRegistry, "balance")).toBe(equalsForm("--store=/s", "--store /s"));
  });
});
