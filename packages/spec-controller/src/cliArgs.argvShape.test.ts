import { beforeEach, describe, it, expect } from "vitest";
import { balanceCommand, cliRegistry, type CliRegistry, type FlagSpec } from "./cliRegistry.js";
import { checkArgvShape, positionalArguments } from "./cliArgs.js";
import { formatFilePaths } from "./host.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { runBalanceCaptured } from "./runBalance.test-utils.js";
import { printedRefusal, shownText } from "./shownText.test-utils.js";

const balanceFlags: readonly FlagSpec[] = balanceCommand.flags;

let wellFormed: string[];

beforeEach(() => {
  wellFormed = balanceFlags.flatMap((flag) => (flag.arg === undefined ? [flag.name] : [flag.name, "v"]));
});

function withBalanceFlag(flag: FlagSpec): CliRegistry {
  return {
    ...cliRegistry,
    commands: cliRegistry.commands.map((command) =>
      command.name === "balance" ? { ...command, flags: [...command.flags, flag] } : command,
    ),
  };
}

describe("[SCN-CLI-063] balance refuses an argument that is neither a flag nor a flag's value, naming it", () => {
  const BALANCE_SCOPE = "spec-controller balance";
  const notAFlag = (token: string): string =>
    `${message(AppError.NotAFlag, { token, scope: BALANCE_SCOPE })}\n${message(AppMessage.SeeFlags, { scope: BALANCE_SCOPE })}`;

  const NOT_A_FLAG: [string, { argv: string[]; token: string }][] = [
    ["a directory with no flag before it", { argv: ["features"], token: "features" }],
    ["a stray word after the flags", { argv: ["--features", "f", "extra", "--exit-zero"], token: "extra" }],
    ["a single-dash token", { argv: ["--features", "f", "-x"], token: "-x" }],
    ["the command given twice", { argv: ["balance", "--features", "f"], token: "balance" }],
    ["a stray word after a flag's value", { argv: ["--features", "dir", "stray"], token: "stray" }],
  ];

  for (const [shape, { argv, token }] of NOT_A_FLAG) {
    it(`refuses ${shape} at balance's scope, naming it as not a flag`, () => {
      expect(shownText(checkArgvShape(argv, cliRegistry, "balance"))).toBe(notAFlag(token));
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
    expect(stderr).toBe(printedRefusal(AppError.NotAFlag, notAFlag("extra"), "balance") + "\n");
    expect(stdout).toBe("");
  });

  it("accepts every registered flag given once, each value flag with its value", () => {
    expect(wellFormed.length).toBeGreaterThan(balanceFlags.length);
    expect(shownText(checkArgvShape(wellFormed, cliRegistry, "balance"))).toBeNull();
  });

  it("refuses the stray word after a value flag given by its alias, and not the alias's value", () => {
    const grown = withBalanceFlag({ name: "--later", aliases: ["-l"], arg: "<x>", description: "added later" });
    expect(shownText(checkArgvShape(["-l", "v", "stray"], grown, "balance"))).toBe(notAFlag("stray"));
  });

  it("reads as balance's arguments only the words no value flag consumed", () => {
    const argv = ["--features", "dir", "stray", "--strict", "--vitest", "r.json", "--bogus", "other"];
    expect(positionalArguments(argv, cliRegistry, "balance")).toEqual(["stray", "other"]);
  });

  it.each([
    ["accepts a value that is a command's name, --target balance", ["--target", "balance"]],
    ["leaves an unregistered flag and the word after it to @SCN-CLI-009", ["--bogus", "value"]],
  ] as const)("%s", (_title, argv) => {
    expect(shownText(checkArgvShape(argv, cliRegistry, "balance"))).toBeNull();
  });
});

describe("[SCN-CLI-062] balance refuses a value given to a flag that takes none, naming both", () => {
  const BALANCE_SCOPE = "spec-controller balance";
  const refusalFor = (flag: string, value: string): string =>
    `${message(AppError.TakesNoValue, { flag, scope: BALANCE_SCOPE, value })}\n` +
    message(AppMessage.SeeFlagsAndValues, { scope: BALANCE_SCOPE });

  for (const { name: flag, arg } of balanceFlags) {
    if (arg !== undefined) continue;
    it(`refuses ${flag} given a value at balance's scope, naming the flag and the value`, () => {
      expect(shownText(checkArgvShape(["--features", "f", flag, "foo"], cliRegistry, "balance"))).toBe(refusalFor(flag, "foo"));
    });
  }

  it("reads a flag after a value flag as a flag, so --features --strict yes refuses the value given to --strict", () => {
    expect(shownText(checkArgvShape(["--features", "--strict", "yes"], cliRegistry, "balance"))).toBe(refusalFor("--strict", "yes"));
  });
});

describe("[SCN-CLI-064] a flag that does not repeat, given twice, is refused naming the flag, never read as its last value", () => {
  const BALANCE_SCOPE = "spec-controller balance";
  const givenTwice = (flag: string): string =>
    `${message(AppError.GivenTwice, { flag, scope: BALANCE_SCOPE })}\n${message(AppMessage.SeeFlags, { scope: BALANCE_SCOPE })}`;

  for (const flag of balanceFlags) {
    if (flag.repeatable === true) continue;
    const given = flag.arg === undefined ? [flag.name] : [flag.name, "v"];
    it(`refuses ${flag.name} given twice, equal values and all, naming it at balance's scope`, () => {
      expect(shownText(checkArgvShape([...given, "--features", "f", ...given], cliRegistry, "balance"))).toBe(givenTwice(flag.name));
    });
  }

  it("refuses a flag given by its name and then by its alias", () => {
    expect(shownText(checkArgvShape(["--help", "-h"], cliRegistry, "balance"))).toBe(givenTwice("-h"));
  });

  it("reads --format given twice as the list it is, both values read", () => {
    const argv = ["--format", "json:a.json", "--format", "md:b.md"];
    expect(shownText(checkArgvShape(argv, cliRegistry, "balance"))).toBeNull();
    expect(formatFilePaths(argv)).toEqual(["a.json", "b.md"]);
  });
});

describe("[SCN-CLI-065] a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice", () => {
  const BALANCE_SCOPE = "spec-controller balance";
  const equalsForm = (written: string, spelling: string): string =>
    `${message(AppError.EqualsForm, { token: written, scope: BALANCE_SCOPE, spelling })}\n${message(AppMessage.SeeFlags, { scope: BALANCE_SCOPE })}`;

  for (const flag of balanceFlags) {
    const written = `${flag.name}=v`;
    const spelling = flag.arg === undefined ? flag.name : `${flag.name} v`;
    it(`refuses ${written} at balance's scope, giving '${spelling}'`, () => {
      expect(shownText(checkArgvShape(["--features", "f", written], cliRegistry, "balance"))).toBe(equalsForm(written, spelling));
    });
  }

  it.each([
    ["refuses --features=dir, giving the value flag and its value as '--features dir'", "--features=dir", "--features dir"],
    ["gives the registry's value placeholder for a form written with no value", "--features=", "--features <dir>"],
    ["refuses the form of a flag the scope does not have, before the unknown-flag check can advise a pin", "--store=/s", "--store /s"],
  ] as const)("%s", (_title, written, spelling) => {
    expect(shownText(checkArgvShape([written], cliRegistry, "balance"))).toBe(equalsForm(written, spelling));
  });

  it.each([
    ["refuses --strict=true, giving the switch alone as '--strict'", "--strict=true", "--strict"],
    ["refuses --unknown=x, a flag no scope registers, giving '--unknown x'", "--unknown=x", "--unknown x"],
    ["gives a generic value placeholder for an unregistered flag written with no value", "--unknown=", "--unknown <value>"],
  ] as const)("%s", (_title, written, spelling) => {
    expect(shownText(checkArgvShape(["--features", "f", written], cliRegistry, "balance"))).toBe(equalsForm(written, spelling));
  });
});
