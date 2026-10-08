import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, RUN_MANIFEST } from "./keptRun.js";
import { meta } from "./runManifestMeta.testkit.js";
import { runBalanceCaptured } from "../../test-support/runBalance.js";

const TARGET = "target";
const RUN_ID = "r1";

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-report-written-"));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function filesUnder(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files.set(path.slice(dir.length), readFileSync(path, "utf8"));
  }
  return files;
}

describe("[SCN-RMG-005] executeKeptRun stamps run.yaml only when the command wrote its report", () => {
  it("stamps nothing and hands back no run when the command wrote no report", () => {
    const storeRoot = join(scratch, "store");

    const kept = executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, () => false);

    expect(kept).toBeUndefined();
    expect(existsSync(join(storeRoot, TARGET, RUN_ID, RUN_MANIFEST))).toBe(false);
    expect(filesUnder(storeRoot).size).toBe(0);
  });

  it("leaves an earlier run under the same run-id byte-identical when the command wrote no report", () => {
    const storeRoot = join(scratch, "store");
    const runDir = join(storeRoot, TARGET, RUN_ID);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, RUN_MANIFEST), "an earlier run's manifest\n");
    writeFileSync(join(runDir, "spec-reconciliation.md"), "an earlier report\n");
    writeFileSync(join(runDir, "spec-reconciliation.json"), "{}\n");
    const before = filesUnder(storeRoot);

    executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, () => false);

    expect(filesUnder(storeRoot)).toEqual(before);
  });

  it("stamps run.yaml and hands back the run when the command wrote its report", () => {
    const storeRoot = join(scratch, "store");

    const kept = executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, () => true);

    expect(kept?.runDir).toBe(join(storeRoot, TARGET, RUN_ID));
    expect(existsSync(join(storeRoot, TARGET, RUN_ID, RUN_MANIFEST))).toBe(true);
  });
});

describe("[SCN-RMG-005] runBalance answers whether it wrote the report its --format specs name", () => {
  function answer(argv: readonly string[]): { wrote: unknown; exitCode: number } {
    const { wrote, exitCode } = runBalanceCaptured(argv);
    return { wrote, exitCode };
  }

  it("answers false for a flag balance does not accept, and leaves the usage status", () => {
    const refused = answer(["--features", "tests/fixtures/balanced/features", "--bogus"]);

    expect(refused).toEqual({ wrote: false, exitCode: 2 });
  });

  it("answers true once it has written the report", () => {
    const json = join(scratch, "report.json");

    const written = answer([
      "--features", "tests/fixtures/balanced/features",
      "--vitest", "tests/fixtures/balanced/vitest.json",
      "--format", `json:${json}`,
    ]);

    expect(written.wrote).toBe(true);
    expect(existsSync(json)).toBe(true);
  });
});
