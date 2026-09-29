import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type RunManifestMeta } from "./keptRun.js";

class Exited extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

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
  rmSync(scratch, { recursive: true, force: true });
});

describe("[SCN-RMG-011] executeKeptRun refuses a run whose own run.yaml is one of the files it reads, before the command runs", () => {
  it("refuses, naming the file and the input it is, and leaves the input as it was", () => {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(runYaml, WORKFLOW);
    const route = vi.fn(() => true);

    expect(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, inputs: [{ subject: "the --ci workflow", path: runYaml }] }, meta, route)).toThrow(Exited);

    expect(process.exit).toHaveBeenCalledWith(2);
    expect(route).not.toHaveBeenCalled();
    const refusal = stderr.join("");
    expect(refusal).toContain(runYaml);
    expect(refusal).toContain("the --ci workflow");
    expect(refusal.trimEnd().split("\n")).toHaveLength(1);
    expect(readFileSync(runYaml, "utf8")).toBe(WORKFLOW);
  });

  it("recognises the file by its identity, so an input reaching it through a link counts", () => {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(runYaml, WORKFLOW);
    const link = join(scratch, "workflow.yml");
    symlinkSync(runYaml, link);
    const route = vi.fn(() => true);

    expect(() => executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, inputs: [{ subject: "the --ci workflow", path: link }] }, meta, route)).toThrow(Exited);

    expect(route).not.toHaveBeenCalled();
    expect(readFileSync(runYaml, "utf8")).toBe(WORKFLOW);
  });

  it("routes and stamps a run whose inputs are elsewhere, and creates nothing to find that out", () => {
    const input = join(scratch, "ci.yml");
    writeFileSync(input, WORKFLOW);
    const route = vi.fn(() => {
      expect(existsSync(runYaml)).toBe(false);
      return true;
    });

    executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID, inputs: [{ subject: "the --ci workflow", path: input }] }, meta, route);

    expect(route).toHaveBeenCalledOnce();
    expect(process.exit).not.toHaveBeenCalled();
    expect(existsSync(runYaml)).toBe(true);
    expect(readFileSync(input, "utf8")).toBe(WORKFLOW);
  });
});
