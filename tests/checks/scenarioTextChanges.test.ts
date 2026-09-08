import { describe, it, expect } from "vitest";
import { detectDeletedCodes } from "./scnSubIssueGate.js";
import { readScenarioChanges } from "./scenarioTextChanges.js";

/**
 * ONE PLANTED CORPUS, ONE VERDICT (3F-3238). This file, `scenarioTextChanges.movedVerbatim`
 * and `scenarioTextChanges.relabelledAndEdited` were forty-three arms over one 166-line
 * module — three files and eight citations for a function that takes two strings and
 * returns three fields. Each arm planted a two-scenario corpus for the one shape it
 * judged, and most re-planted a shape a neighbour had already written.
 *
 * WHAT THE COLLAPSE BUYS, MEASURED. Nine of the module's rules were neutered one at a time
 * against the whole tree. Four of them — the `@`-sigil restriction in `unlabelled`, the
 * JOIN that a hoisted code's several blocks receive, the claim-once rule and the
 * first-match `break` in `pairRenumbers` — redded NOTHING, in any of the three files or
 * anywhere else. Forty-three arms and four rules no arm was watching, because each arm
 * asked its own narrow question of its own narrow fixture. One corpus carrying every shape
 * at once reaches all four.
 *
 * THE ORDER OF BOTH LISTS IS KEPT, NOT GAINED, and saying so is the point. Reversing the
 * head map, and reversing the pairs, each redded `SCN-SSM-016`'s two-renumber arm before
 * this collapse and reds this one after it — so the order was already observed and the
 * claim to have newly acquired it would have been false. What is genuinely new is the four
 * rules above. Measured, because a collapse is exactly where an unearned claim is easiest
 * to make and hardest to notice.
 *
 * THE DIFF IS DERIVED, NOT WRITTEN. `detectDeletedCodes` is the caller-side reader that
 * consumes this module's renumber pairs, and it is the ONLY remaining unit observer of the
 * rule that a renumber's removed code is not a deletion. Its input here is the whole-file
 * replacement of BASE by HEAD — every base line removed, every head line added — composed
 * from the two corpora below rather than typed beside them, so a fixture cannot drift from
 * the corpus it claims to diff.
 */

/** One scenario block, blank separator first — the shape the corpus is assembled from. */
function block(code: string, title: string, steps: readonly string[]): string[] {
  return ["", `  @unit @integration @${code}`, `  Scenario: ${title}`, ...steps.map((s) => `    ${s}`)];
}

const PREAMBLE = (rule: string): string[] => [
  "@LAD",
  "Feature: the local ladder is derived from the workflow",
  "",
  `  Rule: ${rule}`,
];

/** Reworded in HEAD, and lying inside no scenario — the change no code accounts for. */
const RULE_BASE = "the ladder is derived from the workflow, not maintained beside it";
const RULE_HEAD = "the ladder is derived from the workflow, never maintained beside it";

const EDITED_BASE = block("SCN-LAD-201", "an edited scenario names itself", [
  "Given a workflow step the ladder excludes",
  "When the ladder is derived",
  "Then the excluded step is not a gate",
  "And the ladder names it, with the reason it cannot run locally",
]);
const EDITED_HEAD = block("SCN-LAD-201", "an edited scenario names itself", [
  "Given a workflow step the ladder excludes",
  "When the ladder is derived",
  "Then the excluded step is not a gate",
  "And the ladder names it, with the reason it cannot run in this shell",
]);

/** Byte-identical on both sides, and sitting directly after the edited one. */
const NEIGHBOUR = block("SCN-LAD-202", "the untouched neighbour", [
  "Given an exclusion naming a script the workflow no longer runs",
  "When the ladder is derived",
  "Then the ladder reds as stale",
]);

/** Present in BASE alone — the deletion, which takes its blank separator with it. */
const DELETED = block("SCN-LAD-203", "the scenario that is deleted outright", [
  "Given a gate the workflow dropped",
  "When the ladder is derived",
  "Then the ladder no longer names it",
]);

/** A step REMOVED, adding no line in its place — the edit a positional reading loses. */
const STEP_REMOVED_BASE = block("SCN-LAD-204", "the scenario that loses a step", [
  "Given a derived ladder",
  "When the ladder is derived",
  "Then the ladder is not maintained by hand",
  "And the omission is printed rather than commented",
]);
const STEP_REMOVED_HEAD = block("SCN-LAD-204", "the scenario that loses a step", [
  "Given a derived ladder",
  "When the ladder is derived",
  "Then the ladder is not maintained by hand",
]);

/** Byte-identical on both sides, and LAST in HEAD where it was fifth in BASE. */
const MOVED = block("SCN-LAD-205", "the scenario moved verbatim", [
  "Given a file whose scenarios are reordered",
  "When the ladder is derived",
  "Then nothing about this scenario has changed",
]);

const tidiedFirst = (code: string): string[] =>
  block(code, "the first tidied scenario", [
    "Given a feature file whose codes are being tidied",
    "When the ladder is derived",
    "Then the first renumber is auto-detected",
  ]);
const tidiedSecond = (code: string): string[] =>
  block(code, "the second tidied scenario", [
    "Given a second author tidying codes in the same sitting",
    "When the ladder is derived",
    "Then the second renumber is auto-detected too",
  ]);

/** Relabelled AND rewritten — the pairing that must be refused, or the gate has a hole. */
const RELABELLED_BASE = block("SCN-LAD-208", "the relabelled and rewritten scenario", [
  "Given a scenario whose code changed",
  "When the ladder is derived",
  "Then its body is unchanged",
]);
const RELABELLED_HEAD = block("SCN-LAD-218", "the relabelled and rewritten scenario", [
  "Given a scenario whose code changed",
  "When the ladder is derived",
  "Then its body changed as well",
]);

/**
 * ONE CODE ON TWO BLOCKS — the hoisted-code fault the parser surfaces rather than hides.
 * Only the FIRST block is edited, so a reader that JOINS the blocks reports the code
 * updated and a reader that lets the later block overwrite the earlier reports silence.
 */
const HOISTED_FIRST_BASE = block("SCN-LAD-209", "the hoisted code's first block", [
  "Given one id shared by two scenarios",
  "When the ladder is derived",
  "Then the first block is the one that changes",
]);
const HOISTED_FIRST_HEAD = block("SCN-LAD-209", "the hoisted code's first block", [
  "Given one id shared by two scenarios",
  "When the ladder is derived",
  "Then the first block is the one that has changed",
]);
const HOISTED_SECOND = block("SCN-LAD-209", "the hoisted code's second block", [
  "Given the same id carried a second time",
  "When the ladder is derived",
  "Then this block is untouched on both sides",
]);

/**
 * A renumber whose body carries the OLD id as bare prose, left behind on both sides.
 * Only the `@`-sigilled token is normalised, so the two sides still compare equal and the
 * pair stands; a reader that normalised the bare id too would break its own pair.
 */
const prosePairing = (code: string): string[] =>
  block(code, "the scenario naming an id in prose", [
    "Given a scenario body that mentions SCN-LAD-210 without a sigil",
    "When the ladder is derived",
    "Then the prose id is not the tag",
  ]);

/** Two BASE scenarios sharing one text, and ONE in HEAD — only the first may claim it. */
const twin = (code: string): string[] =>
  block(code, "the twinned scenario", [
    "Given two scenarios collapsed into one",
    "When the ladder is derived",
    "Then only the first disappeared code claims the survivor",
  ]);

/** One BASE scenario, and TWO in HEAD sharing its text — only the first may be taken. */
const fork = (code: string): string[] =>
  block(code, "the forked scenario", [
    "Given one scenario split into two",
    "When the ladder is derived",
    "Then the first appeared code is the one paired",
  ]);

const BASE = [
  ...PREAMBLE(RULE_BASE),
  ...EDITED_BASE,
  ...NEIGHBOUR,
  ...DELETED,
  ...STEP_REMOVED_BASE,
  ...MOVED,
  ...tidiedFirst("SCN-LAD-206"),
  ...tidiedSecond("SCN-LAD-207"),
  ...RELABELLED_BASE,
  ...HOISTED_FIRST_BASE,
  ...HOISTED_SECOND,
  ...prosePairing("SCN-LAD-210"),
  ...twin("SCN-LAD-211"),
  ...twin("SCN-LAD-212"),
  ...fork("SCN-LAD-213"),
  "",
].join("\n");

const HEAD = [
  ...PREAMBLE(RULE_HEAD),
  ...EDITED_HEAD,
  ...NEIGHBOUR,
  ...STEP_REMOVED_HEAD,
  ...tidiedFirst("SCN-LAD-216"),
  ...tidiedSecond("SCN-LAD-217"),
  ...RELABELLED_HEAD,
  ...HOISTED_FIRST_HEAD,
  ...HOISTED_SECOND,
  ...prosePairing("SCN-LAD-220"),
  ...twin("SCN-LAD-221"),
  ...fork("SCN-LAD-223"),
  ...fork("SCN-LAD-224"),
  ...MOVED,
  "",
].join("\n");

/**
 * The SAME base with ONE scenario deleted and nothing else touched. The deletion takes a
 * blank separator with it, so a residue that counted blank lines would report a change
 * outside every scenario here — the noise that gets a report ignored. Held apart from the
 * corpus above precisely because `changedOutsideEveryScenario` is ONE boolean: a reading
 * that reported the deletion as an outside change would be masked by the preamble reword
 * that legitimately sets it, and the two readings would agree by accident.
 */
const DELETION_ONLY_HEAD = [
  ...PREAMBLE(RULE_BASE),
  ...EDITED_BASE,
  ...NEIGHBOUR,
  ...STEP_REMOVED_BASE,
  ...MOVED,
  ...tidiedFirst("SCN-LAD-206"),
  ...tidiedSecond("SCN-LAD-207"),
  ...RELABELLED_BASE,
  ...HOISTED_FIRST_BASE,
  ...HOISTED_SECOND,
  ...prosePairing("SCN-LAD-210"),
  ...twin("SCN-LAD-211"),
  ...twin("SCN-LAD-212"),
  ...fork("SCN-LAD-213"),
  "",
].join("\n");

/**
 * BASE replaced by HEAD, whole — composed from the two corpora, so the hunk header's two
 * counts are the corpora's own line counts and cannot be made to agree by accident.
 */
const DIFF = ((base: string[], head: string[]) =>
  [
    "diff --git a/features/local-ladder.feature b/features/local-ladder.feature",
    "--- a/features/local-ladder.feature",
    "+++ b/features/local-ladder.feature",
    `@@ -1,${base.length} +1,${head.length} @@`,
    ...base.map((line) => `-${line}`),
    ...head.map((line) => `+${line}`),
  ].join("\n"))(BASE.split("\n"), HEAD.split("\n"));

describe("[SCN-SSM-017] the scenario-text reading over a corpus as it now stands — every shape one pair of sources can carry, and what the caller's deletion reader makes of the codes it yields", () => {
  it("[SCN-SSM-017] names each changed scenario in head order and no neighbour, joins a hoisted code's blocks, pairs a renumber only where the body is otherwise identical — refusing a relabelled-and-rewritten one, claiming each appeared code once and taking the first — and reports a change outside every scenario without counting a deleted scenario's blank separator", () => {
    const changes = readScenarioChanges(BASE, HEAD);
    const renumberRemoved = changes.renumberPairs.map((pair) => pair.removed);

    expect({
      // THE READING, over the whole corpus at once.
      updatedCodes: changes.updatedCodes,
      renumberPairs: changes.renumberPairs,
      changedOutsideEveryScenario: changes.changedOutsideEveryScenario,

      // THE SAME BASE, ONE SCENARIO DELETED AND NOTHING ELSE — the blank separator's reading.
      deletionOnly: readScenarioChanges(BASE, DELETION_ONLY_HEAD),

      // TWO IDENTICAL SOURCES — the inert answer, which is not the silence above.
      unchanged: readScenarioChanges(BASE, BASE),

      // AN EMPTY SIDE — the file this change adds, and the file it deletes.
      fileAdded: readScenarioChanges("", BASE),
      fileDeleted: readScenarioChanges(BASE, ""),

      // THE CALLER'S DELETION READER, over the codes this reading just yielded.
      deletedCodes: detectDeletedCodes(DIFF, changes.updatedCodes, renumberRemoved),
      // ...and with the renumbers withheld, which is what the exclusion is for.
      deletedIfNoRenumberWereFound: detectDeletedCodes(DIFF, changes.updatedCodes, []),
    }).toEqual({
      updatedCodes: ["SCN-LAD-201", "SCN-LAD-204", "SCN-LAD-209"],
      renumberPairs: [
        { removed: "SCN-LAD-206", added: "SCN-LAD-216" },
        { removed: "SCN-LAD-207", added: "SCN-LAD-217" },
        { removed: "SCN-LAD-210", added: "SCN-LAD-220" },
        { removed: "SCN-LAD-211", added: "SCN-LAD-221" },
        { removed: "SCN-LAD-213", added: "SCN-LAD-223" },
      ],
      changedOutsideEveryScenario: true,

      deletionOnly: {
        updatedCodes: [],
        renumberPairs: [],
        changedOutsideEveryScenario: false,
      },

      unchanged: {
        updatedCodes: [],
        renumberPairs: [],
        changedOutsideEveryScenario: false,
      },

      fileAdded: {
        updatedCodes: [],
        renumberPairs: [],
        changedOutsideEveryScenario: true,
      },
      fileDeleted: {
        updatedCodes: [],
        renumberPairs: [],
        changedOutsideEveryScenario: true,
      },

      deletedCodes: ["SCN-LAD-203", "SCN-LAD-208", "SCN-LAD-212"],
      deletedIfNoRenumberWereFound: [
        "SCN-LAD-203",
        "SCN-LAD-206",
        "SCN-LAD-207",
        "SCN-LAD-208",
        "SCN-LAD-210",
        "SCN-LAD-211",
        "SCN-LAD-212",
        "SCN-LAD-213",
      ],
    });
  });
});
