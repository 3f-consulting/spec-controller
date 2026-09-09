/**
 * The engine-purity check, running over this repository (@SCN-EPG-001).
 *
 * THE SUBJECT IS THE PRODUCT'S OWN SOURCE, WHICH IS WHY THIS IS A CHECK AND NOT A TEST ABOUT ONE.
 * It walks `packages/core/src` and reds if the reconciliation engine imports something impure or
 * references IO. Spec in Gherkin, implementation here, runner vitest.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the @SCN-EPG-001 id
 * matching features/engine-purity.feature, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this run IS the observed evidence.
 *
 * NOTHING ELSE RUNS THIS CHECK AS A CHECK. No fitness row invokes `checkEnginePurity` and no
 * `lint:` script does. One other arm used to reach it over the real tree — sourcePopulation's
 * @SCN-SRC-001 — but that borrowed the checker as an INSTRUMENT for a claim about the enumerator's
 * subject, carried no anti-vacuity floor, and retired with its scenario at 3F-3245. So this is the
 * guard's only contact with the repository, and it keeps the floor.
 *
 * THE PLANTED ARM WENT AT 3F-3245. Authored from this check's implementation by that
 * implementation's author, its green proved the check does what its author wrote rather than what
 * the rule requires — one author keeping both books, which is no reconciliation at all.
 */

import { describe, expect, it } from "vitest";

import { checkEnginePurity } from "./enginePurity.js";
import {
  collectSourceFiles,
  coreSrcRoot,
  MIN_CORE_SRC_FILES_SCANNED,
  resolveRepositoryRoot,
} from "./sourceFiles.js";

/** The repository this guard is asked about, resolved ONCE and passed down (3F-3207). */
const REPOSITORY_ROOT = resolveRepositoryRoot();

describe("[SCN-EPG-001] the reconciliation engine imports nothing impure and references no IO", () => {
  it("passes clean over the REAL packages/core/src tree (the seam holds today)", () => {
    // The dogfood green: any future stray import or IO reference in a production engine file reds
    // this. It is also where comment-stripping is exercised for real — three production files under
    // this root name `process.` inside a doc comment and nowhere else, so a checker that stopped
    // stripping comments reds HERE, which is why no hand-written doc-comment fixture is kept above.
    const engineFiles = collectSourceFiles(coreSrcRoot(REPOSITORY_ROOT), REPOSITORY_ROOT);
    // Sanity: the tree was actually scanned, not an empty walk masquerading as green. The floor is
    // the SHARED one — this guard and noParallelStore walk the same population, so a bare literal
    // here would be a second copy of the same rule, drifting the moment either is retuned (3F-2266).
    expect(engineFiles.length).toBeGreaterThan(MIN_CORE_SRC_FILES_SCANNED);
    expect(checkEnginePurity(engineFiles)).toEqual([]);
  });
});
