import { describe, it, expect } from "vitest";
import { cliRegistry, type CliRegistry, type FlagSpec } from "./cli-registry.js";
import { checkMissingValues } from "./cli-args.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";
import { runBalanceCaptured } from "../test-support/runBalance.js";

const balanceFlags = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];
const valueFlags = balanceFlags.filter((flag) => flag.arg !== undefined);
const booleanFlags = balanceFlags.filter((flag) => flag.arg === undefined).map((flag) => flag.name);

const MISSING: Record<string, (flag: string) => string[]> = {
  "at the end": (flag) => ["--features", "f", flag],
  "followed by a flag": (flag) => [flag, "--exit-zero", "--features", "f"],
  "with an empty value": (flag) => ["--features", "f", flag, ""],
};

const refusalFor = (given: string, flag: FlagSpec): string =>
  `${APP_MESSAGES[AppMessage.MissingValue](given, "spec-controller balance", flag.arg ?? "")}\n` +
  APP_MESSAGES[AppMessage.SeeFlagsAndValues]("spec-controller balance");

const withBalanceFlag = (flag: FlagSpec): CliRegistry => ({
  ...cliRegistry,
  commands: cliRegistry.commands.map((command) =>
    command.name === "balance" ? { ...command, flags: [...command.flags, flag] } : command,
  ),
});

describe("[SCN-CLI-058] balance refuses a flag given no value as a usage fault, naming the missing value", () => {
  it("reads its value flags from the registry, and finds all ten", () => {
    expect(valueFlags).toHaveLength(10);
  });

  for (const flag of valueFlags) {
    for (const given of [flag.name, ...(flag.aliases ?? [])]) {
      for (const [shape, argvOf] of Object.entries(MISSING)) {
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

  it("never asks a flag that takes no value for one", () => {
    for (const flag of booleanFlags) {
      expect(checkMissingValues(["--features", "f", flag], cliRegistry, "balance")).toBeNull();
    }
  });

  it("refuses no value flag for a command the registry does not know", () => {
    for (const flag of valueFlags) {
      expect(checkMissingValues([flag.name], cliRegistry, "blance")).toBeNull();
    }
  });

  it("refuses a value flag registered later, with no new code", () => {
    const later: FlagSpec = { name: "--later", arg: "<x>", description: "added later" };
    expect(checkMissingValues(["--later"], withBalanceFlag(later), "balance")).toBe(refusalFor("--later", later));
  });

  it("names an alias registered later as it was written, not by the flag's name", () => {
    const later: FlagSpec = { name: "--later", aliases: ["-l"], arg: "<x>", description: "added later" };
    expect(checkMissingValues(["-l", "--exit-zero"], withBalanceFlag(later), "balance")).toBe(refusalFor("-l", later));
  });
});
