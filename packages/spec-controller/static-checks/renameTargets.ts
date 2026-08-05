import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The rename-target table's parser — `renameTargets.md` → the map (@SCN-VOC-016, 3F-2378).
 *
 * ONE PARSER MODULE PER DATA FILE, mirroring `blockedVocabulary.md` ↔ `blockedVocabulary.ts`.
 * The table is pure data (every term a mention, so its exemption is honest); this file is
 * code and is audited like any other, which is the whole point of the data floor.
 *
 * WHY THE DATA IS NOT IN `vocabWordSets.ts` ANY MORE. It was, as an object literal whose
 * KEYS were the retired words — inlined data in a code file, and exactly what kept that
 * module on the audit's exempt list. A whole-file exemption over a mixed file hides a USE
 * behind a MENTION, which is what let 3F-2300's renamed handle survive unseen.
 */

/** Where the table lives, resolved from this module rather than the cwd. */
export const RENAME_TARGETS_PATH = fileURLToPath(new URL("./renameTargets.md", import.meta.url));

/**
 * The rename-target table → its map. Reads the two leading cells of each body row and skips
 * the header and the `---` separator, the same shape `parseBlockedVocabulary` reads.
 *
 * Deliberately tolerant of the third `Note` column: the note is for the reader, never
 * matched on, exactly as the canon table's "Why" cell is.
 */
function bodyRows(markdown: string, section: string): string[][] {
  const rows: string[][] = [];
  let inSection = false;
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      inSection = trimmed.slice(3).trim().toLowerCase() === section.toLowerCase();
      continue;
    }
    if (!inSection || !trimmed.startsWith("|")) continue;
    const cells = trimmed.split("|").slice(1, -1).map((cell) => cell.trim());
    const first = cells[0];
    if (first === undefined || first === "" || /^-+$/.test(first)) continue;
    if (first.toLowerCase() === "retired term") continue;
    rows.push(cells);
  }
  return rows;
}

export function parseRenameTargets(markdown: string): Record<string, string> {
  const targets: Record<string, string> = {};
  for (const [term, replacement] of bodyRows(markdown, "Rename targets")) {
    if (term === undefined || replacement === undefined) continue;
    targets[term.toLowerCase()] = replacement;
  }
  return targets;
}

/**
 * How a @SCN-VOC-018 homograph earns the grammar reading. `follows` wants the qualifier as
 * the NEXT word; `co-occurs` wants it anywhere in the judged sequence.
 */
export interface GrammarQualifier {
  readonly match: "follows" | "co-occurs";
  readonly words: readonly string[];
}

export function parseGrammarQualifiers(markdown: string): ReadonlyMap<string, GrammarQualifier> {
  const qualifiers = new Map<string, GrammarQualifier>();
  for (const [term, match, words] of bodyRows(markdown, "Grammar qualifiers")) {
    if (term === undefined || words === undefined) continue;
    if (match !== "follows" && match !== "co-occurs") continue;
    qualifiers.set(term.toLowerCase(), {
      match,
      words: words.split(",").map((w) => w.trim().toLowerCase()).filter((w) => w !== ""),
    });
  }
  return qualifiers;
}

/** The rename-target map, read from the table beside this file. */
export function renameTargets(): Record<string, string> {
  return parseRenameTargets(readFileSync(RENAME_TARGETS_PATH, "utf8"));
}

/** The grammar-qualifier table, read from the same file. */
export function grammarQualifiers(): ReadonlyMap<string, GrammarQualifier> {
  return parseGrammarQualifiers(readFileSync(RENAME_TARGETS_PATH, "utf8"));
}
