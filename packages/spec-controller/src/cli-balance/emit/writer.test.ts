import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, existsSync, fstatSync, linkSync, lstatSync, readlinkSync, mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evidenceReconciliationOf, type RunContext } from "@3f-consulting/spec-controller-core";
import { writeOutputs, type OutputPayloads } from "./writer.js";
import type { OutputPlan, PlannedOutput } from "./format.js";

function usageStatusOf(run: () => unknown): number | undefined {
  try {
    run();
    return undefined;
  } catch (err) {
    const code = (err as { exitCode?: unknown }).exitCode;
    if (typeof code !== "number") throw err;
    return code;
  }
}

const ctx: RunContext = {
  target: "unwritable",
  inputs: { features: "features" },
  runStart: new Date("2026-09-26T00:00:00.000Z"),
  sourceSha: null,
};

const payloads: OutputPayloads = { balance: evidenceReconciliationOf([], [], [], false, false), ctx };

const UNWRITABLE: ReadonlyArray<readonly [string, (dir: string) => string, string]> = [
  ["a read-only file", (dir) => {
    const path = join(dir, "read-only.json");
    writeFileSync(path, "earlier\n");
    chmodSync(path, 0o444);
    return path;
  }, "EACCES"],
  ["a path under a regular file", (dir) => {
    writeFileSync(join(dir, "regular"), "");
    return join(dir, "regular", "report.json");
  }, "ENOTDIR"],
  ["a file in a directory it may not write", (dir) => {
    const readOnly = join(dir, "read-only");
    mkdirSync(readOnly);
    chmodSync(readOnly, 0o555);
    return join(readOnly, "report.json");
  }, "EACCES"],
  ["an existing directory", (dir) => {
    const path = join(dir, "a-directory");
    mkdirSync(path);
    return path;
  }, "EISDIR"],
  ["a file whose parent directory does not exist", (dir) => join(dir, "missing", "report.json"), "ENOENT"],
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

      expect(usageStatusOf(() => writeOutputs(toFile(path), payloads))).toBe(2);
      const refusal = stderr.join("");
      expect(refusal).toContain(path);
      expect(refusal).toContain(reason);
      expect(refusal.trimEnd().split("\n")).toHaveLength(1);
      expect(refusal).not.toMatch(/^\s+at /m);
    });
  }

  it("refuses the markdown report the same way as the json one", () => {
    const path = join(scratch, "a-directory");
    mkdirSync(path);

    expect(usageStatusOf(() => writeOutputs(toFile(path, "md"), payloads))).toBe(2);
    expect(stderr.join("")).toContain("EISDIR");
  });

  it("still writes a destination it can write, overwriting what was there", () => {
    const path = join(scratch, "earlier.json");
    writeFileSync(path, "earlier\n");

    expect(usageStatusOf(() => writeOutputs(toFile(path), payloads))).toBeUndefined();
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
      expect(usageStatusOf(() => writeOutputs(toFile(path), payloads))).toBeUndefined();
    } finally {
      chmodSync(path, 0o644);
    }
    expect(readFileSync(path, "utf8")).not.toBe("earlier\n");
  });

  for (const jsonFirst of [false, true]) {
    const order = jsonFirst ? "named after" : "named before";
    it(`prints nothing to stdout when the markdown report is ${order} the unwritable json one`, () => {
      expect(usageStatusOf(() => writeOutputs(both({ fmt: "md", dest: { kind: "stdout" } }, jsonFirst), payloads))).toBe(2);

      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it(`creates no markdown file when it is ${order} the unwritable json one`, () => {
      const path = join(scratch, "report.md");

      expect(usageStatusOf(() => writeOutputs(both({ fmt: "md", dest: { kind: "file", path } }, jsonFirst), payloads))).toBe(2);

      expect(existsSync(path)).toBe(false);
    });

    it(`leaves an earlier markdown file as it was when it is ${order} the unwritable json one`, () => {
      const path = join(scratch, "report.md");
      writeFileSync(path, "an earlier run's report\n");

      expect(usageStatusOf(() => writeOutputs(both({ fmt: "md", dest: { kind: "file", path } }, jsonFirst), payloads))).toBe(2);

      expect(readFileSync(path, "utf8")).toBe("an earlier run's report\n");
    });
  }
});

describe("[SCN-FMT-010] two outputs that land on one regular file are refused before anything is written", () => {
  const file = (fmt: "md" | "json", path: string): PlannedOutput => ({ fmt, dest: { kind: "file", path } });
  const EARLIER = "an earlier run's report\n";

  function refused(plan: OutputPlan, stdoutIdentity?: () => { dev: bigint; ino: bigint } | undefined): string {
    expect(usageStatusOf(() => writeOutputs(plan, payloads, stdoutIdentity))).toBe(2);
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

  it("refuses the same format twice at one path", () => {
    const path = join(scratch, "y.md");

    expect(refused({ outputs: [file("md", path), file("md", path)] })).toContain(`md:${path} and md:${path}`);
  });

  it("leaves a file holding an earlier run as it was, and creates no third destination", () => {
    const path = join(scratch, "y.md");
    const third = join(scratch, "third.json");
    mkdirSync(join(scratch, "sub"));
    writeFileSync(path, EARLIER);

    const refusal = refused({ outputs: [file("md", path), file("json", third), file("json", `${scratch}/sub/../y.md`)] });

    expect(refusal).toContain("Two outputs name the same file");
    expect(readFileSync(path, "utf8")).toBe(EARLIER);
    expect(existsSync(third)).toBe(false);
  });

  it("refuses a path through a folder and back beside the plain path", () => {
    mkdirSync(join(scratch, "sub"));
    const path = join(scratch, "y.md");

    expect(refused({ outputs: [file("md", path), file("json", `${scratch}/sub/../y.md`)] })).toContain(`${scratch}/sub/../y.md`);
    expect(existsSync(path)).toBe(false);
  });

  it("refuses a symbolic link to the file, a path through a linked folder, and a hard link", () => {
    const dir = join(scratch, "dir");
    mkdirSync(dir);
    const path = join(dir, "real.md");
    writeFileSync(path, EARLIER);
    symlinkSync(path, join(scratch, "link.md"));
    symlinkSync(dir, join(scratch, "dir-link"));
    linkSync(path, join(scratch, "hard.md"));

    for (const alias of [join(scratch, "link.md"), join(scratch, "dir-link", "real.md"), join(scratch, "hard.md")]) {
      stderr.length = 0;
      expect(refused({ outputs: [file("md", path), file("json", alias)] })).toContain(`json:${alias}`);
    }
    expect(readFileSync(path, "utf8")).toBe(EARLIER);
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

    expect(usageStatusOf(() => writeOutputs({ outputs: [file("md", lower), file("json", upper)] }, payloads))).toBeUndefined();
    expect(readFileSync(lower, "utf8")).toMatch(/^# /);
    expect(readFileSync(upper, "utf8")).toMatch(/^\{/);
  });

  it("writes two outputs on two files, as before", () => {
    const md = join(scratch, "y.md");
    const json = join(scratch, "z.json");

    expect(usageStatusOf(() => writeOutputs({ outputs: [file("md", md), file("json", json)] }, payloads))).toBeUndefined();
    expect(readFileSync(md, "utf8")).toMatch(/^# /);
    expect(readFileSync(json, "utf8")).toMatch(/^\{/);
  });
});

describe("[SCN-FMT-012] a destination that is a link to a file not yet created is written through the link", () => {
  it("writes the report into the file the link points to, and leaves the link pointing there", () => {
    const target = join(scratch, "report.json");
    const link = join(scratch, "link.json");
    symlinkSync(target, link);

    expect(usageStatusOf(() => writeOutputs({ outputs: [{ fmt: "json", dest: { kind: "file", path: link } }] }, payloads))).toBeUndefined();
    expect(stderr).toEqual([]);
    expect(readFileSync(target, "utf8")).toMatch(/^\{/);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe(target);
  });

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
        ),
      ),
    ).toBe(2);

    expect(stderr.join("")).toContain("ENOTDIR");
    expect(existsSync(target)).toBe(false);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
  });
});
