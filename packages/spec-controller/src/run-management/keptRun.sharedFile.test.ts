import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executeKeptRun, type RunManifestMeta } from "./keptRun.js";
import { usageStatusOf } from "../usageStatus.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

const TARGET = "shared";
const RUN_ID = "r1";

const meta: RunManifestMeta = {
  sourceSha: "unknown",
  toolSha: "unknown",
  toolVersion: "0.0.0",
  mode: "balance",
  date: "2026-09-28T00:00:00.000Z",
};

let scratch: string;
let storeRoot: string;
let runDir: string;
let runYaml: string;
let stderr: string[];

beforeEach(() => {
  scratch = temporaryDirectory("spec-controller-kept-shared-");
  storeRoot = join(scratch, "store");
  runDir = join(storeRoot, TARGET, RUN_ID);
  runYaml = join(runDir, "run.yaml");
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("[SCN-RMG-010] executeKeptRun refuses a --format path that is its own run.yaml, before the command runs", () => {
  it("refuses the run.yaml of a new run, naming it, and writes no run.yaml", () => {
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [runYaml] }, meta, route))).toBe(2);

    expect(route).not.toHaveBeenCalled();
    const refusal = stderr.join("");
    expect(refusal).toContain(runYaml);
    expect(refusal.trimEnd().split("\n")).toHaveLength(1);
    expect(existsSync(runYaml)).toBe(false);
  });

  it("refuses another spelling of it, and leaves an earlier run's run.yaml as it was", () => {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(runYaml, "an earlier run's manifest\n");
    const route = vi.fn(() => true);
    const spelling = `${runDir}/../${RUN_ID}/run.yaml`;

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [join(scratch, "elsewhere.md"), spelling] }, meta, route))).toBe(2);

    expect(route).not.toHaveBeenCalled();
    expect(stderr.join("")).toContain(spelling);
    expect(readFileSync(runYaml, "utf8")).toBe("an earlier run's manifest\n");
    expect(existsSync(join(scratch, "elsewhere.md"))).toBe(false);
  });
});

describe("[SCN-RMG-010] a --format path is the stored run's own run.yaml only when it is the same file", () => {
  it("routes a run whose --format path lies in a folder that does not exist, and creates nothing there", () => {
    const route = vi.fn(() => true);
    const unmade = join(scratch, "no-such-folder", "out.md");

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [unmade] }, meta, route))).toBeUndefined();

    expect(route).toHaveBeenCalledOnce();
    expect(existsSync(join(scratch, "no-such-folder"))).toBe(false);
  });

  it("finds no --format path sharing a run.yaml that is not a file, and routes the run before its manifest write fails", () => {
    mkdirSync(runYaml, { recursive: true });
    const report = join(scratch, "report.md");
    writeFileSync(report, "a report\n");
    const route = vi.fn(() => true);

    expect(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [report] }, meta, route)).toThrow(/EISDIR/);

    expect(route).toHaveBeenCalledOnce();
    expect(stderr.join("")).not.toContain(report);
    expect(readdirSync(runYaml)).toEqual([]);
  });
});
