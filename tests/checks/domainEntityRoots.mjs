/**
 * The domain's CONCEPT MODULES — the files `max-lines` does not govern (@SCN-CPX-004, 3F-2416).
 *
 * A NUMBERLESS FACT, BESIDE THE ONE FILE THAT HOLDS NUMBERS. `complexityThresholds.mjs` holds numbers
 * stated from OUTSIDE this tree. This file holds no number at all, and that is what it is for: it
 * records what KIND of module each of these is, not how big any of them happens to be today. A third
 * file sat beside them until 3F-3466 — a dated list of per-file allowances, each entry saying "this
 * file measures 575 on this date", a fact about debt which had to shrink. This says "this module is a
 * concept root", a fact about the model, which does not shrink and carries no date to go stale. The
 * distinction is why the lists were never merged, and it is why this one outlived the other.
 *
 * ═══ WHY max-lines YIELDS HERE ═══
 *
 * Canon: `functional-domain-modelling.md` → "The aggregate root outgrows the module ceiling", and the
 * `fitness-functions.md` ruling of 2026-08-05. A concept module co-locates an immutable type with the
 * pure functions over it, and it grows WITH the concept — that is the model working. A file-size
 * ceiling assumes the opposite, that length is a tractability failure fragmentation would cure, and
 * for an entity module it inverts: coherence IS the tractability, read one module and see the whole
 * concept. The only move that satisfies the ceiling is hiving the concept's behaviour into an
 * `*-operations` layer — the anemic shape the model forbids, reached not by anyone's bad instinct but
 * because the gate forced it. So the guard states its scope rather than the model bending to it.
 *
 * ONLY MODULE SIZE YIELDS, AND THAT IS WHAT MAKES THIS SAFE TO GRANT. `complexity` 10 and
 * `max-lines-per-function` 40 apply to these modules exactly as they do anywhere else, and two of
 * them are over `max-lines-per-function` today and reported as the smells they are. A long module of
 * small, simple, well-named functions is coherent; a fat or complex FUNCTION is debt whatever module
 * holds it, and the per-unit gate takes it. Nothing can hide in this list.
 *
 * ═══ WHY A STATED SET AND NOT A GLOB ═══
 *
 * Canon states the exclusion structurally — `src/domain/<x>/<x>.ts` — which in a per-concept-directory
 * layout needs no list at all, because the glob IS the statement. This domain is FLAT
 * (`packages/core/src/domain/*.ts`), so that glob is unavailable and the alternative would be a glob
 * over the whole directory. That is the blanket domain exemption canon rules out: it would sweep in
 * every future value object, composition and helper by the accident of where it lives.
 *
 * THE SET CURRENTLY EQUALS THE DIRECTORY, AND THAT IS A COINCIDENCE OF TODAY'S TREE, NOT THE RULE.
 * Every module under `packages/core/src/domain` is a concept module right now — each one's own header
 * says so. The moment a helper lands there it is under the ceiling like anything else, because nothing
 * adds it here by living in that directory. Written down because the two are observationally identical
 * today, and the difference is the entire point of not writing the glob.
 *
 * THE RESIDUAL, STATED, AND IT IS LARGER THAN IT WAS. Whether a listed module really is a concept
 * root is a judgement no gate can make, and NOTHING mechanical checks the entries at all: there is no
 * `@unit` pin beside this module — measured, 3F-3466, and the claim that there was one is older than
 * this branch. The only reader is the @SCN-CPX-004 cucumber arm, and what it proves is that `max-lines`
 * resolves to `off` at each listed path and that the per-unit rules still bite there. It plants sources
 * and never reads the tree, so a path that does not exist, is duplicated, or names a test file passes
 * every one of its assertions. A per-file allowance list once covered the overlap from the other side;
 * that reader (@SCN-CPX-003's Delete) and the list itself (3F-3466) are both retired, and the existence
 * of each path is now checked by nothing.
 *
 * @type {readonly string[]}
 */
export const DOMAIN_ENTITY_ROOTS = [
  "packages/core/src/domain/evidenceReconciliation.ts",
  "packages/core/src/domain/journal.ts",
  "packages/core/src/domain/ledger.ts",
  "packages/core/src/domain/posting.ts",
  "packages/core/src/domain/qualityCheckReconciliation.ts",
  "packages/core/src/domain/scenarioReconciliation.ts",
];
