# Blocked vocabulary — the vendored canon table

**This file is the source of the enforced term set, not a description of it.** `vocabWordSets.ts`
parses it; nothing in the code holds a second copy of these words. Adding a plain retired word is an
edit *here* and nowhere else — no new rule, no new ticket, no `.ts` change.

**Where it comes from.** This is a committed copy of `double-entry-manifesto.md` →
*Appendix — Blocked vocabulary*, in the `strategy` repository. That repository is not spec-controller,
is not checked out by this repository's CI, and would not be present for a public consumer of this
MIT-licensed tool — so no check here can read canon directly. Reconciling this copy against canon is
the second hop, it belongs to the maintainers' private repository's CI where every product repository is visible,
and it is deliberately **not** built here (3F-2296, operator-ruled 2026-08-03).

**The adoption-status column is this repository's, not canon's.** Canon states the ban for the whole
portfolio; each product adopts on its own schedule. Adopting all rows here verbatim would red 2,272
occurrences that belong to other tickets, so every row carries a triaged verdict:

- **`adopted`** — the row is enforced. Its terms enter the audit's judgement.
- **`deferred`** — recognised and owed, with the date it was deferred and the ticket that pays it.
  Visible debt, never a silent omission.
- **`not-applicable`** — a different verdict from `deferred`, and the distinction is load-bearing.
  A `deferred` row books debt somebody must pay; a `not-applicable` row is one this repository has no
  model for at all, so deferring it would book debt that should never be paid and adopting it would
  red correct code. The reason is recorded in the cell.

**The matcher column names which engine arm judges the row — canon owns *which* words, code owns
*how*.** `whole-word` is the default for a plain row and is the only matcher the derivation feeds;
the other values are the documented exceptions, whose arms live in `vocabAudit.ts` and are not
collapsed into the word list (3F-2281's four-matcher finding):

- **`whole-word`** — a plain banned word, matched in both NAME and PROSE modes. Inflections that the
  naive singulariser does not fold are listed as separate terms, exactly as canon spells them.
- **`phrase-adjacency`** — the retired term is a PHRASE of individually-approved words, so neither
  half may be banned. The arm judges a word by the one that follows it, and its call site sits ahead
  of the full-term and approved-word gates. `static guard`'s ordering is the sharp case: `static` is
  both a manifesto domain word and the qualifier that lets bare `guard` pass, so an arm reached after
  those gates would green the whole class by accident.
- **`qualifier-gated`** — the word is canon's *different word* when a ruled qualifier co-occurs and a
  banned shortening when it stands alone; it is surfaced for `review`, never auto-renamed.
- **`n/a`** — no matcher can express the ban, which is part of why the row is not applicable here.

## The table

| Never write | Always write | Why | Adoption status | Matcher |
|---|---|---|---|---|
| demand / demanded / demands / demanding / demander(s) | `Evidence Obligation`; a `scenario` **raises** it, and it **names** a `static check` | the debit is an `Evidence Obligation`, never a "demand" | adopted — 3F-2281 | whole-word |
| declare / declared / declares / declaring / declaration(s) / declarative / declarer(s) / undeclared / undeclarable | for evidence: `Evidence Observation` (a `scenario` **names** the check); a real one is a **`scenario`**, a fabricated one a **`phantom scenario`** — never "declared" / "undeclared" | the credit-side twin of "demand"; both retired | adopted — 3F-2329. Terms extended to every inflection: a row naming four forms greens the fifth, which is how this family regrew. `declarative` / `declarer(s)` / `undeclarable` have zero occurrences and are REGROWTH guards, the `ci-performance` shape | whole-word |
| static guard / `staticGuard` / `<static-guard>` | `static check` / `staticCheck` / `<static-check>` | retired coinage; the world says static check / static analysis | adopted — 3F-2281 | phrase-adjacency |
| guard (bare noun, for a static check) | `static check` | banned shortening | deferred 2026-08-03 — 3F-1852 pays it; 774 occurrences. Surfaced today for `review` by the qualifier-gated arm, which is not the ban | qualifier-gated |
| budget (of a metric or CI target) | `threshold` | a `threshold` is a ceiling; a budget is spent down | adopted — 3F-2281 | whole-word |
| ci-performance | `ci-run-time` | the retired tag for the pipeline's own timing quality-check | adopted — 3F-2281 | phrase-adjacency |
| tree / subtree / root / branch (of work items) | the `work hierarchy`: progenitor, parent, child, descendants, ancestor, level | tree language was purged from the model | not-applicable — this repository has no work-item model. Its 670 occurrences are filesystem, git and CLI senses: `--root`, `repoRoot`, the git **work tree** 3F-2325 added deliberately, git `branch` | n/a |
| `undemanded` (outcome handle) | `no-evidence-obligation` | removes the demand-root (2026-08-02) | adopted — 3F-2300 | whole-word |

## Known divergences from canon, recorded rather than silent

- **The `ci-performance` row is not in canon's appendix.** It is this repository's own retirement
  (3F-2289, `@SCN-VOC-006`), ruled adopted by the operator on 2026-08-03. Proposing it back to canon
  is the second hop's business, and the row is recorded here so the difference is visible rather than
  discovered later.
- **The rename targets are not read from the "Always write" column.** Canon states one sentence per
  row, but this repository's targets are per-inflection — the noun forms take the canon term, the
  verb forms take `names` / `naming` — so the mapping stays in `vocabWordSets.ts`. Canon owns which
  words are retired; the code owns what each becomes.
- **The per-term *Rejected aliases* under canon's glossary entries are not in this table**, because
  they are not in canon's appendix either. Those bans (`supply`, `execution`, `state`,
  `unattributed`, `requirement`, `oob`) stay in `vocabWordSets.ts` as a separately-sourced list.
