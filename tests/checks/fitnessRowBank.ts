/**
 * THE FITNESS AXIS'S BANKED ROW COUNT — read upward off the tree, written into the record, and
 * never written downward (@SCN-SLF-004, 3F-3192).
 *
 * WHY A SECOND NUMBER EXISTS AT ALL. It was banked when the fitness axis had one author for both
 * of its books: a converted check's Evidence Obligation was raised from a configured row, its
 * Evidence Observation came from running that same row's command, and the corpus was EMITTED from
 * the rows as well. Delete a row, or mistype the key that holds them, and every side moved together
 * in one edit: the manifest read empty, the regenerated corpus held no scenarios, the pass ran
 * nothing, and the report had nothing left to say about any of it — single-entry wearing
 * double-entry's clothes (3F-3180, measured cold). Since 3F-3244 the corpus is AUTHORED beside the
 * rows, so an emptied manifest leaves its scenarios standing and the pass reds on each; what this
 * number is today is a cardinality belt that states the fall in one line, including where a row
 * and its scenario leave together.
 *
 * SO THE SECOND SOURCE IS A COUNT THE REPOSITORY BANKED, AND WHERE IT LIVES IS THE WHOLE ARGUMENT.
 * It goes in `quality-thresholds.yml`, which sits at the repository root and OUTSIDE the
 * `specController.` block a target writes to configure the tool. The typo this exists for cannot
 * reach it: different file, different edit, and a human lowering the figure has to write a commit
 * message saying why. A count kept inside that block would have emptied in the same edit and
 * inherited the fault rather than curing it.
 *
 * READ FROM THE MANIFEST, NEVER FROM THE CORPUS. Two authored sides are two sides to count, and
 * counting the one this bar is not held against would answer a different question from the one the
 * refusal states. And it is narrowed through `fitnessChecksOf`, the
 * LEDGER'S own reader, rather than by counting a JSON array here: a second reading of "how many
 * rows are there" would eventually answer differently from the reading that raises the
 * obligations, and a bar held against a population nobody else counts is a bar about nothing.
 *
 * THE EDIT IS SURGICAL, AND FOR `ratchet.ts`'s REASON. A record file is mostly comment — every
 * bar's justification lives in it — and emitting a parsed document back out drops every one of
 * them. So the text arrives as text and leaves as text, with one numeral different.
 *
 * IT ONLY EVER RAISES, AND THERE IS NO INPUT THAT WRITES A FALL — not a flag, not a defaulted
 * parameter, not a setting. `quality-thresholds.yml`'s own header states why the absence is
 * deliberate: an escape hatch a tool holds open is one nobody ever has to justify. A record that
 * must come down comes down by hand, with the reason in the commit, and @SCN-SLF-004's arm reads
 * these bytes to say so rather than trusting them.
 *
 * AN EQUAL COUNT IS REFUSED TOO. Writing the same numeral back changes nothing, and a no-op that
 * reports success reads, in a shell history or a run's own log, as a banking that happened.
 */

/**
 * WHY IT IS A CHECK RATHER THAN PROTOCOL (3F-3198). It writes a record, which is the shape 3F-3190's
 * discriminator sends to the product. The record is `quality-thresholds.yml` — this repository's own
 * banked bar, deliberately outside the `specController.` block a target configures — and the module
 * only ever raises it. It is the ratchet under an assertion about this tree, not a protocol.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { fitnessChecksOf } from "@3f-consulting/spec-controller-core/internal";

import { MalformedRecordError } from "../../packages/spec-controller/src/mutation-ratchet/record.js";

/**
 * The section of the record that holds the axis's banked size.
 *
 * A SECTION OF ITS OWN, BESIDE `mutation-gates` RATHER THAN INSIDE IT. A mutation gate's record is
 * two counts and an allowance, because a score falls for two unrelated reasons and the pair is
 * what tells them apart; a row count is one number that falls for one reason. Filed as a gate it
 * would owe a `total` and an allowance that mean nothing here, which is a second record format
 * wearing the first one's field names.
 */
export const FITNESS_AXIS = "fitness-axis";

/** The field the section states the count on. */
export const ROWS = "rows";

/**
 * Raised when a banking is not a raise — the up-only refusal, `FallRefusedError`'s twin over one
 * count instead of two.
 *
 * A TYPE OF ITS OWN, AND DELIBERATELY NOT `MalformedRecordError`. Every fault that refusal names is
 * a record somebody wrote badly, sitting in the file its reader is being sent to open. This one is
 * a record that reads perfectly and an ASK that is not a raise, so borrowing the other type would
 * send a reader off to hunt for a fault in a file that has none.
 */
export class FitnessFallRefusedError extends Error {
  constructor(
    /** The name the record was filed under, as the caller handed it over. */
    readonly recordFile: string,
    /** What the record already banks. */
    readonly banked: number,
    /** What the tree was just read to hold. */
    readonly found: number,
  ) {
    super(
      `${FITNESS_AXIS}: NOT A RAISE — the manifest holds ${found} fitness row(s) against a ` +
        `recorded ${banked}. The bank only ever raises, and this run does not: a count below the ` +
        "record would give the bar away, and one equal to it would write the record back " +
        "unchanged — a no-op that reads, in a shell history or a run's own log, as a banking " +
        "that happened. Nothing here lowers a record for you. If the fall is honest — a check " +
        `retired, a row deliberately dropped — edit ${recordFile} by hand and put the reason in ` +
        "the commit, because an escape hatch a tool holds open is one nobody ever has to justify.",
    );
    this.name = "FitnessFallRefusedError";
  }
}

/**
 * How many fitness rows the tree at `root` actually holds, as the LEDGER reads them.
 *
 * A MISTYPED KEY IS ZERO RATHER THAN A THROW, which is the whole point of taking the ledger's own
 * reader: `fitnessChecksOf` answers an empty registry for a key that is not an array, deliberately,
 * because config is data from outside. Zero is therefore the honest reading of the emptied axis —
 * and it is a fall, which is what the refusal below is for.
 */
export function fitnessRowCountAt(root: string): number {
  return fitnessChecksOf(fitnessRowsOf(root)).size;
}

/**
 * The rows themselves, as the target's manifest spells them, before the ledger's reader narrows
 * them.
 *
 * IT LIVES HERE BECAUSE THIS IS THE ONLY THING LEFT THAT READS THEM OFF DISK (3F-3272). It used to
 * sit beside the pass that ran each row's command, read once so the pass and the ledger's reader
 * could not be handed two different manifests; the pass is deleted and the ledger reads the
 * target's manifest at its own edge, so the one remaining caller is this count.
 */
function fitnessRowsOf(root: string): unknown {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: unknown };
  };
  return manifest.specController?.fitnessChecks;
}

/** How far a line is indented, in characters. */
function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * The line the count is written on: its key at any indent, its whole-number value, and whatever
 * spacing the author put around both — captured so it can be put back.
 */
const ROWS_LINE = new RegExp(`^(\\s*${ROWS}\\s*:\\s*)(\\d+)(\\s*)$`);

/** Where the count is written and what is written there. */
interface BankedRows {
  readonly at: number;
  readonly value: number;
}

/** Where the axis's block starts, or -1 where the record writes none. */
function sectionIn(lines: readonly string[]): number {
  return lines.findIndex((line) => line.trim() === `${FITNESS_AXIS}:`);
}

/**
 * What the record banks for the axis, or null where the record writes no block for it at all.
 *
 * THE READER THE BANK ALREADY HAD, HANDED OUT (@SCN-SLF-005, 3F-3193). The figure this writes is
 * the figure the self-reconciliation gate holds the tree to, and a gate that walked the record for
 * itself would be a second reading of the same file — two spellings of where the count lives that
 * agree until somebody edits one.
 *
 * ABSENT IS NULL AND POINTEDLY NOT ZERO (@SCN-SLF-006, 3F-3194). A record that banks nothing has
 * set no bar, which is a different fact from a bar of zero — `found >= 0` is true for every tree on
 * earth, so a defaulted figure would be a comparison that always succeeds wearing a comparison's
 * clothes. Every consumer of this tool that has converted nothing arrives here, and being redded by
 * a bar it never set is how a mechanism reds on first use.
 *
 * AND THAT READING IS NOW WITNESSED HERE RATHER THAN DOWNSTREAM, WHICH IS WHERE IT HAD TO GO. A bar
 * of zero is cleared by every count, so `fitnessAxisFallIn` and the gate below it stay silent
 * whichever way this answers — the defaulting and the cure are indistinguishable from outside this
 * function, at every count, forever. @SCN-SLF-006's arms therefore assert THIS return value, and a
 * `?? 0` here reds them where no exit code would.
 *
 * A BLOCK WITH NO COUNT IN IT IS STILL REFUSED BY NAME, because that is a record somebody wrote
 * badly rather than a record nobody wrote — the distinction `bankedRowsIn` already draws.
 */
export function bankedFitnessRowsIn(text: string, recordFile: string): number | null {
  const lines = text.split("\n");
  return sectionIn(lines) === -1 ? null : bankedRowsIn(lines, recordFile).value;
}

/**
 * The banked count's line, refused by name when the record does not write one.
 *
 * ABSENT IS REFUSED, NEVER DEFAULTED TO ZERO. A record read leniently as "nothing banked" is a bar
 * that every count on earth clears, enforced as though somebody had written it — the vacuous pass
 * this apparatus exists to close. The section is found first so the search for the count cannot
 * wander into some other section's field of the same name.
 */
function bankedRowsIn(lines: readonly string[], recordFile: string): BankedRows {
  const section = sectionIn(lines);
  if (section === -1) {
    throw new MalformedRecordError(
      recordFile,
      FITNESS_AXIS,
      FITNESS_AXIS,
      FITNESS_AXIS,
      "the record writes no block for the fitness axis, so there is nothing to raise.",
    );
  }
  const indent = indentOf(lines[section] ?? "");
  const ends = lines.findIndex(
    (line, at) => at > section && line.trim() !== "" && indentOf(line) <= indent,
  );
  const to = ends === -1 ? lines.length : ends;
  for (let at = section + 1; at < to; at += 1) {
    const written = ROWS_LINE.exec(lines[at] ?? "");
    if (written !== null) return { at, value: Number(written[2]) };
  }
  throw new MalformedRecordError(
    recordFile,
    FITNESS_AXIS,
    FITNESS_AXIS,
    ROWS,
    "the block holds no such line, so there is nothing to rewrite it into.",
  );
}

/**
 * Raise the record's banked row count to what the tree holds, leaving every other byte alone.
 *
 * @param text the record file's own bytes, as authored
 * @param found how many rows the manifest was just read to hold
 * @param recordFile the name the record is filed under, so a refusal can say which file it read
 * @returns the same bytes with one numeral different
 * @throws MalformedRecordError when the record writes no fitness-axis block, or that block holds
 *   no count line — named, never passed over and never sought outside the block.
 * @throws FitnessFallRefusedError when the tree does not hold MORE rows than the record banks.
 *   There is no input that writes it anyway.
 */
export function bankedFitnessRowsText(text: string, found: number, recordFile: string): string {
  const lines = text.split("\n");
  const banked = bankedRowsIn(lines, recordFile);
  if (found <= banked.value) throw new FitnessFallRefusedError(recordFile, banked.value, found);

  lines[banked.at] = (lines[banked.at] ?? "").replace(ROWS_LINE, `$1${found}$3`);
  return lines.join("\n");
}

/** What one banking did: where it wrote, and the count it wrote there. */
export interface BankedFitnessRows {
  readonly at: string;
  readonly rows: number;
}

/**
 * Read the tree's row count and write it into the record, resolved against the caller's tree.
 *
 * READ AND WRITTEN IN THE SAME ENCODING, so the round trip through the filesystem is a round trip
 * rather than a transcoding — the whole promise of a surgical edit being that what comes back out
 * is what went in.
 */
export function bankFitnessRows(root: string, recordFile: string): BankedFitnessRows {
  const found = fitnessRowCountAt(root);
  const at = join(root, recordFile);
  const raised = bankedFitnessRowsText(readFileSync(at, "utf8"), found, recordFile);

  writeFileSync(at, raised, "utf8");
  return { at, rows: found };
}
