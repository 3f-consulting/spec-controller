import { beforeEach, describe, it, expect } from "vitest";
import { balanceCommand, cliRegistry, type FlagSpec } from "./cli-registry.js";
import { checkMissingValues } from "./cli-args.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";
import { runBalanceCaptured } from "../test-support/runBalance.js";

const balanceFlags: readonly FlagSpec[] = balanceCommand.flags;

let valueFlags: FlagSpec[];

beforeEach(() => {
  valueFlags = balanceFlags.filter((flag) => flag.arg !== undefined);
});

const MISSING: [string, (flag: string) => string[]][] = [
  ["at the end", (flag) => ["--features", "f", flag]],
  ["followed by a flag", (flag) => [flag, "--exit-zero", "--features", "f"]],
  ["with an empty value", (flag) => ["--features", "f", flag, ""]],
];

const refusalFor = (given: string, flag: FlagSpec): string =>
  `${APP_MESSAGES[AppMessage.MissingValue](given, "spec-controller balance", flag.arg ?? "")}\n` +
  APP_MESSAGES[AppMessage.SeeFlagsAndValues]("spec-controller balance");

describe("[SCN-CLI-058] balance refuses a flag given no value as a usage fault, naming the missing value", () => {

  for (const flag of balanceFlags) {
    if (flag.arg === undefined) continue;
    for (const given of [flag.name, ...(flag.aliases ?? [])]) {
      for (const [shape, argvOf] of MISSING) {
        it(`refuses ${given} ${shape}, naming it, its value and balance's scope, and never the word "true"`, () => {
          const refusal = checkMissingValues(argvOf(given), cliRegistry, "balance");
          expect(refusal).toBe(refusalFor(given, flag));
          expect(refusal).not.toMatch(/\btrue\b/);
        });
      }
    }

    it(`accepts ${flag.name} given a value`, () => {
      expect(checkMissingValues([flag.name, "some-value"], cliRegistry, "balance")).toBeNull();
    });
  }

  it("runBalance refuses --vitest at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const vitest = valueFlags.find((flag) => flag.name === "--vitest");
    expect(vitest).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/broken/features",
      "--package-json", "tests/fixtures/broken/package.json",
      "--ci", "tests/fixtures/broken",
      "--vitest",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(refusalFor("--vitest", vitest as FlagSpec) + "\n");
    expect(stdout).toBe("");
  });

  it("runBalance refuses --pytest at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const pytest = valueFlags.find((flag) => flag.name === "--pytest");
    expect(pytest).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/broken/features",
      "--package-json", "tests/fixtures/broken/package.json",
      "--ci", "tests/fixtures/broken",
      "--pytest",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(refusalFor("--pytest", pytest as FlagSpec) + "\n");
    expect(stdout).toBe("");
  });

  it("runBalance refuses --jest at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const jest = valueFlags.find((flag) => flag.name === "--jest");
    expect(jest).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/broken/features",
      "--package-json", "tests/fixtures/broken/package.json",
      "--ci", "tests/fixtures/broken",
      "--jest",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(refusalFor("--jest", jest as FlagSpec) + "\n");
    expect(stdout).toBe("");
  });

  it("runBalance refuses --junit at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const junit = valueFlags.find((flag) => flag.name === "--junit");
    expect(junit).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/broken/features",
      "--package-json", "tests/fixtures/broken/package.json",
      "--ci", "tests/fixtures/broken",
      "--junit",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(refusalFor("--junit", junit as FlagSpec) + "\n");
    expect(stdout).toBe("");
  });

  it("refuses no value flag for a command the registry does not know", () => {
    for (const flag of valueFlags) {
      expect(checkMissingValues([flag.name], cliRegistry, "blance")).toBeNull();
    }
  });
});
