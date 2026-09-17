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
 * file parses diffs and decides the gate; this is a corpus comparison over different inputs. And it
 * is already over the standard on `complexity` and on `max-lines-per-function`, so under
 * @SCN-FIT-001 any change touching it reds until it comes back under; this module is under the
 * standard. Which files carry that debt is deliberately written down nowhere — `pnpm exec eslint`
 * reports every standing violation on every run.
 *
 * THE RENUMBER ARM CAME HERE FOR THE SAME REASON (@SCN-SSM-015, 3F-3057). "Is this scenario's body
 * otherwise unchanged" is the same shape of question over the same two `byCode` maps, and it was
 * being answered per HUNK — a pair emitted only when the hunk held exactly one removed tag-line
 * code, one added one, and no other changed line. All three are facts about the hunk, so an
 * unrelated edit to a neighbouring scenario, or a second renumber landing beside the first, threw
 * the pair away. A second module would have meant a second corpus read for a strictly weaker reason.
 *
 * ONE CORPUS READER. The extents come off `parseTaggedScenarios`' existing walk, reached through
 * core's `/internal` seam. There is no second Gherkin parse here; that walk was extracted precisely
 * so no second reader could grow beside it.
 */

import { parseTaggedScenarios } from "@3f-consulting/spec-controller-core/internal";
import type { RenumberPair } from "./scnSubIssueGate.js";

/** What comparing one feature file's two sources says. */
export interface FeatureScenarioChanges {
  /** Codes present in BOTH sources whose scenario text differs, in head document order. */
  updatedCodes: string[];
  /**
   * Codes that DISAPPEARED paired with codes that APPEARED on the same scenario text — a relabel
   * and nothing else. In base document order; each appeared code is claimed at most once.
   */
  renumberPairs: RenumberPair[];
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
 * The one token a relabel changes, replaced on BOTH sides so everything else can be compared.
 * ONLY the `@`-sigilled token is normalised: the code is carried as a tag, and any other textual
 * difference — a changed step, a bare prose id left behind — must defeat the pair. That is the
 * conservative direction and the one the gate needs, because the decision passes a renumber
 * UNCONDITIONALLY: an over-eager pairing is not a mis-report but a hole through the whole gate.
 */
const RELABELLED_TAG = " @SCN ";

function unlabelled(text: string, code: string): string {
  return text.split(`@${code}`).join(RELABELLED_TAG);
}

/**
 * Pair each disappeared code with the first unclaimed appeared code carrying the same scenario
 * text. First match in document order, each appeared code claimed once — deterministic, and the
 * only case where the choice is arbitrary is two byte-identical scenarios renumbered together,
 * where either pairing says the same thing.
 *
 * A code present on BOTH sides is never a renumber, which is the same shared-code rule the update
 * arm runs on and is what keeps a scenario merely MOVED out of the pairs with nothing special-cased.
 */
function pairRenumbers(base: CorpusText, head: CorpusText): RenumberPair[] {
  const appeared = [...head.byCode.keys()].filter((code) => !base.byCode.has(code));
  const claimed = new Set<string>();
  const pairs: RenumberPair[] = [];

  for (const removed of [...base.byCode.keys()].filter((code) => !head.byCode.has(code))) {
    const before = unlabelled(base.byCode.get(removed)!, removed);
    for (const added of appeared) {
      if (claimed.has(added)) continue;
      if (before !== unlabelled(head.byCode.get(added)!, added)) continue;
      claimed.add(added);
      pairs.push({ removed, added });
      break;
    }
  }

  return pairs;
}

/**
 * Compare one feature file's two sources.
 *
 * A code present on only ONE side is never `updated` — that is an add, a delete or a renumber. The
 * first two are still the diff's own questions, read off the tag lines it added and removed; the
 * renumber is answered here, because "this scenario's body is otherwise unchanged" is a fact about
 * the scenario and no hunk-local test can reach it.
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

  return {
    updatedCodes,
    renumberPairs: pairRenumbers(base, head),
    changedOutsideEveryScenario: base.residue !== head.residue,
  };
}
