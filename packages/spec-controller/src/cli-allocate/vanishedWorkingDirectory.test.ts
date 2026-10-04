import { afterEach, describe, expect, it, vi } from "vitest";
import { runAllocate } from "./cli.js";

// The shape Node gives process.cwd() when the directory the process stands in
// does not exist: a plain Error carrying errno, code and syscall, and no path.
function removedWorkingDirectory(): Error {
  return Object.assign(
    new Error(
      "ENOENT: process.cwd failed with error no such file or directory, the current working directory was likely removed without changing the working directory, uv_cwd",
    ),
    { errno: -2, code: "ENOENT", syscall: "uv_cwd" },
  );
}

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
