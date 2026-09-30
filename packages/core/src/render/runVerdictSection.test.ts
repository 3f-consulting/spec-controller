import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";

const er = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

const ctx: RunContext = {
  target: "nothing-to-reconcile-target",
  inputs: { features: "features" },
  runStart: new Date("2026-09-12T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

describe("[SCN-CLI-019] the run verdict on a ledger with no accounts reads NOTHING TO RECONCILE, never BALANCED", () => {
  const empty: Ledger = reconcile([], []);

  it("names the run's own state and the exit code it maps to", () => {
    const md = renderMarkdown(er(empty), ctx);
    expect(md).toContain("**NOTHING TO RECONCILE**");
    expect(md).toMatch(/\*\*NOTHING TO RECONCILE\*\* — .*\(exit 5\)/);
  });

  it("never reads as balanced — the vacuous green is the fault, not a missing sentence", () => {
    const md = renderMarkdown(er(empty), ctx);
    expect(md).not.toContain("**BALANCED**");
    expect(md).not.toContain("(exit 0)");
  });

  it("does not fire for a run that HAS accounts, whatever their verdict", () => {
    const balanced: Ledger = reconcile(
      [{ scnId: "SCN-NTR-002", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-NTR-002", status: "passed" }]
    );
    const md = renderMarkdown(er(balanced), ctx);
    expect(md).toContain("**BALANCED**");
    expect(md).not.toContain("**NOTHING TO RECONCILE**");
  });
});
