/**
 * The vendored canon table and the derivation that turns it into the enforced word set
 * (@SCN-VOC-010, 3F-2330) — features/vocabulary-audit.feature.
 *
 * DERIVATION, NOT COMPARISON — the point of the whole module. Canon's blocked-vocabulary
 * table lives in the `strategy` repository, which this repository's CI never checks out
 * and a public consumer would not have, so no check here can read it. That leaves two
 * hops: code ↔ the vendored copy, and the vendored copy ↔ canon. The second belongs to
 * the maintainers' private repository's CI across every product and is not built here. The FIRST is
 * not checked at all — it is dissolved. The enforced set is PARSED OUT OF the committed
 * table, so there is no second list left to disagree with it, and a new plain retired
 * word is a table edit with no code change at all.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO. It does not judge words and it does not own
 * a matcher. The table says WHICH words are retired and which arm judges each; every arm
 * stays in `vocabAudit.ts` untouched — the plain banned-word set, the per-inflection
 * entries, and the phrase-adjacency rules whose call-site ordering is load-bearing. Nor
 * does it derive rename targets: canon states one sentence per row, while this
 * repository's targets are per-inflection, so that mapping stays in `vocabWordSets.ts`.
 *
 * SELF-EXEMPT. The table beside this file enumerates the banned vocabulary, so both are
 * listed in `vocabAuditCli.ts`'s `SELF_EXEMPT_PATHS` alongside `vocabWordSets.ts` — the
 * same meta-mention exemption (operator ruling 2026-07-02).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The triage verdict a vendored row carries. Only `adopted` enters the enforced set;
 * `deferred` is visible, dated debt; `not-applicable` is a row this repository has no
 * model for, which is a different thing from debt and is recorded as such.
 */
export type AdoptionStatus = "adopted" | "deferred" | "not-applicable";

/**
 * WHICH engine arm judges a row's terms. `whole-word` is the default for a plain row and
 * the only value the derivation feeds; the rest name the documented exceptions so a
 * reader of the table can see that the matchers were not collapsed into the word list.
 */
export type TermMatcher = "whole-word" | "phrase-adjacency" | "qualifier-gated" | "none";

/** One parsed row of the vendored blocked-vocabulary table. */
export interface BlockedVocabularyRow {
  /** The retired terms, lowercased, from the "Never write" column. */
  readonly terms: readonly string[];
  /** The "Always write" cell, verbatim — carried for the reader, not matched on. */
  readonly alwaysWrite: string;
  /** The "Why" cell, verbatim — carried for the reader, not matched on. */
  readonly why: string;
  /** The triage verdict, or `null` when the cell records none this module recognises. */
  readonly status: AdoptionStatus | null;
  /** The date + ticket of a deferral, or the reason a row is not applicable here. */
  readonly statusNote: string;
  /** The engine arm that judges this row's terms. */
  readonly matcher: TermMatcher;
}

/** Markdown emphasis and the handle punctuation canon writes its terms in. */
const DECORATION = /[`*<>]/g;
/** A term's parenthetical: an inflection suffix, or the sense the ban is scoped to. */
const PARENTHETICAL = /\([^)]*\)/g;

/**
 * The "Never write" cell → its terms.
 *
 * The parenthetical goes because canon uses it for two things the matcher cannot use: an
 * inflection suffix (`demander(s)`) and the SENSE a ban is scoped to (`(of work items)`,
 * `(bare noun, for a static check)`). Neither is a word to match; the sense-scoped rows
 * are precisely the ones this repository does not adopt, and the reason travels in the
 * status cell where a reader will look for it.
 */
function termsOf(cell: string): string[] {
  return cell
    .replace(PARENTHETICAL, "")
    .replace(DECORATION, "")
    .split("/")
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term !== "");
}

/** The recognised verdicts, longest-first so `not-applicable` cannot be read as a prefix. */
const STATUSES: readonly AdoptionStatus[] = ["not-applicable", "adopted", "deferred"];

/** The "Adoption status" cell → its verdict and the rest of the cell as the note. */
function statusOf(cell: string): { status: AdoptionStatus | null; statusNote: string } {
  const plain = cell.replace(DECORATION, "").trim();
  const status = STATUSES.find((s) => plain.toLowerCase().startsWith(s));
  if (status === undefined) return { status: null, statusNote: plain };
  return { status, statusNote: plain.slice(status.length).trim() };
}

/** The "Matcher" cell → the arm it names. Anything unrecognised (`n/a`) judges nothing. */
function matcherOf(cell: string): TermMatcher {
  const plain = cell.replace(DECORATION, "").trim().toLowerCase();
  const named: readonly TermMatcher[] = ["whole-word", "phrase-adjacency", "qualifier-gated"];
  return named.find((m) => plain.startsWith(m)) ?? "none";
}

/** A markdown table line → its cells, with the leading/trailing delimiters dropped. */
function cellsOf(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** True for the `|---|---|` rule under a table header — structure, not a row. */
function isSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

/** The number of columns a data row must carry to be read. */
const COLUMNS = 5;

/**
 * Parse the vendored table's markdown into its rows.
 *
 * Only full-width data rows are read, so the file's prose — including the bulleted
 * explanation of each status and matcher — passes through without being mistaken for
 * vocabulary. The header is skipped by its first cell rather than by position, because a
 * table that lost its header should yield nothing rather than a row made of column names.
 */
export function parseBlockedVocabulary(markdown: string): readonly BlockedVocabularyRow[] {
  const rows: BlockedVocabularyRow[] = [];
  for (const line of markdown.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = cellsOf(line);
    if (cells.length !== COLUMNS) continue;
    if (isSeparator(cells)) continue;
    if (cells[0] === "Never write") continue;
    const { status, statusNote } = statusOf(cells[3]!);
    rows.push({
      terms: termsOf(cells[0]!),
      alwaysWrite: cells[1]!,
      why: cells[2]!,
      status,
      statusNote,
      matcher: matcherOf(cells[4]!),
    });
  }
  return rows;
}

/**
 * The enforced plain-banned word set: the `adopted` rows matched `whole-word`.
 *
 * TWO FILTERS, BOTH LOAD-BEARING. The status filter is what lets this repository ship
 * green against a canon table whose unadopted rows carry 2,272 occurrences. The matcher
 * filter is what keeps the phrase rows OUT of the plain set: `static guard` and
 * `ci-performance` are adopted, but each is built from individually-approved words, so
 * banning either half outright would red canon itself. Multi-word terms are dropped for
 * the same reason — a whole-word matcher cannot match a phrase, and silently half-matching
 * one is worse than not matching it.
 */
export function bannedWordsOf(rows: readonly BlockedVocabularyRow[]): ReadonlySet<string> {
  const banned = new Set<string>();
  for (const row of rows) {
    if (row.status !== "adopted" || row.matcher !== "whole-word") continue;
    for (const term of row.terms) {
      if (!/\s/.test(term)) banned.add(term);
    }
  }
  return banned;
}

/**
 * The vendored table as committed beside this file.
 *
 * Resolved through `import.meta.url`, never through `cwd`: the audit is driven over
 * foreign roots by its own integration arm, and a table found relative to the working
 * directory would be a different table — or none — depending on where the tool was run.
 */
const TABLE_PATH = fileURLToPath(new URL("./blockedVocabulary.md", import.meta.url));

export const BLOCKED_VOCABULARY_ROWS: readonly BlockedVocabularyRow[] = parseBlockedVocabulary(
  readFileSync(TABLE_PATH, "utf8")
);
