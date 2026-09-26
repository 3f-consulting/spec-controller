import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evidenceReconciliationOf, type RunContext } from "@3f-consulting/spec-controller-core";
import { writeOutputs, type OutputPayloads } from "./writer.js";
import type { OutputPlan, PlannedOutput } from "./format.js";

class Exited extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

const ctx: RunContext = {
  target: "unwritable",
  inputs: { features: "features" },
  runStart: new Date("2026-09-26T00:00:00.000Z"),
  sourceSha: null,
};

const payloads: OutputPayloads = { balance: evidenceReconciliationOf([], [], [], false, false), ctx };

/** Each way a file destination can be unwritable, with the reason the operating system gives. */
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

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-writer-"));
  stderr = [];
  vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new Exited(code);
  });
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

      expect(() => writeOutputs(toFile(path), payloads)).toThrow(Exited);

      expect(process.exit).toHaveBeenCalledWith(2);
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

    expect(() => writeOutputs(toFile(path, "md"), payloads)).toThrow(Exited);

    expect(process.exit).toHaveBeenCalledWith(2);
    expect(stderr.join("")).toContain("EISDIR");
  });

  it("still writes a destination it can write, overwriting what was there", () => {
    const path = join(scratch, "earlier.json");
    writeFileSync(path, "earlier\n");

    writeOutputs(toFile(path), payloads);

    expect(process.exit).not.toHaveBeenCalled();
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
      writeOutputs(toFile(path), payloads);

      expect(process.exit).not.toHaveBeenCalled();
    } finally {
      chmodSync(path, 0o644);
    }
    expect(readFileSync(path, "utf8")).not.toBe("earlier\n");
  });

  for (const jsonFirst of [false, true]) {
    const order = jsonFirst ? "named after" : "named before";
    it(`prints nothing to stdout when the markdown report is ${order} the unwritable json one`, () => {
      expect(() => writeOutputs(both({ fmt: "md", dest: { kind: "stdout" } }, jsonFirst), payloads)).toThrow(Exited);

      expect(process.exit).toHaveBeenCalledWith(2);
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it(`creates no markdown file when it is ${order} the unwritable json one`, () => {
      const path = join(scratch, "report.md");

      expect(() => writeOutputs(both({ fmt: "md", dest: { kind: "file", path } }, jsonFirst), payloads)).toThrow(Exited);

      expect(existsSync(path)).toBe(false);
    });

    it(`leaves an earlier markdown file as it was when it is ${order} the unwritable json one`, () => {
      const path = join(scratch, "report.md");
      writeFileSync(path, "an earlier run's report\n");

      expect(() => writeOutputs(both({ fmt: "md", dest: { kind: "file", path } }, jsonFirst), payloads)).toThrow(Exited);

      expect(readFileSync(path, "utf8")).toBe("an earlier run's report\n");
    });
  }
});
