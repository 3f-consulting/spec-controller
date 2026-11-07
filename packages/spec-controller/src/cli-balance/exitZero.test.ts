import { describe, it, expect, vi } from "vitest";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { expectRefused } from "./balanceRun.test-utils.js";
import { AppError } from "../messages.js";
import { message } from "../appText.js";
import { CoreMessage, coreMessage, markdownHeading } from "@3f-consulting/spec-controller-core/internal";

describe("[SCN-CLI-021] under --exit-zero a verdict run prints the same report byte for byte and exits 0", () => {
  const EXAMPLES = [
    {
      verdict: "all-balanced",
      argv: [
        "--features", "tests/fixtures/balanced/features",
        "--vitest", "tests/fixtures/balanced/vitest.json",
        "--package-json", "tests/fixtures/balanced/package.json",
        "--ci", "tests/fixtures/balanced",
      ],
      code: 0,
    },
    {
      verdict: "out-of-balance",
      argv: [
        "--features", "tests/fixtures/evidence-observation/features",
        "--vitest", "tests/fixtures/evidence-observation/vitest.json",
        "--ci", "tests/fixtures/evidence-observation",
      ],
      code: 1,
    },
    {
      verdict: "only-Pending-Items under --strict",
      argv: [
        "--features", "tests/fixtures/pending-only/features",
        "--package-json", "tests/fixtures/pending-only/package.json",
        "--ci", "tests/fixtures/pending-only",
        "--strict",
      ],
      code: 3,
    },
    {
      verdict: "balanced-with-claim-code-errors",
      argv: [
        "--features", "tests/fixtures/claim-code-error/features",
        "--vitest", "tests/fixtures/claim-code-error/vitest.json",
        "--package-json", "tests/fixtures/claim-code-error/package.json",
        "--ci", "tests/fixtures/claim-code-error",
      ],
      code: 1,
    },
  ] as const;

  function runPinned(argv: readonly string[]): { stdout: string; exitCode: number } {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-18T12:00:00.000Z"));
    try {
      const { stdout, exitCode } = runBalanceCaptured(argv);
      return { stdout, exitCode };
    } finally {
      vi.useRealTimers();
    }
  }

  for (const example of EXAMPLES) {
    it(`${example.verdict}: exits ${example.code} without the flag and 0 with it, printing the same bytes`, () => {
      const without = runPinned(example.argv);
      const withFlag = runPinned([...example.argv, "--exit-zero"]);

      expect(without.exitCode).toBe(example.code);
      expect(withFlag.exitCode).toBe(0);
      expect(`\n${without.stdout}`).toContain(`\n${markdownHeading(1, coreMessage(CoreMessage.ReportTitle))}`);
      expect(withFlag.stdout).toBe(without.stdout);
    });
  }
});

describe("[SCN-CLI-022] --exit-zero never masks a run that could give no verdict", () => {
  function runWithExitZero(argv: readonly string[]): { exitCode: number; stdout: string; stderr: string } {
    const { exitCode, stdout, stderr } = runBalanceCaptured([...argv, "--exit-zero"]);
    return { exitCode, stdout, stderr };
  }

  it("usage: a supplied --vitest path that does not exist still exits 2, refusing with the missing-input error alone, naming the flag and the path, and reporting nothing", () => {
    const missing = "tests/fixtures/does-not-exist/vitest.missing";
    const run = runWithExitZero([
      "--features", "tests/fixtures/evidence-observation/features",
      "--vitest", missing,
    ]);
    expectRefused({ ...run, report: run.stdout }, message(AppError.InputPathMissing, { flag: "--vitest", path: missing }));
    expect(run.stderr).toContain("--vitest");
    expect(run.stderr).toContain(missing);
  });
});
