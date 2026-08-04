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
export function parseRenameTargets(markdown: string): Record<string, string> {
  const targets: Record<string, string> = {};
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.split("|").slice(1, -1).map((cell) => cell.trim());
    const [term, replacement] = cells;
    if (term === undefined || replacement === undefined) continue;
    if (term === "" || /^-+$/.test(term)) continue;
    if (term.toLowerCase() === "retired term") continue;
    targets[term.toLowerCase()] = replacement;
  }
  return targets;
}

/** The rename-target map, read from the table beside this file. */
export function renameTargets(): Record<string, string> {
  return parseRenameTargets(readFileSync(RENAME_TARGETS_PATH, "utf8"));
}
