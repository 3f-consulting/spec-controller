/**
 * The `--exit-zero` arm of `runBalance`, in-process. Its own file rather than a
 * block in `cli.test.ts` because that file sits at the 400-line standard the complexity gate holds a
 * touched file to.
 */

import { describe, it, expect, vi } from "vitest";
import { runBalance } from "./cli.js";

/**
 * `--exit-zero` moves the VERDICT codes (1, 3) to 0 and leaves the report
 * byte-identical. In-process, so the clock is pinned and the comparison is the whole stdout with no
 * mask: any byte the flag changed would show here, the provenance line included.
 */
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
      // Every account balances, and one code is misfiled: a verdict-class 1, which
      // --exit-zero moves like any other (operator ruling, 2026-09-24).
      verdict: "balanced-with-scenario-code-errors",
      argv: [
        "--features", "tests/fixtures/scenario-code-error/features",
        "--vitest", "tests/fixtures/scenario-code-error/vitest.json",
        "--package-json", "tests/fixtures/scenario-code-error/package.json",
        "--ci", "tests/fixtures/scenario-code-error",
      ],
      code: 1,
    },
  ] as const;

  /** Run `balance` in-process at a pinned instant; return what it printed and the status it left. */
  function runPinned(argv: readonly string[]): { stdout: string; exitCode: number } {
    const savedExitCode = process.exitCode;
    process.exitCode = 0;
    const chunks: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      });
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-18T12:00:00.000Z"));
    try {
      runBalance([...argv]);
      return { stdout: chunks.join(""), exitCode: Number(process.exitCode ?? 0) };
    } finally {
      vi.useRealTimers();
      errSpy.mockRestore();
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  }

  for (const example of EXAMPLES) {
    it(`${example.verdict}: exits ${example.code} without the flag and 0 with it, printing the same bytes`, () => {
      const without = runPinned(example.argv);
      const withFlag = runPinned([...example.argv, "--exit-zero"]);

      expect(without.exitCode).toBe(example.code);
      expect(withFlag.exitCode).toBe(0);
      expect(without.stdout).toMatch(/^# Evidence Reconciliation/m);
      expect(withFlag.stdout).toBe(without.stdout);
    });
  }
});

/**
 * `--exit-zero` never masks a run that could give no verdict. Usage (2), unsound (4) and
 * nothing-to-reconcile (5) each set `process.exitCode`, and are read from there.
 */
describe("[SCN-CLI-022] --exit-zero never masks a run that could give no verdict", () => {
  /** Run `balance --exit-zero` in-process; return the status it left and what it wrote to stderr. */
  function runWithExitZero(argv: readonly string[]): { exitCode: number; stderr: string } {
    const savedExitCode = process.exitCode;
    process.exitCode = 0;
    const errChunks: string[] = [];
    const outSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const errSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        errChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      });
    try {
      runBalance([...argv, "--exit-zero"]);
      return { exitCode: Number(process.exitCode ?? 0), stderr: errChunks.join("") };
    } finally {
      errSpy.mockRestore();
      outSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  }

  it("usage: a supplied --vitest path that does not exist still exits 2, naming the flag and the path", () => {
    const missing = "tests/fixtures/does-not-exist/vitest.missing";
    const run = runWithExitZero([
      "--features", "tests/fixtures/evidence-observation/features",
      "--vitest", missing,
    ]);
    expect(run.exitCode).toBe(2);
    // The missing-path refusal, not the unknown-flag one — an unregistered --exit-zero also exits 2.
    expect(run.stderr).toContain("--vitest");
    expect(run.stderr).toContain(missing);
  });

  it("unsound: a collection-failed suite still exits 4", () => {
    const run = runWithExitZero([
      "--features", "tests/fixtures/broken/features",
      "--vitest", "tests/fixtures/broken/vitest.json",
      "--package-json", "tests/fixtures/broken/package.json",
      "--ci", "tests/fixtures/broken",
    ]);
    expect(run.exitCode).toBe(4);
  });

  it("unsound beside a misfiled code: unsound pre-empts the scenario code error, and still exits 4", () => {
    const run = runWithExitZero([
      "--features", "tests/fixtures/unsound-code-error/features",
      "--vitest", "tests/fixtures/unsound-code-error/vitest.json",
      "--package-json", "tests/fixtures/unsound-code-error/package.json",
      "--ci", "tests/fixtures/unsound-code-error",
    ]);
    expect(run.exitCode).toBe(4);
  });

  it("nothing to reconcile: a target that declared and produced nothing still exits 5", () => {
    const run = runWithExitZero([
      "--features", "tests/fixtures/nothing-to-reconcile/features",
      "--package-json", "tests/fixtures/nothing-to-reconcile/package.json",
      "--ci", "tests/fixtures/nothing-to-reconcile",
    ]);
    expect(run.exitCode).toBe(5);
  });
});
