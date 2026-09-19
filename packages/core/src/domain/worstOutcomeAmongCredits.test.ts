/**
 * @unit for @SCN-LDG-038 (features/ledger.feature) — ONE property over `reconcile` for the rule the
 * examples beside it pin case by case (3F-3547, 3F-3552): whatever credits answer one evidence
 * obligation, on either arm, in any arrival order and from any files, the obligation reads the worst
 * outcome among them, and the item names a credit carrying it.
 *
 * TWO ANCHORS, AND WHY THE ORACLE IS NOT SIMPLY `reconcile` OVER ONE CREDIT. That was the first
 * draft, and a plant dropping `watermelon` from the precedence passed it: a lone severed credit then
 * read `missing` through the same rule, so the oracle moved with the fault. So what one credit reads
 * on its own is STATED here, from the single-credit scenarios (@SCN-LNT-028, @SCN-LDG-028,
 * @SCN-LDG-017, @SCN-LNT-026), AND checked against `reconcile` over that credit alone on every run —
 * the statement cannot drift from the product, and the product cannot drag the statement with it.
 *
 * The examples in failedCreditAmongSeveral.test.ts prove the pairs already found; this covers the
 * orderings and mixtures nobody has tried — several credits, locators that collide and cross, and
 * credits the match excludes (`broken`) or reads as an absence (`exists: false`) mixed in.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObligation, EvidenceObservation, Scenario } from "./journal.js";
import type { Outcome } from "./qualityCheckReconciliation.js";

const SCN = "SCN-AAA-001";
const CHECK = "complexity";

/** The ruled order, worst first; `missing` is what an obligation reads when no credit answers it. */
const WORST_FIRST: readonly Outcome[] = ["failing", "watermelon", "satisfied", "missing"];

/** Few files, so locators collide as often as they cross, and absent as often as either. */
const locator = fc.constantFrom(undefined, "a.feature", "m.feature", "z.feature");

/** One arm of the rule: the obligation it answers, and any credit that can reach it. */
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

/**
 * What ONE credit reads on its own, as the single-credit scenarios state it: a proof that never ran
 * answers nothing (@SCN-LDG-017, @SCN-LNT-026); a behavioural credit is its status; a fitness credit
 * asks its own verdict first, then its wiring, then whether it exists at all (@SCN-LNT-028,
 * @SCN-LDG-028).
 */
function readsAlone(credit: EvidenceObservation): Outcome {
  if ("broken" in credit && credit.broken) return "missing";
  if (credit.qualityCheck !== "fitness") return credit.status === "passed" ? "satisfied" : "failing";
  if (credit.status === "failed") return "failing";
  if (credit.enforcedOverRealSource) return "satisfied";
  return credit.exists ? "watermelon" : "missing";
}

/** The obligation's item, reconciled over exactly these credits. */
function itemOf(arm: Arm, credits: EvidenceObservation[]) {
  const rows: Scenario[] = [{ scnId: SCN, evidenceObligations: [arm.obligation] }];
  const row = reconcile(rows, credits).scenarioReconciliations.find((r) => r.scnId === SCN)!;
  return row.qualityCheckReconciliations.find(
    (i) => i.qualityCheck === arm.obligation.qualityCheck
  )!;
}

const worstOf = (outcomes: readonly Outcome[]): Outcome =>
  WORST_FIRST.find((o) => outcomes.includes(o)) ?? "missing";

/** An arm, its credits, and the same credits in another arrival order. */
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
        // The statement of a lone credit's reading, held to the product's on every credit drawn.
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
