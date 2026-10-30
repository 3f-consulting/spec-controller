import { describe, it, expect } from "vitest";

import { evidenceObservationTally } from "./ledger.js";
import { tallyOfEveryObservationKind } from "./behaviouralObservationTally.test-utils.js";
import {
  citesUnknownScenarioReconciliationsOf,
  noEvidenceObligationReconciliationsOf,
  unnamedClaimReconciliationsOf,
} from "./qualityCheckReconciliation.js";
import { UNNAMED_CLAIM_ID } from "../model.js";
import type { ClaimKind, ClaimReconciliation, EvidenceObservation, Ledger } from "../model.js";

const fitnessObservationOf = (scnId?: string, ran: { exists?: boolean; broken?: true } = {}): EvidenceObservation => ({
  qualityCheck: "fitness",
  fitnessFunction: "guard-x",
  ...(scnId !== undefined ? { scnId } : {}),
  exists: ran.exists ?? true,
  enforcedOverRealSource: true,
  ...(ran.broken !== undefined ? { broken: ran.broken, locator: ".github/workflows/ci.yml" } : {}),
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

  it("[SCN-RPT-023] Evidence observations counts each evidence observation by the kind of claim its row reconciles, a broken behavioural one included, and each fitness function that ran", () => {
    const ledger: Ledger = {
      claimReconciliations: [
        rowOf("SCN-A", "scenario", [
          { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
          { qualityCheck: "integration", scnId: "SCN-A", status: "passed" },
          { qualityCheck: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/a.feature" },
          fitnessObservationOf("SCN-A"),
          fitnessObservationOf("SCN-A", { exists: false }),
        ]),
        rowOf("SCN-PHX-999", "phantom-claim", [
          { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
          { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "failed", broken: true, locator: "src/phx.test.ts" },
          fitnessObservationOf("SCN-PHX-999"),
          fitnessObservationOf("SCN-PHX-999", { broken: true }),
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

    const tally = evidenceObservationTally(ledger);

    expect(tally).toEqual({
      total: 12,
      onScenario: 4,
      onPhantomClaim: 3,
      onUnnamedClaim: 5,
      byQualityCheck: [
        { qualityCheck: "unit", count: 5 },
        { qualityCheck: "integration", count: 2 },
        { qualityCheck: "e2e", count: 1 },
        { qualityCheck: "performance", count: 1 },
        { qualityCheck: "fitness", count: 3 },
      ],
    });
    expect(tally.byQualityCheck.reduce((n, { count }) => n + count, 0)).toBe(tally.total);
    expect(tally.onScenario + tally.onPhantomClaim + tally.onUnnamedClaim).toBe(tally.total);
  });
});
