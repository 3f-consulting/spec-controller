/**
 * Unit tests for planKeptRun — the PURE kept-run planner (@SCN-RMG-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the
 * @SCN-RMG-001 id matching features/run-management.feature, so a grep of the id returns
 * both halves of the pair (this @unit + the Cucumber @integration step-block).
 *
 * The @unit arm proves the planner in isolation, no IO: given { storeRoot, target, runId }
 * it yields the correctly-NESTED run dir <storeRoot>/<target>/<runId>/ + the two file-dest
 * paths (spec-reconciliation.md, spec-reconciliation.json) inside it. The @integration arm
 * (features/run-management.feature) proves the impure runner's real on-disk effect.
 *
 * Parent: @SCN-RMG-001 — the run-management layer.
 */

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parse } from "yaml";
import {
  planKeptRun,
  planRunManifest,
  serialiseRunManifest,
  resolveRunId,
  RECONCILIATION_DOCUMENT,
  RECONCILIATION_JSON,
  type RunManifestInput,
} from "./keptRun.js";

describe("[SCN-RMG-001] planKeptRun: yields the nested run dir + the two file-dest paths from { storeRoot, target, runId }", () => {
  it("nests the run dir at <storeRoot>/<target>/<runId>/ and places both outputs inside it", () => {
    const storeRoot = "/store/root";
    const target = "acme-web";
    const runId = "2026-07-01T09-30-00Z";

    const plan = planKeptRun({ storeRoot, target, runId });

    const expectedRunDir = join(storeRoot, target, runId);
    expect(plan.runDir).toBe(expectedRunDir);
    // The two file-dest paths sit INSIDE the nested run dir, named for the document + JSON.
    expect(plan.documentPath).toBe(join(expectedRunDir, RECONCILIATION_DOCUMENT));
    expect(plan.reconciliationJsonPath).toBe(join(expectedRunDir, RECONCILIATION_JSON));
    // The artefact filenames are the decided names (spec-reconciliation.md/.json).
    expect(RECONCILIATION_DOCUMENT).toBe("spec-reconciliation.md");
    expect(RECONCILIATION_JSON).toBe("spec-reconciliation.json");
  });

  it("nests target THEN run-id (1086's owned substructure), not a flat <root>/<run-id> or <root>/<target>", () => {
    const plan = planKeptRun({ storeRoot: "/root", target: "t", runId: "r" });

    // Both hops are present, in order: /root/t/r — a flat /root/r or /root/t (a missing
    // level) fails this. The intermediate segment is the target; its child is the run-id.
    expect(plan.runDir).toBe(join("/root", "t", "r"));
    expect(plan.documentPath).toBe(join("/root", "t", "r", "spec-reconciliation.md"));
    expect(plan.reconciliationJsonPath).toBe(join("/root", "t", "r", "spec-reconciliation.json"));
  });

  it("relocates the whole nest wholesale when a different store root is injected (root is a parameter, never hardcoded)", () => {
    const here = planKeptRun({ storeRoot: "/tmp/store-a", target: "acme", runId: "e1" });
    const there = planKeptRun({ storeRoot: "/var/store-b", target: "acme", runId: "e1" });

    expect(here.runDir).toBe(join("/tmp/store-a", "acme", "e1"));
    expect(there.runDir).toBe(join("/var/store-b", "acme", "e1"));
    // Same target/run-id, different injected root → the entire run dir moves with the root.
    expect(here.documentPath).toBe(join("/tmp/store-a", "acme", "e1", "spec-reconciliation.md"));
    expect(there.documentPath).toBe(join("/var/store-b", "acme", "e1", "spec-reconciliation.md"));
  });
});

describe("[SCN-RMG-002] planRunManifest: builds the run.yaml manifest from run metadata (empty purpose, the artefacts map)", () => {
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
    // The TOOL's identity (3F-1916) — which spec-controller produced the run.
    expect(manifest.tool_sha).toBe(input.toolSha);
    expect(manifest.tool_version).toBe(input.toolVersion);
    expect(manifest.mode).toBe(input.mode);
    expect(manifest.date).toBe(input.date);
    // The artefacts map carries the decided filenames (2026-06-30 vocabulary fold).
    expect(manifest.artefacts).toEqual({
      document: "spec-reconciliation.md",
      reconciliation: "spec-reconciliation.json",
    });
  });

  it("stamps purpose EMPTY (the ad-hoc default; slugs added by operator hand-edit) and links empty", () => {
    const manifest = planRunManifest(input);

    // purpose: [] is the ad-hoc default — NO --purpose flag, NO controlled-vocabulary
    // enforcement (both deferred; operator ruling).
    expect(manifest.purpose).toEqual([]);
    expect(manifest.links).toEqual([]);
  });

  it("serialises to valid YAML that a real parser reads back to the decided fields", () => {
    const yamlText = serialiseRunManifest(planRunManifest(input));

    // The emitted YAML must be VALID — the @integration parses the real on-disk file, so a
    // string-match would not do; prove the serialiser round-trips through a real parser here.
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
});

describe("[SCN-RMG-003] resolveRunId: the run-id defaults to an injected-clock ISO timestamp; an operator --run-id mnemonic overrides it", () => {
  it("defaults (no --run-id) to the INJECTED instant as a filesystem-safe ISO-8601 UTC timestamp — no colons, no millis", () => {
    // The clock is INJECTED (never a bare new Date()), so the default run-id is deterministic:
    // a pinned instant yields one exact string. The millis and the time-separator colons are
    // dropped so the run-id is a filesystem-safe directory name (matching the store run dir).
    const now = new Date("2026-06-30T10:04:01.123Z");

    const runId = resolveRunId({ now });

    expect(runId).toBe("2026-06-30T10-04-01Z");
  });

  it("returns the operator --run-id mnemonic VERBATIM, ignoring the clock entirely", () => {
    // A wildly different instant proves the override path never consults the clock — the
    // mnemonic (an earlier precedent: acme-q3, e1) names the run dir instead.
    const now = new Date("2000-01-01T00:00:00.000Z");

    expect(resolveRunId({ runId: "acme-q3", now })).toBe("acme-q3");
    expect(resolveRunId({ runId: "e1", now })).toBe("e1");
  });
});
