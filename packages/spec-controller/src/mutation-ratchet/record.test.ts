/**
 * Unit pin for the kill floor a gate's record implies — the counts it banked, the allowance it
 * states, and the subtraction between them (@SCN-MUT-012, 3F-2790, 3F-3337).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id
 * matching features/mutation-score.feature, so a grep of either returns both halves of its pair —
 * this arm and the step block in tests/steps/mutationScore.steps.ts.
 *
 * WHAT LEFT, AND WHY THE READER DID NOT (3F-3337). This file used to pin `parseGateRecords`,
 * `floorOf`, `gateRecordFor` and every malformed-record refusal under three of the ratchet's own
 * scenarios, named in that commit. The ratchet is deleted; the READER is not, because the engine's
 * `mutationGate` bar kind is a published capability decided over a target's record and reaches it
 * through this module. What specifies it now is @SCN-MUT-012 and @SCN-MUT-013, which decide the
 * same reads at the app edge that actually performs them — @SCN-MUT-013's own Examples carry the
 * record that holds no gate of that name, the record that is not there to be read, and the record
 * holding text nothing can read. Those are the three refusals this file used to ask about in
 * isolation, asked where the answer is consumed.
 *
 * MORE THAN ONE GATE, DELIBERATELY. A reader that returned the first gate it found, or folded them
 * all into one, greens against a record holding a single entry — and a record holding one gate is
 * the case that never occurs in the field, because the reason to quarantine a cheap scope from an
 * expensive one is why a project has gates at all. So the fixture below states two, with different
 * counts and different allowances.
 *
 * AND THE TWO ALLOWANCES ARE ONE AND ZERO, which is what makes the floor assertions separate
 * questions rather than one asked twice. A gate allowing nothing has its floor seated exactly on
 * the score it recorded; a gate allowing a mutant has it strictly below. An implementation that
 * ignored the allowance entirely, or spent it from the denominator, passes one of those and fails
 * the other.
 */

import { describe, it, expect } from "vitest";

import { parseGateRecords, floorOf, killFloorOf, type GateRecord } from "./record.js";

/** The name the fixture record is filed under — this file's own, never a name the module knows. */
const FIXTURE_RECORD_FILE = "quality-thresholds.yml";

/**
 * A well-formed record holding two gates.
 *
 * The counts are a real pair, and the allowances are the two that matter: one mutant against a
 * gate whose reason is a property of its own measurement, and none against a gate that has nothing
 * to absorb.
 */
const RECORD_TEXT = `
mutation-gates:
  domain:
    detected: 2175
    total: 2243
    slack-mutants: 1
    slack-reason: "two mutants here are detected by timeout, and a timeout can flip to Survived on a slower runner with no change to the suite"

  state-model:
    detected: 202
    total: 254
    slack-mutants: 0
    slack-reason: "deterministic gate, zero timeouts — any detected drop is a real regression"
`;

/** One gate's record, read out of the fixture, or a failure naming the gate the fixture states. */
function recordFor(gate: string): GateRecord {
  const record = parseGateRecords(RECORD_TEXT, FIXTURE_RECORD_FILE).get(gate);
  if (record === undefined) throw new Error(`the fixture record states no gate "${gate}".`);
  return record;
}

/**
 * @SCN-MUT-012 (@unit) — `floorOf`'s counts twin, and the reason it is a second function rather
 * than a caller doing the subtraction: how an allowance is spent is the record's own fact, and an
 * edge that computed `detected - slack` itself would be a second place holding that fact.
 *
 * Its @integration half is the step block in tests/steps/mutationScore.steps.ts, which drives the
 * whole seam — a planted record, the manifest naming its gate, the obligation that reaches the
 * ledger — over the app edge that reads this.
 */
describe("[SCN-MUT-012] killFloorOf", () => {
  it("is the recorded kills less the allowance, counted in mutants", () => {
    expect(killFloorOf(recordFor("domain"))).toBe(2174);
  });

  it("seats the floor exactly on the recorded kills when the gate allows nothing", () => {
    expect(killFloorOf(recordFor("state-model"))).toBe(202);
  });

  it("stays a whole number of mutants where its percentage twin does not", () => {
    // THE DIVISION IS THE WHOLE DIFFERENCE between this and `floorOf`, and it is asserted rather
    // than described: an implementation that answered with the percentage would satisfy neither
    // half of this, and one that rounded a percentage back to a count would satisfy the first.
    const record = recordFor("domain");

    expect(Number.isInteger(killFloorOf(record))).toBe(true);
    expect(Number.isInteger(floorOf(record))).toBe(false);
  });

  it("does not consult the population, so a record whose total moved holds the same floor", () => {
    // The population-independence the ledger's bar rests on (3F-2788). New mutable code arriving
    // with survivors on it moves `total` and nothing else; a floor that moved with it would red a
    // suite that lost no kill at all.
    const banked = recordFor("domain");

    expect(killFloorOf({ ...banked, total: banked.total + 8 })).toBe(killFloorOf(banked));
  });
});
