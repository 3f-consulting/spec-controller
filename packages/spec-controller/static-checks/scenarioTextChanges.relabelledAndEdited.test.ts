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
 * from `scenarioTextChanges.test.ts` rather than exported from it: a test helper exported
 * across files is a seam between two test files, and five lines is cheaper than that seam.
 */
function diffBody(diff: string, marker: "+" | "-"): string[] {
  return diff
    .split("\n")
    .filter((line) => line.startsWith(marker) && !line.startsWith(`${marker}${marker}`))
    .map((line) => line.slice(1));
}

/**
 * The @unit arm of @SCN-SSM-017, in its OWN file — a relabel whose scenario ALSO changed,
 * refused as a pair.
 *
 * WHY IT IS NOT IN `scenarioTextChanges.test.ts` beside the other rows over the same
 * reading. That file reached its `max-lines` ceiling on this row (511 counted lines against
 * a test ceiling of 400), and the two ways out are not equal: a fresh
 * `complexityExceptions.mjs` entry buys the room by raising a number someone then has to
 * argue back down, on the very slice that just corrected this module's docblock claim about
 * that list. Splitting costs one duplicated five-line `diffBody` helper and nothing else.
 * The rows above stay where they are — moving a sibling's landed evidence is a
 * behaviour-preserving refactor, not this scenario's work — so the file they share is now
 * AT its ceiling and the next row over that reading splits too.
 *
 * The @unit arm of @SCN-SSM-017 — a relabel whose scenario ALSO changed, refused as a pair.
 *
 * THE ONLY ROW IN THIS RULE THAT REDS WHEN THE READING PAIRS TOO MUCH. The two rows above
 * red when it pairs too LITTLE, and the cheapest reading that satisfies them both is one
 * that never looks at the body at all — pair a disappeared code with an appeared one on
 * document position, or on their shared feature prefix, and stop. That reading passes
 * @SCN-SSM-015 and @SCN-SSM-016 exactly. This row is what it fails.
 *
 * AND THE FAILURE IT WOULD BE ALLOWED IS THE WHOLE GATE, not a mis-report. `decideScnGate`
 * passes a renumber UNCONDITIONALLY, ahead of the ticket handle and ahead of every
 * exemption trailer, so an over-eager pairing exempts every renamed-and-rewritten scenario
 * in the repository from the check that binds a behaviour change to a tracked work item.
 * The auto-exemption is for a relabel that changes nothing else; a changed body is a
 * changed behaviour and still owes a handle or an explicit SCN-exempt trailer.
 *
 * THE CONTROL IS WHAT MAKES THE EMPTY ANSWER MEAN SOMETHING. An empty `renumberPairs` is
 * also what a reading that had stopped pairing ANYTHING returns, so the same relabel
 * arriving WITHOUT the step edit is read here too and must pair — the difference between
 * the two answers is the body edit and nothing else about the fixture.
 *
 * BOTH CLAUSES OF THE OUTCOME ARE ASSERTED. "No pair" alone would be satisfied by a gate
 * that had stopped reading added codes altogether, so the sets are carried on into
 * `decideScnGate` and the violation naming the NEW code is named.
 *
 * The @integration arm (tests/steps/scenarioSubIssueMatchRelabelledAndEdited.steps.ts)
 * runs the real CLI over a real git fixture; this arm pins the reading.
 */

/** The neighbour scenario, untouched on both sides — nothing here is about it. */
const RELABELLED_NEIGHBOUR = "SCN-LAD-006";
/** The relabelled scenario's code on the BASE side, and on the HEAD side. */
const RELABELLED_FROM = "SCN-LAD-007";
const RELABELLED_TO = "SCN-LAD-008";

const OWN_STEP_BEFORE = "the excluded step is not a gate";
const OWN_STEP_AFTER =
  "the excluded step is not a gate, and the ladder names the exclusion that left it out";

/**
 * The relabelled scenario's OWN last step is what changes — inside the same extent as the
 * tag line, which is the fixture's whole point. @SCN-SSM-015's fixture puts the edit in the
 * NEIGHBOUR and must still pair; move it inside and the pair must vanish.
 */
function relabelledCorpus(code: string, ownLastStep: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      `  @unit @integration @${RELABELLED_NEIGHBOUR}`,
      "  Scenario: the ladder is derived from the workflow itself",
      "    Given a workflow naming its gate steps",
      "    When the ladder is derived",
      "    Then the ladder names every gate step",
      "",
      `  @unit @integration @${code}`,
      "  Scenario: an excluded step is not a gate",
      "    Given a workflow step the ladder excludes",
      "    When the ladder is derived",
      `    Then ${ownLastStep}`,
    ].join("\n") + "\n"
  );
}

const RELABELLED_BASE = relabelledCorpus(RELABELLED_FROM, OWN_STEP_BEFORE);
/** Relabelled AND edited — the row's own case. */
const RELABELLED_HEAD = relabelledCorpus(RELABELLED_TO, OWN_STEP_AFTER);
/** The CONTROL: the same relabel, body untouched. A renumber, and it must pair. */
const RELABEL_WITHOUT_EDIT_HEAD = relabelledCorpus(RELABELLED_TO, OWN_STEP_BEFORE);
/** The other half of the control: the same edit, code untouched. An update, and it must report. */
const EDIT_WITHOUT_RELABEL_HEAD = relabelledCorpus(RELABELLED_FROM, OWN_STEP_AFTER);

/**
 * `git diff <base>...HEAD` over the two sources above, captured VERBATIM from real git
 * rather than composed by hand. Both changed lines lie inside the relabelled scenario's own
 * extent — the tag line and the last step — which is what separates this fixture from
 * @SCN-SSM-015's, where the edited step belongs to the neighbour.
 */
const RELABELLED_AND_EDITED_DIFF = `diff --git a/features/target.feature b/features/target.feature
index 7978501..d8d633f 100644
--- a/features/target.feature
+++ b/features/target.feature
@@ -7,8 +7,8 @@ Feature: the local ladder is derived from the workflow
     When the ladder is derived
     Then the ladder names every gate step
 
-  @unit @integration @SCN-LAD-007
+  @unit @integration @SCN-LAD-008
   Scenario: an excluded step is not a gate
     Given a workflow step the ladder excludes
     When the ladder is derived
-    Then the excluded step is not a gate
+    Then the excluded step is not a gate, and the ladder names the exclusion that left it out
`;

/**
 * The corpus cut into blank-line-separated blocks, keyed by the `@SCN` code on the block's
 * first line. Deliberately NOT `parseTaggedScenarios`: the premise assertion above has to
 * hold independently of the walk the reading under test is built on.
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
    ...overrides,
  };
}

describe("[SCN-SSM-017] a relabelled scenario whose body also changed is not a renumber", () => {
  it("is a fixture whose relabel and step edit land inside the SAME scenario", () => {
    // Both changed lines belong to the relabelled scenario's own extent: its tag line and
    // its last step. Were the edit in the NEIGHBOUR this would be @SCN-SSM-015's fixture,
    // where the pair must SURVIVE — so the row would assert the exact opposite outcome
    // against the exact opposite premise, the most expensive way for a test to be wrong.
    expect(diffBody(RELABELLED_AND_EDITED_DIFF, "-")).toEqual([
      `  @unit @integration @${RELABELLED_FROM}`,
      `    Then ${OWN_STEP_BEFORE}`,
    ]);
    expect(diffBody(RELABELLED_AND_EDITED_DIFF, "+")).toEqual([
      `  @unit @integration @${RELABELLED_TO}`,
      `    Then ${OWN_STEP_AFTER}`,
    ]);
    // Said of the CORPUS as well as of the diff, and said WITHOUT the parser under test:
    // the blocks are cut on blank lines, so this assertion cannot be satisfied by the same
    // walk it is meant to constrain. The changed step is inside the relabelled scenario on
    // each side, and the neighbour's block is byte-identical across the two.
    const base = blocksByCode(RELABELLED_BASE);
    const head = blocksByCode(RELABELLED_HEAD);
    expect(base.get(RELABELLED_FROM)).toContain(OWN_STEP_BEFORE);
    expect(head.get(RELABELLED_TO)).toContain(OWN_STEP_AFTER);
    expect(head.get(RELABELLED_NEIGHBOUR)).toEqual(base.get(RELABELLED_NEIGHBOUR));
  });

  it("pairs nothing — the body changed, so the relabel is not a renumber", () => {
    expect(readScenarioChanges(RELABELLED_BASE, RELABELLED_HEAD).renumberPairs).toEqual([]);
  });

  it("pairs the SAME relabel when the body does not change — the edit is what refuses it", () => {
    // The control. Without it the empty answer above is equally consistent with a reading
    // that had stopped pairing anything at all.
    expect(readScenarioChanges(RELABELLED_BASE, RELABEL_WITHOUT_EDIT_HEAD).renumberPairs).toEqual([
      { removed: RELABELLED_FROM, added: RELABELLED_TO },
    ]);
    // And the other half: the same edit under the code it kept is an ordinary update, so
    // the edit is a real change to that scenario however it is carried.
    expect(readScenarioChanges(RELABELLED_BASE, EDIT_WITHOUT_RELABEL_HEAD).updatedCodes).toEqual([
      RELABELLED_FROM,
    ]);
  });

  it("names no code updated — neither code is on both sides, so the change is an add and a delete", () => {
    expect(readScenarioChanges(RELABELLED_BASE, RELABELLED_HEAD).updatedCodes).toEqual([]);
  });

  it("leaves the OLD code in the deleted set, because no pair claimed it", () => {
    const { updatedCodes, renumberPairs } = readScenarioChanges(
      RELABELLED_BASE,
      RELABELLED_HEAD
    );
    expect(
      detectDeletedCodes(
        RELABELLED_AND_EDITED_DIFF,
        updatedCodes,
        renumberPairs.map((pair) => pair.removed)
      )
    ).toEqual([RELABELLED_FROM]);
  });

  it("reds the gate for the NEW code, which is what an over-eager pairing would exempt", () => {
    const { updatedCodes, renumberPairs } = readScenarioChanges(
      RELABELLED_BASE,
      RELABELLED_HEAD
    );
    const result = decideScnGate(
      gateInput({
        addedCodes: parseAddedCodes(RELABELLED_AND_EDITED_DIFF),
        updatedCodes,
        deletedCodes: detectDeletedCodes(
          RELABELLED_AND_EDITED_DIFF,
          updatedCodes,
          renumberPairs.map((pair) => pair.removed)
        ),
        renumberPairs,
      })
    );

    // The added arm still reports the new code — asserted so this cannot go green for a
    // gate that had stopped reading added codes rather than for one that refused the pair.
    expect(parseAddedCodes(RELABELLED_AND_EDITED_DIFF)).toEqual([RELABELLED_TO]);
    expect(result.ok).toBe(false);
    expect(
      result.violations.map(({ kind, code }) => ({ kind, code }))
    ).toEqual([
      { kind: "missing-ticket-handle", code: RELABELLED_TO },
      { kind: "missing-ticket-handle", code: RELABELLED_FROM },
    ]);
  });
});
