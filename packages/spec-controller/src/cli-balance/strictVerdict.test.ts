import { describe, it, expect } from "vitest";
import { runBalanceCaptured } from "../../test-support/runBalance.js";
import { headlineExit } from "./balanceRun.testkit.js";

function runInProcess(argv: readonly string[]): { stdout: string; exitCode: number } {
  const { stdout, exitCode } = runBalanceCaptured(argv);
  return { stdout, exitCode };
}

const PENDING_ONLY = [
  "--features", "tests/fixtures/pending-only/features",
  "--package-json", "tests/fixtures/pending-only/package.json",
  "--ci", "tests/fixtures/pending-only",
];

describe("[SCN-CLI-011] a live --strict run over Pending Items exits 3 and its headline names exit 3", () => {
  it("names the code the process leaves, under --strict", () => {
    const run = runInProcess([...PENDING_ONLY, "--strict"]);
    expect(run.exitCode).toBe(3);
    expect(headlineExit(run.stdout)).toBe(3);
  });

  it("names exit 0 without --strict, the code the process leaves then", () => {
    const run = runInProcess(PENDING_ONLY);
    expect(run.exitCode).toBe(0);
    expect(headlineExit(run.stdout)).toBe(0);
  });
});
