import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, existsSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evidenceReconciliationOf, type RunContext } from "@3f-consulting/spec-controller-core";
import { writeOutputs, type OutputPayloads } from "./writer.js";
import type { OutputPlan, PlannedOutput } from "./format.js";
import { stdoutIdentity as processStdout } from "../../outputLocation.js";
import { earlierStoredRunDirOf } from "../../run-management/keptRun.js";
import { usageStatusOf } from "../../usageStatus.test-utils.js";

const ctx: RunContext = {
  target: "unwritable",
  inputs: { features: "features" },
  runStart: new Date("2026-09-26T00:00:00.000Z"),
  sourceSha: null,
};

const noOwnRun = (path: string): string | undefined => earlierStoredRunDirOf(path, undefined);

let payloads: OutputPayloads;

function aReadOnlyFile(dir: string): string {
  const path = join(dir, "read-only.json");
  writeFileSync(path, "earlier\n");
  chmodSync(path, 0o444);
  return path;
}

function aPathUnderARegularFile(dir: string): string {
  writeFileSync(join(dir, "regular"), "");
  return join(dir, "regular", "report.json");
}

function aFileInADirectoryItMayNotWrite(dir: string): string {
  const readOnly = join(dir, "read-only");
  mkdirSync(readOnly);
  chmodSync(readOnly, 0o555);
  return join(readOnly, "report.json");
}

function anExistingDirectory(dir: string): string {
  const path = join(dir, "a-directory");
  mkdirSync(path);
  return path;
}

function aFileWhoseParentDoesNotExist(dir: string): string {
  return join(dir, "missing", "report.json");
}

const UNWRITABLE: ReadonlyArray<readonly [string, (dir: string) => string, string]> = [
  ["a read-only file", aReadOnlyFile, "EACCES"],
  ["a path under a regular file", aPathUnderARegularFile, "ENOTDIR"],
  ["a file in a directory it may not write", aFileInADirectoryItMayNotWrite, "EACCES"],
  ["an existing directory", anExistingDirectory, "EISDIR"],
  ["a file whose parent directory does not exist", aFileWhoseParentDoesNotExist, "ENOENT"],
];

const toFile = (path: string, fmt: "md" | "json" = "json"): OutputPlan => ({
  outputs: [{ fmt, dest: { kind: "file", path } }],
});

let scratch: string;
let stderr: string[];

function volumeIsCaseSensitive(): boolean {
  const dir = mkdtempSync(join(tmpdir(), "spec-controller-case-"));
  try {
    writeFileSync(join(dir, "probe"), "");
    return !existsSync(join(dir, "PROBE"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

beforeEach(() => {
  payloads = { balance: evidenceReconciliationOf([], [], [], false, false), ctx };
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-writer-"));
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const name of ["read-only", "read-only.json"]) {
    if (existsSync(join(scratch, name))) chmodSync(join(scratch, name), 0o755);
  }
  rmSync(scratch, { recursive: true, force: true });
});

describe("[SCN-FMT-008] a file destination that cannot be written is refused on the usage code, naming the path and why", () => {
  for (const [shape, arrange, reason] of UNWRITABLE) {
    it(`refuses ${shape}, naming it and ${reason}, on one line with no stack trace`, () => {
      const path = arrange(scratch);

      expect(usageStatusOf(() => writeOutputs(toFile(path), payloads, processStdout, [], noOwnRun))).toBe(2);
      const refusal = stderr.join("");
      expect(refusal).toContain(path);
      expect(refusal).toContain(reason);
      expect(refusal.trimEnd().split("\n")).toHaveLength(1);
      expect(refusal).not.toMatch(/^\s+at /m);
    });
  }

  it("still writes a destination it can write, overwriting what was there", () => {
    const path = join(scratch, "earlier.json");
    writeFileSync(path, "earlier\n");

    expect(usageStatusOf(() => writeOutputs(toFile(path), payloads, processStdout, [], noOwnRun))).toBeUndefined();
    expect(stderr).toEqual([]);
  });
});

describe("[SCN-FMT-009] when one file destination cannot be written, the writer emits to no destination", () => {
  const unwritable = (): PlannedOutput => {
    writeFileSync(join(scratch, "regular"), "");
    return { fmt: "json", dest: { kind: "file", path: join(scratch, "regular", "report.json") } };
  };
  const both = (markdown: PlannedOutput, jsonFirst: boolean): OutputPlan => {
    const json = unwritable();
    return { outputs: jsonFirst ? [json, markdown] : [markdown, json] };
  };

  it("does not refuse a file it may write but not read", () => {
    const path = join(scratch, "write-only.json");
    writeFileSync(path, "earlier\n");
    chmodSync(path, 0o222);

    try {
      expect(usageStatusOf(() => writeOutputs(toFile(path), payloads, processStdout, [], noOwnRun))).toBeUndefined();
    } finally {
      chmodSync(path, 0o644);
    }
    expect(readFileSync(path, "utf8")).not.toBe("earlier\n");
  });

  for (const jsonFirst of [false, true]) {
    const order = jsonFirst ? "named after" : "named before";
    it(`prints nothing to stdout when the markdown report is ${order} the unwritable json one`, () => {
      expect(usageStatusOf(() => writeOutputs(both({ fmt: "md", dest: { kind: "stdout" } }, jsonFirst), payloads, processStdout, [], noOwnRun))).toBe(2);

      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it(`creates no markdown file when it is ${order} the unwritable json one`, () => {
      const path = join(scratch, "report.md");

      expect(usageStatusOf(() => writeOutputs(both({ fmt: "md", dest: { kind: "file", path } }, jsonFirst), payloads, processStdout, [], noOwnRun))).toBe(2);

      expect(existsSync(path)).toBe(false);
    });

    it(`leaves an earlier markdown file as it was when it is ${order} the unwritable json one`, () => {
      const path = join(scratch, "report.md");
      writeFileSync(path, "an earlier run's report\n");

      expect(usageStatusOf(() => writeOutputs(both({ fmt: "md", dest: { kind: "file", path } }, jsonFirst), payloads, processStdout, [], noOwnRun))).toBe(2);

      expect(readFileSync(path, "utf8")).toBe("an earlier run's report\n");
    });

    it(`refuses naming the json report and its path, and creates no file, when the markdown report is ${order} it`, () => {
      const markdown = join(scratch, "report.md");
      const json = join(scratch, "regular", "report.json");

      expect(usageStatusOf(() => writeOutputs(both({ fmt: "md", dest: { kind: "file", path: markdown } }, jsonFirst), payloads, processStdout, [], noOwnRun))).toBe(2);

      expect(stderr.join("")).toBe(`The json report could not be written: ${json} (ENOTDIR: not a directory, open '${json}')\n`);
      expect(process.stdout.write).not.toHaveBeenCalled();
      expect(readdirSync(scratch)).toEqual(["regular"]);
    });
  }
});

describe("[SCN-FMT-010] two outputs that land on one regular file are refused before anything is written", () => {
  const file = (fmt: "md" | "json", path: string): PlannedOutput => ({ fmt, dest: { kind: "file", path } });
  const EARLIER = "an earlier run's report\n";

  function refused(plan: OutputPlan, stdoutIdentity?: () => { dev: bigint; ino: bigint } | undefined): string {
    expect(usageStatusOf(() => writeOutputs(plan, payloads, stdoutIdentity ?? processStdout, [], noOwnRun))).toBe(2);
    expect(process.stdout.write).not.toHaveBeenCalled();
    const refusal = stderr.join("");
    expect(refusal.trimEnd().split("\n")).toHaveLength(1);
    return refusal;
  }

  it("refuses two formats at one path that does not exist yet, and leaves no file behind", () => {
    const path = join(scratch, "y.md");

    const refusal = refused({ outputs: [file("md", path), file("json", path)] });

    expect(refusal).toContain(`md:${path} and json:${path}`);
    expect(readdirSync(scratch)).toEqual([]);
  });

  it("refuses standard output beside the file it is redirected into", () => {
    const path = join(scratch, "out.md");
    writeFileSync(path, EARLIER);
    const fd = openSync(path, "r");
    const identity = fstatSync(fd, { bigint: true });
    closeSync(fd);

    const refusal = refused({ outputs: [{ fmt: "md", dest: { kind: "stdout" } }, file("json", path)] }, () => ({
      dev: identity.dev,
      ino: identity.ino,
    }));

    expect(refusal).toContain(`md on standard output and json:${path}`);
    expect(readFileSync(path, "utf8")).toBe(EARLIER);
  });

  it.runIf(volumeIsCaseSensitive())("writes both reports when two spellings that differ only in case are two files on a case-sensitive volume", () => {
    const lower = join(scratch, "y.md");
    const upper = join(scratch, "Y.MD");

    expect(usageStatusOf(() => writeOutputs({ outputs: [file("md", lower), file("json", upper)] }, payloads, processStdout, [], noOwnRun))).toBeUndefined();
    expect(readFileSync(lower, "utf8")).toMatch(/^# /);
    expect(readFileSync(upper, "utf8")).toMatch(/^\{/);
  });
});

describe("[SCN-FMT-012] a destination that is a link to a file not yet created is written through the link", () => {

  it("removes the file it created through the link, not the link, when the run is refused for another destination", () => {
    const target = join(scratch, "report.json");
    const link = join(scratch, "link.json");
    symlinkSync(target, link);
    writeFileSync(join(scratch, "regular"), "");

    expect(
      usageStatusOf(() =>
        writeOutputs(
          {
            outputs: [
              { fmt: "json", dest: { kind: "file", path: link } },
              { fmt: "md", dest: { kind: "file", path: join(scratch, "regular", "report.md") } },
            ],
          },
          payloads,
          processStdout,
          [],
          noOwnRun,
        ),
      ),
    ).toBe(2);

    expect(stderr.join("")).toContain("ENOTDIR");
    expect(existsSync(target)).toBe(false);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
  });
});
