import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { reconcilingItemsOf } from "./claimReconciliationsTable.test-utils.js";

describe("[SCN-RPT-020] the markdown renders each outcome's sentence, not the bare handle", () => {
  let rich: Ledger;
  beforeEach(() => {
    rich = reconcile(
      [
        {
          scnId: "SCN-A",
          evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }],
        },
        { scnId: "SCN-B", evidenceObligations: [] },
      ],
      [
        { qualityCheckKind: "fitness", fitnessFunction: "typecheck", scnId: "SCN-A", exists: true, enforcedOverRealSource: false },
        { qualityCheckKind: "integration", scnId: null, status: "passed", locator: "tests/stray.test.ts:1" },
      ]
    );
  });

  it("renders every summary cause row as the outcome's sentence alone, and no bare handle", () => {
    const md = renderMarkdown(__er(rich), ctx, publishedExitCodeOf);
    expect(md).toContain("\n| Evidence Observation is missing |");
    expect(md).toContain("\n| Evidence Observation is failing |");
    expect(md).toContain(`\n| ${OUTCOME_DESCRIPTION.watermelon} |`);
    expect(md).toContain("\n| Evidence Observation cites an unknown Scenario |");
    expect(md).toContain("\n| Evidence Observation cites no Scenario |");
    expect(md).toContain("\n| Evidence Observation cites a Scenario with no matching Evidence Obligation |");
    expect(md).toContain(
      "\n| Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited |"
    );
    for (const handle of [
      "missing",
      "failing",
      "watermelon",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "no-evidence-obligation",
      "both-missing",
    ]) {
      expect(md).not.toContain(`\n| ${handle} |`);
    }
  });

  it("renders a fitness claim's reconciling item with the outcome's sentence, not the bare handle", () => {
    const items = reconcilingItemsOf(renderMarkdown(__er(rich), ctx, publishedExitCodeOf), "SCN-A");
    expect(items.some((item) => item.startsWith(`fitness: ${OUTCOME_DESCRIPTION.watermelon}`))).toBe(true);
    expect(items.some((item) => item.startsWith("fitness: watermelon"))).toBe(false);
  });
});

describe("[SCN-RPT-025] every outcome glosses as its sentence, verbatim", () => {
  const OUTCOME_ENTRIES = [
    ["satisfied", CoreMessage.OutcomeSatisfied],
    ["missing", CoreMessage.OutcomeMissing],
    ["failing", CoreMessage.OutcomeFailing],
    ["watermelon", CoreMessage.OutcomeWatermelon],
    ["no-scn-code", CoreMessage.OutcomeNoScnCode],
    ["duplicate-scn-code", CoreMessage.OutcomeDuplicateScnCode],
    ["cites-unknown-scenario", CoreMessage.OutcomeCitesUnknownScenario],
    ["cites-no-scenario", CoreMessage.OutcomeCitesNoScenario],
    ["no-evidence-obligation", CoreMessage.OutcomeNoEvidenceObligation],
    ["broken", CoreMessage.OutcomeBroken],
    ["both-missing", CoreMessage.OutcomeBothMissing],
  ] as const satisfies readonly (readonly [Outcome, CoreMessage])[];
  // A new outcome fails the typecheck here until its entry has a row.
  const everyOutcomeHasARow: [Exclude<Outcome, (typeof OUTCOME_ENTRIES)[number][0]>] extends [never] ? true : never = true;
  void everyOutcomeHasARow;

  it.each(OUTCOME_ENTRIES)(
    'the "%s" outcome glosses as its sentence, verbatim',
    (handle, entry) => {
      expect(OUTCOME_DESCRIPTION[handle]).toBe(CORE_MESSAGES[entry]);
    }
  );
});
