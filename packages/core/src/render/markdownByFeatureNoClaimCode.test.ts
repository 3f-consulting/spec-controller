import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf, type EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { evidenceObligations } from "../domain/corpusCounts.js";
import type { ScenarioName } from "../domain/qualityCheckReconciliation.js";
import { scenarioName, scenarioTitleOf } from "../domain/scenarioName.test-utils.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

const ctx: RunContext = {
  target: "by-feature-no-claim-code",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "features",
  runStart: new Date("2026-09-27T09:00:00.000Z"),
  sourceSha: null,
};

const reconciliationOf = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false), ledger });

function noClaimCodeCorpus(untagged: ScenarioName[]): { reconciliation: EvidenceReconciliation; census: ReturnType<typeof evidenceObligations> } {
  const ledger = reconcile([], [], untagged.map((u) => `${u.feature} : ${scenarioTitleOf(u)}`));
  return { reconciliation: reconciliationOf(ledger), census: evidenceObligations(0, 0, untagged) };
}

function byFeatureRows(md: string): string[][] {
  const section = md.slice(md.indexOf(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading))));
  const end = section.indexOf("\n#", 1);
  return (end > 0 ? section.slice(0, end) : section)
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Feature ") && !line.startsWith("| ---"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function byFeatureRowOf(rows: string[][], code: string): { row: string[][]; others: string[][] } {
  const isCodes = ([feature = ""]: string[]): boolean => feature.endsWith(` (${code})`);
  return { row: rows.filter(isCodes).map(([, ...cells]) => cells), others: rows.filter((cells) => !isCodes(cells)) };
}

describe("[CLM-RPT-031] a feature file's scenarios carrying no claim code count together on one row named by that file", () => {
  let checkout: ScenarioName[];
  beforeEach(() => {
    checkout = ["pay by card", "pay by voucher", "pay on account"].map((title) => scenarioName("checkout.feature", title));
  });

  it("renders one row named by the file, counting all three as carrying no claim code", () => {
    const { reconciliation, census } = noClaimCodeCorpus(checkout);
    const rows = byFeatureRows(renderMarkdown(reconciliation, ctx, publishedExitCodeOf, census));
    expect(rows).toEqual([["checkout.feature", "3", "3 with no claim code"]]);
  });
});

describe("[CLM-RPT-032] a scenario carrying no claim code in a file headed by a feature code counts on that feature's row", () => {
  it("counts a headed file's no-claim-code scenarios on its feature's row when none carries the code", () => {
    const { reconciliation, census } = noClaimCodeCorpus([
      scenarioName("one.feature", "a no-claim-code scenario"),
      scenarioName("one.feature", "an over-long code"),
    ]);
    const md = renderMarkdown(reconciliation, ctx, publishedExitCodeOf, census, new Map([["ONE", "one"]]));
    expect(byFeatureRowOf(byFeatureRows(md), "ONE")).toEqual({ row: [["2", "2 with no claim code"]], others: [] });
  });

  it("counts them on the same row as the scenarios carrying the file's code", () => {
    const untagged = [
      scenarioName("sample.feature", "an untagged scenario with no anchor"),
      scenarioName("sample.feature", "an untagged outline with no anchor"),
    ];
    const ledger = reconcile(
      [{ claimCode: "CLM-UNT-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [],
      untagged.map((u) => `${u.feature} : ${scenarioTitleOf(u)}`),
    );
    const md = renderMarkdown(reconciliationOf(ledger), ctx, publishedExitCodeOf, evidenceObligations(1, 1, untagged), new Map([["UNT", "sample"]]));
    expect(byFeatureRowOf(byFeatureRows(md), "UNT")).toEqual({ row: [["3", "CLM-UNT-001 and 2 with no claim code"]], others: [] });
  });
});
