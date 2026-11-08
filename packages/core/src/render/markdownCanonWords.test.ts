import { describe, it, expect } from "vitest";
import { renderJson, renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { claimReconciliationsOf } from "../assemble/reportClaimReconciliations.test-utils.js";
import { UNNAMED_CLAIM_ID } from "../domain/claimReconciliation.js";

describe("[CLM-RPT-039] the markdown counts phantom-claim and unnamed-claim rows by the reconciliation model's definitions of them, while the JSON keeps the terms", () => {
  const proven = { claimCode: "CLM-CWD-001", evidenceObligations: [{ qualityCheckKind: "unit" as const }] };
  const provenObservation = { qualityCheckKind: "unit" as const, claimCode: "CLM-CWD-001", status: "passed" as const };
  const strandedObservation = { qualityCheckKind: "unit" as const, claimCode: "CLM-GONE-001", status: "passed" as const };
  const uncitedObservation = { qualityCheckKind: "unit" as const, claimCode: null, status: "passed" as const };
  const unbalanced = () => reconcile([proven], [provenObservation, strandedObservation, uncitedObservation]);

  it("tallies each row kind by its definition", () => {
    const md = renderMarkdown(__er(unbalanced()), ctx, publishedExitCodeOf);
    expect(md).toContain(`- ${coreMessage(CoreMessage.PhantomClaimTally, { count: 1 })}\n`);
    expect(md).toContain(`- ${coreMessage(CoreMessage.UnnamedClaimTally, { count: 1, unnamedClaimId: UNNAMED_CLAIM_ID })}\n`);
  });

  it("states the rows no feature groups by their definitions", () => {
    const md = renderMarkdown(__er(unbalanced()), ctx, publishedExitCodeOf);
    const ungrouped = [
      coreMessage(CoreMessage.PhantomClaimReconciliations, { count: 1 }),
      coreMessage(CoreMessage.UnnamedClaimReconciliations, { count: 1 }),
    ].join(coreMessage(CoreMessage.AndJoiner));
    expect(md).toContain(coreMessage(CoreMessage.NotGroupedByFeature, { ungrouped }));
  });

  it("sums the test volume over scenarios, cited claim codes with no real scenario, and observations citing no scenario", () => {
    const md = renderMarkdown(__er(unbalanced(), true), ctx, publishedExitCodeOf);
    expect(md).toContain(coreMessage(CoreMessage.EvidenceObservationsSum, { total: 3, onScenario: 1, onPhantomClaim: 1, onUnnamedClaim: 1 }));
  });

  it("glosses a balanced run with the satisfied outcome's sentence", () => {
    const md = renderMarkdown(__er(reconcile([proven], [provenObservation])), ctx, publishedExitCodeOf);
    expect(md).toContain(coreMessage(CoreMessage.BalancedGloss));
    expect(md).toContain(
      `every ${coreMessage(CoreMessage.ClaimReconciliationSubject)} balances: every ${coreMessage(CoreMessage.OutcomeSatisfied)}.`
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

describe("[CLM-RPT-040] the markdown's prose refers to an outcome by its sentence, never by its handle", () => {
  const proven = { claimCode: "CLM-CWD-001", evidenceObligations: [{ qualityCheckKind: "unit" as const }] };
  const brokenObservation = {
    qualityCheckKind: "unit" as const,
    claimCode: "CLM-CWD-001",
    status: "failed" as const,
    broken: true as const,
    locator: "src/collect.test.ts",
  };
  const provenObservation = { qualityCheckKind: "unit" as const, claimCode: "CLM-CWD-001", status: "passed" as const };

  it("the unsound stamp quotes the missing outcome's sentence", () => {
    const md = renderMarkdown(__er(reconcile([proven], [brokenObservation])), ctx, publishedExitCodeOf);
    const stamp = coreMessage(CoreMessage.RunUnsound, { proofs: coreMessage(CoreMessage.ProofsNeverRan, { count: 1 }) });
    expect(md.split("\n")).toContain(stamp);
    expect(stamp).toContain(`"${coreMessage(CoreMessage.OutcomeMissing)}"`);
    expect(md).not.toContain("`missing`");
  });

  it("the claim code errors section's note quotes the duplicated code's outcome sentence on a run with a claim code error", () => {
    const md = renderMarkdown(
      {
        ...__er(reconcile([proven], [provenObservation])),
        claimCodeErrors: [{ kind: "no-feature-code", files: ["unc.feature"] }],
        claimCodePopulation: { featureFiles: 1, featureCodes: 0 },
      },
      ctx,
      publishedExitCodeOf
    );
    expect(md).toContain(coreMessage(CoreMessage.DuplicateClaimCodeNotListed, { outcome: coreMessage(CoreMessage.OutcomeDuplicateClaimCode) }));
    expect(md).toContain(`as "${coreMessage(CoreMessage.OutcomeDuplicateClaimCode)}".`);
    expect(md).not.toContain("`duplicate-claim-code`");
  });
});
