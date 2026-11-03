import { describe, expect, it } from "vitest";
import { CORE_MESSAGES, CoreMessage } from "@3f-consulting/spec-controller-core/internal";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { executeKeptRun, RUN_MANIFEST } from "./keptRun.js";
import { meta } from "./runManifestMeta.test-utils.js";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { wrapCommandArgv } from "../host.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

const TARGET = "target";
const RUN_ID = "r1";

const BALANCE_ARGS = [
  "--features", "tests/fixtures/balanced/features",
  "--vitest", "tests/fixtures/balanced/vitest.json",
];

function routeThroughBalance(formatSpecs: readonly string[]): boolean {
  return runBalanceCaptured(wrapCommandArgv(BALANCE_ARGS, [...formatSpecs])).wrote;
}

describe("[SCN-RMG-004] `spec-controller --store <root> balance` writes a stored run the operator can reach", () => {
  it("writes the markdown and JSON reports into the run directory it hands back", () => {
    const scratch = temporaryDirectory("spec-controller-stored-reports-");
    const storeRoot = join(scratch, "store");
    const runDir = join(storeRoot, TARGET, RUN_ID);

    const plan = executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, meta, routeThroughBalance);

    expect(plan).toEqual({
      runDir,
      documentPath: join(runDir, "spec-reconciliation.md"),
      reconciliationJsonPath: join(runDir, "spec-reconciliation.json"),
    });
    expect(readdirSync(runDir).sort()).toEqual([RUN_MANIFEST, "spec-reconciliation.json", "spec-reconciliation.md"]);
    expect(readFileSync(join(runDir, "spec-reconciliation.md"), "utf8").slice(0, CORE_MESSAGES[CoreMessage.ReportTitle].length + 1)).toBe(`${CORE_MESSAGES[CoreMessage.ReportTitle]}\n`);
    const json = JSON.parse(readFileSync(join(runDir, "spec-reconciliation.json"), "utf8")) as Record<string, unknown>;
    expect(json).toHaveProperty("runProvenance");
  });
});
