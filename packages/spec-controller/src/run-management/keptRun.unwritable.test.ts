import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, RUN_MANIFEST, type RunManifestMeta } from "./keptRun.js";
import { usageStatusOf } from "../usageStatus.test-utils.js";
import { runBalanceCaptured, type BalanceRun } from "../../test-support/runBalance.js";
import { wrapCommandArgv } from "../host.js";

const TARGET = "unwritable";
const RUN_ID = "r1";

const BALANCE_ARGS = [
  "--features", "tests/fixtures/evidence-observation/features",
  "--vitest", "tests/fixtures/evidence-observation/vitest.json",
];

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

describe("[SCN-RMG-009] a stored run that cannot write a report into its run directory is refused naming the file and why", () => {
  it("refuses a markdown report whose place in the run directory is a directory, with EISDIR, and stamps no run.yaml", () => {
    const storeRoot = join(scratch, "store");
    const runDir = join(storeRoot, TARGET, RUN_ID);
    const document = join(runDir, "spec-reconciliation.md");
    mkdirSync(document, { recursive: true });
    let balance: BalanceRun | undefined;
    const route = (formatSpecs: readonly string[]): boolean => {
      balance = runBalanceCaptured(wrapCommandArgv(BALANCE_ARGS, [...formatSpecs]));
      return balance.wrote;
    };

    expect(executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, route)).toBeUndefined();

    expect(balance?.exitCode).toBe(2);
    expect(balance?.stderr).toContain(document);
    expect(balance?.stderr).toContain("EISDIR");
    expect(existsSync(join(runDir, RUN_MANIFEST))).toBe(false);
  });
});
