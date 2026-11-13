import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "../commands/main.js";
import { exitCodeOf } from "./exitCode.js";

const BALANCED: RunVerdict = { verdict: "balanced" };
const OUT_OF_BALANCE: RunVerdict = { verdict: "out-of-balance" };
const NOT_RECONCILED: RunVerdict = { verdict: "not-reconciled", why: "unsound" };

describe("each run verdict will have its exit code", () => {
  it.each([
    ["CLM-CLI-166", "balanced", 0, BALANCED],
    ["CLM-CLI-167", "out of balance", 1, OUT_OF_BALANCE],
    ["CLM-CLI-168", "not reconciled, because unsound", 3, NOT_RECONCILED],
    ["CLM-CLI-169", "not reconciled, because claim code errors", 3, { verdict: "not-reconciled", why: "claim-code-errors" }],
    ["CLM-CLI-170", "not reconciled, because nothing to reconcile", 3, { verdict: "not-reconciled", why: "nothing-to-reconcile" }],
  ] as const)("[%s] a run that reached the run verdict %s exits %i", (_clm, _verdict, exitCode, runVerdict) => {
    expect(exitCodeOf(runVerdict)).toBe(exitCode);
  });
});

describe("under --exit-zero only an out-of-balance run will exit 0 instead of its code", () => {
  it.each([
    ["CLM-CLI-171", "balanced", 0, BALANCED],
    ["CLM-CLI-172", "out of balance", 0, OUT_OF_BALANCE],
    ["CLM-CLI-173", "not reconciled", 3, NOT_RECONCILED],
  ] as const)("[%s] a run %s exits %i under --exit-zero", (_clm, _ending, underExitZero, runVerdict) => {
    expect(exitCodeOf(runVerdict, { exitZero: true })).toBe(underExitZero);
  });

  it("[CLM-CLI-172] balance run again under --exit-zero exits 0 where it was out of balance at 1", () => {
    const folder = temporaryDirectory("exit-zero-");
    mkdirSync(join(folder, "features"));
    writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
    const quiet = { output: { fd: 1, write: () => {} }, error: { fd: 2, write: () => {} } };
    const balanced = (args: readonly string[]) => main(["balance", "--features", join(folder, "features"), ...args], folder, quiet);

    expect([balanced([]), balanced(["--exit-zero"])]).toEqual([1, 0]);
  });

  // An ending with no verdict never reaches the verdict's exit code.
  it.each([
    ["CLM-CLI-174", "a usage error", ["balance", "--exit-zero", "--bogus"], 2, false],
    ["CLM-CLI-175", "an unexpected error", ["balance", "--exit-zero"], 4, true],
  ] as const)("[%s] a run ending on %s exits %i under --exit-zero", (_clm, _ending, args, exitCode, unexpected) => {
    const streams = {
      output: {
        fd: 1,
        write: () => {
          if (unexpected) throw new Error("the report could not be written");
        },
      },
      error: { fd: 2, write: () => {} },
    };

    expect(main(args, temporaryDirectory("exit-zero-"), streams)).toBe(exitCode);
  });
});
