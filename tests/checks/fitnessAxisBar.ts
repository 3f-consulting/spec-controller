/**
 * THE BANKED FIGURE, HELD AGAINST THE AXIS — a manifest that has lost fitness rows since the record
 * was banked reds the self-reconciliation gate, naming both numbers (@SCN-SLF-005, 3F-3193).
 *
 * WHAT THIS IS FOR. It was built when the fitness axis had ONE author for both of its books: a
 * converted check's Evidence Obligation was raised from a configured row, its Evidence Observation
 * came from running that same row's command, and the corpus those scenarios lived in was EMITTED
 * from the rows too. Delete a row — or mistype the key that holds them — and every side moved
 * together in one edit: the manifest read empty, the regenerated corpus held no scenarios, the pass
 * ran nothing, and the report had nothing left to say about any of it. Measured cold on 3F-3180:
 * sixteen rows gone, exit 0, and not one line a reader could tell from a healthy one.
 *
 * THAT IS NO LONGER THE STANDING SHAPE, AND THIS IS NO LONGER THE ONLY SURVIVING SIDE (3F-3244).
 * The corpus is AUTHORED now, beside the rows rather than from them, so an emptied manifest leaves
 * twelve scenarios standing that nothing configures — the pass reds on each, and the ledger's
 * census names them. The second, independently authored source is the corpus itself.
 *
 * SO WHAT THIS IS TODAY IS A CARDINALITY BELT, AND IT IS WORTH KEEPING AS ONE. It answers before
 * the books are opened, in one line naming both figures, over the population the obligations are
 * raised over — a plainer sentence than a reader assembles from a wall of unconfigured-scenario
 * reds, and one that still fires where a row and its scenario leave together.
 *
 * WHERE IT RUNS IS STILL NOT A FITNESS ROW. A comparison held as a row would vanish with the rows
 * it is there to notice the loss of — rebuilding, inside the cure, the recursion that made the
 * corpus drift guard unable to detect its own absence (deleted at 3F-3243). It runs in
 * `balance:self` instead, which is already its own `ci.yml` step and is where a bar is read
 * (3F-2509).
 *
 * AND THE COUNT COMES OFF THE MANIFEST, NEVER OFF THE CORPUS. Two authored sides are two sides to
 * count, and counting the one this belt is not held against would answer a different question from
 * the one the refusal states. It is read through `fitnessRowCountAt`, which is the LEDGER'S own
 * reader, so the bar is held against exactly the population the obligations are raised over.
 *
 * ═══ WHAT A GREEN FROM THIS CHECK DOES NOT MEAN ═══
 *
 * IT DOES NOT MAKE THE INCIDENTAL `tests/checks/*.test.ts` FILES REDUNDANT. Three of them
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
    "This is a cardinality belt over the rows, and it says the fall in one line naming both " +
    "figures. The scenarios in features/fitness-checks.feature are authored beside these rows " +
    "rather than emitted from them, so an emptied manifest leaves every scenario standing and is " +
    "named scenario by scenario on the ledger; the figure is banked in a file the edit cannot " +
    "reach so that the count itself still speaks, and it is read before the reconciliation " +
    "rather than inside it — a ledger over an emptied axis reconciles a population that " +
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
