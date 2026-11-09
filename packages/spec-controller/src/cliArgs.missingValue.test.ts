import { beforeEach, describe, it, expect } from "vitest";
import { balanceCommand, cliRegistry, type FlagSpec } from "./cliRegistry.js";
import { checkMissingValues } from "./cliArgs.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { runBalanceCaptured } from "./runBalance.test-utils.js";
import { printedRefusal, shownText } from "./shownText.test-utils.js";

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
  `${message(AppError.MissingValue, { flag: given, scope: "spec-controller balance", arg: flag.arg ?? "" })}\n` +
  message(AppMessage.SeeFlagsAndValues, { scope: "spec-controller balance" });

describe("[CLM-CLI-058] balance refuses a flag given no value as a usage fault, naming the missing value", () => {

  for (const flag of balanceFlags) {
    if (flag.arg === undefined) continue;
    for (const given of [flag.name, ...(flag.aliases ?? [])]) {
      for (const [shape, argvOf] of MISSING) {
        it(`refuses ${given} ${shape}, naming it, its value and balance's scope, and never the word "true"`, () => {
          const refusal = shownText(checkMissingValues(argvOf(given), cliRegistry, "balance"));
          expect(refusal).toBe(refusalFor(given, flag));
          expect(refusal).not.toMatch(/\btrue\b/);
        });
      }
    }

    it(`accepts ${flag.name} given a value`, () => {
      expect(shownText(checkMissingValues([flag.name, "some-value"], cliRegistry, "balance"))).toBeNull();
    });
  }

  it("runBalance refuses --vitest at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const vitest = valueFlags.find((flag) => flag.name === "--vitest");
    expect(vitest).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/never-ran/features",
      "--package-json", "tests/fixtures/never-ran/package.json",
      "--ci", "tests/fixtures/never-ran",
      "--vitest",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(printedRefusal(AppError.MissingValue, refusalFor("--vitest", vitest as FlagSpec), "balance") + "\n");
    expect(stdout).toBe("");
  });

  it("runBalance refuses --pytest at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const pytest = valueFlags.find((flag) => flag.name === "--pytest");
    expect(pytest).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/never-ran/features",
      "--package-json", "tests/fixtures/never-ran/package.json",
      "--ci", "tests/fixtures/never-ran",
      "--pytest",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(printedRefusal(AppError.MissingValue, refusalFor("--pytest", pytest as FlagSpec), "balance") + "\n");
    expect(stdout).toBe("");
  });

  it("runBalance refuses --jest at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const jest = valueFlags.find((flag) => flag.name === "--jest");
    expect(jest).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/never-ran/features",
      "--package-json", "tests/fixtures/never-ran/package.json",
      "--ci", "tests/fixtures/never-ran",
      "--jest",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(printedRefusal(AppError.MissingValue, refusalFor("--jest", jest as FlagSpec), "balance") + "\n");
    expect(stdout).toBe("");
  });

  it("runBalance refuses --junit at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const junit = valueFlags.find((flag) => flag.name === "--junit");
    expect(junit).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/never-ran/features",
      "--package-json", "tests/fixtures/never-ran/package.json",
      "--ci", "tests/fixtures/never-ran",
      "--junit",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(printedRefusal(AppError.MissingValue, refusalFor("--junit", junit as FlagSpec), "balance") + "\n");
    expect(stdout).toBe("");
  });

  it("runBalance refuses --rspec at the end over an out-of-balance target at exit 2, naming it and its value alone, before it reconciles", () => {
    const rspec = valueFlags.find((flag) => flag.name === "--rspec");
    expect(rspec).toBeDefined();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/never-ran/features",
      "--package-json", "tests/fixtures/never-ran/package.json",
      "--ci", "tests/fixtures/never-ran",
      "--rspec",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(printedRefusal(AppError.MissingValue, refusalFor("--rspec", rspec as FlagSpec), "balance") + "\n");
    expect(stdout).toBe("");
  });

  it("refuses no value flag for a command the registry does not know", () => {
    for (const flag of valueFlags) {
      expect(shownText(checkMissingValues([flag.name], cliRegistry, "blance"))).toBeNull();
    }
  });
});
