/**
 * THE PORTFOLIO'S CHECK CHARACTERISTICS — the words that may name what a fitness check asserts.
 *
 * THE FAULT THIS EXISTS TO CLOSE (3F-2996). The set of words that could name a characteristic
 * used to be read out of the target's own `specController.checkRegistry` and
 * `specController.thresholds`, so adding a registry entry was simultaneously the act that MINTED
 * a characteristic and the act that CERTIFIED it. Fourteen tags for seven characteristics were
 * built over a month in a repository that reconciles its own tree on every push, and nothing
 * redded once (3F-2994). A vocabulary a product can extend by editing its own manifest is not a
 * shared vocabulary; it is a per-product roster wearing one.
 *
 * SO THE ROSTER IS THE PORTFOLIO'S, AND IT ARRIVES BY VERSION. Canon names this package as the
 * machine-readable form's home — *"a `spec-controller-core` export or its own shared package …
 * from which each product's tag checker DERIVES its legal set via its pinned version, refreshed
 * on a bump — never a hand-typed roster"* (`fitness-functions.md` → *Static checks*). Every
 * reconciled product already installs this package to run `balance`, so the export is the
 * smaller of the two shapes canon offers: nothing is published that was not published before,
 * and no consumer gains a dependency.
 *
 * ON THE PUBLIC `.` BARREL, NEVER `./internal`. A roster only the monorepo can import is
 * reachable by exactly the one product that does not need it. The barrel entry is a v1 contract
 * change, and `publishedSurfaces.ts`' hand-written surface is updated in the same act — which
 * makes the addition a reviewed decision rather than drift, the property this whole slice is
 * about, applied to itself.
 *
 * ═══ THE SECOND HOP IS DELIBERATELY NOT BUILT HERE ═══
 *
 * There are two hops between canon and a verdict: code ↔ this roster, and this roster ↔ canon's
 * prose. The FIRST is DISSOLVED — this export IS the list every consumer reads, so there is no
 * second copy in code to disagree with it. The SECOND belongs to the `strategy` repository's CI,
 * where every product is visible, and is not built here for the reason `blockedVocabulary.md`
 * already runs under: canon lives in a repository this one's CI never checks out, and a public
 * consumer of an MIT-licensed tool would not have it at all (operator ruling 2026-08-03,
 * 3F-2296). This file is a VENDORED COPY and says so on its face rather than leaving a reader to
 * wonder whether the reconciliation was forgotten.
 *
 * ═══ WHAT A GREEN AGAINST THIS ROSTER DOES NOT ESTABLISH ═══
 *
 * That a characteristic was EARNED. Canon's admission test — *a characteristic earns a tag when
 * no existing characteristic names the property the check asserts* — asks whether an existing
 * word already covers this property, and no check can answer that. Membership here answers the
 * answerable half: is this word one the portfolio carries. The check that reads this roster says
 * so in its own output rather than letting a green be read as more than it is.
 *
 * PURE DATA AND ONE PREDICATE — no I/O, nothing imported, so it sits in `domain/` beside
 * `checkRegistry.ts` and `enginePurity` / `domainPurity` stay green by construction.
 */

/**
 * The characteristics the portfolio carries, transcribed from `fitness-functions.md`.
 *
 * STATIC CHECKS — canon's grouped-by-characteristic sentence, in its order: `complexity`
 * (complexity, complexity-exceptions), `function-length`, `tech-conformance` (domain-purity,
 * domain-no-globals, cross-aggregate-boundary, no-parallel-store, anemic-domain,
 * orchestration-thinness), `vocab` (vocab-audit, no-state-literals), `traceability` (scn-tags,
 * scn-references, feature-codes, scn-subissues), `lint` (style/form of code or spec prose),
 * `flag-hygiene` (flag-age, flag-states-matrix), `doc-accuracy`, and the discovery-reachable
 * `typecheck`, `security`, `licence`, `bundle-size`. `self-balance` closes the list — a static
 * check over the PRODUCED EVIDENCE rather than the source (canon, *Self-reconciliation*).
 *
 * MEASURED — assessed by running the suite and measuring it: `ci-run-time`, `coverage`,
 * `mutation` (canon, *Runtime fitness functions*).
 *
 * BARE, AND SORTED BY NEITHER. The words carry no `@` because every reader hands this list bare
 * terms (`bareTerm`, 3F-2976), and the order is canon's own so a reader diffing the two documents
 * reads them in the same sequence.
 */
export const PORTFOLIO_CHECK_CHARACTERISTICS: readonly string[] = [
  // Static checks
  "complexity",
  "function-length",
  "tech-conformance",
  "vocab",
  "traceability",
  "lint",
  "flag-hygiene",
  "doc-accuracy",
  "typecheck",
  "security",
  "licence",
  "bundle-size",
  "self-balance",
  // Measured
  "ci-run-time",
  "coverage",
  "mutation",
];

/**
 * Whether the portfolio roster carries this characteristic.
 *
 * EXACT, AND NEVER A NEAR-MATCH COURTESY. A word the roster does not carry is not resolved to the
 * roster word it resembles: the mint is the act being surfaced, and quietly reading `complexty`
 * as `complexity` would hide exactly what a caller reads this to make visible.
 *
 * The term arrives BARE. Every reader in this repository reaches the roster through the resolvers
 * that already store both terms bare, so stripping a sigil here would be a second reading of what
 * a term bare is — the disagreement between readers that 3F-2976 spent a slice removing.
 */
export function isPortfolioCharacteristic(characteristic: string): boolean {
  return PORTFOLIO_CHECK_CHARACTERISTICS.includes(characteristic);
}
