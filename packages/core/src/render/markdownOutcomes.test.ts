import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { OUT_OF_BALANCE_OUTCOMES, type Ledger, type Outcome } from "../model.js";
import { CoreMessage, type WordedCoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { reconcilingItemsOf } from "./claimReconciliationsTable.test-utils.js";

describe("[CLM-RPT-020] the markdown renders each outcome's sentence, not the bare handle", () => {
  let rich: Ledger;
  beforeEach(() => {
    rich = reconcile(
      [
        {
          claimCode: "CLM-A",
          evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }],
        },
        { claimCode: "CLM-B", evidenceObligations: [] },
      ],
      [
        { qualityCheckKind: "fitness", fitnessFunction: "typecheck", claimCode: "CLM-A", exists: true, enforcedOverRealSource: false },
        { qualityCheckKind: "integration", claimCode: null, status: "passed", locator: "tests/stray.test.ts:1" },
      ]
    );
  });

  const CAUSE_ROW_ENTRIES = [
    ["missing", CoreMessage.OutcomeMissing],
    ["failing", CoreMessage.OutcomeFailing],
    ["cannot-fail", CoreMessage.OutcomeCannotFail],
    ["no-claim-code", CoreMessage.OutcomeNoClaimCode],
    ["duplicate-claim-code", CoreMessage.OutcomeDuplicateClaimCode],
    ["cites-unknown-claim", CoreMessage.OutcomeCitesUnknownClaim],
    ["cites-no-claim", CoreMessage.OutcomeCitesNoClaim],
    ["not-asked-for", CoreMessage.OutcomeNotAskedFor],
    ["never-ran", CoreMessage.OutcomeNeverRan],
    ["no-quality-check", CoreMessage.OutcomeNoQualityCheck],
  ] as const satisfies readonly (readonly [Outcome, WordedCoreMessage])[];
  // A new out-of-balance outcome fails the typecheck here until its entry has a row.
  const everyCauseHasARow: [Exclude<Outcome, "satisfied" | (typeof CAUSE_ROW_ENTRIES)[number][0]>] extends [never]
    ? true
    : never = true;
  void everyCauseHasARow;

  it("renders every summary cause row as its own outcome's sentence, and no bare handle", () => {
    const md = renderMarkdown(__er(rich), ctx, publishedExitCodeOf);
    const lines = md.split("\n");
    const lineSubjectRow = lines.findIndex((line) =>
      line.startsWith(`| ${coreMessage(CoreMessage.ReconciliationLineSubject)} |`)
    );
    expect(lineSubjectRow).toBeGreaterThanOrEqual(0);
    expect([...OUT_OF_BALANCE_OUTCOMES].sort()).toEqual(CAUSE_ROW_ENTRIES.map(([handle]) => handle).sort());
    const causeRows = lines.slice(lineSubjectRow + 1, lineSubjectRow + 1 + OUT_OF_BALANCE_OUTCOMES.length);
    const entryOf = new Map<Outcome, WordedCoreMessage>(CAUSE_ROW_ENTRIES);
    expect(causeRows.map((line) => line.split(" | ")[0])).toEqual(
      OUT_OF_BALANCE_OUTCOMES.map((outcome) => `| ${coreMessage(entryOf.get(outcome)!)}`)
    );
    for (const [handle] of CAUSE_ROW_ENTRIES) {
      expect(md).not.toContain(`\n| ${handle} |`);
    }
  });

  it("renders a fitness claim's reconciling item with the outcome's sentence, not the bare handle", () => {
    const items = reconcilingItemsOf(renderMarkdown(__er(rich), ctx, publishedExitCodeOf), "CLM-A");
    expect(items.some((item) => item.startsWith(`fitness: ${coreMessage(CoreMessage.OutcomeCannotFail)}`))).toBe(true);
    expect(items.some((item) => item.startsWith("fitness: cannot-fail"))).toBe(false);
  });
});
