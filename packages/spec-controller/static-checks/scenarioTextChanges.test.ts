import { describe, it, expect } from "vitest";
import { detectDeletedCodes } from "./scnSubIssueGate.js";
import { readScenarioChanges } from "./scenarioTextChanges.js";

/**
 * The @unit arm of @SCN-SSM-010 — the pure reading over two feature sources.
 *
 * The @integration arm (tests/steps/scenarioSubIssueMatchLastStep.steps.ts) is the one
 * with the teeth, because the fault was the CLI's CHOICE OF INPUT. This arm pins the
 * reading itself: no line arithmetic is involved, so the answer must be the same
 * whether the edit lands on a scenario's first step or its last.
 */

/**
 * The measured shape from PR #239: two adjacent scenarios, the edit on the LAST step of
 * the first. Its own tag line is five lines above the change; the neighbour's is two
 * lines below it. Those distances are what made a hunk-local reading report the
 * neighbour — and are exactly what a source comparison never consults.
 */
function corpus(lastStep: string): string {
  return [
    "@LAD",
    "Feature: the local ladder is derived from the workflow",
    "",
    "  @unit @integration @SCN-LAD-004",
    "  Scenario: an excluded step is not a gate",
    "    Given a workflow step the ladder excludes",
    "    When the ladder is derived",
    "    Then the excluded step is not a gate",
    `    And ${lastStep}`,
    "",
    "  @unit @integration @SCN-LAD-005",
    "  Scenario: an exclusion naming a script CI does not run reds as stale",
    "    Given an exclusion naming a script the workflow no longer runs",
    "    When the ladder is derived",
    "    Then the ladder reds as stale",
    "",
  ].join("\n");
}

const BASE = corpus("the ladder names it, with the reason it cannot run locally");
const HEAD = corpus("the ladder names it, with the reason it is left out");

describe("[SCN-SSM-010] a change to a scenario's last step names that scenario, not the next one", () => {
  it("names the scenario whose last step changed", () => {
    expect(readScenarioChanges(BASE, HEAD).updatedCodes).toEqual(["SCN-LAD-004"]);
  });

  it("does not name the following scenario, whose text is byte-identical", () => {
    expect(readScenarioChanges(BASE, HEAD).updatedCodes).not.toContain("SCN-LAD-005");
  });

  it("reads a last-step edit exactly as it reads a first-step edit — position is not in the question", () => {
    const firstStepHead = BASE.replace(
      "    Given a workflow step the ladder excludes",
      "    Given a workflow step the derivation excludes"
    );
    expect(readScenarioChanges(BASE, firstStepHead).updatedCodes).toEqual(["SCN-LAD-004"]);
  });

  it("says nothing changed outside a scenario when the edit is inside one", () => {
    expect(readScenarioChanges(BASE, HEAD).changedOutsideEveryScenario).toBe(false);
  });

  it("names no scenario when the two sources are identical", () => {
    expect(readScenarioChanges(BASE, BASE)).toEqual({
      updatedCodes: [],
      renumberPairs: [],
      changedOutsideEveryScenario: false,
    });
  });
});

/**
 * The @unit arm of @SCN-SSM-011 — the same two scenarios, with the edit changed from a
 * REWORD to a pure REMOVAL.
 *
 * This is the case the obvious cure for the row above silently drops. That cure is
 * positional — changed line numbers off the hunk header, scenario extents off the
 * checked-out file — and `changedLinesByFile` already implements it: for a pure line
 * removal it returns nothing, because a removed line holds no position in the new file.
 * A positional reading therefore reports NO updated code for an edit that genuinely
 * changes what a scenario asserts: a mis-attribution traded for a silent miss.
 *
 * A source comparison has no such hole, and this arm is the pin that keeps it that way.
 */

/**
 * The head source: `BASE` with SCN-LAD-004's last step deleted and NOTHING put in its
 * place. Guarded by the length assertion below — a fixture that quietly stopped being a
 * pure removal would leave this row green while proving the row above instead.
 */
const REMOVED_STEP_HEAD = BASE.split("\n")
  .filter((line) => !line.startsWith("    And "))
  .join("\n");

describe("[SCN-SSM-011] a step removed from a scenario still names that scenario", () => {
  it("is a fixture that removes exactly one line and adds none", () => {
    expect(REMOVED_STEP_HEAD.split("\n")).toHaveLength(BASE.split("\n").length - 1);
    expect(BASE.split("\n").filter((l) => l.startsWith("    And "))).toHaveLength(1);
  });

  it("names the scenario whose last step was removed, though the removal added no line", () => {
    expect(readScenarioChanges(BASE, REMOVED_STEP_HEAD).updatedCodes).toEqual(["SCN-LAD-004"]);
  });

  it("does not name the following scenario, whose text is byte-identical", () => {
    expect(readScenarioChanges(BASE, REMOVED_STEP_HEAD).updatedCodes).not.toContain(
      "SCN-LAD-005"
    );
  });

  it("reads a removal exactly as it reads a reword — the two edits are one question", () => {
    expect(readScenarioChanges(BASE, REMOVED_STEP_HEAD).updatedCodes).toEqual(
      readScenarioChanges(BASE, HEAD).updatedCodes
    );
  });

  it("calls the removal a change INSIDE a scenario, not one outside every scenario", () => {
    expect(readScenarioChanges(BASE, REMOVED_STEP_HEAD).changedOutsideEveryScenario).toBe(false);
  });
});

/**
 * The @unit arm of @SCN-SSM-012 — a WHOLE SCENARIO deleted from between two untouched
 * ones, read at both of the answers that row pins.
 *
 * The two answers come from two readers, deliberately. WHICH SCENARIOS' TEXT DIFFERS is
 * a question for the two sources (`readScenarioChanges`); WHICH TAG LINES THE PR REMOVED
 * is a question the diff genuinely answers, and `detectDeletedCodes` reads it off the `-`
 * tag line itself, never off a context line. The old updated-code reading is what
 * confused the two: it took the codes sitting on the hunk's CONTEXT lines and reported
 * them updated, so a deletion — which removes a run of lines and therefore drags a
 * neighbour's tag line into the hunk as context — accused a scenario the PR never
 * touched.
 *
 * BOTH HALVES ARE ASSERTED HERE, and the positive one is not decoration. A row that only
 * checked the neighbours stayed quiet would go green for a gate that had stopped
 * reporting deletions at all — the same false green, one door along, which is the shape
 * this whole slice exists to close.
 */

/** The corpus above the deletion: the feature preamble and the untouched preceding scenario. */
const BEFORE_DELETION = [
  "@LAD",
  "Feature: the local ladder is derived from the workflow",
  "",
  "  @unit @integration @SCN-LAD-003",
  "  Scenario: the ladder is derived from the workflow itself",
  "    Given a workflow naming its gate steps",
  "    When the ladder is derived",
  "    Then the ladder names every gate step",
  "",
];

/**
 * The scenario the fixture PR DELETES — its tag line, its keyword line, every step, and
 * the blank line that separated it from the scenario below. Deleting a scenario takes its
 * separator with it; leaving the blank behind would make the head source malformed in a
 * way no real deletion produces.
 */
const DELETED_SCENARIO = [
  "  @unit @integration @SCN-LAD-004",
  "  Scenario: an excluded step is not a gate",
  "    Given a workflow step the ladder excludes",
  "    When the ladder is derived",
  "    Then the excluded step is not a gate",
  "    And the ladder names it, with the reason it cannot run locally",
  "",
];

/** The corpus below the deletion: the untouched following scenario. */
const AFTER_DELETION = [
  "  @unit @integration @SCN-LAD-005",
  "  Scenario: an exclusion naming a script CI does not run reds as stale",
  "    Given an exclusion naming a script the workflow no longer runs",
  "    When the ladder is derived",
  "    Then the ladder reds as stale",
];

const DELETION_BASE = [...BEFORE_DELETION, ...DELETED_SCENARIO, ...AFTER_DELETION].join("\n") + "\n";
const DELETION_HEAD = [...BEFORE_DELETION, ...AFTER_DELETION].join("\n") + "\n";

/**
 * `git diff <base>...HEAD` over exactly those two sources, captured VERBATIM from git
 * rather than composed by hand — a hand-shaped diff is free to disagree with the one the
 * check actually receives, and the fault this row guards lived in precisely that gap.
 *
 * Read what the hunk contains: the following scenario's tag line sits in the TRAILING
 * CONTEXT, three lines under the deletion. That is the whole mechanism of the old fault —
 * a code the PR never touched, present in the hunk, reported as updated. The first
 * assertion below ties this capture back to the sources above, so it cannot drift into
 * describing some other edit while still passing.
 */
const DELETION_DIFF = `diff --git a/features/target.feature b/features/target.feature
index 30195ad..105d4d6 100644
--- a/features/target.feature
+++ b/features/target.feature
@@ -7,13 +7,6 @@ Feature: the local ladder is derived from the workflow
     When the ladder is derived
     Then the ladder names every gate step
 
-  @unit @integration @SCN-LAD-004
-  Scenario: an excluded step is not a gate
-    Given a workflow step the ladder excludes
-    When the ladder is derived
-    Then the excluded step is not a gate
-    And the ladder names it, with the reason it cannot run locally
-
   @unit @integration @SCN-LAD-005
   Scenario: an exclusion naming a script CI does not run reds as stale
     Given an exclusion naming a script the workflow no longer runs
`;

/** The diff's body lines, marker kept — the `---`/`+++` file headers are not body. */
function diffBody(diff: string, marker: "+" | "-"): string[] {
  return diff
    .split("\n")
    .filter((line) => line.startsWith(marker) && !line.startsWith(`${marker}${marker}`))
    .map((line) => line.slice(1));
}

describe("[SCN-SSM-012] deleting a scenario names it deleted and leaves its neighbours unnamed", () => {
  it("is a fixture whose diff removes exactly the deleted scenario's lines and adds none", () => {
    expect(diffBody(DELETION_DIFF, "+")).toEqual([]);
    expect(diffBody(DELETION_DIFF, "-")).toEqual(DELETED_SCENARIO);
    expect(DELETION_BASE).toContain(DELETED_SCENARIO.join("\n"));
    expect(DELETION_HEAD).not.toContain("SCN-LAD-004");
  });

  it("reports the deleted scenario's code deleted", () => {
    const { updatedCodes } = readScenarioChanges(DELETION_BASE, DELETION_HEAD);
    // No renumber is reachable here: the fixture adds no tag line at all (asserted above).
    expect(detectDeletedCodes(DELETION_DIFF, updatedCodes, [])).toEqual(["SCN-LAD-004"]);
  });

  it("names neither neighbour updated — a code on only one side is never an update", () => {
    expect(readScenarioChanges(DELETION_BASE, DELETION_HEAD).updatedCodes).toEqual([]);
  });

  it("does not name the deleted scenario updated either — the deletion is the other reader's", () => {
    expect(readScenarioChanges(DELETION_BASE, DELETION_HEAD).updatedCodes).not.toContain(
      "SCN-LAD-004"
    );
  });

  it("calls a deletion a change inside scenarios, though it takes a blank separator with it", () => {
    expect(readScenarioChanges(DELETION_BASE, DELETION_HEAD).changedOutsideEveryScenario).toBe(
      false
    );
  });
});

/**
 * The @unit arm of @SCN-SSM-013 — a change lying inside NO scenario, read at both of the
 * answers that row pins.
 *
 * THE READING'S HALF OF THE ROW IS GREEN ON FIRST RUN. Comparing the two sources already
 * yields silence for an edit outside every scenario, because a residue line belongs to no
 * code and no code's text moved; and it already yields the fact, because the residues
 * differ. That is @SCN-SSM-010's mechanism doing what it was built to do, so this arm's
 * teeth come from a recorded plant rather than a staged red. What genuinely reds today is
 * the CHECK SAYING SO, and only the @integration arm
 * (tests/steps/scenarioSubIssueMatchPreamble.steps.ts) can see stdout.
 *
 * THE TWO EMPTY ANSWERS ARE THE POINT, and the last two rows below are what separate
 * them. `updatedCodes: []` alone carries two meanings — "no scenario contains this
 * change" and "nothing changed at all" — and reading the honest one as the inert one is
 * this repository's own missing-versus-unreached confusion arriving in a third place.
 * `changedOutsideEveryScenario` is the discriminator, and a row that only checked the
 * silence would pass a reading that had lost it.
 */

/**
 * The fixture corpus: a `Rule:` preamble with a scenario's tag line TWO LINES BELOW it.
 * Those two lines are the whole shape — three lines of unified-diff context put that tag
 * line inside the hunk as context, which is what made the old reading report a scenario
 * the change was not in (measured at the parent's Analysis: `updated: [SCN-LAD-004]`).
 */
function preambleCorpus(preamble: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      "  Rule: the ladder names what it leaves out, and why",
      `    ${preamble}`,
      "",
      "    @unit @integration @SCN-LAD-004",
      "    Scenario: an excluded step is not a gate",
      "      Given a workflow step the ladder excludes",
      "      When the ladder is derived",
      "      Then the excluded step is not a gate",
    ].join("\n") + "\n"
  );
}

const PREAMBLE_BASE = preambleCorpus("An exclusion carries the reason it cannot run locally.");
const PREAMBLE_HEAD = preambleCorpus("An exclusion carries the reason it is left out.");

describe("[SCN-SSM-013] a change outside every scenario names no scenario, and the check says so", () => {
  it("is a fixture whose changed line sits two lines above a scenario's tag line", () => {
    const changed = PREAMBLE_HEAD.split("\n").findIndex(
      (line, i) => line !== PREAMBLE_BASE.split("\n")[i]
    );
    expect(PREAMBLE_HEAD.split("\n")[changed + 2]).toContain("@SCN-LAD-004");
  });

  it("names no updated scenario code — the change is in no scenario, so no code accounts for it", () => {
    expect(readScenarioChanges(PREAMBLE_BASE, PREAMBLE_HEAD).updatedCodes).toEqual([]);
  });

  it("does not inherit the neighbouring scenario whose tag line the hunk happens to carry", () => {
    expect(readScenarioChanges(PREAMBLE_BASE, PREAMBLE_HEAD).updatedCodes).not.toContain(
      "SCN-LAD-004"
    );
  });

  it("says the change lies outside every scenario", () => {
    expect(readScenarioChanges(PREAMBLE_BASE, PREAMBLE_HEAD).changedOutsideEveryScenario).toBe(
      true
    );
  });

  it("distinguishes that from an unchanged file, which names no code either", () => {
    const outsideEveryScenario = readScenarioChanges(PREAMBLE_BASE, PREAMBLE_HEAD);
    const unchanged = readScenarioChanges(PREAMBLE_BASE, PREAMBLE_BASE);
    expect(unchanged.updatedCodes).toEqual(outsideEveryScenario.updatedCodes);
    expect(unchanged.changedOutsideEveryScenario).toBe(false);
  });
});

/**
 * The @unit arm of @SCN-SSM-015 — the renumber pairing read from the two sources.
 *
 * WHAT MOVED, AND WHAT DID NOT. `detectRenumberPairs` accumulated per HUNK and emitted a
 * pair only when the hunk held exactly one removed tag-line code, one added tag-line code,
 * and no other changed line. Every one of those three is a fact about the HUNK. Whether a
 * relabelled scenario's BODY is otherwise unchanged is a fact about that scenario, and
 * hunk boundaries are a function of git's context setting and of what else changed nearby
 * — so the same renumber paired or did not pair depending on an edit to a DIFFERENT
 * scenario. That is the @SCN-SSM-010 move made once more, on the arm beside it.
 *
 * WHICH TAG LINES THE DIFF ADDED AND REMOVED IS STILL THE DIFF'S. `parseAddedCodes` is
 * untouched and `detectDeletedCodes` still reads the `-` tag line itself; what it no
 * longer does is compute the renumber-removed set from the diff, because that is no
 * longer a question the diff can answer. It takes it as a parameter, exactly as it took
 * the updated set at 3F-3044.
 *
 * The @integration arm (tests/steps/scenarioSubIssueMatchSharedHunk.steps.ts) runs the
 * real CLI over a real git fixture and proves the ONE HUNK before it proves anything
 * else; this arm pins the reading.
 */

/**
 * Two adjacent scenarios: the first has its LAST step edited, the second is RELABELLED.
 * The two changes are two lines apart, so git emits ONE hunk carrying both — which is
 * precisely the arrangement the old detector read as "not a renumber".
 */
function sharedHunkCorpus(neighbourLastStep: string, relabelledCode: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      "  @unit @integration @SCN-LAD-006",
      "  Scenario: the ladder is derived from the workflow itself",
      "    Given a workflow naming its gate steps",
      "    When the ladder is derived",
      `    Then ${neighbourLastStep}`,
      "",
      `  @unit @integration @${relabelledCode}`,
      "  Scenario: an excluded step is not a gate",
      "    Given a workflow step the ladder excludes",
      "    When the ladder is derived",
      "    Then the excluded step is not a gate",
    ].join("\n") + "\n"
  );
}

const NEIGHBOUR_STEP_BEFORE = "the ladder names every gate step";
const NEIGHBOUR_STEP_AFTER = "the ladder names every gate step it derives";

const SHARED_HUNK_BASE = sharedHunkCorpus(NEIGHBOUR_STEP_BEFORE, "SCN-LAD-007");
const SHARED_HUNK_HEAD = sharedHunkCorpus(NEIGHBOUR_STEP_AFTER, "SCN-LAD-008");
/** The same relabel with the neighbour left alone — the control the old detector DID pair. */
const RELABEL_ONLY_HEAD = sharedHunkCorpus(NEIGHBOUR_STEP_BEFORE, "SCN-LAD-008");

/**
 * `git diff <base>...HEAD` over the two sources above, captured VERBATIM from git rather
 * than composed by hand. ONE `@@` header, carrying the neighbour's step edit and the
 * relabel together: a diff that quietly split into two hunks would have paired under the
 * OLD reading too, and would prove nothing at all.
 */
const SHARED_HUNK_DIFF = `diff --git a/features/target.feature b/features/target.feature
index 7978501..94ab074 100644
--- a/features/target.feature
+++ b/features/target.feature
@@ -5,9 +5,9 @@ Feature: the local ladder is derived from the workflow
   Scenario: the ladder is derived from the workflow itself
     Given a workflow naming its gate steps
     When the ladder is derived
-    Then the ladder names every gate step
+    Then the ladder names every gate step it derives
 
-  @unit @integration @SCN-LAD-007
+  @unit @integration @SCN-LAD-008
   Scenario: an excluded step is not a gate
     Given a workflow step the ladder excludes
     When the ladder is derived
`;

describe("[SCN-SSM-015] a renumber sharing a hunk with an unrelated edit is still auto-detected", () => {
  it("is a fixture whose relabel and unrelated edit land in ONE hunk", () => {
    expect(SHARED_HUNK_DIFF.split("\n").filter((l) => l.startsWith("@@"))).toHaveLength(1);
    expect(diffBody(SHARED_HUNK_DIFF, "-")).toEqual([
      `    Then ${NEIGHBOUR_STEP_BEFORE}`,
      "  @unit @integration @SCN-LAD-007",
    ]);
    expect(diffBody(SHARED_HUNK_DIFF, "+")).toEqual([
      `    Then ${NEIGHBOUR_STEP_AFTER}`,
      "  @unit @integration @SCN-LAD-008",
    ]);
  });

  it("pairs the relabelled scenario though a neighbour's step changed beside it", () => {
    expect(readScenarioChanges(SHARED_HUNK_BASE, SHARED_HUNK_HEAD).renumberPairs).toEqual([
      { removed: "SCN-LAD-007", added: "SCN-LAD-008" },
    ]);
  });

  it("reads the same pair with the neighbour untouched — no part of the answer is the hunk's", () => {
    expect(readScenarioChanges(SHARED_HUNK_BASE, RELABEL_ONLY_HEAD).renumberPairs).toEqual(
      readScenarioChanges(SHARED_HUNK_BASE, SHARED_HUNK_HEAD).renumberPairs
    );
  });

  it("still names the neighbour updated — the edit that cost the pair is a real change to it", () => {
    expect(readScenarioChanges(SHARED_HUNK_BASE, SHARED_HUNK_HEAD).updatedCodes).toEqual([
      "SCN-LAD-006",
    ]);
  });

  it("names neither side of the relabel updated — each sits on one side only", () => {
    const { updatedCodes } = readScenarioChanges(SHARED_HUNK_BASE, SHARED_HUNK_HEAD);
    expect(updatedCodes).not.toContain("SCN-LAD-007");
    expect(updatedCodes).not.toContain("SCN-LAD-008");
  });

  it("keeps the renumber's removed code out of the deleted set, from the caller's answer", () => {
    const { updatedCodes, renumberPairs } = readScenarioChanges(SHARED_HUNK_BASE, SHARED_HUNK_HEAD);
    expect(
      detectDeletedCodes(
        SHARED_HUNK_DIFF,
        updatedCodes,
        renumberPairs.map((pair) => pair.removed)
      )
    ).toEqual([]);
  });
});

/**
 * The @unit arm of @SCN-SSM-016 — two renumbers landing in one hunk, both paired.
 *
 * THE SAME `flush()`, THE OTHER CONDITION. The row above pins the retired detector's
 * "no other changed line" test; this row pins its COUNT — a pair was emitted only when
 * the hunk held EXACTLY ONE removed tag-line code and EXACTLY ONE added one. A cure that
 * merely stopped consulting the neighbouring edit would satisfy @SCN-SSM-015 and still
 * throw both of these pairs away, which is why the two rows are not one row wearing two
 * fixtures.
 *
 * NOTHING ELSE CHANGES IN THIS HUNK, deliberately. The fixture holds exactly two removed
 * tag lines and two added ones and not one other altered line, so `otherChange` — the
 * condition @SCN-SSM-015 owns — is never reached. The only reading this row can red is
 * one that still counts.
 *
 * THE ASSERTION IS PLURAL ON PURPOSE. A reading that paired the first relabel and
 * abandoned the second would satisfy every assertion @SCN-SSM-015 makes and still refuse
 * the second author, so both pairs are named and each is compared against the answer read
 * when that relabel arrives alone.
 *
 * The @integration arm (tests/steps/scenarioSubIssueMatchTwoRenumbers.steps.ts) runs the
 * real CLI over a real git fixture and proves the ONE HUNK from git before it proves
 * anything else; this arm pins the reading.
 */

/**
 * Two adjacent scenarios with DIFFERENT bodies, each parameterised on its own code. The
 * two tag lines sit six lines apart — well inside twice unified diff's three lines of
 * context — so git has no choice but to emit both relabels as one hunk.
 *
 * The bodies differ so the pairing is unambiguous: byte-identical scenarios renumbered
 * together are the one case where the choice is arbitrary, and this row is not about that.
 */
function twoRenumberCorpus(firstCode: string, secondCode: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      `  @unit @integration @${firstCode}`,
      "  Scenario: the ladder is derived from the workflow itself",
      "    Given a workflow naming its gate steps",
      "    When the ladder is derived",
      "    Then the ladder names every gate step",
      "",
      `  @unit @integration @${secondCode}`,
      "  Scenario: an excluded step is not a gate",
      "    Given a workflow step the ladder excludes",
      "    When the ladder is derived",
      "    Then the excluded step is not a gate",
    ].join("\n") + "\n"
  );
}

const TWO_RENUMBER_BASE = twoRenumberCorpus("SCN-LAD-006", "SCN-LAD-007");
const TWO_RENUMBER_HEAD = twoRenumberCorpus("SCN-LAD-016", "SCN-LAD-017");
/** Each relabel arriving on its own — the controls the retired detector DID pair. */
const FIRST_RENUMBER_ONLY_HEAD = twoRenumberCorpus("SCN-LAD-016", "SCN-LAD-007");
const SECOND_RENUMBER_ONLY_HEAD = twoRenumberCorpus("SCN-LAD-006", "SCN-LAD-017");

/**
 * `git diff <base>...HEAD` over the two sources above, captured VERBATIM from git rather
 * than composed by hand. ONE `@@` header carrying both relabels and nothing else: a diff
 * that quietly split into two hunks would have paired under the OLD reading too, one pair
 * per hunk, and would prove nothing at all.
 */
const TWO_RENUMBER_DIFF = `diff --git a/features/target.feature b/features/target.feature
index 7978501..b65bae1 100644
--- a/features/target.feature
+++ b/features/target.feature
@@ -1,13 +1,13 @@
 @LAD
 Feature: the local ladder is derived from the workflow
 
-  @unit @integration @SCN-LAD-006
+  @unit @integration @SCN-LAD-016
   Scenario: the ladder is derived from the workflow itself
     Given a workflow naming its gate steps
     When the ladder is derived
     Then the ladder names every gate step
 
-  @unit @integration @SCN-LAD-007
+  @unit @integration @SCN-LAD-017
   Scenario: an excluded step is not a gate
     Given a workflow step the ladder excludes
     When the ladder is derived
`;

describe("[SCN-SSM-016] two renumbers inside one hunk are both auto-detected", () => {
  it("is a fixture whose two relabels land in ONE hunk, with no other line changed", () => {
    expect(TWO_RENUMBER_DIFF.split("\n").filter((l) => l.startsWith("@@"))).toHaveLength(1);
    expect(diffBody(TWO_RENUMBER_DIFF, "-")).toEqual([
      "  @unit @integration @SCN-LAD-006",
      "  @unit @integration @SCN-LAD-007",
    ]);
    expect(diffBody(TWO_RENUMBER_DIFF, "+")).toEqual([
      "  @unit @integration @SCN-LAD-016",
      "  @unit @integration @SCN-LAD-017",
    ]);
  });

  it("pairs BOTH renumbers, not merely the first", () => {
    expect(readScenarioChanges(TWO_RENUMBER_BASE, TWO_RENUMBER_HEAD).renumberPairs).toEqual([
      { removed: "SCN-LAD-006", added: "SCN-LAD-016" },
      { removed: "SCN-LAD-007", added: "SCN-LAD-017" },
    ]);
  });

  it("reads each pair exactly as it reads it alone — the other relabel is not part of the question", () => {
    const pairs = (head: string) => readScenarioChanges(TWO_RENUMBER_BASE, head).renumberPairs;
    expect(pairs(TWO_RENUMBER_HEAD)).toEqual([
      ...pairs(FIRST_RENUMBER_ONLY_HEAD),
      ...pairs(SECOND_RENUMBER_ONLY_HEAD),
    ]);
  });

  it("names no code updated — a relabel changes the carrier, not the scenario's text", () => {
    expect(readScenarioChanges(TWO_RENUMBER_BASE, TWO_RENUMBER_HEAD).updatedCodes).toEqual([]);
  });

  it("keeps BOTH removed codes out of the deleted set, from the caller's answer", () => {
    const { updatedCodes, renumberPairs } = readScenarioChanges(
      TWO_RENUMBER_BASE,
      TWO_RENUMBER_HEAD
    );
    expect(
      detectDeletedCodes(
        TWO_RENUMBER_DIFF,
        updatedCodes,
        renumberPairs.map((pair) => pair.removed)
      )
    ).toEqual([]);
  });
});
