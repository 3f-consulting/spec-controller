/**
 * The @unit arm of @SCN-CLI-058 — a flag that takes a value, given none, is refused (3F-3639).
 * The @e2e arm in tests/steps/cliBalance.steps.ts proves the same refusal through the real binary.
 *
 * Every row below is derived from the registry, never listed: the flags that take a value are the
 * ones with a value placeholder, so a flag registered later is asserted here without a new row.
 * The wording is never pinned (features/message-catalogue.feature) — only that the refusal names the
 * flag, and never names the word a missing value used to become.
 */

import { describe, it, expect } from "vitest";
import { cliRegistry, type CliRegistry } from "./cli-registry.js";
import { checkMissingValues } from "./cli-args.js";

const balanceFlags = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];
const valueFlags = balanceFlags.filter((flag) => flag.arg !== undefined).map((flag) => flag.name);
const booleanFlags = balanceFlags.filter((flag) => flag.arg === undefined).map((flag) => flag.name);

/** The three ways a value goes missing: nothing after the flag, a flag after it, an empty one. */
const MISSING: Record<string, (flag: string) => string[]> = {
  "at the end": (flag) => ["--features", "f", flag],
  "followed by a flag": (flag) => [flag, "--exit-zero", "--features", "f"],
  "with an empty value": (flag) => ["--features", "f", flag, ""],
};

describe("[SCN-CLI-058] balance refuses a flag given no value as a usage fault, naming the missing value", () => {
  it("reads its value flags from the registry, and finds all ten", () => {
    expect(valueFlags).toHaveLength(10);
  });

  for (const flag of valueFlags) {
    for (const [shape, argvOf] of Object.entries(MISSING)) {
      it(`refuses ${flag} ${shape}, naming the flag and never the word "true"`, () => {
        const refusal = checkMissingValues(argvOf(flag), cliRegistry, "balance");
        expect(refusal).not.toBeNull();
        expect(refusal).toContain(flag);
        expect(refusal).not.toMatch(/\btrue\b/);
      });
    }

    it(`accepts ${flag} given a value`, () => {
      expect(checkMissingValues([flag, "some-value"], cliRegistry, "balance")).toBeNull();
    });
  }

  it("never asks a flag that takes no value for one", () => {
    for (const flag of booleanFlags) {
      expect(checkMissingValues(["--features", "f", flag], cliRegistry, "balance")).toBeNull();
    }
  });

  it("refuses a value flag registered later, with no new code", () => {
    const grown: CliRegistry = {
      ...cliRegistry,
      commands: cliRegistry.commands.map((command) =>
        command.name === "balance"
          ? { ...command, flags: [...command.flags, { name: "--later", arg: "<x>", description: "added later" }] }
          : command,
      ),
    };
    expect(checkMissingValues(["--later"], grown, "balance")).toContain("--later");
  });
});
