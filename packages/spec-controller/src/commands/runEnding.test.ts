import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closedPipe, noVerdictLine } from "../runEnding/crashGuards.test-utils.js";
import { main } from "./main.js";
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

describe("under --exit-zero only an out-of-balance run will exit 0 instead of its code", () => {
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
