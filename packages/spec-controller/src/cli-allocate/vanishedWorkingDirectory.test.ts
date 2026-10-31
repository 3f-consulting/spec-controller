import { afterEach, describe, expect, it, vi } from "vitest";
import { removedWorkingDirectory } from "../vanishedWorkingDirectory.test-utils.js";
import { allocateWhere } from "./answered.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("[SCN-ALC-019] asked from a working directory that no longer exists, allocate is refused as a usage error", () => {
  it("refuses ONE, saying the working directory could not be read, with no path to name", () => {
    const thrown = removedWorkingDirectory();
    expect(Object.keys(thrown)).toEqual(["errno", "code", "syscall"]);

    const answered = allocateWhere(() => {
      throw thrown;
    }, ["ONE"]);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr).toBe(`spec-controller allocate: usage error — the working directory could not be read (${thrown.message})\n`);
  });
});
