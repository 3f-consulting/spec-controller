import { describe, it, expect } from "vitest";
import {
  decideScnGate,
  detectDeletedCodes,
  parseAddedCodes,
  type ScnGateInput,
} from "./scnSubIssueGate.js";
import { readScenarioChanges } from "./scenarioTextChanges.js";

/**
 * A diff's added or removed BODY lines — the `---`/`+++` file headers excluded. Duplicated
 * from the sibling test files rather than exported from one of them, for the reason
 * `scenarioTextChanges.relabelledAndEdited.test.ts` gives: a test helper exported across
 * files is a seam between two test files, and five lines is cheaper than that seam.
 */
function diffBody(diff: string, marker: "+" | "-"): string[] {
  return diff
    .split("\n")
    .filter((line) => line.startsWith(marker) && !line.startsWith(`${marker}${marker}`))
    .map((line) => line.slice(1));
}

/**
 * The @unit arm of @SCN-SSM-014 — a scenario moved verbatim reports no updated code.
 *
 * WHY IT IS IN ITS OWN FILE. `scenarioTextChanges.test.ts` is AT its `max-lines` ceiling
 * (the test ceiling is 400 counted lines), and sibling 3F-3059 set the precedent when it
 * arrived there: split, rather than buy the room with a fresh `complexityExceptions.mjs`
 * entry that someone then has to argue back down — on the very slice that corrected that
 * module's docblock claim about the exception list. Moving the rows already there is a
 * behaviour-preserving refactor, not this scenario's work, so they stay put.
 *
 * WHICH OF THE TWO READINGS THIS ARM PINS, because the ambiguity is where the residual came
 * from. A verbatim move is NOT A CHANGE to the scenario that moved, so there is nothing to
 * report — as against: it IS a change with nothing owed, so it is reported and excused. The
 * code does the first, and it does it with nothing special-cased: a code present on BOTH
 * sides whose text is identical never enters the updated set, and no exemption is granted
 * anywhere, so there is none to withdraw. The control below is what makes that visible —
 * change one byte of the moved scenario and the SAME move reports it updated.
 *
 * IT ARRIVED AS A CONSEQUENCE, WHICH IS WHY IT IS PINNED. 3F-3044 changed the updated arm
 * from a hunk reading to a corpus comparison, and this silence fell out of it: the retired
 * reading held every `@SCN` code on a context line, so a moved block reported its NEIGHBOURS
 * updated. Nothing chose the new behaviour and no scenario held it. An intended consequence
 * with no scenario is indistinguishable from an accident, so the next refactor that touches
 * attribution can revert it with every gate still green.
 *
 * WHAT THIS ARM DOES NOT PROVE, ASSERTED SO IT CANNOT BE READ AS PROVING IT. Git represents
 * a verbatim move as a removal plus a re-addition, so `parseAddedCodes` still reports the
 * moved scenario's code ADDED and the author who only reordered a file is still made to
 * carry a binding for it. The updated arm's silence does not spare them. That is a third
 * fault of the same family, filed as 3F-3056, and out of this slice's scope; the last two
 * tests here are its measurement, sitting beside the silence so the row cannot be misread as
 * a promise about the reorderer that the gate does not keep.
 *
 * The @integration arm (tests/steps/scenarioSubIssueMatchMovedScenario.steps.ts) drives the
 * real CLI over a real git fixture; this arm pins the reading.
 */

/** The first scenario, untouched and never moved — nothing here is about it. */
const ANCHOR_CODE = "SCN-LAD-001";
/** The scenario git represents as removed-and-re-added when the pair below is reordered. */
const MOVED_CODE = "SCN-LAD-002";
/** Its neighbour, which the move puts above it. */
const NEIGHBOUR_CODE = "SCN-LAD-003";

const ANCHOR = `  @unit @integration @${ANCHOR_CODE}
  Scenario: the ladder is derived from the workflow itself
    Given a workflow naming its gate steps
    When the ladder is derived
    Then the ladder names every gate step`;

const MOVED_LAST_STEP = "the excluded step is not a gate";

function movedScenario(lastStep: string): string {
  return `  @unit @integration @${MOVED_CODE}
  Scenario: an excluded step is not a gate
    Given a workflow step the ladder excludes
    When the ladder is derived
    Then ${lastStep}`;
}

const NEIGHBOUR = `  @unit @integration @${NEIGHBOUR_CODE}
  Scenario: a gate step names the check it runs
    Given a workflow gate step
    When the ladder is derived
    Then the ladder names the check that step runs`;

function corpus(scenarios: readonly string[]): string {
  return (
    ["@LAD", "Feature: the local ladder is derived from the workflow", ""]
      .concat(scenarios.flatMap((scenario) => [scenario, ""]))
      .join("\n")
      .trimEnd() + "\n"
  );
}

const BASE = corpus([ANCHOR, movedScenario(MOVED_LAST_STEP), NEIGHBOUR]);
/** The row's own case: the third scenario moved above the second, every byte preserved. */
const MOVED_HEAD = corpus([ANCHOR, NEIGHBOUR, movedScenario(MOVED_LAST_STEP)]);
/** The CONTROL: the same move, with ONE byte of the moved scenario changed. */
const MOVED_AND_EDITED_HEAD = corpus([
  ANCHOR,
  NEIGHBOUR,
  movedScenario(`${MOVED_LAST_STEP}, and the ladder names the exclusion that left it out`),
]);

/**
 * `git diff <base>...HEAD` over the two sources above, captured VERBATIM from real git
 * rather than composed by hand — the shape of the move is the whole premise, and hand-written
 * diffs are where a fixture quietly stops being the thing it claims to be. Git renders the
 * reorder as a REMOVAL of @SCN-LAD-002's block and a RE-ADDITION of it below the neighbour,
 * which is exactly why the added arm still names it.
 */
const MOVED_DIFF = `diff --git a/features/target.feature b/features/target.feature
index e49ef38..fa4e6b4 100644
--- a/features/target.feature
+++ b/features/target.feature
@@ -7,14 +7,14 @@ Feature: the local ladder is derived from the workflow
     When the ladder is derived
     Then the ladder names every gate step
 
-  @unit @integration @SCN-LAD-002
-  Scenario: an excluded step is not a gate
-    Given a workflow step the ladder excludes
-    When the ladder is derived
-    Then the excluded step is not a gate
-
   @unit @integration @SCN-LAD-003
   Scenario: a gate step names the check it runs
     Given a workflow gate step
     When the ladder is derived
     Then the ladder names the check that step runs
+
+  @unit @integration @SCN-LAD-002
+  Scenario: an excluded step is not a gate
+    Given a workflow step the ladder excludes
+    When the ladder is derived
+    Then the excluded step is not a gate
`;

/**
 * The corpus cut into blank-line-separated blocks, keyed by the `@SCN` code on the block's
 * first line. Deliberately NOT `parseTaggedScenarios`: the byte-identity premise has to hold
 * independently of the walk the reading under test is built on, or the fixture is being
 * checked by the thing it is meant to constrain.
 */
function blocksByCode(source: string): Map<string, string> {
  const blocks = new Map<string, string>();
  for (const block of source.trimEnd().split("\n\n")) {
    const code = /@(SCN-[A-Z]{3}-\d{3})\b/.exec(block.split("\n")[0] ?? "");
    if (code !== null) blocks.set(code[1]!, block);
  }
  return blocks;
}

/** The gate input's inert fields — this row is about the code sets and nothing else. */
function gateInput(overrides: Partial<ScnGateInput>): ScnGateInput {
  return {
    addedCodes: [],
    updatedCodes: [],
    deletedCodes: [],
    renumberPairs: [],
    exemptions: [],
    unitEquivalentBehaviourBearing: false,
    unitEquivalentCitedCodes: [],
    uncitedChangedTestBlocks: [],
    hasTicketHandle: false,
    isExternalPr: false,
    prBodyReadable: true,
    ...overrides,
  };
}

describe("[SCN-SSM-014] a scenario moved verbatim is not a change, so no code is reported updated", () => {
  it("is a fixture whose moved scenario is BYTE-IDENTICAL across the two sides", () => {
    // The premise, asserted before any outcome is. A fixture that changed one byte of the
    // moved scenario would report it updated, correctly, and this row would prove nothing
    // while still reading as though it had — the most expensive way for a test to be wrong.
    const base = blocksByCode(BASE);
    const head = blocksByCode(MOVED_HEAD);
    expect(head.get(MOVED_CODE)).toEqual(base.get(MOVED_CODE));
    // And it genuinely MOVED: the block that followed it in the base precedes it in the head,
    // itself byte-identical, so the only difference between the two sources is the order.
    expect(head.get(NEIGHBOUR_CODE)).toEqual(base.get(NEIGHBOUR_CODE));
    expect([...base.keys()]).toEqual([ANCHOR_CODE, MOVED_CODE, NEIGHBOUR_CODE]);
    expect([...head.keys()]).toEqual([ANCHOR_CODE, NEIGHBOUR_CODE, MOVED_CODE]);
    // Said of real git output too: it renders the reorder as a removal and a re-addition of
    // @SCN-LAD-002's whole block, which is the fact the added arm below turns on.
    expect(diffBody(MOVED_DIFF, "-")).toEqual([
      ...movedScenario(MOVED_LAST_STEP).split("\n"),
      "",
    ]);
    expect(diffBody(MOVED_DIFF, "+")).toEqual([
      "",
      ...movedScenario(MOVED_LAST_STEP).split("\n"),
    ]);
  });

  it("names no code updated — a move is not a change to the scenario that moved", () => {
    expect(readScenarioChanges(BASE, MOVED_HEAD).updatedCodes).toEqual([]);
  });

  it("reports the SAME move updated once one byte of it changes — which is what the silence means", () => {
    // The control, and the reason the empty answer above says something. An empty updated set
    // is also what a reading that had stopped comparing anything returns; the difference
    // between these two answers is one byte inside the moved scenario and nothing else about
    // the fixture. It also settles WHICH reading the silence is: the move is not reported and
    // then excused — nothing is excused anywhere — it is simply not a change to report.
    expect(readScenarioChanges(BASE, MOVED_AND_EDITED_HEAD).updatedCodes).toEqual([MOVED_CODE]);
  });

  it("names no renumber and nothing outside every scenario — the silence is the updated arm's alone", () => {
    const changes = readScenarioChanges(BASE, MOVED_HEAD);
    // A code present on BOTH sides is never a renumber, so nothing paired the move away into
    // the auto-exemption — which would have produced the same empty updated set for a reason
    // the row does not claim.
    expect(changes.renumberPairs).toEqual([]);
    // Nor is the move reported as a change lying outside every scenario. Blank separators are
    // dropped from the residue, so a reorder leaves it identical; a reading that counted them
    // would report this fact on every move, and that report would then be the noise it exists
    // to avoid being.
    expect(changes.changedOutsideEveryScenario).toBe(false);
  });

  it("still reports the moved code ADDED — which is what this row does NOT claim is spared", () => {
    // 3F-3056, measured here rather than left to the next reader to derive. Git's removal-plus-
    // re-addition is a tag line the diff added, `parseAddedCodes` reads any `+` tag line as an
    // added code, and neither of those is this slice's to change. Asserting it beside the
    // silence is what stops the row reading as a promise about the reordering author.
    expect(parseAddedCodes(MOVED_DIFF)).toEqual([MOVED_CODE]);
    // And it is NOT reported deleted: the same code appears on a `+` tag line, which is the
    // condition `detectDeletedCodes` already tests, so the move costs nothing on that arm.
    const { updatedCodes, renumberPairs } = readScenarioChanges(BASE, MOVED_HEAD);
    expect(
      detectDeletedCodes(
        MOVED_DIFF,
        updatedCodes,
        renumberPairs.map((pair) => pair.removed)
      )
    ).toEqual([]);
  });

  it("draws a binding for the ADDED code alone — no obligation reaches it as an update", () => {
    const { updatedCodes, renumberPairs } = readScenarioChanges(BASE, MOVED_HEAD);
    const result = decideScnGate(
      gateInput({
        addedCodes: parseAddedCodes(MOVED_DIFF),
        updatedCodes,
        deletedCodes: detectDeletedCodes(
          MOVED_DIFF,
          updatedCodes,
          renumberPairs.map((pair) => pair.removed)
        ),
        renumberPairs,
      })
    );

    // The obligation the reordering author carries is the ADDED arm's, entire — the verb in
    // the message is what says so, and it is asserted because "the gate reds" alone would be
    // true under a reading that had reported the move updated as well. What this row pins is
    // that NO obligation arrives by that door.
    expect(result.violations.map(({ kind, code }) => ({ kind, code }))).toEqual([
      { kind: "missing-ticket-handle", code: MOVED_CODE },
    ]);
    expect(result.violations[0]!.message).toMatch(/^Added scenario code/);
    expect(result.violations.some((v) => v.message.startsWith("Updated scenario code"))).toBe(
      false
    );
  });
});
