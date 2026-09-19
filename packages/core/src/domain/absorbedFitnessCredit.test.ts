/**
 * @unit for a fitness credit that reaches a REAL row and answers nothing on it — @SCN-LNT-013 on
 * the item it becomes, @SCN-LNT-014 on the verdict that follows.
 *
 * Bidirectional evidence: each describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/absorbedFitnessCredit.steps.ts.
 *
 * WHAT THIS IS ABOUT, IN ONE LINE. `@SCN-LNT-012` made the fitness match compare CHECK TAGS — the
 * @SCN picks the row, the tag picks the obligation — which created a credit that reaches a real row
 * and matches no obligation on it. The credit-side catch was still keyed on the AXIS, so the credit
 * it newly failed to match, it also newly failed to catch. Half a correction; this is the other
 * half.
 */

import { describe, it, expect } from "vitest";

import { evidenceObligationPairsOf } from "./journal.js";
import { evidenceReconciliationOf, reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import type { EvidenceObservation, Scenario } from "./journal.js";

const SCN = "SCN-AAA-001";

/** The row's own check — the one it actually names. */
const OWN = "complexity";
/** The stray credit's check — one this row never names. */
const STRAY = "typecheck";

const rowNaming = (...checks: string[]): Scenario[] => [
  { scnId: SCN, evidenceObligations: checks.map((c) => ({ qualityCheck: "lint", staticCheck: c })) },
];

/** A static-check credit citing `SCN`, wired into CI unless told otherwise. */
const credit = (checkTag: string, enforced = true): EvidenceObservation => ({
  qualityCheck: "lint",
  staticCheck: `lint:${checkTag}`,
  checkTag,
  scnId: SCN,
  exists: true,
  enforcedOverRealSource: enforced,
});

const itemsOn = (scenarios: Scenario[], observations: EvidenceObservation[]) => {
  const row = reconcile(scenarios, observations).scenarioReconciliations.find(
    (r) => r.scnId === SCN
  )!;
  return row.qualityCheckReconciliations.map((i) => `${i.staticCheck}=${i.outcome}`);
};

describe("[SCN-LNT-013] a fitness credit whose check the cited row does not name posts there as no-evidence-obligation", () => {
  it("surfaces the stray credit as a credit-only item naming the check that ran", () => {
    expect(itemsOn(rowNaming(OWN), [credit(STRAY)])).toEqual([
      `${OWN}=missing`,
      `${STRAY}=no-evidence-obligation`,
    ]);
  });

  it("leaves the row's own obligation reconciling on its own terms beside it", () => {
    // The two facts stay apart. The scenario still owes the check it named and still reads whatever
    // its own run says; the stray credit is a second, independent item. A reader who saw one row
    // could not tell which of the two things went wrong.
    expect(itemsOn(rowNaming(OWN), [credit(OWN), credit(STRAY)])).toEqual([
      `${OWN}=satisfied`,
      `${STRAY}=no-evidence-obligation`,
    ]);
  });

  it("still matches a credit whose check the row DOES name — nothing that worked stops working", () => {
    // The regression guard on the change's own blast radius. Every currently-matching fitness
    // credit must go on matching; re-keying the pair set must not make a named check miss.
    expect(itemsOn(rowNaming(OWN), [credit(OWN)])).toEqual([`${OWN}=satisfied`]);
    expect(itemsOn(rowNaming(OWN, STRAY), [credit(OWN), credit(STRAY)])).toEqual([
      `${OWN}=satisfied`,
      `${STRAY}=satisfied`,
    ]);
  });

  it("keys the pair set on the check tag for a fitness obligation, and on the axis for a runtime one", () => {
    // The asymmetry is the design, not an inconsistency. A runtime credit's `qualityCheck` IS its
    // discriminating term — an obligation at `unit` is answered by a credit at `unit`, and there is
    // nothing finer to key on. On the fitness axis the axis word is `lint` for EVERY check, so the
    // axis alone cannot discriminate and the check tag is what does.
    expect([
      ...evidenceObligationPairsOf([
        {
          scnId: SCN,
          evidenceObligations: [
            { qualityCheck: "unit" },
            { qualityCheck: "lint", staticCheck: OWN },
          ],
        },
      ]),
    ]).toEqual([`${SCN} unit`, `${SCN} lint ${OWN}`]);
  });

  it("keeps a pending fitness obligation naming NOTHING — and so surfaces its credit", () => {
    // Canon, Pending Item: a `<qc>pending` tag raises no Evidence Obligation, so a credit citing
    // that scenario at a pending quality-check is `no-evidence-obligation` "exactly as when nothing
    // was raised at all". On the fitness axis that was FALSE whenever the row also raised a
    // non-pending fitness obligation — the axis-keyed pair absorbed the credit. Re-keying restores
    // 3F-1858's intent here.
    const row: Scenario[] = [
      {
        scnId: SCN,
        evidenceObligations: [
          { qualityCheck: "lint", staticCheck: OWN },
          { qualityCheck: "lint", staticCheck: STRAY, pending: true },
        ],
      },
    ];
    expect(evidenceObligationPairsOf(row)).toEqual(new Set([`${SCN} lint ${OWN}`]));
    expect(itemsOn(row, [credit(STRAY)])).toContain(`${STRAY}=no-evidence-obligation`);
  });

  it("does not let a credit carrying NO check tag key as a match", () => {
    // A fitness credit reaching a real row always carries a checkTag — the seam resolves it and the
    // @SCN together or neither, so an uncited credit posts to suspense and never arrives here. The
    // invariant is pinned rather than assumed: were one to arrive, it must not key as
    // "<scn> lint undefined" and quietly match a same-shaped absent obligation.
    const uncited = {
      qualityCheck: "lint",
      staticCheck: "lint:orphan",
      scnId: SCN,
      exists: true,
      enforcedOverRealSource: true,
    } as EvidenceObservation;
    expect(itemsOn(rowNaming(OWN), [uncited])).toEqual([
      `${OWN}=missing`,
      // It surfaces, and it names its runnable handle — the only vocabulary it has. Naming nothing
      // would leave a reader with "some check arrived uninvited" on a row that may name several.
      "lint:orphan=no-evidence-obligation",
    ]);
  });
});

describe("[SCN-LNT-014] a balanced row cannot absorb a stray fitness credit", () => {
  it("goes out-of-balance over the stray credit alone, and the whole run with it", () => {
    // THE MEASURED FALSE GREEN, reproduced as a pin. The row's own obligation is satisfied and the
    // stray credit carries a genuine watermelon — a check that exists and CI does not run. Before
    // the fix: no reconciling item, a balanced row, isBalanced true, exit 0, over an unwired check.
    // That is the report this tool exists to refuse, produced by the tool.
    const rec = evidenceReconciliationOf(
      rowNaming(OWN),
      [credit(OWN), credit(STRAY, false)],
      [],
      true,
      true
    );
    const row = rec.ledger.scenarioReconciliations.find((r) => r.scnId === SCN)!;
    // "Alone" is load-bearing — the row's own obligation is satisfied, so the ONLY thing making
    // this row out-of-balance is the credit it never asked for.
    expect(row.reconcilingItems.map((i) => `${i.staticCheck}=${i.outcome}`)).toEqual([
      `${STRAY}=no-evidence-obligation`,
    ]);
    expect(row.verdict).toBe("out-of-balance");
    // The one that matters: a row-level assertion alone would still pass if the roll-up dropped it.
    expect(isBalanced(rec.ledger)).toBe(false);
    // AND "ALONE" HOLDS FOR THE RUN, NOT ONLY FOR THE ROW (3F-3531). The same books without the
    // stray credit balance, so the `false` above is this credit's. A ledger out of balance somewhere
    // else as well — a row nobody asked for, minted from a population the caller never passed —
    // would read the same `false` and prove nothing about the credit.
    const withoutTheStray = evidenceReconciliationOf(rowNaming(OWN), [credit(OWN)], [], true, true);
    expect(isBalanced(withoutTheStray.ledger)).toBe(true);
  });
});
