import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type RunManifestMeta } from "./keptRun.js";
import { usageStatusOf } from "../usageStatus.testkit.js";

const TARGET = "unwritable";
const RUN_ID = "r1";

const meta: RunManifestMeta = {
  sourceSha: "unknown",
  toolSha: "unknown",
  toolVersion: "0.0.0",
  mode: "balance",
  date: "2026-09-26T00:00:00.000Z",
};

let scratch: string;
let stderr: string[];

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-kept-run-"));
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(scratch, { recursive: true, force: true });
});

describe("[SCN-RMG-008] executeKeptRun refuses a run directory it cannot create, before the command runs", () => {
  it("creates a root whose missing parents can be created, and runs the command", () => {
    const storeRoot = join(scratch, "missing", "store");
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, route))).toBeUndefined();

    expect(route).toHaveBeenCalledOnce();
    expect(existsSync(join(storeRoot, TARGET, RUN_ID, "run.yaml"))).toBe(true);
  });
});

describe("[SCN-RMG-009] executeKeptRun refuses a run.yaml it cannot write, naming it and why", () => {
  const arrangeRunDir = (): { storeRoot: string; runYaml: string } => {
    const storeRoot = join(scratch, "store");
    mkdirSync(join(storeRoot, TARGET, RUN_ID), { recursive: true });
    return { storeRoot, runYaml: join(storeRoot, TARGET, RUN_ID, "run.yaml") };
  };

  it("refuses a run.yaml it may not write, with EACCES, leaving it as it was", () => {
    const { storeRoot, runYaml } = arrangeRunDir();
    writeFileSync(runYaml, "an earlier run's manifest\n");
    chmodSync(runYaml, 0o444);

    try {
      expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, vi.fn(() => true)))).toBe(2);

      expect(stderr.join("")).toContain(runYaml);
      expect(stderr.join("")).toContain("EACCES");
      expect(readFileSync(runYaml, "utf8")).toBe("an earlier run's manifest\n");
    } finally {
      chmodSync(runYaml, 0o644);
    }
  });
});
