/**
 * The no-parallel-store check, running over this repository (@SCN-NPS-001).
 *
 * THE SUBJECT IS THE PRODUCT'S OWN SOURCE, WHICH IS WHY THIS IS A CHECK AND NOT A TEST ABOUT ONE.
 * It walks `packages/core/src` and reds if a second representation of the Ledger's entries appears
 * beside the Ledger. Spec in Gherkin, implementation here, runner vitest.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the @SCN-NPS-001 id
 * matching features/no-parallel-store.feature, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this run IS the observed evidence, mirroring @SCN-EPG-001 and
 * @SCN-DPG-001 exactly.
 *
 * NOTHING ELSE IN THE REPOSITORY RUNS THIS CHECK, measured rather than inherited: no row of
 * package.json's specController.fitnessChecks invokes `checkNoParallelStore`, no `lint:` or
 * `guard:` script does, and grepped across the tree the checker is referenced from exactly one
 * file — this one.
 *
 * THE POPULATION FLOOR IS THE ANTI-VACUITY TERM, and it is shared with enginePurity because the two
 * walk the same root. A green over an empty walk reads exactly like a green over a clean tree; the
 * floor is what separates them.
 *
 * THE LEGITIMATE FIELD THE REAL TREE HOLDS is `evidenceObservations` on the Ledger row
 * (@SCN-LDG-022) — eight sites under `domain/` — so a rule widened to match it reds here rather
 * than passing quietly.
 *
 * THE PLANTED ARM WENT AT 3F-3245. Authored from this check's implementation by that
 * implementation's author, its green proved the check does what its author wrote rather than what
 * the rule requires — one author keeping both books, which is no reconciliation at all.
 */

import { describe, expect, it } from "vitest";

import { checkNoParallelStore } from "./noParallelStore.js";
import {
  collectSourceFiles,
  coreSrcRoot,
  MIN_CORE_SRC_FILES_SCANNED,
  resolveRepositoryRoot,
} from "./sourceFiles.js";

/** The repository this lock is asked about, resolved ONCE and passed down (3F-3207). */
const REPOSITORY_ROOT = resolveRepositoryRoot();

/**
 * The production core-src population — the ONE exact pin on it left in this repository (3F-3221).
 *
 * Bump it when a core module is legitimately added or removed; the count moving is the fact this
 * constant exists to make loud, and `git log -S CORE_SRC_FILE_COUNT` carries which slice moved it
 * each time it did. A removal is the shape a double-entry ledger is blind to — nothing fails, a
 * row simply stops being counted — which is the direction this pin exists for.
 *
 * IT DID NOT MOVE AT 3F-3252, AND THE REASON IS WORTH THE LINE. `parse/convertedFitnessCredits.ts`
 * left with the cucumber fitness pass it read, and `parse/ciStepRecord.ts` arrived to replace it:
 * one out, one in, so the count is 38 on both sides. THAT IS THIS PIN'S OWN BLIND SPOT — a
 * simultaneous add and removal nets to zero and reads as a tree that did not change. An exact pin
 * catches a bare removal, which a floor cannot; it does not catch a swap, and nothing here does.
 *
 * IT MOVED 39 → 41 AT 3F-3303, AND THE MOVE IS AN ADDITION WITH NOTHING LEAVING. `parse/
 * corpusFaults.ts` reached the 400-line `max-lines` ceiling with four grammar clauses still to
 * land, and canon rules that a module at the ceiling SPLITS rather than buying an exception entry
 * (@SCN-CPX-001). It split on the seam its own rules have — `parse/corpusCodeFaults.ts` (a feature
 * code binding to a feature file) and `parse/corpusGrammarFaults.ts` (a tag meaning something) —
 * leaving the composition and the fault vocabulary behind. Two in, none out, so this is the
 * direction the pin reads cleanly rather than the swap its blind spot is about.
 *
 * IT MOVED 41 → 42 AT 3F-3307, AND AGAIN THE MOVE IS AN ADDITION WITH NOTHING LEAVING.
 * `parse/corpusGrammarFaults.ts` was at 345 of the 400-line ceiling and the one-check rule
 * (@SCN-STG-007) does not fit under it — so the same canon applies a second time and
 * `parse/corpusClaimFaults.ts` arrives. The seam is not grammar-versus-more-grammar: the grammar
 * arm asks whether a WORD means something, and this asks whether a SCENARIO has claimed too many
 * of the words that do. One in, none out.
 *
 * What it must never be is loosened into a floor: the floor is already asserted
 * below, and it is measurably blind to the fault this catches.
 */
const CORE_SRC_FILE_COUNT = 42;

describe("[SCN-NPS-001] no parallel store re-represents the Ledger's entries", () => {
  it("passes clean over the REAL packages/core/src tree (the lock holds today)", () => {
    // The dogfood green, and this guard's only contact with the repository: any resurrected census
    // module, re-defined retired symbol or re-added `attributed` credit list reds here.
    const coreFiles = collectSourceFiles(coreSrcRoot(REPOSITORY_ROOT), REPOSITORY_ROOT);
    // Sanity, in both directions. The floor is the SHARED one — this guard and @SCN-EPG-001 walk
    // the same population, so a bare literal here would be a second copy of the same rule, drifting
    // the moment either is retuned (3F-2266). The pin is the exact form the floor cannot reach: a
    // walk that quietly returned 37 of these 38 files clears a floor of 10 by twenty-seven, and
    // every guard over this population would then report green about a smaller world.
    expect(coreFiles.length).toBeGreaterThan(MIN_CORE_SRC_FILES_SCANNED);
    expect(coreFiles).toHaveLength(CORE_SRC_FILE_COUNT);
    expect(checkNoParallelStore(coreFiles)).toEqual([]);
  });
});
