import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObligation, EvidenceObservation, Scenario } from "./journal.js";
import type { Outcome } from "./qualityCheckReconciliation.js";

const SCN = "SCN-AAA-001";
const CHECK = "complexity";

const WORST_FIRST: readonly Outcome[] = ["failing", "watermelon", "satisfied", "missing"];

const locator = fc.constantFrom(undefined, "a.feature", "m.feature", "z.feature");

interface Arm {
  obligation: EvidenceObligation;
  credit: fc.Arbitrary<EvidenceObservation>;
}

const ARMS: Record<"runtime" | "fitness", Arm> = {
  runtime: {
    obligation: { qualityCheck: "unit" },
    credit: fc
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
    credit: fc
      .record({
        staticCheck: fc.constantFrom("lint:a", "lint:b"),
        exists: fc.boolean(),
        enforcedOverRealSource: fc.boolean(),
        status: fc.constantFrom(undefined, "passed" as const, "failed" as const),
        locator,
        broken: fc.constantFrom(undefined, true as const),
      })
      .map(({ staticCheck, exists, enforcedOverRealSource, status, locator, broken }) => ({
        qualityCheck: "fitness" as const,
        staticCheck,
        scnId: SCN,
        exists,
        enforcedOverRealSource,
        ...(status ? { status } : {}),
        ...(locator ? { locator } : {}),
        ...(broken ? { broken } : {}),
      })),
  },
};

function readsAlone(credit: EvidenceObservation): Outcome {
  if ("broken" in credit && credit.broken) return "missing";
  if (credit.qualityCheck !== "fitness") return credit.status === "passed" ? "satisfied" : "failing";
  if (credit.status === "failed") return "failing";
  if (credit.enforcedOverRealSource) return "satisfied";
  return credit.exists ? "watermelon" : "missing";
}

function itemOf(arm: Arm, credits: EvidenceObservation[]) {
  const rows: Scenario[] = [{ scnId: SCN, evidenceObligations: [arm.obligation] }];
  const row = reconcile(rows, credits).scenarioReconciliations.find((r) => r.scnId === SCN)!;
  return row.qualityCheckReconciliations.find(
    (i) => i.qualityCheck === arm.obligation.qualityCheck
  )!;
}

const worstOf = (outcomes: readonly Outcome[]): Outcome =>
  WORST_FIRST.find((o) => outcomes.includes(o)) ?? "missing";

const armAndCreditsTwoWays = fc.constantFrom("runtime" as const, "fitness" as const).chain((arm) =>
  fc
    .array(ARMS[arm].credit, { maxLength: 6 })
    .chain((credits) =>
      fc
        .shuffledSubarray(credits, { minLength: credits.length, maxLength: credits.length })
        .map((reordered) => ({ arm, credits, reordered }))
    )
);

describe("[SCN-LDG-038] whatever credits answer one evidence obligation, on either arm, in any order and wherever their files sort, it reads the worst outcome among them and names a credit carrying it", () => {
  it("reads the worst outcome any credit reads alone, names a credit reading it, and reads the same in any arrival order", () => {
    fc.assert(
      fc.property(armAndCreditsTwoWays, ({ arm, credits, reordered }) => {
        for (const credit of credits) expect(itemOf(ARMS[arm], [credit]).outcome).toBe(readsAlone(credit));
        const expected = worstOf(credits.map(readsAlone));
        const item = itemOf(ARMS[arm], credits);
        expect(item.outcome).toBe(expected);
        expect(itemOf(ARMS[arm], reordered).outcome).toBe(expected);
        if (expected === "missing") {
          expect(item.evidenceObservation).toBeUndefined();
        } else {
          expect(credits).toContainEqual(item.evidenceObservation);
          expect(readsAlone(item.evidenceObservation!)).toBe(expected);
        }
      }),
      { numRuns: 300 }
    );
  });
});
