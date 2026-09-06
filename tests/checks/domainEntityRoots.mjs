/**
 * The domain's CONCEPT MODULES — the files `max-lines` does not govern (@SCN-CPX-004, 3F-2416).
 *
 * A THIRD KIND OF NUMBERLESS FACT, BESIDE THE OTHER TWO. `complexityThresholds.mjs` holds numbers
 * stated from OUTSIDE this tree; `complexityExceptions.mjs` holds numbers MEASURED FROM it. This file
 * holds no number at all, and that is what it is for: it records what KIND of module each of these is,
 * not how big any of them happens to be today. An exception entry says "this file measures 575 on this
 * date" — a fact about debt, which must shrink. This says "this module is a concept root" — a fact
 * about the model, which does not shrink and carries no date to go stale. Three files, three kinds of
 * claim, and a reader never has to work out which they are looking at.
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
 * `max-lines-per-function` 40 apply to these modules exactly as they do anywhere else — three of them
 * carry a `max-lines-per-function` exception today and stay gated as the smells they are. A long
 * module of small, simple, well-named functions is coherent; a fat or complex FUNCTION is debt
 * whatever module holds it, and the per-unit gate takes it. Nothing can hide in this list.
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
 * THE RESIDUAL, STATED. Whether a listed module really is a concept root is a judgement no gate can
 * make. What IS checked, by the `@unit` pin: every path exists, lives under a domain directory, is not
 * a test file, appears once, and carries no `max-lines` exception. The last of those is checked twice
 * over — `@SCN-CPX-003`'s reconciliation measures through this exclusion, so an entry added for one of
 * these paths reds as a stale entry with no help from the pin.
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
