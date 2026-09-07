/**
 * THE BANKED FIGURE, HELD AGAINST THE AXIS — a manifest that has lost fitness rows since the record
 * was banked reds the self-reconciliation gate, naming both numbers (@SCN-SLF-005, 3F-3193).
 *
 * WHAT THIS IS FOR. Since the check registry was retired, the fitness axis has had ONE author for
 * both of its books: a converted check's Evidence Obligation is generated from a configured row and
 * its Evidence Observation is produced by running that same row's command. Delete a row — or
 * mistype the key that holds them — and both sides move together in one edit. The manifest reads
 * empty, the regenerated corpus holds no scenarios, the pass runs nothing, and the report has
 * nothing left to say about any of it. Measured cold on 3F-3180: sixteen rows gone, exit 0, and not
 * one line a reader could tell from a healthy one. This comparison is the second, independently
 * authored source that edit cannot reach, and its whole job is to make that loud.
 *
 * WHERE IT RUNS IS THE LOAD-BEARING DECISION, AND IT IS NOT A FITNESS ROW. A fitness row's scenario
 * is GENERATED into the corpus, so an emptied corpus would take this comparison away with it —
 * rebuilding, inside the cure, the exact recursion described below for the drift guard. It runs in
 * `balance:self` instead, which is already its own `ci.yml` step, outside the corpus, and is where
 * a bar is read (3F-2509).
 *
 * AND THE COUNT COMES OFF THE MANIFEST, NEVER OFF THE GENERATED CORPUS. The corpus is derived from
 * the rows, so a count taken from it and held to this figure would be a derivation checked against
 * itself — the same single-author fault arriving through its own cure. It is read through
 * `fitnessRowCountAt`, which is the LEDGER'S own reader, so the bar is held against exactly the
 * population the obligations are raised over.
 *
 * ═══ WHAT A GREEN FROM THIS CHECK DOES NOT MEAN ═══
 *
 * IT DOES NOT CURE `@SCN-FIT-014`'s SELF-REFERENCE, AND A READER WHO TAKES IT AS HAVING DONE SO HAS
 * READ IT WRONG. The corpus drift guard regenerates the corpus and diffs it, and the command works
 * — but its own scenario is generated into the very file it guards, so an emptied corpus takes its
 * witness with it and `0 scenarios` is an exit 0. It cannot detect its own absence. This banked
 * count does not fix that: it changes the CONSEQUENCE, not the guard. An emptied corpus now reds
 * here, on the count, even though the drift guard never ran to notice that it was gone. So the
 * residual SHRINKS AND DOES NOT CLOSE — `@SCN-FIT-014` remains a check whose green means less than
 * a reader takes it to mean, and what changed is only that its silence is no longer the last word.
 * Moving it out of the artefact it guards is a separate question about generator design and is
 * deliberately not built here.
 *
 * AND IT DOES NOT MAKE THE INCIDENTAL `tests/checks/*.test.ts` FILES REDUNDANT. Three of them
 * already red on an emptied manifest — `complexityExceptionsReconciliation`,
 * `lintScnSubIssuesCli`, `mutationGateWiring` — each by accident, because one check wanted to
 * assert that ITS OWN row is configured. (Five, until 3F-3211 retired the two vocabulary ones.)
 * Once a designed witness exists somebody will read those three as duplicate coverage.
 * They are not. They witness a different fault:
 *
 *   THIS IS A CARDINALITY WITNESS. It compares a number. Sixteen rows becoming zero, or fifteen,
 *   reds it.
 *
 *   A SUBSTITUTION PRESERVES THE NUMBER. Delete one row and add another and the count is still
 *   sixteen, and this mechanism is SILENT BY CONSTRUCTION — no amount of care in the implementation
 *   below changes that, because arithmetic is what it does.
 *
 *   THE FIVE ARE IDENTITY WITNESSES FOR THEIR OWN ROWS. `complexityExceptionsReconciliation.test.ts`
 *   asserts that `SCN-CPX-003` SPECIFICALLY is named by a configured row; a substitution reds it and
 *   does not red the count.
 *
 * THE ASYMMETRY, STATED RATHER THAN LEFT TO BE FOUND: only five of the sixteen rows have an identity
 * witness at all, and those five are accidents of what one check happened to want to assert about
 * itself. ELEVEN ROWS CAN BE SWAPPED OUT WITH NOTHING NOTICING. That gap is real, it is not this
 * mechanism's to close, and a docblock implying otherwise would be the overclaim this repository
 * keeps catching. 3F-3186 owns that population and 3F-3189 is the spike that will say which tests
 * are the only witness to something; do not delete or alter any of the five on the strength of this.
 *
 * Parent: 3F-3180 (sub-issue 2 of 3).
 */

/**
 * WHY IT IS A CHECK RATHER THAN PROTOCOL (3F-3198). It reads the banked figure and REFUSES a manifest
 * that has fallen below it: an assertion about this repository reported as a pass or a refusal, which
 * is the plainest case of a check in the tree. It reads a record on the way there, as every check
 * does; reading one is not what makes a module protocol.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { RECORD_FILE } from "../../packages/spec-controller/src/mutation-ratchet/reconcile.js";

import { bankedFitnessRowsIn, FITNESS_AXIS, fitnessRowCountAt } from "./fitnessRowBank.js";

/** What a run found against what its record banks — the two numbers a refusal has to carry. */
export interface FitnessAxisFall {
  /** What the record banks for the axis. */
  readonly banked: number;
  /** What the manifest was just read to hold. */
  readonly found: number;
}

/**
 * The fall a record and a manifest disagree by, or null where there is nothing to report.
 *
 * AN EQUAL COUNT IS NOT A FALL, WHICH IS THE ASYMMETRY WITH THE BANK. `bankFitnessRows` refuses an
 * equal count, because writing the same numeral back changes nothing and a no-op reporting success
 * reads as a banking that happened. Here the same equality is the ordinary healthy state of every
 * green build, so a shared comparison between the two would red the tree on every push. Two rules
 * about two different acts.
 *
 * AND A REPOSITORY THAT NEVER BANKED IS SILENT, NOT ZEROED (@SCN-SLF-006, 3F-3194). Both nulls
 * below are that fact: no record file, and a record filing no block for the axis. Neither has set a
 * bar, and a bar it never set must not red it — every consumer that has converted nothing arrives
 * here first, so a figure defaulted in would be the shape that reds a tool on first use. The two
 * `null` returns are the only place that distinction is observable: read as zero it would still be
 * cleared by every count, so this function's own callers cannot tell the two apart and
 * @SCN-SLF-006's arms watch `bankedFitnessRowsIn` instead.
 *
 * @param record the record file's own bytes, or null where the tree files no record at all
 * @param found how many rows the manifest was just read to hold
 */
export function fitnessAxisFallIn(record: string | null, found: number): FitnessAxisFall | null {
  if (record === null) return null;
  const banked = bankedFitnessRowsIn(record, RECORD_FILE);
  if (banked === null) return null;
  return found < banked ? { banked, found } : null;
}

/**
 * The sentence a fall is reported in, naming both numbers and the file that banks one of them.
 *
 * BOTH NUMBERS, IN THE LINE ITSELF. A reader meeting this red is told what the record banks and what
 * the manifest now holds, in one sentence, without going to look. A line saying only that the axis
 * had shrunk would send them off to find the two figures the sentence was the right place to state.
 *
 * AND IT NAMES THE ONE ROUTE DOWN, in `quality-thresholds.yml`'s own register. There is no flag that
 * lowers this record and there must not be one: an escape hatch a tool holds open is one nobody ever
 * has to justify, and it would be reached for on the first inconvenient red rather than the first
 * honest one.
 */
export function fitnessAxisRefusal(fall: FitnessAxisFall, recordFile: string): string {
  return (
    `balance:self: ${FITNESS_AXIS}: THE AXIS HAS LOST ROWS — banked ${fall.banked}, found ` +
    `${fall.found}. ${recordFile} banks ${fall.banked} fitness row(s) and this tree's manifest now ` +
    `holds ${fall.found}.\n` +
    "Both books on this axis have one author: the Evidence Obligations are generated from the " +
    "configured rows and the Evidence Observations come from running those same rows, so one edit " +
    "moves both sides together and no surviving side is left to disagree. That is why the figure " +
    "is banked in a file the edit cannot reach, and why this is read before the reconciliation " +
    "rather than reported inside it — a ledger over an emptied axis reconciles a population that " +
    "is no longer there, and says nothing about the rows that left.\n" +
    "Nothing here lowers a record for you. If the fall is honest — a check retired, a row " +
    `deliberately dropped — edit ${recordFile} by hand and put the reason in the commit.`
  );
}

/**
 * Read the tree's rows and its record, and answer the refusal a fall owes — or null.
 *
 * THE RECORD IS RESOLVED AGAINST THE TREE BEING JUDGED, like `features/` and `package.json` and
 * unlike the four evidence reports: a project's bars are a fact ABOUT that project, not output this
 * run produced. `--root` therefore moves the record read with everything else it moves.
 */
export function fitnessAxisRefusalAt(root: string, recordFile: string = RECORD_FILE): string | null {
  const at = join(root, recordFile);
  const fall = fitnessAxisFallIn(
    existsSync(at) ? readFileSync(at, "utf8") : null,
    fitnessRowCountAt(root),
  );
  return fall === null ? null : fitnessAxisRefusal(fall, at);
}
