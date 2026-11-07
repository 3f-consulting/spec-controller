import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  executeKeptRun,
  planKeptRun,
  planRunManifest,
  serialiseRunManifest,
  resolveRunId,
  RUN_MANIFEST,
  type RunManifestInput,
} from "./keptRun.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

describe("[CLM-RMG-001] planKeptRun: yields the nested run dir + the two file-dest paths from { storeRoot, target, runId }", () => {

  it("nests target THEN run-id (1086's owned substructure), not a flat <root>/<run-id> or <root>/<target>", () => {
    const plan = planKeptRun({ storeRoot: "/root", target: "t", runId: "r" });

    expect(plan.runDir).toBe(join("/root", "t", "r"));
    expect(plan.documentPath).toBe(join("/root", "t", "r", "spec-reconciliation.md"));
    expect(plan.reconciliationJsonPath).toBe(join("/root", "t", "r", "spec-reconciliation.json"));
  });
});

describe("[CLM-RMG-002] planRunManifest: builds the run.yaml manifest from run metadata (empty purpose, the artefacts map)", () => {
  const input: RunManifestInput = {
    runId: "2026-07-01T09-30-00Z",
    target: "acme-web",
    sourceSha: "abc1234",
    toolSha: "13ee47f",
    toolVersion: "0.1.0",
    mode: "balance",
    date: "2026-07-01",
  };

  it("stamps the decided field set with values threaded from the metadata", () => {
    const manifest = planRunManifest(input);

    expect(manifest.schema_version).toBe(2);
    expect(manifest.run_id).toBe(input.runId);
    expect(manifest.target).toBe(input.target);
    expect(manifest.source_sha).toBe(input.sourceSha);
    expect(manifest.tool_sha).toBe(input.toolSha);
    expect(manifest.tool_version).toBe(input.toolVersion);
    expect(manifest.mode).toBe(input.mode);
    expect(manifest.date).toBe(input.date);
    expect(manifest.artefacts).toEqual({
      document: "spec-reconciliation.md",
      reconciliation: "spec-reconciliation.json",
    });
  });

  it("stamps purpose EMPTY (the ad-hoc default; slugs added by operator hand-edit) and links empty", () => {
    const manifest = planRunManifest(input);

    expect(manifest.purpose).toEqual([]);
    expect(manifest.links).toEqual([]);
  });

  it("serialises to valid YAML that a real parser reads back to the decided fields", () => {
    const yamlText = serialiseRunManifest(planRunManifest(input));

    const roundTripped = parse(yamlText) as Record<string, unknown>;
    expect(roundTripped.schema_version).toBe(2);
    expect(roundTripped.run_id).toBe(input.runId);
    expect(roundTripped.source_sha).toBe(input.sourceSha);
    expect(roundTripped.mode).toBe(input.mode);
    expect(roundTripped.date).toBe(input.date);
    expect(roundTripped.purpose).toEqual([]);
    expect(roundTripped.links).toEqual([]);
    expect(roundTripped.artefacts).toEqual({
      document: "spec-reconciliation.md",
      reconciliation: "spec-reconciliation.json",
    });
  });

  it("writes the stored run's own run.yaml with that run's id, target and metadata", () => {
    const scratch = temporaryDirectory("spec-controller-run-manifest-");
    const storeRoot = join(scratch, "store");
    const { runId, target, ...meta } = input;

    executeKeptRun({ storeRoot, target, runId }, meta, () => true);

    const written = parse(readFileSync(join(storeRoot, target, runId, RUN_MANIFEST), "utf8")) as Record<string, unknown>;
    expect(written).toEqual({
      schema_version: 2,
      run_id: input.runId,
      target: input.target,
      source_sha: input.sourceSha,
      tool_sha: input.toolSha,
      tool_version: input.toolVersion,
      mode: input.mode,
      date: input.date,
      purpose: [],
      links: [],
      artefacts: {
        document: "spec-reconciliation.md",
        reconciliation: "spec-reconciliation.json",
      },
    });
  });
});

describe("[CLM-RMG-003] resolveRunId: the run-id defaults to an injected-clock ISO timestamp; an operator --run-id mnemonic overrides it", () => {
  it("defaults (no --run-id) to the INJECTED instant as a filesystem-safe ISO-8601 UTC timestamp — no colons, no millis", () => {
    const now = new Date("2026-06-30T10:04:01.123Z");

    const runId = resolveRunId({ now });

    expect(runId).toBe("2026-06-30T10-04-01Z");
  });

  it("returns the operator --run-id mnemonic VERBATIM, ignoring the clock entirely", () => {
    const now = new Date("2000-01-01T00:00:00.000Z");

    expect(resolveRunId({ runId: "acme-q3", now })).toBe("acme-q3");
    expect(resolveRunId({ runId: "e1", now })).toBe("e1");
  });
});
