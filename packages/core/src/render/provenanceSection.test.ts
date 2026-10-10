import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";

const er = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

let balance: Ledger;
beforeEach(() => {
  balance = reconcile(
    [{ scnId: "SCN-RPT-028", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-RPT-028", status: "passed" }],
  );
});

const handed = (inputs: RunContext["inputs"]): RunContext => ({
  target: "partly-handed-target",
  inputs,
  runStart: new Date("2026-09-06T15:30:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
});

const notSuppliedLine = (md: string): string | null =>
  md.split("\n").find((line) => line.startsWith("- Not supplied:")) ?? null;

describe("[SCN-RPT-028] the Run provenance names the canonical inputs the run did not receive", () => {
  it("names the flags with no value on a line of their own, beneath the Inputs list", () => {
    const md = renderMarkdown(er(balance), handed({ features: "features", ciSteps: "ci-steps.json" }));
    expect(notSuppliedLine(md)).toBe("- Not supplied: `--vitest`, `--cucumber`, `--ci`, `--package-json`");
    expect(md.indexOf("  - `--ci-steps ci-steps.json`")).toBeGreaterThan(-1);
    expect(md.indexOf("  - `--ci-steps ci-steps.json`")).toBeLessThan(md.indexOf("- Not supplied:"));
    expect(md.indexOf("- Not supplied:")).toBeLessThan(md.indexOf("- Run timestamp (UTC):"));
  });

  it("says nothing about absence when the run was handed every canonical stream", () => {
    const md = renderMarkdown(
      er(balance),
      handed({
        features: "features",
        vitest: "vitest.json",
        cucumber: "cucumber.json",
        ci: ".github/workflows",
        packageJson: "package.json",
        ciSteps: "ci-steps.json",
      })
    );
    expect(notSuppliedLine(md)).toBeNull();
  });

  it("keeps the none-specified Inputs branch reachable, and names every canonical flag beside it", () => {
    const md = renderMarkdown(er(balance), handed({}));
    expect(md.split("\n")).toContain("- Inputs: none specified");
    expect(notSuppliedLine(md)).toBe(
      "- Not supplied: `--features`, `--vitest`, `--cucumber`, `--ci`, `--package-json`, `--ci-steps`"
    );
  });
});
