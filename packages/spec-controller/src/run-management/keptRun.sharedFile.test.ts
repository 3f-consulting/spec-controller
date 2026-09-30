import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type RunManifestMeta } from "./keptRun.js";

/**
 * The status a call leaves with: the exit code carried by whatever it threw, or `undefined` when it
 * returned. The refusal is thrown for the command to settle, so the call itself
 * carries the code.
 */
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
