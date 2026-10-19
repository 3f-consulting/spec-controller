import { afterEach, describe, expect, it, vi } from "vitest";
import { runBalanceCaptured, type BalanceRun } from "../../test-support/runBalance.js";

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

function balanceWhereCwdThrows(thrown: Error): BalanceRun {
  vi.spyOn(process, "cwd").mockImplementation(() => {
    throw thrown;
  });
  return runBalanceCaptured([]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("[SCN-CLI-100] a run from a working directory that no longer exists is refused as unreadable, naming the feature corpus read by default", () => {
  it("refuses with the usage status, naming the default corpus and the working directory's read failure", () => {
    const thrown = removedWorkingDirectory();
    let answered: BalanceRun | undefined;

    expect(() => {
      answered = balanceWhereCwdThrows(thrown);
    }).not.toThrow();

    expect(answered?.stdout).toBe("");
    expect(answered?.exitCode).toBe(2);
    expect(answered?.stderr).toBe(`The feature corpus read by default could not be read: features (${thrown.message})\n`);
  });
});
