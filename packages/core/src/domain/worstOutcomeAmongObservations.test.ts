import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObligation, EvidenceObservation, Scenario } from "./journal.js";
import type { Outcome } from "./qualityCheckReconciliation.js";

const SCN = "SCN-AAA-001";

const WORST_FIRST: readonly Outcome[] = ["failing", "watermelon", "satisfied", "missing"];

interface Arm {
  obligation: EvidenceObligation;
  observation: fc.Arbitrary<EvidenceObservation>;
}

function armsOf(): Record<"behavioural" | "fitness", Arm> {
  const locator = fc.constantFrom(undefined, "a.feature", "m.feature", "z.feature");
  return {
    behavioural: {
      obligation: { qualityCheck: "unit" },
      observation: fc
        .record({
          status: fc.constantFrom("passed" as const, "failed" as const),
          locator,
          broken: fc.constantFrom(undefined, true as const),
        })
        .map(({ status, locator, broken }) => ({
          qualityCheck: "unit" as const,
          scnId: SCN,
          status,
          ...(locator ? { locator } : {}),
          ...(broken ? { broken } : {}),
        })),
    },
    fitness: {
      obligation: { qualityCheck: "fitness" },
      observation: fc
        .record({
          fitnessFunction: fc.constantFrom("lint:a", "lint:b"),
          exists: fc.boolean(),
          enforcedOverRealSource: fc.boolean(),
          status: fc.constantFrom(undefined, "passed" as const, "failed" as const),
          locator,
          broken: fc.constantFrom(undefined, true as const),
        })
        .map(({ fitnessFunction, exists, enforcedOverRealSource, status, locator, broken }) => ({
          qualityCheck: "fitness" as const,
          fitnessFunction,
          scnId: SCN,
          exists,
          enforcedOverRealSource,
          ...(status ? { status } : {}),
          ...(locator ? { locator } : {}),
          ...(broken ? { broken } : {}),
        })),
    },
  };
}

function readsAlone(observation: EvidenceObservation): Outcome {
  if ("broken" in observation && observation.broken) return "missing";
  if (observation.qualityCheck !== "fitness") return observation.status === "passed" ? "satisfied" : "failing";
  if (observation.status === "failed") return "failing";
  if (observation.enforcedOverRealSource) return "satisfied";
  return observation.exists ? "watermelon" : "missing";
}

function itemOf(arm: Arm, observations: EvidenceObservation[]) {
  const rows: Scenario[] = [{ scnId: SCN, evidenceObligations: [arm.obligation] }];
  const row = reconcile(rows, observations).claimReconciliations.find((r) => r.scnId === SCN)!;
  return row.qualityCheckReconciliations.find(
    (i) => i.qualityCheck === arm.obligation.qualityCheck
  )!;
}

const worstOf = (outcomes: readonly Outcome[]): Outcome =>
  WORST_FIRST.find((o) => outcomes.includes(o)) ?? "missing";

const armAndObservationsTwoWays = (arms: Record<"behavioural" | "fitness", Arm>) =>
  fc.constantFrom("behavioural" as const, "fitness" as const).chain((arm) =>
    fc
      .array(arms[arm].observation, { maxLength: 6 })
      .chain((observations) =>
        fc
          .shuffledSubarray(observations, { minLength: observations.length, maxLength: observations.length })
          .map((reordered) => ({ arm, observations, reordered }))
      )
  );

describe("[SCN-LDG-038] whatever evidence observations answer one evidence obligation, on either arm, in any order and wherever their files sort, it reads the worst outcome among them and names an evidence observation carrying it", () => {
  it("reads the worst outcome any evidence observation reads alone, names an evidence observation reading it, and reads the same in any arrival order", () => {
    const arms = armsOf();
    fc.assert(
      fc.property(armAndObservationsTwoWays(arms), ({ arm, observations, reordered }) => {
        for (const observation of observations) expect(itemOf(arms[arm], [observation]).outcome).toBe(readsAlone(observation));
        const expected = worstOf(observations.map(readsAlone));
        const item = itemOf(arms[arm], observations);
        expect(item.outcome).toBe(expected);
        expect(itemOf(arms[arm], reordered).outcome).toBe(expected);
        if (expected === "missing") {
          expect(item.evidenceObservation).toBeUndefined();
        } else {
          expect(observations).toContainEqual(item.evidenceObservation);
          expect(readsAlone(item.evidenceObservation!)).toBe(expected);
        }
      }),
      { numRuns: 300 }
    );
  });
});
