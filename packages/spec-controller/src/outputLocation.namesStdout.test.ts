import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { namesStdout } from "./outputLocation.js";

let scratch: string;

beforeEach(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-names-stdout-")));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("[SCN-FMT-011] a path names standard output when it spells file descriptor 1, directly or through links", () => {
  it("answers yes for /dev/stdout and /dev/fd/1, however the path is spelled", () => {
    expect(namesStdout("/dev/stdout")).toBe(true);
    expect(namesStdout("/dev/fd/1")).toBe(true);
    expect(namesStdout("/dev/../dev/stdout")).toBe(true);
    expect(namesStdout("//dev//stdout")).toBe(true);
    expect(namesStdout("/dev//fd///1")).toBe(true);
  });

  it("follows a chain of up to forty links to any spelling of file descriptor 1, and stops at a chain one link longer", () => {
    const chainTo = (target: string, name: string, links: number): string => {
      for (let i = links; i >= 1; i--) {
        const link = join(scratch, `${name}-${i}`);
        symlinkSync(target, link);
        target = link;
      }
      return target;
    };
    const spellings = ["/dev/stdout", "/dev/fd/1", "/proc/self/fd/1", "/proc/thread-self/fd/1", `/proc/${process.pid}/fd/1`];

    spellings.forEach((spelling, n) => {
      expect(namesStdout(chainTo(spelling, `forty-${n}`, 40)), spelling).toBe(true);
    });
    expect(namesStdout(chainTo("/dev/stdout", "forty-one", 41))).toBe(false);
  });

  it.each([
    [
      "answers yes for file descriptor 1 spelled through this process's own entry in /proc",
      "/proc/self/fd/1",
      "/proc/thread-self/fd/1",
      `/proc/${process.pid}/fd/1`,
      true,
    ],
    ["answers no for standard error, the null device and file descriptor 2", "/dev/stderr", "/dev/null", "/dev/fd/2", false],
  ] as const)("%s", (_title, first, second, third, answer) => {
    expect(namesStdout(first)).toBe(answer);
    expect(namesStdout(second)).toBe(answer);
    expect(namesStdout(third)).toBe(answer);
  });
});
