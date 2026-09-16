/**
 * THE PORTFOLIO'S CHECK CHARACTERISTICS — the words that may name what a fitness check asserts.
 *
 * WHAT THIS IS FOR NOW — A ROLL-UP VOCABULARY, NOT A GATE (3F-3167). A fitness scenario carries
 * one tag, `@fitness`, and names its characteristic as a FIELD on its configured row. The word is
 * therefore a REPORTING LABEL: it is what a report groups its fitness rows by and what the
 * portfolio says out loud about where a product is weak. Nothing parses it, and no check in this
 * repository holds a manifest to this list any more.
 *
 * THE GATE THAT USED TO (3F-2996, retired 3F-3167). The set of words that could name a
 * characteristic was once read out of the target's own check registry and
 * `specController.thresholds`, so adding a registry entry was simultaneously the act that MINTED
 * a characteristic and the act that CERTIFIED it. Fourteen tags for seven characteristics were
 * built over a month in a repository that reconciles its own tree on every push, and nothing
 * redded once (3F-2994). `lint:check-characteristics` closed that, along with a minting ceremony
 * for words canon had not named — and both left when the tag stopped doing two jobs. A word that
 * only labels a roll-up cannot be minted into the parser by a typo, because the parser does not
 * read it. Whether the portfolio SHOULD carry a given word is a canon question, asked of people.
 *
 * THE ROSTER IS STILL THE PORTFOLIO'S, AND IT STILL ARRIVES BY VERSION. Canon names this package
 * as the machine-readable form's home — *"a `spec-controller-core` export or its own shared
 * package … from which each product DERIVES its legal set via its pinned version, refreshed on a
 * bump — never a hand-typed roster"* (`fitness-functions.md` → *Static checks*). Every reconciled
 * product already installs this package to run `balance`, so the export is the smaller of the two
 * shapes canon offers: nothing is published that was not published before, and no consumer gains
 * a dependency. What changed at 3F-3167 is what a consumer DOES with it — group a report, not
 * refuse a build.
 *
 * ON THE PUBLIC `.` BARREL, NEVER `./internal`. A roster only the monorepo can import is
 * reachable by exactly the one product that does not need it. The barrel entry is a v1 contract
 * change. It USED to be reconciled against a hand-written surface updated in the same act, which
 * made the addition a reviewed decision rather than drift — the property that slice was about,
 * applied to itself. That surface left at 3F-3449 and nothing replaced it, so the reviewed-decision
 * property now rests on the reviewer and not on a check.
 *
 * ═══ THIS FILE IS A VENDORED COPY, AND SAYS SO ═══
 *
 * Canon lives in the `strategy` repository, which this one's CI never checks out and a public
 * consumer of an MIT-licensed tool would not have at all — the arrangement the operator ruled
 * for exactly this case (2026-08-03, 3F-2296). So this list is transcribed, and
 * holding it to canon belongs to the maintainers' private repository's CI, where every product is visible. It
 * says so on its face rather than leaving a reader to wonder whether the reconciliation was
 * forgotten.
 *
 * PURE DATA AND ONE PREDICATE — no I/O, nothing imported, so it sits in `domain/` beside
 * the fitness-row readers, and `pnpm lint:boundaries` stays green by construction — the whole of
 * what asks that question, now that `domainPurity` has gone at 3F-3438.
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
