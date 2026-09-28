import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { namesStdout } from "./outputLocation.js";

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-names-stdout-"));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("[SCN-FMT-011] a path names standard output when it spells file descriptor 1, directly or through links", () => {
  it("answers yes for /dev/stdout and /dev/fd/1, however the path is spelled", () => {
    expect(namesStdout("/dev/stdout")).toBe(true);
    expect(namesStdout("/dev/fd/1")).toBe(true);
    expect(namesStdout("/dev/../dev/stdout")).toBe(true);
  });

  it("answers yes for a link to /dev/stdout, and a link to that link", () => {
    symlinkSync("/dev/stdout", join(scratch, "out"));
    symlinkSync(join(scratch, "out"), join(scratch, "out-again"));

    expect(namesStdout(join(scratch, "out"))).toBe(true);
    expect(namesStdout(join(scratch, "out-again"))).toBe(true);
  });

  it("answers no for standard error, the null device and file descriptor 2", () => {
    expect(namesStdout("/dev/stderr")).toBe(false);
    expect(namesStdout("/dev/null")).toBe(false);
    expect(namesStdout("/dev/fd/2")).toBe(false);
  });

  it("answers no for a regular file, a path under a folder that does not exist, and a link that goes in a circle", () => {
    writeFileSync(join(scratch, "report.md"), "");
    symlinkSync(join(scratch, "b"), join(scratch, "a"));
    symlinkSync(join(scratch, "a"), join(scratch, "b"));

    expect(namesStdout(join(scratch, "report.md"))).toBe(false);
    expect(namesStdout(join(scratch, "missing", "report.md"))).toBe(false);
    expect(namesStdout(join(scratch, "a"))).toBe(false);
  });
});
