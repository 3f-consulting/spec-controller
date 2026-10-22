import { describe, it, expect } from "vitest";
import { renderJson, renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

describe("[SCN-RPT-039] the markdown counts phantom-claim and unnamed-claim rows by the reconciliation model's definitions of them, while the JSON keeps the terms", () => {
  const proven = { scnId: "SCN-CWD-001", evidenceObligations: [{ qualityCheck: "unit" as const }] };
  const provenObservation = { qualityCheck: "unit" as const, scnId: "SCN-CWD-001", status: "passed" as const };
  const strandedObservation = { qualityCheck: "unit" as const, scnId: "SCN-GONE-001", status: "passed" as const };
  const uncitedObservation = { qualityCheck: "unit" as const, scnId: null, status: "passed" as const };
  const unbalanced = () => reconcile([proven], [provenObservation, strandedObservation, uncitedObservation]);

  it("tallies each row kind by its definition", () => {
    const md = renderMarkdown(__er(unbalanced()), ctx, publishedExitCodeOf);
    expect(md).toContain("- 1 Claim Reconciliation(s) for cited scenario ids with no real scenario.\n");
    expect(md).toContain(
      '- 1 Claim Reconciliation(s) for evidence observations citing no scenario, aggregated into "(unnamed claim)".\n'
    );
  });

  it("states the rows no feature groups by their definitions", () => {
    const md = renderMarkdown(__er(unbalanced()), ctx, publishedExitCodeOf);
    expect(md).toContain(
      "1 Claim Reconciliation(s) for cited scenario ids with no real scenario and " +
        "1 Claim Reconciliation(s) for evidence observations citing no scenario " +
        "out of balance, not grouped by feature (no feature file names them)"
    );
  });

  it("sums the test volume over scenarios, cited scenario ids with no real scenario, and observations citing no scenario", () => {
    const md = renderMarkdown(__er(unbalanced(), true, false), ctx, publishedExitCodeOf);
    expect(md).toContain(
      "3 evidence observations = 1 on scenarios + 1 on cited scenario ids with no real scenario + 1 citing no scenario."
    );
  });

  it("glosses a balanced run with the satisfied outcome's sentence", () => {
    const md = renderMarkdown(__er(reconcile([proven], [provenObservation])), ctx, publishedExitCodeOf);
    expect(md).toContain(
      "every Claim Reconciliation balances: every Evidence Observation satisfies its Evidence Obligation."
    );
    expect(md).toContain(`every Claim Reconciliation balances: every ${OUTCOME_DESCRIPTION.satisfied}.`);
  });

  it("keeps the terms phantom-claim and unnamed-claim as the JSON's row kinds", () => {
    const json = JSON.parse(renderJson(__er(unbalanced()), ctx)) as {
      ledger: { claimReconciliations: { kind: string }[] };
    };
    expect(json.ledger.claimReconciliations.map((row) => row.kind)).toEqual([
      "scenario",
      "phantom-claim",
      "unnamed-claim",
    ]);
  });
});

describe("[SCN-RPT-040] the markdown's prose refers to an outcome by its sentence, never by its handle", () => {
  const proven = { scnId: "SCN-CWD-001", evidenceObligations: [{ qualityCheck: "unit" as const }] };
  const brokenObservation = {
    qualityCheck: "unit" as const,
    scnId: "SCN-CWD-001",
    status: "failed" as const,
    broken: true as const,
    locator: "src/collect.test.ts",
  };
  const provenObservation = { qualityCheck: "unit" as const, scnId: "SCN-CWD-001", status: "passed" as const };

  it("the unsound stamp quotes the missing outcome's sentence", () => {
    const md = renderMarkdown(__er(reconcile([proven], [brokenObservation])), ctx, publishedExitCodeOf);
    expect(md).toContain(
      'A row reading "Evidence Observation is missing" below may therefore be a BROKEN proof rather than an absent one'
    );
    expect(md).toContain(`A row reading "${OUTCOME_DESCRIPTION.missing}" below`);
    expect(md).not.toContain("`missing`");
  });

  it("the scenario code errors section's note quotes the duplicated code's outcome sentence", () => {
    const md = renderMarkdown({ ...__er(reconcile([proven], [provenObservation])), scenarioCodeErrors: [] }, ctx, publishedExitCodeOf);
    expect(md).toContain(
      "A duplicated @SCN code is not listed here: it is reported on its account's rows, as " +
        '"Evidence Obligation\'s @SCN code is carried by another Scenario".'
    );
    expect(md).toContain(`as "${OUTCOME_DESCRIPTION["duplicate-scn-code"]}".`);
    expect(md).not.toContain("`duplicate-scn-code`");
  });
});
