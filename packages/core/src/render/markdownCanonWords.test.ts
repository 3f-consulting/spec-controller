import { describe, it, expect } from "vitest";
import { renderJson, renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { claimReconciliationsOf } from "../assemble/reportClaimReconciliations.test-utils.js";

describe("[SCN-RPT-039] the markdown counts phantom-claim and unnamed-claim rows by the reconciliation model's definitions of them, while the JSON keeps the terms", () => {
  const proven = { scnId: "SCN-CWD-001", evidenceObligations: [{ qualityCheckKind: "unit" as const }] };
  const provenObservation = { qualityCheckKind: "unit" as const, scnId: "SCN-CWD-001", status: "passed" as const };
  const strandedObservation = { qualityCheckKind: "unit" as const, scnId: "SCN-GONE-001", status: "passed" as const };
  const uncitedObservation = { qualityCheckKind: "unit" as const, scnId: null, status: "passed" as const };
  const unbalanced = () => reconcile([proven], [provenObservation, strandedObservation, uncitedObservation]);

  it("tallies each row kind by its definition", () => {
    const md = renderMarkdown(__er(unbalanced()), ctx, publishedExitCodeOf);
    expect(md).toContain(`- ${CORE_MESSAGES[CoreMessage.PhantomClaimTally](1)}\n`);
    expect(md).toContain(`- ${CORE_MESSAGES[CoreMessage.UnnamedClaimTally](1)}\n`);
  });

  it("states the rows no feature groups by their definitions", () => {
    const md = renderMarkdown(__er(unbalanced()), ctx, publishedExitCodeOf);
    const ungrouped = [
      CORE_MESSAGES[CoreMessage.PhantomClaimReconciliations](1),
      CORE_MESSAGES[CoreMessage.UnnamedClaimReconciliations](1),
    ].join(CORE_MESSAGES[CoreMessage.AndJoiner]);
    expect(md).toContain(CORE_MESSAGES[CoreMessage.NotGroupedByFeature](ungrouped));
  });

  it("sums the test volume over scenarios, cited scenario ids with no real scenario, and observations citing no scenario", () => {
    const md = renderMarkdown(__er(unbalanced(), true), ctx, publishedExitCodeOf);
    expect(md).toContain(CORE_MESSAGES[CoreMessage.EvidenceObservationsSum](3, 1, 1, 1));
  });

  it("glosses a balanced run with the satisfied outcome's sentence", () => {
    const md = renderMarkdown(__er(reconcile([proven], [provenObservation])), ctx, publishedExitCodeOf);
    expect(md).toContain(CORE_MESSAGES[CoreMessage.BalancedGloss]);
    expect(md).toContain(
      `every ${CORE_MESSAGES[CoreMessage.ClaimReconciliationSubject]} balances: every ${CORE_MESSAGES[CoreMessage.OutcomeSatisfied]}.`
    );
  });

  it("keeps the terms phantom-claim and unnamed-claim as the JSON's row kinds", () => {
    const rows = claimReconciliationsOf<{ kind: string }>(JSON.parse(renderJson(__er(unbalanced()), ctx)));
    expect(rows.map((row) => row.kind)).toEqual([
      "scenario",
      "phantom-claim",
      "unnamed-claim",
    ]);
  });
});

describe("[SCN-RPT-040] the markdown's prose refers to an outcome by its sentence, never by its handle", () => {
  const proven = { scnId: "SCN-CWD-001", evidenceObligations: [{ qualityCheckKind: "unit" as const }] };
  const brokenObservation = {
    qualityCheckKind: "unit" as const,
    scnId: "SCN-CWD-001",
    status: "failed" as const,
    broken: true as const,
    locator: "src/collect.test.ts",
  };
  const provenObservation = { qualityCheckKind: "unit" as const, scnId: "SCN-CWD-001", status: "passed" as const };

  it("the unsound stamp quotes the missing outcome's sentence", () => {
    const md = renderMarkdown(__er(reconcile([proven], [brokenObservation])), ctx, publishedExitCodeOf);
    const stamp = CORE_MESSAGES[CoreMessage.RunUnsound](CORE_MESSAGES[CoreMessage.OneProofNeverRan]);
    expect(md.split("\n")).toContain(stamp);
    expect(stamp).toContain(`"${CORE_MESSAGES[CoreMessage.OutcomeMissing]}"`);
    expect(md).not.toContain("`missing`");
  });

  it("the scenario code errors section's note quotes the duplicated code's outcome sentence on a run with a scenario code error", () => {
    const md = renderMarkdown(
      {
        ...__er(reconcile([proven], [provenObservation])),
        scenarioCodeErrors: [{ kind: "no-feature-code", files: ["unc.feature"] }],
        scenarioCodePopulation: { featureFiles: 1, featureCodes: 0 },
      },
      ctx,
      publishedExitCodeOf
    );
    expect(md).toContain(coreMessage(CoreMessage.DuplicateScnCodeNotListed, { outcome: CORE_MESSAGES[CoreMessage.OutcomeDuplicateScnCode] }));
    expect(md).toContain(`as "${CORE_MESSAGES[CoreMessage.OutcomeDuplicateScnCode]}".`);
    expect(md).not.toContain("`duplicate-scn-code`");
  });
});
