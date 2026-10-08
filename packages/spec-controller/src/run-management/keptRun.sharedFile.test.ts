import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type RunManifestMeta } from "./keptRun.js";
import { usageStatusOf } from "../usageStatus.testkit.js";

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
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-kept-shared-"));
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
  rmSync(scratch, { recursive: true, force: true });
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

  it("routes and stamps a run whose --format paths are elsewhere", () => {
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [join(scratch, "elsewhere.md")] }, meta, route))).toBeUndefined();

    expect(route).toHaveBeenCalledOnce();
    expect(existsSync(runYaml)).toBe(true);
    expect(existsSync(join(scratch, "elsewhere.md"))).toBe(false);
  });
});

describe("[SCN-RMG-010] a --format path is the stored run's own run.yaml only when it is the same file", () => {
  function earlierRun(): void {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(runYaml, "an earlier run's manifest\n");
  }

  it("refuses a hard link to an earlier run's run.yaml, naming the link, and leaves the run.yaml as it was", () => {
    earlierRun();
    const link = join(scratch, "linked.md");
    linkSync(runYaml, link);
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [link] }, meta, route))).toBe(2);

    expect(route).not.toHaveBeenCalled();
    expect(stderr.join("")).toContain(link);
    expect(readFileSync(runYaml, "utf8")).toBe("an earlier run's manifest\n");
  });

  it("refuses a symbolic link to the run.yaml of a new run, and leaves no run.yaml behind", () => {
    mkdirSync(runDir, { recursive: true });
    const link = join(scratch, "symlinked.md");
    symlinkSync(runYaml, link);
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [link] }, meta, route))).toBe(2);

    expect(route).not.toHaveBeenCalled();
    expect(stderr.join("")).toContain(link);
    expect(existsSync(runYaml)).toBe(false);
  });

  it("routes a run whose --format path is another file beside its run.yaml, in the same run directory", () => {
    earlierRun();
    const beside = join(runDir, "notes.md");
    writeFileSync(beside, "notes\n");
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [beside] }, meta, route))).toBeUndefined();

    expect(route).toHaveBeenCalledOnce();
    expect(readFileSync(beside, "utf8")).toBe("notes\n");
  });

  it("routes a run whose --format path lies in a folder that does not exist, and creates nothing there", () => {
    const route = vi.fn(() => true);
    const unmade = join(scratch, "no-such-folder", "out.md");

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [unmade] }, meta, route))).toBeUndefined();

    expect(route).toHaveBeenCalledOnce();
    expect(existsSync(join(scratch, "no-such-folder"))).toBe(false);
  });

  it("finds no --format path sharing a run.yaml that is not a file, and routes the run before its manifest write is refused", () => {
    mkdirSync(runYaml, { recursive: true });
    const report = join(scratch, "report.md");
    writeFileSync(report, "a report\n");
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, formatPaths: [report] }, meta, route))).toBe(2);

    expect(route).toHaveBeenCalledOnce();
    expect(stderr.join("")).not.toContain(report);
    expect(readdirSync(runYaml)).toEqual([]);
  });
});
