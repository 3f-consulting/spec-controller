/**
 * The @unit arm of @SCN-SLF-005 — the banked figure held against the axis (3F-3193).
 *
 * ONE ARM, ONE PLANTED CORPUS, ONE ASSERTION (3F-3232, under 3F-3218). This module detects one kind
 * of violation — a manifest holding fewer rows than the record banks — and everything else it states
 * is a boundary of that one rule. Ten arms each asserting one boundary left the RULE'S SHAPE
 * unasserted: a comparison that answered correctly at every sampled point but reversed somewhere
 * between them satisfied all ten. The planted corpus below carries an instance of every reading this
 * module can return — a fall at zero, a fall by one, a fall by many, the two counts that are NOT
 * falls, both forms of never-banked, and the whole reader run over planted trees — and one expect
 * over the whole verdict pins them together.
 *
 * WHERE @SCN-SLF-006's ARMS WENT, SAID PLAINLY RATHER THAN ELIDED (3F-3232). That scenario keeps its
 * @integration tier and loses only its @unit one, and its distinctive assertion does not go with the
 * tier: its step arm in `tests/steps/fitnessAxisBar.steps.ts` already reads `bankedFitnessRowsIn`
 * off a planted record's real bytes and asserts null, and runs the REAL gate over three planted
 * trees rather than over one sample. What this file keeps of that rule is the two silences and their
 * positive control, because this module's own silence is a boundary of its one violation.
 *
 * THE MODULE IS IMPORTED THROUGH A NAMESPACE, DELIBERATELY — the convention
 * `complexityThreshold.test.ts` states. A named import of a missing export is an ESM link error that
 * takes this whole file down before an assertion runs, and with one arm left that costs
 * @SCN-SLF-005 its only observation and reds the ledger as `missing` rather than as a sentence.
 * Through the namespace a missing export is a failing assertion naming the export.
 *
 * WHAT THIS TIER IS NOT FOR, AND IT IS MEASURED RATHER THAN ASSUMED (Ruling B, 3F-3218). Whether
 * THIS repository's manifest is held to ITS banked figure on a normal build is not asserted here and
 * need not be: `pnpm balance:self` — gate 5 of the derived local ladder, and its own `ci.yml` step —
 * calls `fitnessAxisRefusalAt(".")` before it opens the books and exits 1 on the verdict. That was
 * proved to REACH this module rather than merely to be named for it, from both ends: with the
 * record's figure moved 13 → 14 the gate exits 1 naming `banked 14, found 13`, and with one row
 * dropped from the real manifest it exits 1 naming `banked 13, found 12`. The OPPOSITE plant — this
 * module neutered to report nothing, which is the prescription that reads as the obvious one —
 * leaves the gate GREEN and identical to the control but for its timestamp, because a check that has
 * stopped looking finds nothing and a healthy tree also finds nothing. Only the direction that makes
 * the check report a violation that is not there discriminates.
 *
 * @SCN-SLF-005 — bidirectional evidence marker. Grepping it returns the scenario in
 * `features/self-reconciliation.feature`, this file, and the step block that runs the real gate.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import * as axisBarModule from "./fitnessAxisBar.js";
import { bankedFitnessRowsIn, FITNESS_AXIS, ROWS } from "./fitnessRowBank.js";

/** The name a refusal is told to quote, so a reader is sent to a file rather than to a concept. */
const RECORD_FILE = "quality-thresholds.yml";

/** The `rows:` a LATER section states — a bar nobody wrote, and somewhere wrong for a reader to land. */
const DECOY_ROWS = 999;

/**
 * A module export, asserted PRESENT with a sentence rather than named-imported, for the reason the
 * header gives. The cast is deliberate: the file must still type-check when the export is gone, so
 * the absence surfaces as a red assertion cited to @SCN-SLF-005 rather than as a link error.
 */
function exported<Name extends keyof typeof axisBarModule>(name: Name): (typeof axisBarModule)[Name] {
  const candidate = (axisBarModule as Partial<typeof axisBarModule>)[name];
  expect(candidate, `@SCN-SLF-005 needs \`${name}\` exported from the fitness-axis bar`).toBeTypeOf(
    "function",
  );
  return candidate as (typeof axisBarModule)[Name];
}

/**
 * The record's shape, spelled once, with whatever the axis's block is — or is not.
 *
 * THE SECTION AND FIELD NAMES ARE THE BANK'S OWN CONSTANTS, never retyped. Two spellings that agree
 * until one is edited is the arrangement this repository refuses everywhere, and it is exactly what
 * a second copy of `fitness-axis` in a test would be.
 */
function recordWhoseAxisBlockIs(block: readonly string[]): string {
  return [
    "# spec-controller's own quality bars — the counts its gates last banked.",
    "",
    "mutation-gates:",
    "  domain:",
    "    detected: 694",
    "    total: 697",
    "",
    "# IT READS UPWARD AND IT IS BANKED, NEVER TYPED.",
    ...block,
    "",
    "other-section:",
    `  ${ROWS}: ${DECOY_ROWS}`,
    "",
  ].join("\n");
}

/** A record whose fitness block sits between two others, one of which states a `rows:` of its own. */
const recordBanking = (rows: number): string =>
  recordWhoseAxisBlockIs([`${FITNESS_AXIS}:`, `  ${ROWS}: ${rows}`]);

/** The same record with no block for the axis — a repository that has never banked this one. */
const recordBankingNothing = (): string => recordWhoseAxisBlockIs([]);

/** A tree whose manifest holds exactly `rows` acted-on fitness rows, banking `banked` if it banks. */
function treeHolding(rows: number, banked?: number): string {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-slf005-"));
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "planted",
      specController: {
        fitnessChecks: Array.from({ length: rows }, (_unused, at) => ({
          scn: `SCN-PLT-${String(at + 1).padStart(3, "0")}`,
          characteristic: "traceability",
          command: "pnpm lint:planted",
        })),
      },
    }) + "\n",
    "utf8",
  );
  if (banked !== undefined) {
    writeFileSync(path.join(root, RECORD_FILE), recordBanking(banked), "utf8");
  }
  return root;
}

/**
 * What a refusal SAID, reduced to the pair it owes — and never to null.
 *
 * A SENTENCE WITH NO PAIR IN IT KEEPS ITS OWN VALUE. Collapsing it into the same null a silence
 * returns would make this reduction blind to exactly the regression it is here to catch: a refusal
 * that fired and then failed to name its two numbers would read as a check that stayed quiet.
 */
function reading(said: string | null): "silent" | "spoke without both numbers" | readonly string[] {
  if (said === null) return "silent";
  const pair = /banked (\d+), found (\d+)/.exec(said);
  return pair === null ? "spoke without both numbers" : pair.slice(1);
}

// @SCN-SLF-005
describe("[SCN-SLF-005] a fitness axis smaller than the figure the record banks is a fall", () => {
  it("[SCN-SLF-005] reports every shortfall against the figure banked under the axis's OWN block and nothing else, stays silent at an equal or grown count and over a repository that banked no figure at all, and names both numbers and the record in the sentence a fall is refused with", () => {
    const fallIn = exported("fitnessAxisFallIn");
    const refusalAt = exported("fitnessAxisRefusalAt");
    const said = exported("fitnessAxisRefusal")({ banked: 16, found: 0 }, RECORD_FILE);

    const verdict = {
      // THE VIOLATION, AT THREE DISTANCES. The plant this module exists for empties the axis whole,
      // but a single row deleted is the same fault arriving one at a time, and a comparison that
      // only noticed zero would be a check on the typo rather than on the axis.
      fallAtZero: fallIn(recordBanking(16), 0),
      fallByOne: fallIn(recordBanking(16), 15),
      fallByMany: fallIn(recordBanking(16), 3),
      // NOT VIOLATIONS, AND THE ASYMMETRY WITH THE BANK. `bankFitnessRows` refuses an equal count,
      // because writing the same numeral back is a no-op wearing a banking's clothes; here equal is
      // the healthy state of every green build, and a shared `<=` would red the tree on every push.
      intact: fallIn(recordBanking(16), 16),
      grown: fallIn(recordBanking(16), 17),
      // THE COUNT THAT SEPARATES THE TWO READERS, and the only one that can: 20 is above the 16 the
      // axis banks and below the 999 a later section states, so a reader that had landed on the
      // decoy reports a fall here where the right answer is silence. `fallByMany` above is the same
      // separation from the other side — it would come back banked 999.
      pastTheDecoy: fallIn(recordBanking(16), 20),
      // BOTH ORDINARY FORMS OF NEVER BANKED — no block for the axis, and no record file at all,
      // which is where every consumer that has converted nothing arrives first.
      neverBankedBlock: fallIn(recordBankingNothing(), 0),
      neverBankedFile: fallIn(null, 0),
      // THE POSITIVE CONTROL FOR BOTH SILENCES: same count, one bar. Without it, "no fall" is also
      // what a comparison that had stopped looking would say.
      bankedOne: fallIn(recordBanking(1), 0),
      // WHERE ABSENT AND ZERO PART COMPANY, and the only place they can: a bar of zero is cleared by
      // every count, so the two silences above agree with the defaulting and with the cure alike.
      readOfARecordBankingNothing: bankedFitnessRowsIn(recordBankingNothing(), RECORD_FILE),
      // THE SENTENCE, WHICH IS THE WHOLE CONTENT OF A REFUSAL. "the fitness axis has shrunk" would
      // send a reader off to find the two figures the sentence was the right place to state.
      refusalReads: reading(said),
      refusalCitesTheRecord: said.includes(RECORD_FILE),
      // THE WHOLE READER OVER REAL TREES rather than over strings — the one that decides whether a
      // missing file is an absent bar or an error, and reads the count off the MANIFEST and never
      // off the corpus, which is the other authored side rather than this bar's subject. The trees
      // below carry no corpus at all, so a reader that wanted one would have nothing to answer from.
      overFallenTree: reading(refusalAt(treeHolding(3, 16), RECORD_FILE)),
      overIntactTree: reading(refusalAt(treeHolding(3, 3), RECORD_FILE)),
      overTreeFilingNoRecord: reading(refusalAt(treeHolding(0), RECORD_FILE)),
      overEmptiedTreeThatBanked: reading(refusalAt(treeHolding(0, 1), RECORD_FILE)),
    };

    expect(verdict).toEqual({
      fallAtZero: { banked: 16, found: 0 },
      fallByOne: { banked: 16, found: 15 },
      fallByMany: { banked: 16, found: 3 },
      intact: null,
      grown: null,
      pastTheDecoy: null,
      neverBankedBlock: null,
      neverBankedFile: null,
      bankedOne: { banked: 1, found: 0 },
      readOfARecordBankingNothing: null,
      refusalReads: ["16", "0"],
      refusalCitesTheRecord: true,
      overFallenTree: ["16", "3"],
      overIntactTree: "silent",
      overTreeFilingNoRecord: "silent",
      overEmptiedTreeThatBanked: ["1", "0"],
    });
  });
});
