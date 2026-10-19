import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";

const SCN = "SCN-ORD-001";

const scenarios: Scenario[] = [
  {
    scnId: SCN,
    evidenceObligations: [
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
      { qualityCheck: "e2e" },
      { qualityCheck: "performance" },
      { qualityCheck: "fitness" },
    ],
  },
];

const unitZ: EvidenceObservation = { qualityCheck: "unit", scnId: SCN, status: "passed", locator: "z.test.ts" };
const unitA: EvidenceObservation = { qualityCheck: "unit", scnId: SCN, status: "passed", locator: "a.test.ts" };
const integration: EvidenceObservation = { qualityCheck: "integration", scnId: SCN, status: "passed", locator: "f.feature" };
const e2e: EvidenceObservation = { qualityCheck: "e2e", scnId: SCN, status: "passed", locator: "b.feature" };
const performance: EvidenceObservation = { qualityCheck: "performance", scnId: SCN, status: "passed", locator: "a.feature" };
const fitness: EvidenceObservation = {
  qualityCheck: "fitness",
  fitnessFunction: "tidy",
  scnId: SCN,
  exists: true,
  enforcedOverRealSource: true,
};

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])
  );
}

const rowOf = (observations: EvidenceObservation[], scnId = SCN) =>
  reconcile(scenarios, observations).claimReconciliations.find((r) => r.scnId === scnId)!;

const coordinates = (observations: readonly EvidenceObservation[]) =>
  observations.map((o) => [o.qualityCheck, o.locator ?? null]);

describe("[SCN-RMD-009] a row reads its evidence in one order, whatever order the runner reported it in", () => {
  it("reconciles every arrival order of one evidence set to the same ledger", () => {
    const evidence = [fitness, integration, unitZ, e2e, unitA, performance];
    const ledgers = new Set(permutations(evidence).map((order) => JSON.stringify(reconcile(scenarios, order))));
    expect(ledgers.size).toBe(1);
  });

  it("reads a row's evidence observations by quality check in tier order, fitness last, then by location", () => {
    expect(coordinates(rowOf([fitness, performance, e2e, integration, unitZ, unitA]).evidenceObservations)).toEqual([
      ["unit", "a.test.ts"],
      ["unit", "z.test.ts"],
      ["integration", "f.feature"],
      ["e2e", "b.feature"],
      ["performance", "a.feature"],
      ["fitness", null],
    ]);
  });

  it("reads an evidence observation with no location before every located evidence observation of its quality check", () => {
    const unlocated: EvidenceObservation = { qualityCheck: "unit", scnId: SCN, status: "passed" };
    const capitalised: EvidenceObservation = { ...unitA, locator: "A.test.ts" };
    expect(coordinates(rowOf([unitA, capitalised, unlocated]).evidenceObservations)).toEqual([
      ["unit", null],
      ["unit", "A.test.ts"],
      ["unit", "a.test.ts"],
    ]);
  });

  it("orders evidence observations at one location by the scenario they cite — the phantom rows they mint follow it", () => {
    const ghost2: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-GHOST-002", status: "passed", locator: "p.test.ts" };
    const ghost1: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-GHOST-001", status: "passed", locator: "p.test.ts" };
    const phantomClaimIds = reconcile(scenarios, [ghost2, ghost1])
      .claimReconciliations.filter((r) => r.kind === "phantom-claim")
      .map((r) => r.scnId);
    expect(phantomClaimIds).toEqual(["SCN-GHOST-001", "SCN-GHOST-002"]);
  });

  it("reads an evidence observation citing no scenario before the evidence observations at its location that cite one", () => {
    const broken = { qualityCheck: "unit", status: "failed", broken: true, locator: "a.test.ts" } as const;
    const citing: EvidenceObservation = { ...broken, scnId: "SCN-CITED-001" };
    const citingNone: EvidenceObservation = { ...broken, scnId: null };
    const suspense = reconcile(scenarios, [citing, citingNone]).claimReconciliations.find(
      (r) => r.kind === "unnamed-claim"
    )!;
    expect(suspense.evidenceObservations.map((o) => o.scnId)).toEqual([null, "SCN-CITED-001"]);
  });

  it("orders evidence observations alike in check, location and scenario by what else they say, however their objects were built", () => {
    const saysA: EvidenceObservation = { qualityCheck: "unit", scnId: SCN, status: "failed", locator: "a.test.ts", message: "a" };
    const saysB: EvidenceObservation = { message: "b", locator: "a.test.ts", status: "failed", scnId: SCN, qualityCheck: "unit" };
    expect(rowOf([saysB, saysA]).evidenceObservations.map((o) => (o as { message?: string }).message)).toEqual(["a", "b"]);
  });

  it("orders evidence observations alike but for their notes by what the notes say, however the notes were built", () => {
    const notesA = [{ kind: "several-scn-codes" as const, codes: ["SCN-AAA-001", "SCN-BBB-001"] }];
    const notesB = [{ codes: ["SCN-AAA-002", "SCN-BBB-001"], kind: "several-scn-codes" as const }];
    const saysA: EvidenceObservation = { qualityCheck: "unit", scnId: SCN, status: "failed", locator: "a.test.ts", notes: notesA };
    const saysB: EvidenceObservation = { ...saysA, notes: notesB };
    for (const order of [[saysA, saysB], [saysB, saysA]]) {
      expect(rowOf(order).evidenceObservations.map((o) => ("notes" in o ? o.notes : undefined))).toEqual([notesA, notesB]);
    }
  });
});
