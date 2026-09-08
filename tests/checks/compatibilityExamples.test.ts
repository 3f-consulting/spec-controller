/**
 * The @unit arm of @SCN-CMP-001 — the commitment page held to the reader it claims support from
 * (3F-3175).
 *
 * ONE ARM, ONE PLANTED PAGE, ONE ASSERTION (3F-3233, under 3F-3218). Seventeen arms each pinned one
 * boundary of this module in isolation, and between them they left the VERDICT'S SHAPE unasserted:
 * a check that detected all five violation kinds correctly but interleaved the two questions, or
 * reported a sixth finding nobody asked for, or emitted them in a different order, satisfied every
 * one of the seventeen. The page below carries an instance of every violation kind this module
 * detects AND an instance of every boundary it must stay silent at, and one expect over the whole
 * returned verdict pins detection, silence, ordering and completeness together.
 *
 * THE TWO QUESTIONS ARE GROUPED, NOT INTERLEAVED, and the planted page is built to prove it. The
 * shape findings come first in block order and the citation findings after in line order, so the
 * unparseable block at the bottom of the page reports its parse failure BEFORE the citation on the
 * line above it. That ordering is the module's stated contract and it is what a single list-valued
 * assertion can hold and seventeen scalar ones could not.
 *
 * AND A BLOCK THE SHAPE HALF CANNOT READ IS STILL SCANNED FOR CITATIONS. The last block on the page
 * carries a same-line comment, so its configuration is unreadable and short-circuits to one parse
 * finding — and the stale code inside it is still reported, because the citation question is asked
 * of the page's text rather than of its parsed blocks.
 *
 * THE MODULE IS IMPORTED THROUGH A NAMESPACE, DELIBERATELY — the convention `fitnessAxisBar.test.ts`
 * states. A named import of a missing export is an ESM link error that takes this whole file down
 * before an assertion runs, and with one arm left that costs @SCN-CMP-001 its only observation and
 * reds the ledger as `missing` rather than as a sentence. Through the namespace a missing export is
 * a failing assertion naming the export.
 *
 * EVERY FIXTURE HERE IS A PLANTED PAGE, never `doc/compatibility.md` itself. The real page is what
 * the fitness scenario runs against; asserting against it here would make this arm re-red every time
 * the page legitimately changed, and would prove the check works only on the one input it already
 * had.
 *
 * WHY NO REAL-TREE ARM IS KEPT, AND IT IS MEASURED RATHER THAN ASSUMED (Ruling B, 3F-3218).
 * `pnpm doc:compatibility-examples` — the command of the `SCN-FIT-015` row, run by `cucumber:fitness`
 * on every `pnpm verify` and every CI push — runs this module over the real `doc/compatibility.md`,
 * and that was proved to REACH this code rather than merely to be named for it, from three ends.
 * With the resolution filter inverted the row exits 1 naming TEN entries under four real blocks; with
 * the corpus guard inverted it exits 1 naming the one allocated code the real page cites; with the
 * page itself moved aside it exits 1 refusing to call an unread subject clean. The OPPOSITE plant —
 * this module's exported check neutered to report nothing, which reads as the obvious prescription —
 * leaves the row GREEN and byte-identical to the control, because a check that has stopped looking
 * finds nothing and a healthy page also finds nothing. Only the direction that makes the check report
 * a violation that is not there discriminates.
 *
 * @SCN-CMP-001 — bidirectional evidence marker. Grepping it returns the scenario in
 * `features/compatibility-commitment.feature` and this file.
 *
 * Parent: 3F-3154.
 */

import { describe, expect, it } from "vitest";

import * as compatibilityModule from "./compatibilityExamples.js";

/**
 * A module export, asserted PRESENT with a sentence rather than named-imported, for the reason the
 * header gives. The cast is deliberate: the file must still type-check when the export is gone, so
 * the absence surfaces as a red assertion cited to @SCN-CMP-001 rather than as a link error.
 */
function exported<Name extends keyof typeof compatibilityModule>(
  name: Name
): (typeof compatibilityModule)[Name] {
  const candidate = (compatibilityModule as Partial<typeof compatibilityModule>)[name];
  expect(
    candidate,
    `@SCN-CMP-001 needs \`${name}\` exported from the compatibility-examples check`
  ).toBeTypeOf("function");
  return candidate as (typeof compatibilityModule)[Name];
}

/**
 * ONE PAGE CARRYING EVERY VIOLATION AND EVERY SILENCE, with its line numbers load-bearing.
 *
 * Written as a line array rather than a template literal because a finding IS a line number: the
 * whole content of this module's answer is *where on the page*, and an array is the only form in
 * which the expected numbers below can be counted rather than trusted.
 */
const PAGE = [
  /*  1 */ "# A commitment page, with everything that can be wrong with one",
  /*  2 */ "",
  /*  3 */ "It cites SCN-CPX-006, which this corpus still holds, and SCN-CHK-004, which is the reader's own.",
  /*  4 */ "",
  // A CONFIGURATION UNDER A ```json FENCE. The tempting rule reads the fence language; this block is
  // here because that rule would silently stop checking the first block somebody wrote as json.
  /*  5 */ "```json",
  /*  6 */ '"specController": { "staticChecks": ["typecheck"] }',
  /*  7 */ "```",
  /*  8 */ "",
  // NOT A CONFIGURATION AT ALL — the `--measurements` document shape, out of scope by not naming the
  // key rather than by a rule about its fence. It must not appear among the blocks found, AND its
  // stale code must still be reported: the shape question is asked of the blocks and the citation
  // question of the page, so the one block this file otherwise ignores is still held to its codes.
  /*  9 */ "```json",
  /* 10 */ '{ "measurements": [ { "scnId": "SCN-CIP-001", "checkTag": "ci-run-time", "measured": 42.1 } ] }',
  /* 11 */ "```",
  /* 12 */ "",
  // THE POSITIVE CONTROL FOR THE SHAPE HALF: every documented key, both checkRegistry spellings, a
  // bar naming a mutation gate no record here can source, a fitness row in each bar direction, a
  // whole-line comment and a trailing comma. Nothing may be reported against it — without this block
  // "five findings" is also what a check that reported every entry it saw would say.
  /* 13 */ "```jsonc",
  /* 14 */ '"specController": {',
  /* 15 */ "  // a whole-line comment, which this narrow jsonc reading honours",
  /* 16 */ '  "checkRegistry": {',
  /* 17 */ '    "lint:complexity-exceptions": { "check": "complexity", "scn": "SCN-CPX-006" },',
  /* 18 */ '    "typecheck": "typecheck"',
  /* 19 */ "  },",
  /* 20 */ '  "thresholds": { "SCN-MUT-011": { "mutation": { "atLeast": { "mutationGate": "domain" } } } },',
  /* 21 */ '  "fitnessChecks": [',
  /* 22 */ '    { "scn": "SCN-FIT-012", "characteristic": "ci-run-time", "command": "x", "atMost": 75 },',
  /* 23 */ '    { "scn": "SCN-FIT-002", "characteristic": "mutation", "command": "y", "atLeast": { "mutationGate": "domain" } }',
  /* 24 */ "  ],",
  /* 25 */ "}",
  /* 26 */ "```",
  /* 27 */ "",
  // THE FOUR ENTRY-LEVEL VIOLATIONS, in one block so their ORDER is asserted: a key whose value the
  // reader drops, an array entry that is not a string, a fitness row whose own key is unreadable, and
  // a documented key this check knows no reader for. The two `cannot address` forms are both here on
  // purpose — they are the hole a filtered authored list left, and they arrive by different routes.
  /* 28 */ "```jsonc",
  /* 29 */ '"specController": {',
  /* 30 */ '  "checkRegistry": { "kept": "complexity", "dropped": 42 },',
  /* 31 */ '  "staticChecks": ["typecheck", 42],',
  /* 32 */ '  "fitnessChecks": [ { "scn": 21, "characteristic": "vocab", "command": "x" } ],',
  /* 33 */ '  "somethingNew": { "a": 1 }',
  /* 34 */ "}",
  /* 35 */ "```",
  /* 36 */ "",
  // UNREADABLE, AND STILL SCANNED. The same-line comment short-circuits this block to one parse
  // finding against the fence's own line — and the stale code inside it is reported anyway, one line
  // further down, because citations are asked of the page's text and not of its parsed blocks.
  /* 37 */ "```jsonc",
  /* 38 */ '"specController": { "thresholds": { "SCN-CIP-013": { "ci-run-time": 75 } } } // trailing',
  /* 39 */ "```",
  /* 40 */ "",
  /* 41 */ "The measurement example cites SCN-MUT-042, which this repository deleted.",
  /* 42 */ "",
  /* 43 */ "SCN-CIP-013 is named a second time here, and the report names it once.",
].join("\n");

/** This repository as the check sees it, holding exactly the codes the page's silences depend on. */
const CORPUS = {
  featureCodes: new Set(["CPX", "CIP", "MUT", "FIT"]),
  scenarioCodes: new Set(["SCN-CPX-006", "SCN-MUT-011", "SCN-FIT-012", "SCN-FIT-002"]),
};

/** The same repository, having never lost the two codes the page is reported for. */
const CORPUS_HOLDING_EVERYTHING = {
  featureCodes: CORPUS.featureCodes,
  scenarioCodes: new Set([
    ...CORPUS.scenarioCodes,
    "SCN-CIP-001",
    "SCN-CIP-013",
    "SCN-MUT-042",
  ]),
};

/** A capture that is expected to be there, kept visibly distinct from one that is not. */
function at(found: RegExpExecArray, group: number): string {
  return found[group] ?? "?";
}

/**
 * THE FIVE SENTENCES THIS MODULE CAN SAY, and how each reads back — a table rather than a branch,
 * the shape the module's own DOCUMENTED_KEYS takes and for the same reason: a sixth kind is a row
 * here, never a sixth arm of logic.
 *
 * EACH PATTERN QUOTES THE MESSAGE'S OWN WORDS, not a loose keyword, so a message reworded into
 * something else falls off the end rather than landing in whichever bucket its remaining words
 * happened to match.
 */
const KINDS: readonly (readonly [RegExp, (found: RegExpExecArray) => string])[] = [
  [/block does not parse/, () => "block does not parse"],
  [
    /specController\.([A-Za-z]+) writes an entry the reader cannot address/,
    (found) => `${at(found, 1)} — cannot address`,
  ],
  [
    /documents specController\.([A-Za-z]+) and this check knows no reader/,
    (found) => `${at(found, 1)} — knows no reader`,
  ],
  [
    /specController\.([A-Za-z]+) documents "([^"]+)" and the reader does not accept/,
    (found) => `${at(found, 1)} — does not accept "${at(found, 2)}"`,
  ],
  [
    /this page names (SCN-[A-Z0-9]+-\d+)/,
    (found) => `${at(found, 1)} is in no feature file`,
  ],
];

/**
 * What a finding SAID, reduced to the line, the key it is about and the kind it is — and never to a
 * shrug.
 *
 * AN UNRECOGNISED MESSAGE KEEPS ITS OWN VALUE rather than falling into any of the five buckets.
 * Classifying leniently here would derive the expected side from the same reading the actual side
 * passes through, and the two would agree about a sentence neither of them could read.
 */
function reading({ line, message }: compatibilityModule.Finding): string {
  for (const [pattern, say] of KINDS) {
    const found = pattern.exec(message);
    if (found !== null) return `${line}: ${say(found)}`;
  }
  return `${line}: UNCLASSIFIED — ${message}`;
}

// @SCN-CMP-001
describe("[SCN-CMP-001] the commitment page's own examples are held to the reader it claims support from", () => {
  it("[SCN-CMP-001] reports every entry a documented block writes that its reader drops, cannot address or knows no reader for, every block its narrow jsonc reading cannot parse, and every scenario of ours the page names that features/ no longer carries — grouped shape-then-citation, deduplicated, silent at both fences, at the --measurements shape, at a foreign feature code and at every entry the reader still accepts", () => {
    const findingsFor = exported("compatibilityFindings");

    const verdict = {
      // THE FENCE RULE AND THE KEY RULE, read off the blocks the check found: the json configuration
      // is in, the json non-configuration is out, and both jsonc blocks are in.
      blocksFound: exported("manifestBlocksOf")(PAGE).map((block) => block.line),
      // THE NARROW READING, asserted directly rather than inferred from a silence — a comment on its
      // own line and a trailing comma are the only two things honoured, and both are honoured here.
      narrowJsoncReading: exported("configOf")(
        ['"specController": {', "  // dropped", '  "staticChecks": ["a"],', "}"].join("\n")
      ),
      // THE SCAN, over the four positions a code can sit in — a thresholds key, a `scn` field, with a
      // sigil and without — and deduplicated in the order the text names them.
      codesCited: exported("citedCodes")(
        '"thresholds": { "SCN-CIP-013": { } }, "scn": "@SCN-CPX-006", again SCN-CIP-013'
      ),
      // THE WHOLE VERDICT: five shape findings in block order, then three citation findings in line
      // order. The parse failure at 37 landing before the citation at 10 is the grouping — a page
      // order the two questions deliberately do not share; the second naming of SCN-CIP-013 at 43
      // being absent is the deduplication.
      overTheStalePage: findingsFor(PAGE, CORPUS).map(reading),
      // THE SAME PAGE, THE SAME SHAPE, A CORPUS THAT NEVER LOST THE CODES. The citation findings must
      // go and the shape findings must stay — which is what says the two questions are independent
      // and that the citations were caused by the corpus rather than by the page.
      onceTheCorpusCarriesThem: findingsFor(PAGE, CORPUS_HOLDING_EVERYTHING).map(reading),
      // THE POSITIVE CONTROL FOR SILENCE: the page's own clean block, alone, against the same corpus.
      // Without it, every list above is equally consistent with a check that reports its input back.
      overAPageWithNothingWrong: findingsFor(PAGE.split("\n").slice(12, 26).join("\n"), CORPUS),
    };

    expect(verdict).toEqual({
      blocksFound: [5, 13, 28, 37],
      narrowJsoncReading: { specController: { staticChecks: ["a"] } },
      codesCited: ["SCN-CIP-013", "SCN-CPX-006"],
      overTheStalePage: [
        '28: checkRegistry — does not accept "dropped"',
        "28: staticChecks — cannot address",
        "28: fitnessChecks — cannot address",
        "28: somethingNew — knows no reader",
        "37: block does not parse",
        "10: SCN-CIP-001 is in no feature file",
        "38: SCN-CIP-013 is in no feature file",
        "41: SCN-MUT-042 is in no feature file",
      ],
      onceTheCorpusCarriesThem: [
        '28: checkRegistry — does not accept "dropped"',
        "28: staticChecks — cannot address",
        "28: fitnessChecks — cannot address",
        "28: somethingNew — knows no reader",
        "37: block does not parse",
      ],
      overAPageWithNothingWrong: [],
    });
  });
});
