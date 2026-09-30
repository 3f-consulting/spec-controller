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
  staticCheck: "tidy",
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
  reconcile(scenarios, observations).scenarioReconciliations.find((r) => r.scnId === scnId)!;

const coordinates = (observations: readonly EvidenceObservation[]) =>
  observations.map((o) => [o.qualityCheck, o.locator ?? null]);

describe("[SCN-RMD-009] a row reads its evidence in one order, whatever order the runner reported it in", () => {
  it("reconciles every arrival order of one evidence set to the same ledger", () => {
    const evidence = [fitness, integration, unitZ, e2e, unitA, performance];
    const ledgers = new Set(permutations(evidence).map((order) => JSON.stringify(reconcile(scenarios, order))));
    expect(ledgers.size).toBe(1);
  });

  it("reads a row's credits by quality check in tier order, fitness last, then by location", () => {
    expect(coordinates(rowOf([fitness, performance, e2e, integration, unitZ, unitA]).evidenceObservations)).toEqual([
      ["unit", "a.test.ts"],
      ["unit", "z.test.ts"],
      ["integration", "f.feature"],
      ["e2e", "b.feature"],
      ["performance", "a.feature"],
      ["fitness", null],
    ]);
  });

  it("names the first credit in that order, not the first to arrive", () => {
    const unitItem = rowOf([unitZ, unitA]).qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");
    expect(unitItem?.evidenceObservation).toEqual(unitA);
  });

  it("reads a credit with no location before every located credit of its quality check", () => {
    const unlocated: EvidenceObservation = { qualityCheck: "unit", scnId: SCN, status: "passed" };
    const capitalised: EvidenceObservation = { ...unitA, locator: "A.test.ts" };
    expect(coordinates(rowOf([unitA, capitalised, unlocated]).evidenceObservations)).toEqual([
      ["unit", null],
      ["unit", "A.test.ts"],
      ["unit", "a.test.ts"],
    ]);
  });

  it("reads a location before a longer one it is the start of", () => {
    const longer: EvidenceObservation = { ...unitA, locator: "a.test.ts-2" };
    expect(coordinates(rowOf([longer, unitA]).evidenceObservations)).toEqual([
      ["unit", "a.test.ts"],
      ["unit", "a.test.ts-2"],
    ]);
  });

  it("orders credits at one location by the scenario they cite — the phantom rows they mint follow it", () => {
    const ghost2: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-GHOST-002", status: "passed", locator: "p.test.ts" };
    const ghost1: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-GHOST-001", status: "passed", locator: "p.test.ts" };
    const phantomIds = reconcile(scenarios, [ghost2, ghost1])
      .scenarioReconciliations.filter((r) => r.kind === "phantom-scenario")
      .map((r) => r.scnId);
    expect(phantomIds).toEqual(["SCN-GHOST-001", "SCN-GHOST-002"]);
  });

  it("reads a credit citing no scenario before the credits at its location that cite one", () => {
    const broken = { qualityCheck: "unit", status: "failed", broken: true, locator: "a.test.ts" } as const;
    const citing: EvidenceObservation = { ...broken, scnId: "SCN-CITED-001" };
    const citingNone: EvidenceObservation = { ...broken, scnId: null };
    const suspense = reconcile(scenarios, [citing, citingNone]).scenarioReconciliations.find(
      (r) => r.kind === "suspense-scenario"
    )!;
    expect(suspense.evidenceObservations.map((o) => o.scnId)).toEqual([null, "SCN-CITED-001"]);
  });

  it("orders credits alike in check, location and scenario by what else they say, however their objects were built", () => {
    const saysA: EvidenceObservation = { qualityCheck: "unit", scnId: SCN, status: "failed", locator: "a.test.ts", message: "a" };
    const saysB: EvidenceObservation = { message: "b", locator: "a.test.ts", status: "failed", scnId: SCN, qualityCheck: "unit" };
    expect(rowOf([saysB, saysA]).evidenceObservations.map((o) => (o as { message?: string }).message)).toEqual(["a", "b"]);
  });

  it("posts a credit reported twice twice", () => {
    expect(rowOf([unitA, unitZ, unitA]).evidenceObservations).toEqual([unitA, unitA, unitZ]);
  });

  it("leaves the caller's evidence in the order the caller gave it", () => {
    const evidence = [unitZ, fitness, unitA];
    reconcile(scenarios, evidence);
    expect(evidence).toEqual([unitZ, fitness, unitA]);
  });
});
