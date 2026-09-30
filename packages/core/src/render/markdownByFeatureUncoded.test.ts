import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { reconcile, summaryOf, type EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { evidenceObligations, type UntaggedScenario } from "../census/evidenceObligations.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";

const ctx: RunContext = {
  target: "by-feature-uncoded",
  inputs: { features: "features" },
  runStart: new Date("2026-09-27T09:00:00.000Z"),
  sourceSha: null,
};

const reconciliationOf = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

function uncodedCorpus(untagged: UntaggedScenario[]): { reconciliation: EvidenceReconciliation; census: ReturnType<typeof evidenceObligations> } {
  const ledger = reconcile([], [], untagged.map((u) => `${u.feature} : ${u.scenario}`));
  return { reconciliation: reconciliationOf(ledger), census: evidenceObligations(0, 0, untagged) };
}

function byFeatureRows(md: string): string[][] {
  const section = md.slice(md.indexOf("### Out-of-balance by feature"));
  const end = section.indexOf("\n#", 1);
  return (end > 0 ? section.slice(0, end) : section)
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Feature ") && !line.startsWith("| ---"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

describe("[SCN-RPT-031] a feature file's scenarios carrying no @SCN code count together on one row named by that file", () => {
  const checkout = ["pay by card", "pay by voucher", "pay on account"].map((scenario) => ({
    feature: "checkout.feature",
    scenario,
  }));

  it("renders one row named by the file, counting all three as carrying no @SCN code", () => {
    const { reconciliation, census } = uncodedCorpus(checkout);
    const rows = byFeatureRows(renderMarkdown(reconciliation, ctx, census));
    expect(rows).toEqual([["checkout.feature", "3", "3 with no `@SCN` code"]]);
  });

  it("puts no file-and-name locator in any cell", () => {
    const { reconciliation, census } = uncodedCorpus(checkout);
    const cells = byFeatureRows(renderMarkdown(reconciliation, ctx, census)).flat();
    expect(cells.filter((cell) => cell.includes(" : "))).toEqual([]);
  });

  it("keeps the total line counting every row", () => {
    const { reconciliation, census } = uncodedCorpus(checkout);
    expect(renderMarkdown(reconciliation, ctx, census)).toContain("3 of 3 scenario rows out of balance, grouped by feature.");
  });

  it("gives two files two rows, in the order their scenarios first appear", () => {
    const { reconciliation, census } = uncodedCorpus([
      ...checkout.slice(0, 2),
      { feature: "refund.feature", scenario: "refund to card" },
    ]);
    const rows = byFeatureRows(renderMarkdown(reconciliation, ctx, census));
    expect(rows).toEqual([
      ["checkout.feature", "2", "2 with no `@SCN` code"],
      ["refund.feature", "1", "1 with no `@SCN` code"],
    ]);
  });
});

describe("[SCN-RPT-032] a scenario carrying no @SCN code in a file headed by a feature code counts on that feature's row", () => {
  it("counts a headed file's uncoded scenarios on its feature's row when none carries the code", () => {
    const { reconciliation, census } = uncodedCorpus([
      { feature: "one.feature", scenario: "an uncoded scenario" },
      { feature: "one.feature", scenario: "an over-long code" },
    ]);
    const md = renderMarkdown(reconciliation, ctx, census, new Map([["ONE", "one"]]));
    expect(byFeatureRows(md)).toEqual([["one (ONE)", "2", "2 with no `@SCN` code"]]);
  });

  it("counts them on the same row as the scenarios carrying the file's code", () => {
    const untagged = [
      { feature: "sample.feature", scenario: "an untagged scenario with no anchor" },
      { feature: "sample.feature", scenario: "an untagged outline with no anchor" },
    ];
    const ledger = reconcile(
      [{ scnId: "SCN-UNT-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [],
      untagged.map((u) => `${u.feature} : ${u.scenario}`),
    );
    const md = renderMarkdown(reconciliationOf(ledger), ctx, evidenceObligations(1, 1, untagged), new Map([["UNT", "sample"]]));
    expect(byFeatureRows(md)).toEqual([["sample (UNT)", "3", "SCN-UNT-001 and 2 with no `@SCN` code"]]);
  });

  it("still names a headerless file beside a headed one", () => {
    const { reconciliation, census } = uncodedCorpus([
      { feature: "one.feature", scenario: "an uncoded scenario" },
      { feature: "checkout.feature", scenario: "pay by card" },
    ]);
    const md = renderMarkdown(reconciliation, ctx, census, new Map([["ONE", "one"]]));
    expect(byFeatureRows(md)).toEqual([
      ["one (ONE)", "1", "1 with no `@SCN` code"],
      ["checkout.feature", "1", "1 with no `@SCN` code"],
    ]);
  });
});
