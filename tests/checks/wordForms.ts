/**
 * Word FORMS and word SENSE — the two judgements that must happen before the vocabulary
 * gates can run, split out of `vocabAudit.ts` (@SCN-VOC-018, 3F-2329).
 *
 * Split rather than added there because that module sits at a `max-lines` exception, and an
 * exception buys no headroom (`complexity-threshold.feature`). The pairing is not incidental:
 * `homographSense` needs the stemmer, and both answer "what IS this token" ahead of "is it
 * allowed", which is the engine's question.
 */

import { HOMOGRAPH_QUALIFIERS } from "./vocabWordSets.js";

/** Naive stem — folds the plural inflections this vocabulary actually uses. */
export function singularise(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (/(ses|xes|zes|ches|shes)$/.test(word) && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

/**
 * Which sense a @SCN-VOC-018 homograph carries HERE — the external tool's grammar, or
 * authored vocabulary. `null` for a word the qualifier table does not rule on.
 *
 * Pure over an injected sequence so the @unit arm can prove BOTH directions without a tree:
 * a matcher that always answered `grammar` passes the grammar cases alone, and that is the
 * failure that greens a retired word forever with nothing saying so.
 *
 * `following` is the next word in the SOURCE, used only where the judged sequence has run
 * out (3F-2432). A TypeScript code region is one segment per name, so a `follows` qualifier
 * standing beside the word is never inside the sequence and the rule could not fire there at
 * all. One word of lookahead, and no further: the qualifier list is untouched, so a word with
 * nothing after it stays vocabulary and the pass is still earned by position.
 */
export function homographSense(
  words: readonly string[],
  at: number,
  following?: string,
): "grammar" | "vocabulary" | null {
  const word = (words[at] ?? "").toLowerCase();
  if (word === "") return null;
  const rule = HOMOGRAPH_QUALIFIERS.get(word) ?? HOMOGRAPH_QUALIFIERS.get(singularise(word));
  if (rule === undefined) return null;
  // Only the exact spelling the table names can be grammar; an inflection never is. This is
  // what stops the reserved-word STEM lookup below greening the whole family.
  if (!HOMOGRAPH_QUALIFIERS.has(word)) return "vocabulary";
  const satisfied =
    rule.match === "follows"
      ? rule.words.includes(singularise((words[at + 1] ?? following ?? "").toLowerCase()))
      : words.some((w, i) => i !== at && rule.words.includes(singularise(w.toLowerCase())));
  return satisfied ? "grammar" : "vocabulary";
}
