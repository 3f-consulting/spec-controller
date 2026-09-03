/**
 * WHICH SCENARIOS' TEXT DIFFERS between a feature file's BASE source and its HEAD source
 * (@SCN-SSM-010, 3F-3044) — the reading the scn-subissue gate's UPDATED-code arm is taken from.
 *
 * THE QUESTION IT REPLACES. `detectUpdatedCodes` accumulated per HUNK: every `@SCN` code on a
 * CONTEXT line, reported as updated once any other line in that hunk changed. True as a
 * measurement — those codes are in the hunk — and an answer to a different question. "Which tag
 * lines fall inside this hunk" is a fact about the DIFF; "which scenario contains this change" is a
 * fact about the CORPUS. A scenario's last step is an ordinary place to change and is where the two
 * come apart: three lines of context leave the edited scenario's own tag line outside the window and
 * the following scenario's inside it, so the code reported is the neighbour's (PR #239, 3F-3041).
 *
 * WHY NOT "WHICH SCENARIO CONTAINS THIS LINE". That keeps a POSITION in the question, and a position
 * can only come from the diff. Measured at the parent's Analysis: `changedLinesByFile` already
 * implements exactly that reading and returns `[]` for a PURE LINE REMOVAL — a removed line holds no
 * position in the new file. Its own docblock accepts that deliberately, and is right to for test
 * blocks ("deleting a test is not the leak this gate hunts") and wrong for Gherkin, where removing a
 * step IS a change to that scenario's behaviour. Adopting it would trade a mis-attribution for a
 * silent miss. Comparing the two SOURCES has no boundary to get wrong: two sources in, a set of
 * codes out, no line arithmetic and no context width for anyone to defend.
 *
 * A NEW MODULE RATHER THAN MORE OF `scnSubIssueGate.ts`, on design and on mechanism, agreeing. That
 * file parses diffs and decides the gate; this is a corpus comparison over different inputs. And
 * `complexityExceptions.mjs` freezes it at its measured `max-lines`, buying not one line of
 * headroom, so growth there reds `lint:complexity` by construction.
 *
 * ONE CORPUS READER. The extents come off `parseTaggedScenarios`' existing walk, reached through
 * core's `/internal` seam. There is no second Gherkin parse here; that walk was extracted precisely
 * so no second reader could grow beside it.
 */

import { parseTaggedScenarios } from "@3f-consulting/spec-controller-core/internal";

/** What comparing one feature file's two sources says. */
export interface FeatureScenarioChanges {
  /** Codes present in BOTH sources whose scenario text differs, in head document order. */
  updatedCodes: string[];
  /** Something changed that lies inside no scenario in either source. */
  changedOutsideEveryScenario: boolean;
}

/** One source, read as the two things the comparison needs from it. */
interface CorpusText {
  /**
   * Each `@SCN` code's scenario text. A HOISTED code — one id shared by several scenarios, a
   * corpus-authoring fault this parser deliberately surfaces rather than hides — yields several
   * blocks for one code; their text is JOINED, so the code reports updated when any of them changes.
   * No new policy: the existing visible fault stays visible.
   */
  byCode: Map<string, string>;
  /**
   * Everything left once every named scenario's extent is removed — a `Feature:` or `Rule:`
   * preamble, a comment between scenarios, a scenario carrying no `@SCN` (nothing can name it, so
   * a change to it is a change no code accounts for, and saying so is the point).
   *
   * BLANK LINES ARE DROPPED. Deleting a scenario takes its blank separator with it, and a shifted
   * blank is not a change to anything — counting it would report a change outside every scenario on
   * every deletion, which is the noise that gets a report ignored.
   */
  residue: string;
}

function readCorpus(source: string): CorpusText {
  const lines = source.split(/\r?\n/);
  const named = new Array<boolean>(lines.length).fill(false);
  const byCode = new Map<string, string>();

  for (const scenario of parseTaggedScenarios(source)) {
    const text = lines.slice(scenario.startLine - 1, scenario.endLine).join("\n");
    const held = byCode.get(scenario.scnId);
    byCode.set(scenario.scnId, held === undefined ? text : `${held}\n${text}`);
    for (let line = scenario.startLine; line <= scenario.endLine; line += 1) named[line - 1] = true;
  }

  const residue = lines.filter((line, i) => named[i] !== true && line.trim() !== "").join("\n");
  return { byCode, residue };
}

/**
 * Compare one feature file's two sources.
 *
 * A code present on only ONE side is never `updated` — that is an add, a delete or a renumber, and
 * each already has its own detector reading the tag lines the diff added or removed.
 *
 * An EMPTY source is the honest reading of a file this change adds (no base) or deletes (no head):
 * neither is an update, and both fall out of the shared-code rule with nothing special-cased.
 *
 * An UNPARSEABLE source THROWS, from the walk, exactly as `parseTaggedScenarios` already does. The
 * base is a commit that passed the Gherkin parse gate on main, so it is unreachable in a real run —
 * the floor is what stops a future caller re-opening the hole quietly.
 */
export function readScenarioChanges(
  baseSource: string,
  headSource: string
): FeatureScenarioChanges {
  const base = readCorpus(baseSource);
  const head = readCorpus(headSource);

  const updatedCodes: string[] = [];
  for (const [code, text] of head.byCode) {
    const before = base.byCode.get(code);
    if (before !== undefined && before !== text) updatedCodes.push(code);
  }

  return { updatedCodes, changedOutsideEveryScenario: base.residue !== head.residue };
}
