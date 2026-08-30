/**
 * Unit pin for a gate's record — the counts it banked, the allowance it states, and the floor those
 * two imply (@SCN-RAT-001, 3F-2790).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id
 * matching features/mutation-ratchet.feature, so a grep of either returns both halves of its pair —
 * this arm and the step block in tests/steps/mutationRatchet.steps.ts.
 *
 * MORE THAN ONE GATE, DELIBERATELY. A reader that returned the first gate it found, or folded them
 * all into one, greens against a record holding a single entry — and a record holding one gate is
 * the case that never occurs in the field, because the reason to quarantine a cheap scope from an
 * expensive one is why a project has gates at all. So the fixture below states two, with different
 * counts and different allowances, and both are asserted.
 *
 * AND THE TWO ALLOWANCES ARE ONE AND ZERO, which is what makes the floor assertions separate
 * questions rather than one asked twice. A gate allowing nothing has its floor seated exactly on
 * the score it recorded; a gate allowing a mutant has it strictly below. An implementation that
 * ignored the allowance entirely, or spent it from the denominator, passes one of those and fails
 * the other.
 *
 * WHAT THE @integration ARM ADDS INSTEAD. This one hands the reader a string. That arm writes a
 * record file to a real tree — comment furniture, blank lines, a multi-line justification and all —
 * reads it back off disk and drives the same reader over the real bytes, which is where a parser
 * that is right about a template literal and wrong about an authored file is caught.
 */

import { describe, it, expect } from "vitest";

import {
  parseGateRecords,
  gateRecordFor,
  floorOf,
  killFloorOf,
  recordedScoreOf,
  scoreOf,
  type GateRecord,
} from "./record.js";

/** The name the fixture record is filed under — this file's own, never a name the module knows. */
const RECORD_FILE = "quality-thresholds.yml";

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
  const record = parseGateRecords(RECORD_TEXT, RECORD_FILE).get(gate);
  if (record === undefined) throw new Error(`the fixture record states no gate "${gate}".`);
  return record;
}

describe("[SCN-RAT-001] parseGateRecords", () => {
  it("reads one record per gate the file states, and no others", () => {
    const records = parseGateRecords(RECORD_TEXT, RECORD_FILE);

    expect([...records.keys()]).toEqual(["domain", "state-model"]);
  });

  it("carries each gate's own counts, rather than one gate's applied to both", () => {
    expect(recordFor("domain")).toMatchObject({ gate: "domain", detected: 2175, total: 2243 });
    expect(recordFor("state-model")).toMatchObject({
      gate: "state-model",
      detected: 202,
      total: 254,
    });
  });

  it("carries the allowance each gate states, and the reason stated with it", () => {
    expect(recordFor("domain").allowance).toEqual({
      mutants: 1,
      reason:
        "two mutants here are detected by timeout, and a timeout can flip to Survived on a slower runner with no change to the suite",
    });
    expect(recordFor("state-model").allowance).toEqual({
      mutants: 0,
      reason: "deterministic gate, zero timeouts — any detected drop is a real regression",
    });
  });
});

describe("[SCN-RAT-001] floorOf", () => {
  it("spends the allowance from the kills, so a gate allowing one sits a mutant below its record", () => {
    // 2174 is the fixture's 2175 kills less the one mutant it allows; the divisor is untouched.
    expect(floorOf(recordFor("domain"))).toBe(scoreOf(2174, 2243));
  });

  it("seats the floor exactly on the recorded score when the gate allows nothing", () => {
    const record = recordFor("state-model");

    expect(floorOf(record)).toBe(recordedScoreOf(record));
  });

  it("sits strictly below the recorded score when the gate allows a mutant", () => {
    const record = recordFor("domain");

    expect(floorOf(record)).toBeLessThan(recordedScoreOf(record));
  });

  it("does not take the allowance off the score, which would mean two things in two gates", () => {
    // The allowance is counted in MUTANTS, and one mutant is 0.0446 points in `domain` and 0.394 in
    // `state-model`. Spending it from the score would make one number two bars; this pins the gap
    // at one gate's own mutant, so an implementation that subtracted percentage points reds here
    // whatever constant it chose.
    const record = recordFor("domain");

    expect(recordedScoreOf(record) - floorOf(record)).toBeCloseTo(scoreOf(1, 2243), 12);
  });
});

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

describe("[SCN-RAT-001] recordedScoreOf", () => {
  it("is the kills over every mutant measured, as a percentage", () => {
    expect(recordedScoreOf(recordFor("domain"))).toBe((2175 / 2243) * 100);
    expect(recordedScoreOf(recordFor("state-model"))).toBe((202 / 254) * 100);
  });
});

/**
 * A record that cannot be read as a bar is refused, naming the gate and the field
 * (@SCN-RAT-002, 3F-2792).
 *
 * MALFORMED MEANS NO BAR, NEVER A DEFAULTED ONE. Every fixture below is a record a lenient reader
 * answers with a bar nobody wrote — an absent section read as "no gates to enforce", a gate that
 * measured nothing read as scoring zero, an allowance nobody justified read as justified. The bar
 * is then enforced as though somebody had written it, and the only symptom is a build that has
 * quietly stopped being able to red. So each one is refused, and the refusal says which record it
 * read and where in that record the fault is.
 *
 * ONE DEPARTURE PER FIXTURE, WHICH IS WHY THEY ARE BUILT RATHER THAN TYPED OUT. `oneGateRecord`
 * states a well-formed gate and each case below overrides exactly one field of it. Eight
 * hand-written literals agree by coincidence, and the day one of them drifts a second field the
 * case stops testing the thing it is named after — silently, because it still reds.
 *
 * THE REFUSAL IS CHECKED STRUCTURALLY, AND ITS TYPE IS CHECKED BY IDENTITY. What a caller relies
 * on is that ONE catch reaches every row here, so `sharesTheOneRefusalType` compares constructors
 * across two faults detected by entirely different machinery — a field this module reads itself,
 * and a duplicated gate the YAML parser detects before this module sees a mapping at all. Naming
 * the class in an `instanceof` would assert less: it would pass just as happily if the parser's
 * own error were let through under a second type nobody catches.
 */

/** The name the fixture records are filed under — this file's own, never a name the module knows. */
const MALFORMED_RECORD_FILE = "our-own-quality-bars.yml";

/** The fields a gate's block states, as a record file writes them. */
type GateFields = Readonly<Record<string, string>>;

/**
 * A record holding one well-formed gate, with any field stated over.
 *
 * The gate allows nothing and says why anyway, so the well-formed starting point is the one case
 * with nothing to justify — every refusal below is reached by changing one field of a record that
 * reads cleanly, rather than by starting from a heap and hoping the reader trips on the intended
 * half of it.
 */
function oneGateRecord(stated: GateFields = {}): string {
  const fields: GateFields = {
    detected: "202",
    total: "254",
    "slack-mutants": "0",
    "slack-reason": '"deterministic gate, zero timeouts — any detected drop is a real regression"',
    ...stated,
  };
  return ["mutation-gates:", "  state-model:", ...fieldLines(fields)].join("\n");
}

/** One gate block's field lines, at the indentation a gate's own block sits at. */
function fieldLines(fields: GateFields): string[] {
  return Object.entries(fields)
    .filter(([, value]) => value !== "")
    .map(([field, value]) => `    ${field}: ${value}`);
}

/** What a refusal must carry, so a reader is not left hunting through near-identical gate blocks. */
interface Refusal {
  readonly name: string;
  readonly message: string;
  readonly section: string;
  readonly key: string;
  readonly field: string;
}

/** Read the record, and hand back the refusal — or fail, because a bar was handed back instead. */
function refusalFrom(text: string): Refusal {
  try {
    parseGateRecords(text, MALFORMED_RECORD_FILE);
  } catch (refused) {
    return refused as unknown as Refusal;
  }
  throw new Error("reading this record was answered with a bar, rather than refused.");
}

/** Whether two faults are refused under the very same type — what one `catch` clause relies on. */
function sharesTheOneRefusalType(text: string, other: string): boolean {
  return (
    (refusalFrom(text) as unknown as object).constructor ===
    (refusalFrom(other) as unknown as object).constructor
  );
}

/** Assert one refusal names the record it read, and the section, gate and field the fault sits at. */
function expectRefusedAt(text: string, section: string, key: string, field: string): void {
  const refusal = refusalFrom(text);

  expect(refusal.name).toBe("MalformedRecordError");
  expect(refusal.message).toContain(MALFORMED_RECORD_FILE);
  expect({ section: refusal.section, key: refusal.key, field: refusal.field }).toEqual({
    section,
    key,
    field,
  });
}

/** The section a gate's record sits in — spelled here so a fixture never borrows the module's own. */
const GATES_SECTION = "mutation-gates";

describe("[SCN-RAT-002] parseGateRecords refuses a record it cannot read as a bar", () => {
  it("refuses a record with no section holding gates, rather than reading it as nothing to enforce", () => {
    expectRefusedAt(
      "some-other-policy:\n  unrelated: true\n",
      GATES_SECTION,
      "<section>",
      GATES_SECTION,
    );
  });

  it("refuses a section holding no gate, which is a bar that enforces nothing", () => {
    expectRefusedAt("mutation-gates: {}\n", GATES_SECTION, "<section>", GATES_SECTION);
  });

  it("refuses a gate that measured no mutants at all, because it has no score to be below", () => {
    expectRefusedAt(oneGateRecord({ total: "0" }), GATES_SECTION, "state-model", "total");
  });

  it("refuses a gate that detected more mutants than it measured", () => {
    expectRefusedAt(oneGateRecord({ detected: "255" }), GATES_SECTION, "state-model", "detected");
  });

  it("refuses an allowance wider than the kills it is spent from, which no measurement can fall under", () => {
    expectRefusedAt(
      oneGateRecord({ "slack-mutants": "203", "slack-reason": '"a wide allowance"' }),
      GATES_SECTION,
      "state-model",
      "slack-mutants",
    );
  });

  it("refuses a count that is not a whole number of mutants, because the unit is the mutant", () => {
    expectRefusedAt(oneGateRecord({ detected: "201.5" }), GATES_SECTION, "state-model", "detected");
  });

  it("refuses a negative count, which is not a number of mutants either", () => {
    expectRefusedAt(oneGateRecord({ total: "-254" }), GATES_SECTION, "state-model", "total");
  });

  it("refuses a gate whose entry is not a block of fields at all", () => {
    expectRefusedAt("mutation-gates:\n  state-model: 202\n", GATES_SECTION, "state-model", "<entry>");
  });

  it("refuses a record whose top level is not a mapping of sections", () => {
    expectRefusedAt("- state-model\n- domain\n", "<document>", "root", "root");
  });
});

describe("[SCN-RAT-002] parseGateRecords refuses an allowance that cannot say why it exists", () => {
  it("refuses a non-zero allowance whose reason is blank", () => {
    expectRefusedAt(
      oneGateRecord({ "slack-mutants": "1", "slack-reason": '""' }),
      GATES_SECTION,
      "state-model",
      "slack-reason",
    );
  });

  it("refuses a non-zero allowance that states no reason at all", () => {
    expectRefusedAt(
      oneGateRecord({ "slack-mutants": "1", "slack-reason": "" }),
      GATES_SECTION,
      "state-model",
      "slack-reason",
    );
  });

  it("reads a ZERO allowance with no reason, because there is nothing to justify", () => {
    // The boundary of the row above, and the reason it is a boundary rather than a blanket rule: a
    // reader that simply required a reason on every gate would pass every case above and refuse
    // the one record a project has no work to do on.
    const records = oneGateRecord({ "slack-mutants": "0", "slack-reason": "" });

    expect(parseGateRecords(records, MALFORMED_RECORD_FILE).get("state-model")?.allowance).toEqual({
      mutants: 0,
      reason: "",
    });
  });
});

describe("[SCN-RAT-002] parseGateRecords refuses a gate the record states twice", () => {
  /** The same gate, twice — the second block silently replacing the first if anything read it. */
  const GATE_STATED_TWICE = [
    oneGateRecord(),
    "  state-model:",
    "    detected: 254",
    "    total: 254",
    "    slack-mutants: 0",
    '    slack-reason: "none needed"',
  ].join("\n");

  it("refuses it, rather than reading the record as whichever block came last", () => {
    expectRefusedAt(GATE_STATED_TWICE, "<document>", "root", "yaml");
  });

  it("says a duplicated gate is what it refused, rather than a bare unreadable-file message", () => {
    expect(refusalFrom(GATE_STATED_TWICE).message).toMatch(/uniq/i);
  });

  it("refuses it under the same type as every field fault, so one catch reaches both", () => {
    // THE ROW THAT MAKES THE RULE TOTAL. The YAML parser detects a duplicated key before this
    // module sees a mapping at all, and raises its OWN error type. Left unnormalised, a caller
    // that catches this module's refusal — the only thing it has been told to catch — sails
    // straight past a gate recorded twice.
    expect(sharesTheOneRefusalType(GATE_STATED_TWICE, oneGateRecord({ total: "0" }))).toBe(true);
  });

  it("refuses a record whose YAML cannot be parsed at all, under that same one type", () => {
    expect(sharesTheOneRefusalType("mutation-gates:\n  state-model: [unclosed\n", oneGateRecord({ total: "0" }))).toBe(
      true,
    );
  });
});

/**
 * A gate the record does not hold is refused by name (@SCN-RAT-003, 3F-2793).
 *
 * THIS IS THE ONE FAULT IN THE RULE THAT LOOKS LIKE NOTHING AT ALL. Every case above is a record
 * somebody wrote badly, sitting in the file a reader would go and open. Here the record reads
 * perfectly and is asked for a gate it never held — a gate name mistyped where the caller states
 * it. The lenient answer is not a wrong bar but NO bar, which reads downstream as a gate with
 * nothing to enforce and greens for as long as the typo survives. Nothing about the record is
 * wrong, so nobody is ever sent to look at it.
 *
 * THE FIXTURE IS @SCN-RAT-001'S, AND THE MISS IS A NEAR-NEIGHBOUR OF ONE OF ITS GATES. `domian`
 * is `domain` with two letters transposed, which is the shape this fault actually arrives in — not
 * a gate nobody has ever heard of. A refusal is only worth anything here if a reader holding it can
 * see the transposition without opening the record, which is why the listing is asserted and not
 * left to whoever writes the message.
 *
 * AND THE HIT IS ASSERTED BESIDE THE MISS. A reader that refused every gate, or that handed back
 * whichever record the file states first, satisfies every assertion about the refusal on its own —
 * so both gates of the fixture are asked for by name and each must answer with its own counts.
 */

/** `domain` as a caller mistypes it — a near-neighbour of a gate the fixture record does hold. */
const MISTYPED_GATE = "domian";

/** Every gate the fixture record holds, which is what a refusal must list back. */
const HELD_GATES = ["domain", "state-model"];

/** The placeholder field a refusal names when the fault is the ASK rather than a field of a block. */
const WHOLE_GATE = "<gate>";

/** Ask the fixture record for a gate, and hand back the refusal — or fail, a bar came back. */
function refusalForGate(gate: string): Refusal {
  try {
    gateRecordFor(gate, parseGateRecords(RECORD_TEXT, RECORD_FILE), RECORD_FILE);
  } catch (refused) {
    return refused as unknown as Refusal;
  }
  throw new Error(`asking for gate "${gate}" was answered with a bar, rather than refused.`);
}

/** The bar the fixture record holds for a gate, asked for by name. */
function barFor(gate: string): GateRecord {
  return gateRecordFor(gate, parseGateRecords(RECORD_TEXT, RECORD_FILE), RECORD_FILE);
}

describe("[SCN-RAT-003] gateRecordFor answers a gate the record holds", () => {
  it("hands back that gate's own counts and allowance, rather than the record's first block", () => {
    expect(barFor("state-model")).toMatchObject({
      gate: "state-model",
      detected: 202,
      total: 254,
    });
    expect(barFor("domain")).toMatchObject({ gate: "domain", detected: 2175, total: 2243 });
  });

  it("hands back the record itself, so nothing is rebuilt or dropped on the way through", () => {
    const records = parseGateRecords(RECORD_TEXT, RECORD_FILE);

    expect(gateRecordFor("domain", records, RECORD_FILE)).toEqual(records.get("domain"));
  });
});

describe("[SCN-RAT-003] gateRecordFor refuses a gate the record does not hold", () => {
  it("refuses it, rather than answering with no bar for that one", () => {
    expect(refusalForGate(MISTYPED_GATE).name).toBe("MalformedRecordError");
  });

  it("names the record it read, the section, the gate asked for and where the fault sits", () => {
    const refusal = refusalForGate(MISTYPED_GATE);

    expect(refusal.message).toContain(RECORD_FILE);
    expect({ section: refusal.section, key: refusal.key, field: refusal.field }).toEqual({
      section: GATES_SECTION,
      key: MISTYPED_GATE,
      field: WHOLE_GATE,
    });
  });

  it("puts the gate that was asked for in the message, so the typo is read rather than recalled", () => {
    expect(refusalForGate(MISTYPED_GATE).message).toContain(MISTYPED_GATE);
  });

  it("lists EVERY gate the record does hold, so the near-neighbour is seen without opening the file", () => {
    // A message naming only the gate that was asked for sends its reader to the record to compare
    // spellings by eye — which is the work the refusal was supposed to have done. Both gates are
    // asserted, so a listing that stopped at the first one reds here.
    const { message } = refusalForGate(MISTYPED_GATE);

    for (const gate of HELD_GATES) expect(message).toContain(gate);
  });

  it("refuses it under the same type as a malformed record, so one catch reaches both", () => {
    // The caller was told to catch this module's refusal and nothing else. An unrecorded gate
    // raised under a second type is a fault that caller sails straight past — the same hole the
    // YAML parser's own errors were normalised to close.
    expect((refusalForGate(MISTYPED_GATE) as unknown as object).constructor).toBe(
      (refusalFrom(oneGateRecord({ total: "0" })) as unknown as object).constructor,
    );
  });
});
