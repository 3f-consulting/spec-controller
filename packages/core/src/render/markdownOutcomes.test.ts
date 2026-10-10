import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-RPT-020] the markdown renders each outcome's canon description, not the bare handle", () => {
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

  it("renders every summary ↳ decomposition row with the canon description, and no bare handle", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain("| ↳ Evidence Observation is missing |");
    expect(md).toContain("| ↳ Evidence Observation is failing |");
    expect(md).toContain("| ↳ Evidence Observation is passing but fabricated |");
    expect(md).toContain("| ↳ Evidence Observation cites an unknown Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites no Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites a Scenario with no matching Evidence Obligation |");
    expect(md).toContain(
      "| ↳ Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited |"
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
      expect(md).not.toContain(`| ↳ ${handle} |`);
    }
  });

  it("renders the fitness table's Outcome column with the canon description", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain("| SCN-A | 🍉 Evidence Observation is passing but fabricated |");
  });
});

describe("[SCN-RPT-025] every outcome glosses as the manifesto's canon Outcome text", () => {
  const CANON_OUTCOME_TEXT = [
    ["satisfied", "Evidence Observation satisfies its Evidence Obligation"],
    ["missing", "Evidence Observation is missing"],
    ["failing", "Evidence Observation is failing"],
    ["watermelon", "Evidence Observation is passing but fabricated"],
    ["no-scn-code", "Evidence Obligation has no @SCN code for an Evidence Observation to link to"],
    ["duplicate-scn-code", "Evidence Obligation's @SCN code is carried by another Scenario"],
    ["cites-unknown-scenario", "Evidence Observation cites an unknown Scenario"],
    ["cites-no-scenario", "Evidence Observation cites no Scenario"],
    ["no-evidence-obligation", "Evidence Observation cites a Scenario with no matching Evidence Obligation"],
    ["broken", "Evidence Observation ATTEMPT errored before it could cite a Scenario (the proving suite failed to collect; behaviour never exercised)"],
    ["both-missing", "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"],
  ] as const satisfies readonly (readonly [Outcome, string])[];
  // A new outcome fails the typecheck here until its canon text has a row.
  const everyOutcomeHasARow: [Exclude<Outcome, (typeof CANON_OUTCOME_TEXT)[number][0]>] extends [never] ? true : never = true;

  it.each(CANON_OUTCOME_TEXT)(
    'the "%s" outcome glosses as the manifesto canon text',
    (handle, canon) => {
      expect(OUTCOME_DESCRIPTION[handle]).toBe(canon);
    }
  );
});
