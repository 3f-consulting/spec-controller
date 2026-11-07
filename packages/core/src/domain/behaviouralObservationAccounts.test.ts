import { describe, it, expect } from "vitest";

import { behaviouralObservationTally, evidenceObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import {
  citesUnknownScenarioReconciliationsOf,
  noEvidenceObligationReconciliationsOf,
  unnamedClaimReconciliationsOf,
} from "./qualityCheckReconciliation.js";
import { UNNAMED_CLAIM_ID } from "../model.js";
import type { ClaimKind, ClaimReconciliation, EvidenceObservation, Ledger, Scenario } from "../model.js";

const tallyOfEveryObservationKind = () => {
  const scenarios: Scenario[] = [{ claimCode: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }];
  const observations: EvidenceObservation[] = [
    { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
    { qualityCheckKind: "integration", claimCode: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "SCN-PHX-999", status: "passed" },
    { qualityCheckKind: "integration", claimCode: null, status: "passed" },
    { qualityCheckKind: "e2e", claimCode: "SCN-A", status: "failed", broken: true, locator: "features/x.feature" },
    { qualityCheckKind: "fitness", fitnessFunction: "guard-x", exists: true, enforcedOverRealSource: true },
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  return behaviouralObservationTally(ledger);
};

const fitnessObservationOf = (claimCode?: string, ran: { exists?: boolean; broken?: true } = {}): EvidenceObservation => ({
  qualityCheckKind: "fitness",
  fitnessFunction: "guard-x",
  ...(claimCode !== undefined ? { claimCode } : {}),
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
  it("[SCN-RPT-017] counts raw per layer over ALL behavioural evidence observations, SKIPPING the fitness evidence observation", () => {
    expect(tallyOfEveryObservationKind().rawByLayer).toEqual({ unit: 3, integration: 2, e2e: 1, performance: 0 });
  });

  it("[SCN-RPT-023] Evidence observations counts each evidence observation by the kind of claim its row reconciles, a broken behavioural one included, and each fitness function that ran", () => {
    const ledger: Ledger = {
      claimReconciliations: [
        rowOf("SCN-A", "scenario", [
          { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
          { qualityCheckKind: "integration", claimCode: "SCN-A", status: "passed" },
          { qualityCheckKind: "e2e", claimCode: "SCN-A", status: "failed", broken: true, locator: "features/a.feature" },
          fitnessObservationOf("SCN-A"),
          fitnessObservationOf("SCN-A", { exists: false }),
        ]),
        rowOf("SCN-PHX-999", "phantom-claim", [
          { qualityCheckKind: "unit", claimCode: "SCN-PHX-999", status: "passed" },
          { qualityCheckKind: "unit", claimCode: "SCN-PHX-999", status: "failed", broken: true, locator: "src/phx.test.ts" },
          fitnessObservationOf("SCN-PHX-999"),
          fitnessObservationOf("SCN-PHX-999", { broken: true }),
        ]),
        rowOf(UNNAMED_CLAIM_ID, "unnamed-claim", [
          { qualityCheckKind: "unit", claimCode: null, status: "passed" },
          { qualityCheckKind: "integration", claimCode: null, status: "passed" },
          { qualityCheckKind: "performance", claimCode: null, status: "failed" },
          { qualityCheckKind: "unit", claimCode: null, status: "failed", broken: true, locator: "src/collect.test.ts" },
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
      byQualityCheckKind: [
        { qualityCheckKind: "unit", count: 5 },
        { qualityCheckKind: "integration", count: 2 },
        { qualityCheckKind: "e2e", count: 1 },
        { qualityCheckKind: "performance", count: 1 },
        { qualityCheckKind: "fitness", count: 3 },
      ],
    });
    expect(tally.byQualityCheckKind.reduce((n, { count }) => n + count, 0)).toBe(tally.total);
    expect(tally.onScenario + tally.onPhantomClaim + tally.onUnnamedClaim).toBe(tally.total);
  });
});
