/**
 * The @unit arms of @SCN-SLF-005 — the comparison itself (3F-3193) — and of @SCN-SLF-006, the
 * reading a repository that has never banked gets (3F-3194).
 *
 * WHAT THESE ARMS OWN AND WHAT THEY DO NOT. The rule: a manifest holding fewer rows than the record
 * banks is a fall, an equal count is not, a larger one is not, and the sentence a fall is reported
 * in carries BOTH numbers. Whether the self-reconciliation gate actually RUNS this and exits on it
 * is the @integration arm's, in `tests/steps/fitnessAxisBar.steps.ts`, because a projection over
 * strings cannot tell a wired gate from an unwired one.
 *
 * AND ONE FACT ABOUT ABSENCE THAT ONLY THIS TIER CAN HOLD (@SCN-SLF-006). A bar of zero is cleared
 * by every count on earth, so a record read leniently as banking zero is silent over exactly the
 * repositories that never banked — the defaulting and the cure are indistinguishable from outside
 * the gate, at every count, forever. The distinction lives at the reader's own boundary, where the
 * answer is either a figure or none, so that is where it is asserted. The gate arm below it can
 * only say the silence happened; it cannot say why.
 *
 * THE RECORD TEXTS HERE ARE THE SHAPE THE REAL FILE IS IN — a fitness block among others, and the
 * count nested under it. A reader that found `rows:` anywhere in the file would agree with this
 * repository's own record today and answer some other section's field the first time one is added.
 *
 * @SCN-SLF-005 / @SCN-SLF-006 — bidirectional evidence markers. Grepping either returns the
 * scenario in `features/self-reconciliation.feature`, this file, and the step block that runs the
 * real gate.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { fitnessAxisFallIn, fitnessAxisRefusal, fitnessAxisRefusalAt } from "./fitnessAxisBar.js";
import { bankedFitnessRowsIn, FITNESS_AXIS, ROWS } from "./fitnessRowBank.js";

/** The name a refusal is told to quote, so a reader is sent to a file rather than to a concept. */
const RECORD_FILE = "quality-thresholds.yml";

/**
 * A record whose fitness block sits between two others, one of which states a `rows:` of its own —
 * so a reader that searched the whole file has somewhere wrong to land.
 *
 * THE SECTION AND FIELD NAMES ARE THE BANK'S OWN CONSTANTS, never retyped. Two spellings that agree
 * until one is edited is the arrangement this repository refuses everywhere, and it is exactly what
 * a second copy of `fitness-axis` in a test would be.
 */
function recordBanking(rows: number): string {
  return recordWhoseAxisBlockIs([`${FITNESS_AXIS}:`, `  ${ROWS}: ${rows}`]);
}

/**
 * The same record with no block for the axis at all — a repository that banks its other bars and
 * has never banked this one (@SCN-SLF-006).
 *
 * IT STILL STATES A `rows:` UNDER A LATER SECTION, which is the whole reason this fixture is worth
 * writing: a reader that answered 999 here, or 0, would be enforcing a bar nobody wrote.
 */
function recordBankingNothing(): string {
  return recordWhoseAxisBlockIs([]);
}

/** The record's shape, spelled once, with whatever the axis's block is — or is not. */
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
    `  ${ROWS}: 999`,
    "",
  ].join("\n");
}

/** A tree whose manifest holds exactly `rows` acted-on fitness rows. */
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

// @SCN-SLF-005
describe("[SCN-SLF-005] a fitness axis smaller than the figure the record banks is a fall", () => {
  it("reports the fall when the manifest holds fewer rows than the record banks", () => {
    expect(fitnessAxisFallIn(recordBanking(16), 0)).toEqual({ banked: 16, found: 0 });
    // ONE ROW SHORT IS A FALL TOO. The plant this exists for empties the axis whole, but a single
    // row deleted is the same fault arriving one at a time, and a comparison that only noticed zero
    // would be a check on the typo rather than on the axis.
    expect(fitnessAxisFallIn(recordBanking(16), 15)).toEqual({ banked: 16, found: 15 });
  });

  it("reports no fall where the axis is intact, and none where it has grown", () => {
    // EQUAL IS THE HEALTHY STATE, and it is the asymmetry with the BANK, which refuses an equal
    // count because writing the same numeral back is a no-op wearing a banking's clothes. The two
    // rules are about different acts and a shared `<=` here would red every green build.
    expect(fitnessAxisFallIn(recordBanking(16), 16)).toBeNull();
    expect(fitnessAxisFallIn(recordBanking(16), 17)).toBeNull();
  });

  it("finds the count under the axis's own section rather than wherever a `rows:` line sits", () => {
    // The record above states `rows: 999` under a later section. A reader that took the first or
    // the last `rows:` in the file would answer 999 and green a run that had lost every row it had.
    expect(fitnessAxisFallIn(recordBanking(16), 20)).toBeNull();
    expect(fitnessAxisFallIn(recordBanking(16), 3)).toEqual({ banked: 16, found: 3 });
  });

  it("names BOTH numbers in the sentence, and the file that banks one of them", () => {
    // "the fitness axis has shrunk" would send a reader off to find the two figures the sentence
    // was the right place to state. The pair is the whole content of the refusal.
    const said = fitnessAxisRefusal({ banked: 16, found: 0 }, RECORD_FILE);

    expect(said).toContain("banked 16, found 0");
    expect(said).toContain(RECORD_FILE);
  });

  it("reads the found count off the MANIFEST, through the reading that raises the obligations", () => {
    // NEVER OFF THE GENERATED CORPUS, which is derived from these same rows: a count taken from it
    // and held to this figure would be a derivation checked against itself. The tree below carries
    // no corpus at all, so a reader that wanted one would have nothing to answer from.
    const fallen = fitnessAxisRefusalAt(treeHolding(3, 16), RECORD_FILE);

    expect(fallen).not.toBeNull();
    expect(fallen).toContain("banked 16, found 3");
  });

  it("says nothing where the manifest still holds every row its record banks", () => {
    expect(fitnessAxisRefusalAt(treeHolding(3, 3), RECORD_FILE)).toBeNull();
  });
});

// @SCN-SLF-006
describe("[SCN-SLF-006] a repository that banked no fitness figure is held to no bar at all", () => {
  it("reads a record filing no block for the axis as banking NONE, and pointedly not as banking zero", () => {
    const read = bankedFitnessRowsIn(recordBankingNothing(), RECORD_FILE);

    // THIS ASSERTION IS THE WHOLE SUB-ISSUE, AND NO ARM BELOW IT CAN STAND IN. Zero is a bar every
    // count on earth clears, so a defaulted reading is silent over precisely the repositories this
    // scenario watches — the gate arm would agree with the fault and with the cure alike. Absent
    // and zero part company here or nowhere.
    expect(read).toBeNull();
    expect(read).not.toBe(0);
    // AND NOT THE `rows:` A LATER SECTION STATES. A reader that searched the file rather than the
    // block has somewhere wrong to land, and 999 is a bar nobody wrote either.
    expect(read).not.toBe(999);
  });

  it("reports no fall for a repository that never banked, at the very count an emptied axis reads", () => {
    // ZERO IS THE NUMBER THE FAULT THIS SLICE EXISTS FOR PRODUCES: mistype the manifest key and the
    // ledger's own reader answers an empty registry. A repository that never banked is silent over
    // it, because it has set nothing for that count to be short of.
    expect(fitnessAxisFallIn(recordBankingNothing(), 0)).toBeNull();
    // THE OTHER FORM OF NEVER BANKED — no record file at all, which is where a consumer starts.
    expect(fitnessAxisFallIn(null, 0)).toBeNull();
  });

  it("still reports the fall at that same count once a figure IS banked, so the silence is the absent figure's", () => {
    // THE CONTROL, AND IT IS WHY THE TWO ABOVE MEAN ANYTHING. Same manifest, same count, one bar:
    // a figure of one reds where no figure is silent. Without this line, "reports no fall" is also
    // what a comparison that had stopped looking would say, and this repository has twice in a day
    // found an assertion of absence to be exactly that.
    expect(fitnessAxisFallIn(recordBanking(1), 0)).toEqual({ banked: 1, found: 0 });
  });

  it("says nothing over a tree that files no record, and reds the same tree once one banks a figure", () => {
    // THE WHOLE READER OVER A REAL TREE, rather than over a string: it is the one that decides
    // whether a missing file is an absent bar or an error, and a projection cannot answer that.
    // The two trees hold the same empty manifest and differ only in whether a record exists.
    expect(fitnessAxisRefusalAt(treeHolding(0), RECORD_FILE)).toBeNull();

    const banked = fitnessAxisRefusalAt(treeHolding(0, 1), RECORD_FILE);

    expect(banked).not.toBeNull();
    expect(banked).toContain("banked 1, found 0");
  });
});
