import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type RunManifestMeta } from "./keptRun.js";
import { usageStatusOf } from "../usageStatus.test-utils.js";

const TARGET = "reads-its-own";
const RUN_ID = "r1";
const WORKFLOW = "name: ci\non: [push]\njobs: {}\n";

const meta: RunManifestMeta = {
  sourceSha: "unknown",
  toolSha: "unknown",
  toolVersion: "0.0.0",
  mode: "balance",
  date: "2026-09-29T00:00:00.000Z",
};

let scratch: string;
let storeRoot: string;
let runDir: string;
let runYaml: string;
let stderr: string[];

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-kept-input-"));
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

describe("[SCN-RMG-011] executeKeptRun refuses a run whose own run.yaml is one of the files it reads, before the command runs", () => {
  it("refuses, naming the file and the input it is, and leaves the input as it was", () => {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(runYaml, WORKFLOW);
    const route = vi.fn(() => true);

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, inputs: [{ subject: "the --ci workflow", path: runYaml }] }, meta, route))).toBe(2);

    expect(route).not.toHaveBeenCalled();
    const refusal = stderr.join("");
    expect(refusal).toContain(runYaml);
    expect(refusal).toContain("the --ci workflow");
    expect(refusal.trimEnd().split("\n")).toHaveLength(1);
    expect(readFileSync(runYaml, "utf8")).toBe(WORKFLOW);
  });

  it("routes and stamps a run whose inputs are elsewhere, and creates nothing to find that out", () => {
    const input = join(scratch, "ci.yml");
    writeFileSync(input, WORKFLOW);
    const route = vi.fn(() => {
      expect(existsSync(runYaml)).toBe(false);
      return true;
    });

    expect(usageStatusOf(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, inputs: [{ subject: "the --ci workflow", path: input }] }, meta, route))).toBeUndefined();

    expect(route).toHaveBeenCalledOnce();
    expect(existsSync(runYaml)).toBe(true);
    expect(readFileSync(input, "utf8")).toBe(WORKFLOW);
  });
});
