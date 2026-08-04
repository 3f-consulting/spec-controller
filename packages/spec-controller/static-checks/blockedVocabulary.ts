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
 * The words the tree-enforcement gate reds on — every ADOPTED row's trigger token
 * (@SCN-VOC-014, 3F-2343).
 *
 * WHY A TRIGGER-WORD SET RATHER THAN A FLAG REASON. The gate needs to tell an adopted-row
 * hit from the two flag classes it must NOT enforce, and the manifest's `action` is lossy —
 * `banned`, `bare-shortening` and the three phrase reasons all render as `rename`. Carrying
 * the reason through `ManifestRow` was the first design and is rejected: `vocabAudit.ts` is
 * frozen at its `max-lines` exception, an exception buys no headroom, and growing it to
 * carry a field would be a refactor this slice did not scope. The set below settles the
 * same question from the table alone, so that file is untouched.
 *
 * TWO ARMS, BOTH DERIVED FROM THE STATUS COLUMN — never a second list to keep in step:
 *
 *  - `whole-word` rows contribute via `bannedWordsOf`, which already filters to `adopted`.
 *    So the CODE-SIDE half of `BANNED_WORDS` (`GLOSSARY_ALIAS_BANS` — `state`, `supply`,
 *    `execution`, `unattributed`, `requirement`, `oob`) is excluded BY DERIVATION. Those
 *    are 3F-2369's, which canon-sources them before enforcing.
 *  - `phrase-adjacency` rows contribute their term's FIRST token, because the phrase arms
 *    flag the first word of the pair and leave the second to the unmodified machinery
 *    (`static guard` → `static`, `ci-performance` → `ci`).
 *
 * A `deferred` or `not-applicable` row contributes NOTHING, which is what lets this
 * repository ship green against the unadopted rows' 2,272 occurrences — and when 3F-2329
 * flips the `declare` row to adopted, `declared` joins this set with no code change here.
 */
export function adoptedTriggerWords(
  rows: readonly BlockedVocabularyRow[] = BLOCKED_VOCABULARY_ROWS,
): ReadonlySet<string> {
  const words = new Set<string>(bannedWordsOf(rows));
  for (const row of rows) {
    if (row.status !== "adopted" || row.matcher !== "phrase-adjacency") continue;
    for (const term of row.terms) {
      // Only a term that actually SEPARATES into tokens contributes a trigger. The table
      // spells a phrase row's variants several ways (`static guard`, `static-guard`,
      // `staticguard`); the run-together form is one token and names no first word, so it
      // would add a trigger the engine can never flag.
      const tokens = term.split(/[\s-]+/).filter((token) => token !== "");
      const first = tokens[0];
      if (tokens.length > 1 && first !== undefined) words.add(first);
    }
  }
  return words;
}

/**
 * What is wrong with one row's triage — the vocabulary of `lint:blocked-vocabulary`
 * (@SCN-VOC-011, 3F-2331). The kind is for a reader grouping reds; the message is the red.
 */
export type AdoptionFaultKind =
  | "no-status"
  | "unrecognised-status"
  | "deferral-without-ticket"
  | "deferral-without-date"
  | "no-rows";

/** One thing the triage record fails to say, and which row fails to say it. */
export interface AdoptionFault {
  readonly kind: AdoptionFaultKind;
  /** The row, as the table spells its terms — never an index, which moves when rows do. */
  readonly row: string;
  /** Names WHICH row and WHAT is missing. Never "the table is invalid". */
  readonly message: string;
}

/**
 * A ticket handle. The lookahead demands a LETTER, which is the whole point: `2026-08-03`
 * is a hyphenated handle-shaped token, and a pattern loose enough to accept it would green
 * every dated deferral that names nobody — the exact failure this check exists to catch.
 */
const TICKET_HANDLE = /\b(?=[A-Z0-9]*[A-Z])[A-Z0-9]{2,}-\d+\b/;

/** The day a deferral was taken, ISO — so debt can be aged rather than merely listed. */
const DEFERRAL_DATE = /\b\d{4}-\d{2}-\d{2}\b/;

/** The row's identity in a red: its terms, as the table spells them. Never an index. */
function rowName(row: BlockedVocabularyRow): string {
  return row.terms.length === 0 ? "(a row naming no term)" : row.terms.join(" / ");
}

/** What a deferral must say, and why — the sentence a reader gets back when it doesn't. */
const MISSING_FROM_DEFERRAL = {
  ticket: "no ticket — a deferral without a ticket is an intention, not a decision, and " +
    "nobody is holding it",
  date: "no date — undated debt never resurfaces, and cannot be aged",
} as const;

/** The fault a deferral's note carries, or undefined when it names both ticket and date. */
function deferralFault(row: BlockedVocabularyRow): AdoptionFault | undefined {
  const noTicket = !TICKET_HANDLE.test(row.statusNote);
  const noDate = !DEFERRAL_DATE.test(row.statusNote);
  if (!noTicket && !noDate) return undefined;
  const missing = [
    ...(noTicket ? [MISSING_FROM_DEFERRAL.ticket] : []),
    ...(noDate ? [MISSING_FROM_DEFERRAL.date] : []),
  ];
  return {
    kind: noTicket ? "deferral-without-ticket" : "deferral-without-date",
    row: rowName(row),
    message:
      `the \`${rowName(row)}\` row is deferred but records ${missing.join("; and ")}. ` +
      `Its Adoption status cell reads "deferred ${row.statusNote}".`,
  };
}

/** The fault a row's triage carries, or undefined when the row says what was decided. */
function faultOf(row: BlockedVocabularyRow): AdoptionFault | undefined {
  if (row.status === "deferred") return deferralFault(row);
  if (row.status !== null) return undefined;
  if (row.statusNote === "") {
    return {
      kind: "no-status",
      row: rowName(row),
      message:
        `the \`${rowName(row)}\` row records no adoption status. Every row must carry ` +
        `exactly one of \`adopted\` / \`deferred\` / \`not-applicable\`, or a canon row ` +
        `nobody has looked at is indistinguishable from one deliberately deferred — and it ` +
        `enforces nothing either way.`,
    };
  }
  return {
    kind: "unrecognised-status",
    row: rowName(row),
    message:
      `the \`${rowName(row)}\` row's adoption status reads "${row.statusNote}", which is ` +
      `none of \`adopted\` / \`deferred\` / \`not-applicable\`. The derivation cannot ` +
      `classify it, so the row enforces nothing — as quietly as a blank cell would.`,
  };
}

/**
 * Every fault in the table's triage record, or an empty list when every row is triaged
 * (@SCN-VOC-011, 3F-2331).
 *
 * THE DEGENERATE CASE IS CHECKED FIRST, and it is not a formality. "Every row is triaged"
 * is vacuously true of no rows at all, so a table this parser reads nothing out of — a lost
 * header, a changed column count — would otherwise report all clear while checking nothing.
 * A check that cannot tell "all clear" from "I did not run" is the failure this whole
 * scenario exists to remove, so it must not have that shape itself.
 */
export function checkAdoptionStatuses(
  rows: readonly BlockedVocabularyRow[]
): readonly AdoptionFault[] {
  if (rows.length === 0) {
    return [
      {
        kind: "no-rows",
        row: "(the table)",
        message:
          "no row parsed out of the table at all, so nothing was checked. A lost header or " +
          "a changed column count would otherwise report all clear — and this check must " +
          "not be readable as a green when it did not run.",
      },
    ];
  }
  return rows.flatMap((row) => {
    const fault = faultOf(row);
    return fault === undefined ? [] : [fault];
  });
}

/**
 * The vendored table as committed beside this file.
 *
 * Resolved through `import.meta.url`, never through `cwd`: the audit is driven over
 * foreign roots by its own integration arm, and a table found relative to the working
 * directory would be a different table — or none — depending on where the tool was run.
 *
 * Exported so `lintBlockedVocabularyCli.ts` names the same file this module parsed rather
 * than re-deriving the path — a second derivation is a second table waiting to disagree.
 */
export const VENDORED_TABLE_PATH = fileURLToPath(
  new URL("./blockedVocabulary.md", import.meta.url)
);

export const BLOCKED_VOCABULARY_ROWS: readonly BlockedVocabularyRow[] = parseBlockedVocabulary(
  readFileSync(VENDORED_TABLE_PATH, "utf8")
);
