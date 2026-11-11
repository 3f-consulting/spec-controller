import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exitCodeOf } from "./exitStatus.js";
import { closedPipe, noVerdictLine } from "./crashGuards.test-utils.js";
import { main } from "../commands/main.js";
import { message } from "../messages/appText.js";
import { AppError } from "../messages/messages.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

interface Ended {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

const TARGET = (): string => fileURLToPath(new URL("../../../../tests/fixtures/evidence-observation", import.meta.url));

function balanceArgv(...flags: string[]): string[] {
  const target = TARGET();
  return ["balance", "--features", join(target, "features"), "--vitest", join(target, "vitest.json"), "--ci", target, ...flags];
}

function ended(argv: string[], onStdout: (chunk: string) => void): Ended {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    onStdout(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  try {
    main(argv);
    return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
  } finally {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  }
}

const quietly = (): void => {};

const onAClosedPipe = (): never => {
  throw closedPipe();
};

describe("each run verdict will have its exit code", () => {
  it.each([
    ["CLM-CLI-166", "balanced", (): RunVerdict => ({ verdict: "balanced" }), 0],
    ["CLM-CLI-167", "out of balance", (): RunVerdict => ({ verdict: "out-of-balance" }), 1],
    ["CLM-CLI-168", "not reconciled, because unsound", (): RunVerdict => ({ verdict: "not-reconciled", why: "unsound" }), 3],
    ["CLM-CLI-169", "not reconciled, because claim code errors", (): RunVerdict => ({ verdict: "not-reconciled", why: "claim-code-errors" }), 3],
    ["CLM-CLI-170", "not reconciled, because nothing to reconcile", (): RunVerdict => ({ verdict: "not-reconciled", why: "nothing-to-reconcile" }), 3],
  ])("[%s] the run verdict %s", (_clm, _name, runVerdict, code) => {
    expect(exitCodeOf(runVerdict(), false)).toBe(code);
  });
});

describe("under --exit-zero only an out-of-balance run will exit 0 instead of its code", () => {
  it.each([
    ["CLM-CLI-171", "balanced", (): RunVerdict => ({ verdict: "balanced" }), 0, 0],
    ["CLM-CLI-172", "out of balance", (): RunVerdict => ({ verdict: "out-of-balance" }), 1, 0],
    ["CLM-CLI-173", "not reconciled", (): RunVerdict => ({ verdict: "not-reconciled", why: "unsound" }), 3, 3],
  ])("[%s] a run that ended %s", (_clm, _name, runVerdict, code, underExitZero) => {
    const verdict = Object.freeze(runVerdict());

    expect(exitCodeOf(verdict, false)).toBe(code);
    expect(exitCodeOf(verdict, true)).toBe(underExitZero);
    expect(verdict).toEqual(runVerdict());
  });

  it("[CLM-CLI-174] a run that ended on a usage error", () => {
    const missing = join(TARGET(), "vitest.missing");
    const argv = ["balance", "--features", join(TARGET(), "features"), "--vitest", missing];
    const refusal = message(AppError.InputPathMissing, { flag: "--vitest", path: missing });

    const without = ended(argv, quietly);
    const under = ended([...argv, "--exit-zero"], quietly);

    expect(without.exitCode).toBe(2);
    expect(under.exitCode).toBe(2);
    expect(without.stdout).toBe("");
    expect(under.stdout).toBe("");
    expect(without.stderr).toContain(refusal);
    expect(under.stderr).toBe(without.stderr);
  });

  it("[CLM-CLI-175] a run that ended on an unexpected error", () => {
    const without = ended(balanceArgv(), onAClosedPipe);
    const under = ended(balanceArgv("--exit-zero"), onAClosedPipe);

    expect(without.exitCode).toBe(4);
    expect(under.exitCode).toBe(4);
    expect(without.stderr).toBe(noVerdictLine());
    expect(under.stderr).toBe(noVerdictLine());
  });
});
