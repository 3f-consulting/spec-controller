import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf, type EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { evidenceObligations, type UntaggedScenario } from "../domain/corpusCounts.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";

const ctx: RunContext = {
  target: "by-feature-no-scn-code",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "features",
  runStart: new Date("2026-09-27T09:00:00.000Z"),
  sourceSha: null,
};

const reconciliationOf = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

function noScnCodeCorpus(untagged: UntaggedScenario[]): { reconciliation: EvidenceReconciliation; census: ReturnType<typeof evidenceObligations> } {
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
  let checkout: UntaggedScenario[];
  beforeEach(() => {
    checkout = ["pay by card", "pay by voucher", "pay on account"].map((scenario) => ({
      feature: "checkout.feature",
      scenario,
    }));
  });

  it("renders one row named by the file, counting all three as carrying no @SCN code", () => {
    const { reconciliation, census } = noScnCodeCorpus(checkout);
    const rows = byFeatureRows(renderMarkdown(reconciliation, ctx, census));
    expect(rows).toEqual([["checkout.feature", "3", "3 with no `@SCN` code"]]);
  });
});

describe("[SCN-RPT-032] a scenario carrying no @SCN code in a file headed by a feature code counts on that feature's row", () => {
  it("counts a headed file's no-scn-code scenarios on its feature's row when none carries the code", () => {
    const { reconciliation, census } = noScnCodeCorpus([
      { feature: "one.feature", scenario: "a no-scn-code scenario" },
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
});
