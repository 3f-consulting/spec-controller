import { afterEach, describe, expect, it, vi } from "vitest";
import { runAllocate } from "./cli.js";
import { removedWorkingDirectory } from "../vanishedWorkingDirectory.test-utils.js";

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

function allocateWhereCwdThrows(thrown: Error): Answered {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process, "cwd").mockImplementation(() => {
    throw thrown;
  });
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  try {
    runAllocate(["ONE"]);
  } finally {
    vi.restoreAllMocks();
  }
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("[SCN-ALC-019] asked from a working directory that no longer exists, allocate is refused as a usage error", () => {
  it("refuses ONE, saying the working directory could not be read, with no path to name", () => {
    const thrown = removedWorkingDirectory();
    expect(Object.keys(thrown)).toEqual(["errno", "code", "syscall"]);

    const answered = allocateWhereCwdThrows(thrown);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr).toBe(`spec-controller allocate: usage error — the working directory could not be read (${thrown.message})\n`);
  });
});
