import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type RunManifestMeta } from "./keptRun.js";

class Exited extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

const TARGET = "unwritable";
const RUN_ID = "r1";

const meta: RunManifestMeta = {
  sourceSha: "unknown",
  toolSha: "unknown",
  toolVersion: "0.0.0",
  mode: "balance",
  date: "2026-09-26T00:00:00.000Z",
};

/** Each store root a run directory cannot be created under, with the reason the operating system gives. */
const UNCREATABLE: ReadonlyArray<readonly [string, (dir: string) => string, string]> = [
  ["a regular file", (dir) => {
    writeFileSync(join(dir, "regular"), "");
    return join(dir, "regular");
  }, "ENOTDIR"],
  ["a path under a regular file", (dir) => {
    writeFileSync(join(dir, "regular"), "");
    return join(dir, "regular", "store");
  }, "ENOTDIR"],
  ["a directory it may not write", (dir) => {
    mkdirSync(join(dir, "read-only"));
    chmodSync(join(dir, "read-only"), 0o555);
    return join(dir, "read-only");
  }, "EACCES"],
  ["a path under a directory it may not write", (dir) => {
    mkdirSync(join(dir, "read-only"));
    chmodSync(join(dir, "read-only"), 0o555);
    return join(dir, "read-only", "store");
  }, "EACCES"],
  ["a root whose run directory is a file", (dir) => {
    mkdirSync(join(dir, "store", TARGET), { recursive: true });
    writeFileSync(join(dir, "store", TARGET, RUN_ID), "");
    return join(dir, "store");
  }, "EEXIST"],
];

let scratch: string;
let stderr: string[];

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-kept-run-"));
  stderr = [];
  vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new Exited(code);
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (existsSync(join(scratch, "read-only"))) chmodSync(join(scratch, "read-only"), 0o755);
  rmSync(scratch, { recursive: true, force: true });
});

describe("[SCN-RMG-008] executeKeptRun refuses a run directory it cannot create, before the command runs", () => {
  for (const [shape, arrange, reason] of UNCREATABLE) {
    it(`refuses a store root that is ${shape}, naming the run directory and ${reason}`, () => {
      const storeRoot = arrange(scratch);
      const route = vi.fn();

      expect(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, route)).toThrow(Exited);

      expect(process.exit).toHaveBeenCalledWith(2);
      expect(route).not.toHaveBeenCalled();
      const refusal = stderr.join("");
      expect(refusal).toContain(join(storeRoot, TARGET, RUN_ID));
      expect(refusal).toContain(reason);
      expect(refusal.trimEnd().split("\n")).toHaveLength(1);
      expect(refusal).not.toMatch(/^\s+at /m);
    });
  }

  it("creates a root whose missing parents can be created, and runs the command", () => {
    const storeRoot = join(scratch, "missing", "store");
    const route = vi.fn(() => true);

    executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, route);

    expect(route).toHaveBeenCalledOnce();
    expect(existsSync(join(storeRoot, TARGET, RUN_ID, "run.yaml"))).toBe(true);
    expect(process.exit).not.toHaveBeenCalled();
  });
});

describe("[SCN-RMG-009] executeKeptRun refuses a run.yaml it cannot write, naming it and why", () => {
  const arrangeRunDir = (): { storeRoot: string; runYaml: string } => {
    const storeRoot = join(scratch, "store");
    mkdirSync(join(storeRoot, TARGET, RUN_ID), { recursive: true });
    return { storeRoot, runYaml: join(storeRoot, TARGET, RUN_ID, "run.yaml") };
  };

  it("refuses a run.yaml that is already a directory, with EISDIR, after the command has run", () => {
    const { storeRoot, runYaml } = arrangeRunDir();
    mkdirSync(runYaml);
    const route = vi.fn(() => true);

    expect(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, route)).toThrow(Exited);

    expect(route).toHaveBeenCalledOnce();
    expect(process.exit).toHaveBeenCalledWith(2);
    const refusal = stderr.join("");
    expect(refusal).toContain(runYaml);
    expect(refusal).toContain("EISDIR");
    expect(refusal.trimEnd().split("\n")).toHaveLength(1);
  });

  it("refuses a run.yaml it may not write, with EACCES, leaving it as it was", () => {
    const { storeRoot, runYaml } = arrangeRunDir();
    writeFileSync(runYaml, "an earlier run's manifest\n");
    chmodSync(runYaml, 0o444);

    try {
      expect(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, vi.fn(() => true))).toThrow(Exited);

      expect(process.exit).toHaveBeenCalledWith(2);
      expect(stderr.join("")).toContain(runYaml);
      expect(stderr.join("")).toContain("EACCES");
      expect(readFileSync(runYaml, "utf8")).toBe("an earlier run's manifest\n");
    } finally {
      chmodSync(runYaml, 0o644);
    }
  });
});
