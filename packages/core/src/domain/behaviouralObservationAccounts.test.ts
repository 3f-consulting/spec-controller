import { describe, it, expect } from "vitest";

import { behaviouralObservationTally } from "./ledger.js";
import { tallyOfEveryObservationKind } from "./behaviouralObservationTally.test-utils.js";
import {
  citesUnknownScenarioReconciliationsOf,
  noEvidenceObligationReconciliationsOf,
  unnamedClaimReconciliationsOf,
} from "./qualityCheckReconciliation.js";
import { UNNAMED_CLAIM_ID } from "../model.js";
import type { ClaimKind, ClaimReconciliation, EvidenceObservation, Ledger } from "../model.js";

const fitnessObservationOf = (scnId?: string): EvidenceObservation => ({
  qualityCheck: "fitness",
  fitnessFunction: "guard-x",
  ...(scnId !== undefined ? { scnId } : {}),
  exists: true,
  enforcedOverRealSource: true,
});

const RECONCILIATIONS_OF_KIND = {
  scenario: (claim: string, observations: readonly EvidenceObservation[]) =>
    noEvidenceObligationReconciliationsOf(claim, observations, new Set()),
  "phantom-claim": (_claim: string, observations: readonly EvidenceObservation[]) =>
    citesUnknownScenarioReconciliationsOf(observations),
  "unnamed-claim": (_claim: string, observations: readonly EvidenceObservation[]) =>
    unnamedClaimReconciliationsOf(observations),
} as const;

function rowOf(claim: string, kind: ClaimKind, evidenceObservations: readonly EvidenceObservation[]): ClaimReconciliation {
  const qualityCheckReconciliations = RECONCILIATIONS_OF_KIND[kind](claim, evidenceObservations);
  return {
    claim,
    kind,
    verdict: "out-of-balance",
    qualityCheckReconciliations,
    pendingItems: [],
  };
}

describe("the behavioural-observation tally reports the raw counts and the invented accounts", () => {
  it("[SCN-RPT-017] counts raw per quality-check over ALL behavioural evidence observations, SKIPPING the fitness evidence observation", () => {
    expect(tallyOfEveryObservationKind().rawByBehaviouralQualityCheck).toEqual({ unit: 3, integration: 2, e2e: 1, performance: 0 });
  });

  it("[SCN-RPT-023] Test volume counts each behavioural evidence observation by the kind of claim its row reconciles, a broken one included", () => {
    const ledger: Ledger = {
      claimReconciliations: [
        rowOf("SCN-A", "scenario", [
          { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
          { qualityCheck: "integration", scnId: "SCN-A", status: "passed" },
          { qualityCheck: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/a.feature" },
          fitnessObservationOf("SCN-A"),
        ]),
        rowOf("SCN-PHX-999", "phantom-claim", [
          { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
          { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "failed", broken: true, locator: "src/phx.test.ts" },
          fitnessObservationOf("SCN-PHX-999"),
        ]),
        rowOf(UNNAMED_CLAIM_ID, "unnamed-claim", [
          { qualityCheck: "unit", scnId: null, status: "passed" },
          { qualityCheck: "integration", scnId: null, status: "passed" },
          { qualityCheck: "performance", scnId: null, status: "failed" },
          { qualityCheck: "unit", scnId: null, status: "failed", broken: true, locator: "src/collect.test.ts" },
          fitnessObservationOf(),
        ]),
      ],
    };

    const { onScenario, onPhantomClaim, onUnnamedClaim } = behaviouralObservationTally(ledger);

    expect({ onScenario, onPhantomClaim, onUnnamedClaim }).toEqual({ onScenario: 3, onPhantomClaim: 2, onUnnamedClaim: 4 });
  });
});
