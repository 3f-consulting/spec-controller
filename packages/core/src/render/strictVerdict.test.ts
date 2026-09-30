import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { renderJson } from "./json.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";

const er = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

const ctxOf = (strict: boolean): RunContext => ({
  target: "pending-target",
  inputs: { features: "features" },
  runStart: new Date("2026-09-27T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: null,
  toolVersion: "0.1.0",
  strict,
});

function headline(md: string): string {
  const after = md.split("### Run verdict")[1] ?? "";
  return after.split("\n").find((line) => line.trim() !== "") ?? "";
}

describe("[SCN-CLI-011] an only-Pending-Items run under --strict is headlined as the exit 3 it gives", () => {
  const onlyPending: Ledger = reconcile(
    [
      { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
      { scnId: "SCN-PDR-002", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
    ],
    [],
  );

  it("names exit 3 under a strict run, and never reads as balanced", () => {
    const line = headline(renderMarkdown(er(onlyPending), ctxOf(true)));
    expect(line).toMatch(/^\*\*PENDING\*\* — .*\(exit 3\)$/);
    expect(line).not.toContain("**BALANCED**");
  });

  it("still names exit 0 and keeps the pending note when the run is not strict", () => {
    const md = renderMarkdown(er(onlyPending), ctxOf(false));
    expect(headline(md)).toMatch(/^\*\*BALANCED\*\* — .*\(exit 0\)$/);
    expect(md).toContain("gives exit 3 under `--strict`");
  });

  it("records the strictness in the saved report, so a re-render can read it back", () => {
    const saved = JSON.parse(renderJson(er(onlyPending), ctxOf(true))) as { runProvenance: { strict?: boolean } };
    expect(saved.runProvenance.strict).toBe(true);
    const bare = JSON.parse(renderJson(er(onlyPending), ctxOf(false))) as { runProvenance: { strict?: boolean } };
    expect(bare.runProvenance.strict).toBe(false);
  });
});
