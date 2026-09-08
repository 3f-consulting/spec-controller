/**
 * @SCN-SSM-007 (3F-2367) — the ONE planted-violation arm of the scenario ⟷ sub-issue gate's
 * DECISION AND ITS READER (3F-3237 / 3F-3218). One planted corpus carrying every block shape the
 * gate parses, one planted diff saying which of its lines a pull request touched, and every
 * ending the decision can reach over the codes that corpus yields — in one verdict, one expect.
 *
 * WHY @SCN-SSM-007 AND NOT ONE OF THE SEVEN OTHER CODES THIS FILE CREDITED. An arm credits
 * exactly one scenario (`lib/scnCitation.ts` — the first BRACKETED token, read by
 * `parse/vitest.ts`), so collapsing twenty-seven arms into one spends seven citations. The
 * survivor was chosen by neutering this module rule by rule and recording, for each, whether the
 * arm redded HERE ONLY or also in `lintScnSubIssuesCli.test.ts` — 3F-3236's real-CLI arm, which
 * runs this same decision over a planted repository and credits @SCN-SSM-006:
 *
 *   the fork exemption removed .................... reds BOTH   (@SCN-SSM-003's rule is held there too)
 *   the ticket-handle test inverted ............... reds BOTH   (@SCN-SSM-001, @SCN-SSM-002)
 *   the not-examined ending removed ............... reds BOTH   (@SCN-SSM-018)
 *   a malformed exemption made to pass ............ reds BOTH
 *   the uncited-block finding removed ............. reds BOTH   (@SCN-SSM-005's outer half)
 *   the brace lexer neutered ...................... reds HERE ONLY  (@SCN-SSM-007)
 *   cite inheritance down the chain removed ....... reds HERE ONLY  (@SCN-SSM-007, @SCN-SSM-005)
 *   the citation form widened to sigil-optional ... reds HERE ONLY  (@SCN-SSM-008)
 *   the quoted-literal exclusion removed .......... reds HERE ONLY  (@SCN-SSM-004)
 *
 * @SCN-SSM-007 is redded by three of the nine, two of them held by nothing else in the tree —
 * the widest reach of any code this file cited, and the one whose rule has no second observer.
 * Its own Rule says why that is not a coincidence: @SCN-SSM-005 pins that a cite INHERITS down an
 * ancestor chain, and this pins that the chain is found at all — "the inheritance rule is worth
 * nothing if the ancestor was never open". The corpus below is built around that: two brace-
 * carrying titles, one cited and one not, with their `it`s beneath.
 *
 * THE SEVEN LOSE `@unit`, NOT THEIR SCENARIO. @SCN-SSM-001, -002, -003, -004, -005, -008 and -018
 * all keep `@integration` and their cucumber evidence, so nothing retires; the tier tag comes off
 * in the same commit because the observation it promised is gone. @SCN-SSM-003 was this
 * sub-issue's to settle: both its observations were here and nothing else in the tree credited
 * it, so its tag comes off — and the measurement above is what makes that safe, since its RULE
 * still reds a `@unit` arm, 3F-3236's.
 *
 * WHAT @SCN-FIT-010 DISCHARGES, AND WHAT IT DOES NOT. `pnpm lint:scn-subissues` runs this module
 * over the repository's real diff on every `pnpm verify`, and it was proved to reach the
 * DECISION: made to report a code unbound that is not, the command exits 1 and the row reds. It
 * does NOT reach the corpus-parse half on a pull request shaped like this one. That half is
 * judged only where the change is unit-equivalent — a `src/**` change proven by a `@unit` test
 * with no feature `@SCN` delta — and a pull request carrying a feature delta leaves it computed
 * but inert: neutering the brace lexer, or widening the citation form, leaves the command's
 * output BYTE-IDENTICAL to the control at exit 0. Made unit-equivalent, the same tree reds on the
 * uncited block, so the reach is conditional on the shape rather than absent. No real-tree arm is
 * added on that account, because a real-tree arm here would read the same diff and meet the same
 * condition; what holds that half is the planted corpus below, and the plants recorded against it.
 */

import { describe, expect, it } from "vitest";
import {
  attributeChangedBlockCites,
  changedLinesByFile,
  decideScnGate,
  parseCitedCodesInSource,
  parseTestBlocks,
  type ScnGateInput,
  type ScnGateResult,
  type TestBlock,
} from "./scnSubIssueGate.js";

/**
 * THE PLANTED CORPUS — one test file carrying one instance of every shape the cite reader has to
 * get right, written as quoted fixture LINES so the tree's own scanners read it as data rather
 * than as this file's cites. Line numbers are the fixture's, and the assertions below are stated
 * in them.
 *
 *   5-9   a plainly cited describe over an uncited `it` .......... the inheritance the repo runs on
 *   11-15 an UNCITED sibling alongside it ....................... whose cite must not travel
 *   17-21 a template-literal title with a `${…}` interpolation ... braces before the arrow's
 *   23-27 a plain-quoted title naming an object shape ............ braces again, no interpolation
 *   29-33 a title that only MENTIONS scenario ids, bare and @-ed . prose, vouching for nothing
 *   35-39 a bracketed cite amid prose naming another id .......... the positive half of that rule
 *   41    a cite on an `it` line rather than a `describe` ........ the minority form, still a cite
 *   42    the same id in the `@SCN-…` form ...................... Cucumber's marker, not a cite
 *   44-46 a quoted diff fixture holding a cite as DATA ........... the scanner off its own fixtures
 *   48-52 a brace-titled describe carrying NO cite .............. an open ancestor is not an excuse
 */
const CORPUS = [
  'import { describe, it, expect } from "vitest";', // 1
  "", // 2
  'const suite = "the tally";', // 3
  "", // 4
  'describe("[SCN-API-001] the tally", () => {', // 5
  '  it("counts", () => {', // 6
  "    expect(tally()).toBe(1);", // 7
  "  });", // 8
  "});", // 9
  "", // 10
  'describe("the doubling", () => {', // 11
  '  it("doubles the tally", () => {', // 12
  "    expect(doubled()).toBe(2);", // 13
  "  });", // 14
  "});", // 15
  "", // 16
  "describe(`[SCN-RMG-001] ${suite}`, () => {", // 17
  '  it("nests the run dir", () => {', // 18
  "    expect(planKeptRun(input).runDir).toBe(expected);", // 19
  "  });", // 20
  "});", // 21
  "", // 22
  'describe("[SCN-KPT-001] planKeptRun: the paths from { storeRoot, target, runId }", () => {', // 23
  '  it("names the run dir", () => {', // 24
  "    expect(planKeptRun(input).runDir).toBe(expected);", // 25
  "  });", // 26
  "});", // 27
  "", // 28
  'describe("mirrors what SCN-PDX-008 does, per @SCN-PDR-008", () => {', // 29
  '  it("only mentions", () => {', // 30
  "    expect(mentioned()).toBe(true);", // 31
  "  });", // 32
  "});", // 33
  "", // 34
  'describe("[SCN-BRK-001] unlike SCN-PDX-008, this one is genuinely bound", () => {', // 35
  '  it("is bound", () => {', // 36
  "    expect(bound()).toBe(true);", // 37
  "  });", // 38
  "});", // 39
  "", // 40
  'it("[SCN-LDG-002] posts the suspense item", () => {});', // 41
  'it("@SCN-LDG-003 balances the ledger", () => {});', // 42
  "", // 43
  "const diffFixture = [", // 44
  '  "+describe(\\"[SCN-FIX-001] a fixture, not a cite\\", () => {});",', // 45
  '].join("\\n");', // 46
  "", // 47
  "describe(`${suite} the doubling`, () => {", // 48
  '  it("doubles again", () => {', // 49
  "    expect(doubled()).toBe(2);", // 50
  "  });", // 51
  "});", // 52
].join("\n");

/**
 * THE PLANTED DIFF — the CHANGE-DETECTOR half, and the only thing that says which of the corpus's
 * blocks a pull request touched. Its hunk header starts at new-file line 11 with two context
 * lines, so the five added lines are 13-17 by arithmetic the reader has to do rather than read.
 *
 * ITS TWO SIDES DELIBERATELY DISAGREE (`-9` against `+11`). Every fixture this file replaced wrote
 * a hunk whose old and new start lines were the SAME number, so reading the wrong one of the two
 * captures returned the right answer and twenty-seven arms could not tell the reads apart.
 */
const DIFF = [
  "diff --git a/packages/pkg/src/tally.test.ts b/packages/pkg/src/tally.test.ts",
  "--- a/packages/pkg/src/tally.test.ts",
  "+++ b/packages/pkg/src/tally.test.ts",
  "@@ -9,3 +11,9 @@",
  " });",
  " ",
  '+describe("the doubling", () => {',
  '+  it("doubles the tally", () => {',
  "+    expect(doubled()).toBe(2);",
  "+  });",
  "+});",
].join("\n");

/** Everything a planted message could name, so a silent message reads as silent. */
const SUBJECTS = [
  "SCN-LDG-001",
  "SCN-LDG-002",
  "SCN-API-001",
  "the doubling > doubles the tally",
  "${suite} the doubling > doubles again",
  "mirrors what SCN-PDX-008 does, per @SCN-PDR-008 > only mentions",
];

/** One block, as its range, its leafness, its inherited cites and its ancestor chain. */
function summarise(block: TestBlock): string {
  return `${block.startLine}-${block.endLine} ${block.isLeaf ? "leaf" : "open"} [${block.citedCodes.join(
    ","
  )}] ${block.chain.join(" > ")}`;
}

/**
 * One decision, as the whole of what it returned: the verdict, the two lists, and — for every
 * finding — WHICH of the planted subjects its message actually names. A finding that stops naming
 * its subject stops being actionable, and that is not visible in a kind alone.
 */
function verdictOf(result: ScnGateResult): {
  verdict: string;
  ok: boolean;
  violations: string[];
  unexamined: string[];
} {
  const names = (message: string): string =>
    SUBJECTS.filter((subject) => message.includes(subject)).join(" + ") || "NAMES NOTHING";
  return {
    verdict: result.verdict,
    ok: result.ok,
    violations: result.violations.map((v) => `${v.kind} @${v.code || "—"} names: ${names(v.message)}`),
    unexamined: result.unexamined.map((u) => `@${u.code} names: ${names(u.message)}`),
  };
}

function input(overrides: Partial<ScnGateInput> = {}): ScnGateInput {
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

/** A behaviour-bearing added code, as the code sets carry it into every ending below. */
const added = { addedCodes: ["SCN-LDG-001"] };
/** The unit-equivalent surface, as the corpus's own uncited touched block names it. */
const uncited = {
  unitEquivalentBehaviourBearing: true,
  unitEquivalentCitedCodes: ["SCN-API-001"],
  uncitedChangedTestBlocks: ["the doubling > doubles the tally"],
};

describe("[SCN-SSM-007] the scn-subissue gate reads a corpus as it now stands — every block shape it has to parse, and every ending it can reach over what they yield", () => {
  it("[SCN-SSM-007] keeps a brace-titled describe open over the its beneath it, binds each cite to its own chain and no sibling's, counts the bracketed token alone, and then passes, reds, exempts or declines to answer according to what the pull request carries", () => {
    const changed = changedLinesByFile(DIFF).get("packages/pkg/src/tally.test.ts") ?? [];

    expect({
      // THE READER, over file state — no diff marker anywhere in the corpus.
      citesInSource: parseCitedCodesInSource(CORPUS),
      blocks: parseTestBlocks(CORPUS).map(summarise),

      // THE CHANGE-DETECTOR, over the diff — and only over the diff.
      changedLines: changed,

      // ATTRIBUTION, block by block, over the corpus the reader just parsed.
      touchedUncitedSibling: attributeChangedBlockCites(CORPUS, changed),
      touchedInheritingIt: attributeChangedBlockCites(CORPUS, [6, 7, 8]),
      touchedUnderTemplateLiteralTitle: attributeChangedBlockCites(CORPUS, [18, 19, 20]),
      touchedUnderQuotedBraceTitle: attributeChangedBlockCites(CORPUS, [24, 25, 26]),
      touchedUnderProseTitle: attributeChangedBlockCites(CORPUS, [30, 31, 32]),
      touchedUnderBracketedAmidProse: attributeChangedBlockCites(CORPUS, [36, 37, 38]),
      touchedUnderUncitedBraceTitle: attributeChangedBlockCites(CORPUS, [49, 50, 51]),

      // THE DECISION, over the codes that corpus yields — one run per ending it can reach.
      ticketed: verdictOf(decideScnGate(input({ ...added, hasTicketHandle: true }))),
      unticketed: verdictOf(decideScnGate(input({ ...added }))),
      forkExempt: verdictOf(decideScnGate(input({ ...added, isExternalPr: true }))),
      renumbered: verdictOf(
        decideScnGate(
          input({ ...added, renumberPairs: [{ removed: "SCN-LDG-000", added: "SCN-LDG-001" }] })
        )
      ),
      validlyExempted: verdictOf(
        decideScnGate(
          input({ ...added, exemptions: [{ code: "SCN-LDG-001", reason: "regression" }] })
        )
      ),
      malformedExemption: verdictOf(
        decideScnGate(
          input({ ...added, exemptions: [{ code: "SCN-LDG-001", reason: "because I said so" }] })
        )
      ),
      noBodyToRead: verdictOf(decideScnGate(input({ ...added, prBodyReadable: false }))),
      noBodyButHandled: verdictOf(
        decideScnGate(input({ ...added, hasTicketHandle: true, prBodyReadable: false }))
      ),
      noBodyButMalformed: verdictOf(
        decideScnGate(
          input({
            ...added,
            prBodyReadable: false,
            exemptions: [{ code: "SCN-LDG-001", reason: "because I said so" }],
          })
        )
      ),

      // A run that found something AND could not answer for something else. Only two codes on one
      // run put both lists on the table at once, and only then does their PRECEDENCE mean
      // anything — which is why no arrangement of one-ending-per-arm could state it.
      bothFoundAndUnanswerable: verdictOf(
        decideScnGate(
          input({
            addedCodes: ["SCN-LDG-001", "SCN-LDG-002"],
            prBodyReadable: false,
            exemptions: [{ code: "SCN-LDG-001", reason: "because I said so" }],
          })
        )
      ),

      // THE UNIT-EQUIVALENT SURFACE — the leak the gate exists to close, and its own three endings.
      uncitedBlockOnTicketedPr: verdictOf(
        decideScnGate(input({ ...uncited, hasTicketHandle: true }))
      ),
      uncitedBlockWithNoBody: verdictOf(decideScnGate(input({ ...uncited, prBodyReadable: false }))),
      unitEquivalentCitingNothing: verdictOf(
        decideScnGate(input({ unitEquivalentBehaviourBearing: true, hasTicketHandle: true }))
      ),
      unitEquivalentCitedButUnticketed: verdictOf(
        decideScnGate(
          input({ unitEquivalentBehaviourBearing: true, unitEquivalentCitedCodes: ["SCN-API-001"] })
        )
      ),
      unitEquivalentCitedWithNoBody: verdictOf(
        decideScnGate(
          input({
            unitEquivalentBehaviourBearing: true,
            unitEquivalentCitedCodes: ["SCN-API-001"],
            prBodyReadable: false,
          })
        )
      ),
      unitEquivalentExempted: verdictOf(
        decideScnGate(
          input({
            unitEquivalentBehaviourBearing: true,
            unitEquivalentCitedCodes: ["SCN-API-001"],
            exemptions: [{ code: "SCN-API-001", reason: "evidence-§8A" }],
          })
        )
      ),
    }).toEqual({
      // The @ form is Cucumber's marker, the bare id is prose, and the quoted fixture is data —
      // so of the nine scenario ids the corpus writes, five are citations.
      citesInSource: [
        "SCN-API-001",
        "SCN-RMG-001",
        "SCN-KPT-001",
        "SCN-BRK-001",
        "SCN-LDG-002",
      ],
      blocks: [
        "5-9 open [SCN-API-001] [SCN-API-001] the tally",
        "6-8 leaf [SCN-API-001] [SCN-API-001] the tally > counts",
        "11-15 open [] the doubling",
        "12-14 leaf [] the doubling > doubles the tally",
        // Closed on line 21, not on line 17: the `${` and `}` of the interpolation net out
        // before the arrow's `{` ever opens the body, and counting raw characters closes the
        // block on the very line it opened.
        "17-21 open [SCN-RMG-001] [SCN-RMG-001] ${suite}",
        "18-20 leaf [SCN-RMG-001] [SCN-RMG-001] ${suite} > nests the run dir",
        // The same fault without an interpolation — a plain-quoted title naming an object shape.
        "23-27 open [SCN-KPT-001] [SCN-KPT-001] planKeptRun: the paths from { storeRoot, target, runId }",
        "24-26 leaf [SCN-KPT-001] [SCN-KPT-001] planKeptRun: the paths from { storeRoot, target, runId } > names the run dir",
        "29-33 open [] mirrors what SCN-PDX-008 does, per @SCN-PDR-008",
        "30-32 leaf [] mirrors what SCN-PDX-008 does, per @SCN-PDR-008 > only mentions",
        "35-39 open [SCN-BRK-001] [SCN-BRK-001] unlike SCN-PDX-008, this one is genuinely bound",
        "36-38 leaf [SCN-BRK-001] [SCN-BRK-001] unlike SCN-PDX-008, this one is genuinely bound > is bound",
        "41-41 leaf [SCN-LDG-002] [SCN-LDG-002] posts the suspense item",
        "42-42 leaf [] @SCN-LDG-003 balances the ledger",
        // Open, but carrying no cite of its own: finding the ancestor is not excusing it.
        "48-52 open [] ${suite} the doubling",
        "49-51 leaf [] ${suite} the doubling > doubles again",
      ],
      changedLines: [13, 14, 15, 16, 17],

      // Lines 13-17 touch the uncited sibling's body AND the interpolated describe's opening line;
      // the sibling's cite does not travel, and the cited neighbour above is not touched at all.
      touchedUncitedSibling: {
        citedCodes: [],
        uncitedBlocks: ["the doubling > doubles the tally"],
      },
      touchedInheritingIt: { citedCodes: ["SCN-API-001"], uncitedBlocks: [] },
      touchedUnderTemplateLiteralTitle: { citedCodes: ["SCN-RMG-001"], uncitedBlocks: [] },
      touchedUnderQuotedBraceTitle: { citedCodes: ["SCN-KPT-001"], uncitedBlocks: [] },
      touchedUnderProseTitle: {
        citedCodes: [],
        uncitedBlocks: ["mirrors what SCN-PDX-008 does, per @SCN-PDR-008 > only mentions"],
      },
      touchedUnderBracketedAmidProse: { citedCodes: ["SCN-BRK-001"], uncitedBlocks: [] },
      touchedUnderUncitedBraceTitle: {
        citedCodes: [],
        uncitedBlocks: ["${suite} the doubling > doubles again"],
      },

      ticketed: { verdict: "pass", ok: true, violations: [], unexamined: [] },
      unticketed: {
        verdict: "fail",
        ok: false,
        violations: ["missing-ticket-handle @SCN-LDG-001 names: SCN-LDG-001"],
        unexamined: [],
      },
      forkExempt: { verdict: "pass", ok: true, violations: [], unexamined: [] },
      renumbered: { verdict: "pass", ok: true, violations: [], unexamined: [] },
      validlyExempted: { verdict: "pass", ok: true, violations: [], unexamined: [] },
      malformedExemption: {
        verdict: "fail",
        ok: false,
        violations: ["malformed-exemption @SCN-LDG-001 names: SCN-LDG-001"],
        unexamined: [],
      },
      // Neither answer on offer is true of this run, so neither is given.
      noBodyToRead: {
        verdict: "not-examined",
        ok: false,
        violations: [],
        unexamined: ["@SCN-LDG-001 names: SCN-LDG-001"],
      },
      // The handle answers first, ahead of every exemption trailer, so the unreadable body is
      // never reached — which is why the third answer is a residual case and not the local norm.
      noBodyButHandled: { verdict: "pass", ok: true, violations: [], unexamined: [] },
      // A trailer that WAS read is a finding; reporting it unexamined would hide one behind an absence.
      noBodyButMalformed: {
        verdict: "fail",
        ok: false,
        violations: ["malformed-exemption @SCN-LDG-001 names: SCN-LDG-001"],
        unexamined: [],
      },

      // A finding outranks an unanswered question: the run has still found something, so it reds
      // — and the code it could not answer for is still reported rather than swallowed.
      bothFoundAndUnanswerable: {
        verdict: "fail",
        ok: false,
        violations: ["malformed-exemption @SCN-LDG-001 names: SCN-LDG-001"],
        unexamined: ["@SCN-LDG-002 names: SCN-LDG-002"],
      },

      // The handle proves a live work-unit, not WHICH scenario — so it does not rescue an
      // uncited block, and the violation names the block rather than a code.
      uncitedBlockOnTicketedPr: {
        verdict: "fail",
        ok: false,
        violations: [
          "uncited-unit-equivalent @— names: the doubling > doubles the tally",
        ],
        unexamined: [],
      },
      // A fact about the checked-out tree, read in full whatever the environment carries.
      uncitedBlockWithNoBody: {
        verdict: "fail",
        ok: false,
        violations: [
          "uncited-unit-equivalent @— names: the doubling > doubles the tally",
        ],
        unexamined: [],
      },
      unitEquivalentCitingNothing: {
        verdict: "fail",
        ok: false,
        violations: ["uncited-unit-equivalent @— names: NAMES NOTHING"],
        unexamined: [],
      },
      unitEquivalentCitedButUnticketed: {
        verdict: "fail",
        ok: false,
        violations: ["missing-ticket-handle @SCN-API-001 names: SCN-API-001"],
        unexamined: [],
      },
      unitEquivalentCitedWithNoBody: {
        verdict: "not-examined",
        ok: false,
        violations: [],
        unexamined: ["@SCN-API-001 names: SCN-API-001"],
      },
      unitEquivalentExempted: { verdict: "pass", ok: true, violations: [], unexamined: [] },
    });
  });
});
