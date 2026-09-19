/**
 * THE BROKEN STATIC-CHECK CREDIT, PLANTED — the standing proof that a fitness credit whose check
 * NEVER RAN is excluded from the obligation match STRUCTURALLY, on the flag, whatever else it
 * carries (@SCN-LNT-026).
 *
 * IN ITS OWN FILE, not appended to `evidenceReconciliation.test.ts`: that file sits against its
 * `max-lines` ceiling, which is a real gate here rather than a style preference (@SCN-FIT-001).
 * `uncitedFitnessCredit.test.ts` is the same shape for the same reason.
 *
 * WHY A PLANT AND NOT THE ORDINARY ARMS. Every broken credit this repository's readers actually
 * emit says `false` to `exists` and `enforcedOverRealSource`, because neither fact was observed
 * — so a match that ignored the flag would fall through to `missing` ANYWAY and the fail-safe
 * would be redundant by coincidence of falsiness, which is exactly the reasoning the reconciler's
 * own comment one rule above complains about. The observation below is the shape that separates
 * the two readings: it cites the right row at the right check AND claims both facts TRUE. Without
 * it, deleting the fail-safe changes no run — measured, not assumed: the four mutants Stryker
 * raises on that clause all survived until this file existed.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature.
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { hasBrokenEvidence, staticObservationTally } from "./ledger.js";
import type { Scenario, EvidenceObservation } from "./journal.js";

describe("[SCN-LNT-026] a BROKEN static-check credit is excluded from the obligation match whatever else it carries", () => {
  it("leaves the obligation missing and posts to suspense even when the credit says the check exists and ran", () => {
    // THE FAIL-SAFE'S OWN CLAIM, PROVED RATHER THAN STATED. `fitnessCreditsCiting` excludes a
    // broken credit STRUCTURALLY — on the flag, before anything else it carries is read — and this
    // is the plant that says so: the observation below cites the right row at the right check AND
    // claims both facts TRUE, which is the shape a match would read as `satisfied`. Every credit
    // this repository's readers actually emit says `false` to both, so without an input like this
    // one the clause is redundant by coincidence and its removal changes no run.
    //
    // The other half is the posting rule's, and both are asserted here because they are one
    // sentence: the obligation reconciles `missing` BY ABSENCE while the credit itself lands on
    // suspense, where the reader is told what broke.
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-LNT-026",
        evidenceObligations: [
          { qualityCheck: "fitness" },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      {
        qualityCheck: "fitness",
        staticCheck: "traceability",
        scnId: "SCN-LNT-026",
        exists: true,
        enforcedOverRealSource: true,
        broken: true,
        message: "the run's record says this check's step was skipped",
        locator: "features/fitness-checks.feature",
      },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-LNT-026",
    );
    expect(row?.verdict).toBe("out-of-balance");
    // `missing`, never `satisfied` and never `watermelon` — a proof that never ran can neither
    // discharge an obligation nor fail it, and it carries nothing on the credit side.
    expect(row?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "missing",
        evidenceObligation: { qualityCheck: "fitness" },
      },
    ]);
    // And the credit is not lost: it posts to suspense as broken, carrying its where-to-fix and
    // its what-broke and no observation, and stamps the run unsound.
    const suspense = balance.scenarioReconciliations.find(
      (s) => s.kind === "suspense-scenario",
    );
    expect(suspense?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "broken",
        locator: "features/fitness-checks.feature",
        message: "the run's record says this check's step was skipped",
      },
    ]);
    expect(hasBrokenEvidence(balance)).toBe(true);
    // AND IT IS NEITHER COUNT, for the same reason and on the same flag (3F-3531). It claims it
    // exists and ran over the real tree, which is the shape the running-check filter would count —
    // as a running check, and as an uncited one, since it sits on suspense. The flag is what says
    // it never ran, so the tally must read it before either fact.
    expect(staticObservationTally(balance)).toEqual({
      runningStaticCheckCount: 0,
      uncitedStaticCheckCount: 0,
    });
  });
});
