import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

describe("[SCN-RPT-020] the markdown renders each outcome's sentence, not the bare handle", () => {
  let rich: Ledger;
  beforeEach(() => {
    rich = reconcile(
      [
        {
          scnId: "SCN-A",
          evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }],
        },
        { scnId: "SCN-B", evidenceObligations: [] },
      ],
      [
        { qualityCheck: "fitness", fitnessFunction: "typecheck", scnId: "SCN-A", exists: true, enforcedOverRealSource: false },
        { qualityCheck: "integration", scnId: null, status: "passed", locator: "tests/stray.test.ts:1" },
      ]
    );
  });

  it("renders every summary cause row as the outcome's sentence alone, and no bare handle", () => {
    const md = renderMarkdown(__er(rich), ctx);
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

  it("renders the fitness table's Outcome column with the outcome's sentence", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain(`| SCN-A | ${OUTCOME_DESCRIPTION.watermelon} |`);
  });
});

describe("[SCN-RPT-025] every outcome glosses as its sentence, verbatim", () => {
  const OUTCOME_SENTENCES = [
    ["satisfied", "Evidence Observation satisfies its Evidence Obligation"],
    ["missing", "Evidence Observation is missing"],
    ["failing", "Evidence Observation is failing"],
    ["watermelon", "Evidence Observation is passing but its check could not fail its job"],
    ["no-scn-code", "Evidence Obligation has no @SCN code for an Evidence Observation to link to"],
    ["duplicate-scn-code", "Evidence Obligation's @SCN code is carried by another Scenario"],
    ["cites-unknown-scenario", "Evidence Observation cites an unknown Scenario"],
    ["cites-no-scenario", "Evidence Observation cites no Scenario"],
    ["no-evidence-obligation", "Evidence Observation cites a Scenario with no matching Evidence Obligation"],
    ["broken", "Evidence Observation ATTEMPT errored before its proof ran (behaviour never exercised)"],
    ["both-missing", "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"],
  ] as const satisfies readonly (readonly [Outcome, string])[];
  // A new outcome fails the typecheck here until its sentence has a row.
  const everyOutcomeHasARow: [Exclude<Outcome, (typeof OUTCOME_SENTENCES)[number][0]>] extends [never] ? true : never = true;
  void everyOutcomeHasARow;

  it.each(OUTCOME_SENTENCES)(
    'the "%s" outcome glosses as its sentence, verbatim',
    (handle, sentence) => {
      expect(OUTCOME_DESCRIPTION[handle]).toBe(sentence);
    }
  );
});
