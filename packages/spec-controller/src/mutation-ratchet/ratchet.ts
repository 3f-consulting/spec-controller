/**
 * THE RECORDER — a measurement written into the record as a surgical text edit (@SCN-RAT-011,
 * 3F-2801), refused outright when it is not a raise (@SCN-RAT-012, 3F-2802), and kept inside the
 * block it names when a sibling gate banks the very same counts (@SCN-RAT-013, 3F-2803).
 *
 * A SURGICAL TEXT EDIT, NEVER A RE-DUMP, AND THAT IS THE WHOLE OF THIS MODULE'S DIFFICULTY.
 * Emitting the parsed document back out is the obvious way to write two figures into a record, and
 * it throws away every comment on the way through — comments are not part of the document a parser
 * hands back. A record file is MOSTLY comment: every allowance's justification lives there, and so
 * does the argument for the bar sitting where it sits. So a recorder that re-serialised would
 * delete the reasoning for the very bar it was raising, quietly, in the same commit that claims to
 * be strengthening it, and with the two figures perfectly correct.
 *
 * SO THE TEXT ARRIVES AS TEXT AND LEAVES AS TEXT. Nothing below reaches for a document model. The
 * record is split on its own line breaks, two lines are rewritten where they lie, and the pieces
 * are joined back up — which is why what comes back is the bytes it was handed with two numerals
 * different, down to the blank lines, the indent style, the quoting and the trailing newline.
 *
 * AND THE EDIT IS BOUNDED BY THE NAMED GATE'S OWN BLOCK. A record is a wall of near-identical
 * blocks holding identically-named lines, so a rewriter that took the first `detected` line it met
 * would raise whichever gate happens to be written first and report success on the one it was
 * asked about. The block runs from the gate's key line to the first line after it indented no
 * further than that key — the next gate, or the comment introducing it. The search for that key
 * starts at the gates section rather than the top of the file, because a record is a project's own
 * policy document and may hold anything else it likes above the bars.
 *
 * THE LINES ARE THEN FOUND BY POSITION INSIDE THAT BLOCK, NEVER BY THE FIGURES THEY CARRY, and the
 * difference is invisible over almost every record. A rewriter that struck the OLD numerals out
 * wherever they first appeared would be byte-preserving, would move exactly two lines, would keep
 * every comment, and would write precisely the right two lines over any record whose gates hold
 * distinct figures. It writes the WRONG gate only when two gates bank the same counts — and then
 * silently, leaving the two gates stating figures neither of the trees they describe ever measured.
 * @SCN-RAT-013's record plants that collision on purpose, and authors it with the named gate above
 * its twin and below it, because either rewriter is right by luck when the gate it wants is first.
 *
 * A LINE THE BLOCK DOES NOT HOLD IS AN ERROR NAMING THE LINE, NEVER A NO-OP. Both of the other
 * answers are worse than a refusal: skipping quietly banks half a measurement and reports a raise
 * that did not happen, and searching on past the block's end rewrites some other gate's figure with
 * this gate's count.
 *
 * EVERY FAULT IN THE RECORD IS `record.ts`'s ONE REFUSAL TYPE, and its section name and gate
 * placeholder are imported rather than respelled. A caller is told to catch `MalformedRecordError`
 * for a record it cannot read, so a record fault raised here under a second type is one that caller
 * sails past — and a second copy of the section's name is the agreeing-until-somebody-edits-one
 * shape this library exists to remove.
 *
 * AND THE UP-ONLY REFUSAL IS THE ONE THING HERE THAT IS NOT A RECORD FAULT, WHICH IS WHY IT CARRIES
 * ITS OWN TYPE. Every fault that other refusal names is a record somebody wrote badly, sitting in
 * the file its reader is being sent to open. A run that is not a raise arrives over a record that
 * reads perfectly, so borrowing that type would send its reader hunting through a file with nothing
 * wrong in it — the exact harm `record.ts` refuses to do to the caller who mistyped a gate name.
 *
 * THE RATCHET ONLY EVER RAISES, AND AN EQUAL MEASUREMENT IS REFUSED TOO. Writing the same two
 * figures back changes nothing, and a no-op that reports success reads, in a shell history or a
 * run's own log, as a ratchet that happened; the refusal is what keeps "I banked it" meaning
 * something. It is the SCORE that is compared rather than the pair, because a run can move both of
 * its counts and hold its ratio exactly — over a record already stating that score, writing it
 * raises nothing.
 *
 * AND THE REFUSAL HAS NO OVERRIDE, DELIBERATELY. A fall that is honest — code deleted, a scope
 * narrowed — is a conscious bump: a human edits the two figures and puts the reason in the commit,
 * which is the route the refusal names and the same route the shrunk-population red already sends
 * its reader down. An escape hatch a tool offers is one nobody has to justify, and it would be
 * reached for on the first red night rather than the first honest one. So there is no input here
 * that writes a fall — not a flag, not a defaulted parameter, not a setting — and @SCN-RAT-012's
 * arm asserts that over this module's own bytes rather than trusting it.
 *
 * NOTHING HERE NAMES A PROJECT, A CHECK, A RUNNER, A WORKFLOW OR A REPOSITORY. The gate, the
 * record's own name and the tree it sits in all arrive from the caller.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  counts,
  MalformedRecordError,
  MUTATION_GATES,
  scoreRoseOver,
  WHOLE_GATE,
} from "./record.js";
import { type MutationMeasurement } from "./verdict.js";

/**
 * Raised when a run is not a raise — the up-only refusal (@SCN-RAT-012, 3F-2802).
 *
 * A SECOND TYPE, AND DELIBERATELY NOT `MalformedRecordError`. Every fault that refusal names is a
 * record somebody wrote badly, sitting in the file its reader is being sent to open. This one is a
 * record that reads perfectly and an ASK that is not a raise, so borrowing the other type would
 * send a reader off to hunt for a fault in a file that has none.
 */
export class FallRefusedError extends Error {
  constructor(
    /** The name the record was filed under, as the caller handed it over. */
    readonly recordFile: string,
    /** The gate that was to have been raised, as the caller names it. */
    readonly gate: string,
    banked: GateFigures,
    measurement: MutationMeasurement,
  ) {
    super(
      `${gate}: NOT A RAISE — measured ${counts(measurement.detected, measurement.total)} against ` +
        `a recorded ${counts(banked.detected, banked.total)}. The ratchet only ever raises, and ` +
        "this run does not: a measurement below the record would give the bar away, and one " +
        "scoring exactly what the record already states would write it back unchanged — a no-op " +
        "that reads, in a shell history or a run's own log, as a ratchet that happened. Nothing " +
        "here lowers a record for you. If the fall is honest — code deleted, a scope narrowed — " +
        `edit ${recordFile} by hand and put the reason in the commit, because an escape hatch a ` +
        "tool holds open is one nobody ever has to justify.",
    );
    this.name = "FallRefusedError";
  }
}

/** The half-open span of lines holding one gate's block, its key line excluded. */
interface GateBlock {
  readonly from: number;
  readonly to: number;
}

/** How far a line is indented, in characters. */
function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * The line one field is written on: its key at any indent, its whole-number value, and whatever
 * spacing the author put around both.
 *
 * THE SPACING IS CAPTURED SO IT CAN BE PUT BACK. `detected:   202` and `detected: 202` are the same
 * record and different bytes, and a rewriter that normalised one into the other would be re-dumping
 * one line at a time.
 */
function fieldLine(field: string): RegExp {
  return new RegExp(`^(\\s*${field}\\s*:\\s*)(\\d+)(\\s*)$`);
}

/** Where the gates section's own key line sits, refused when the record is not written as one. */
function gatesSectionAt(lines: readonly string[], gate: string, recordFile: string): number {
  const at = lines.findIndex((line) => line.trim() === `${MUTATION_GATES}:`);
  if (at === -1) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      MUTATION_GATES,
      "the section is not written as a block of gates, so it holds no block to rewrite.",
    );
  }
  return at;
}

/**
 * The lines holding one gate's block, refused when the record writes no block for that gate.
 *
 * ENDING AT THE FIRST LINE INDENTED NO FURTHER THAN THE KEY — the next gate, or the comment
 * introducing it. That boundary is what keeps a rewrite inside the gate it was asked about when the
 * line it is looking for is not there to be found.
 */
function gateBlockOf(lines: readonly string[], gate: string, recordFile: string): GateBlock {
  const section = gatesSectionAt(lines, gate, recordFile);
  const sectionIndent = indentOf(lines[section] ?? "");
  const key = lines.findIndex(
    (line, at) => at > section && line.trim() === `${gate}:` && indentOf(line) > sectionIndent,
  );
  if (key === -1) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      WHOLE_GATE,
      "the record writes no block for this gate, so there is nothing to raise.",
    );
  }
  const indent = indentOf(lines[key] ?? "");
  const ends = lines.findIndex(
    (line, at) => at > key && line.trim() !== "" && indentOf(line) <= indent,
  );
  return { from: key + 1, to: ends === -1 ? lines.length : ends };
}

/**
 * Where one field's line lies inside a block, and the figure written on it.
 *
 * THE LINE IS FOUND ONCE AND USED TWICE — read from, then written to. A recorder that searched for
 * `detected` to read the record and searched again to raise it could find two different lines the
 * day a block holds two, and would then compare against one and rewrite the other.
 */
interface Figure {
  readonly at: number;
  readonly value: number;
}

/**
 * One field's line inside a block, refused by the field's name when the block holds no such line.
 *
 * BOTH FIGURES ARE FOUND BEFORE EITHER IS COMPARED OR WRITTEN, which is what keeps this refusal
 * ahead of the up-only one: a block missing a line is a record fault, and a reader sent to argue
 * about scores over a half-written block has been sent to the wrong question.
 */
function figureIn(
  lines: readonly string[],
  block: GateBlock,
  field: string,
  gate: string,
  recordFile: string,
): Figure {
  const pattern = fieldLine(field);
  for (let at = block.from; at < block.to; at += 1) {
    const written = pattern.exec(lines[at] ?? "");
    if (written !== null) return { at, value: Number(written[2]) };
  }
  throw new MalformedRecordError(
    recordFile,
    MUTATION_GATES,
    gate,
    field,
    "the gate's block holds no such line, so there is nothing to rewrite it into.",
  );
}

/** One gate's two figures, as the record currently writes them. */
interface GateFigures {
  readonly detected: number;
  readonly total: number;
}

/**
 * Refuse a measurement that is not a raise, naming both scores and the one route down.
 *
 * ASKED OF THE SCORE, NEVER OF THE PAIR. A run that moved both of its counts and held its ratio
 * exactly is a run that raises nothing, and a recorder written as "the very same two figures" writes
 * it — a record rewritten to say what it already said.
 */
function refuseUnlessRaised(
  gate: string,
  banked: GateFigures,
  measurement: MutationMeasurement,
  recordFile: string,
): void {
  if (scoreRoseOver(measurement.detected, measurement.total, banked.detected, banked.total)) return;
  throw new FallRefusedError(recordFile, gate, banked, measurement);
}

/** One located line with its figure rewritten, and every byte of its spacing kept. */
function rewritten(line: string, field: string, value: number): string {
  return line.replace(fieldLine(field), `$1${value}$3`);
}

/**
 * Raise a gate's two recorded figures to a measurement, leaving every other byte alone.
 *
 * @param text the record file's own bytes, as authored
 * @param gate the gate to raise, as the caller names it
 * @param measurement the run whose counts are being banked
 * @param recordFile the name the record is filed under, so a refusal can say which file it read
 * @returns the same bytes with two numerals different
 * @throws MalformedRecordError when the record writes no block for the gate, or that block holds no
 *   line to rewrite — named by the line, never passed over and never sought outside the block.
 * @throws FallRefusedError when the measurement does not score above what the gate already banks.
 *   There is no input that writes it anyway.
 */
export function raisedRecordText(
  text: string,
  gate: string,
  measurement: MutationMeasurement,
  recordFile: string,
): string {
  const lines = text.split("\n");
  const block = gateBlockOf(lines, gate, recordFile);
  const detected = figureIn(lines, block, "detected", gate, recordFile);
  const total = figureIn(lines, block, "total", gate, recordFile);

  refuseUnlessRaised(gate, { detected: detected.value, total: total.value }, measurement, recordFile);

  lines[detected.at] = rewritten(lines[detected.at] ?? "", "detected", measurement.detected);
  lines[total.at] = rewritten(lines[total.at] ?? "", "total", measurement.total);

  return lines.join("\n");
}

/**
 * Write a raised record back over the file it was read from, resolved against the caller's tree.
 *
 * THE ROOT ARRIVES, AND IS NEVER THIS MODULE'S OWN LOCATION. A recorder that joined the directory it
 * was installed into is correct only while it sits inside the tree it is writing to, and stops
 * being so the moment it is installed as a dependency of one.
 *
 * READ AND WRITTEN IN THE SAME ENCODING, so the round trip through the filesystem is a round trip
 * rather than a transcoding — the whole promise of this module being that what comes back out is
 * what went in.
 *
 * @param root the CONSUMER'S workspace
 * @param recordFile where the record sits, relative to that root
 * @param gate the gate to raise, as the caller names it
 * @param measurement the run whose counts are being banked
 * @returns the path that was written, so a caller can say where the record now stands
 */
export function bankRaisedRecord(
  root: string,
  recordFile: string,
  gate: string,
  measurement: MutationMeasurement,
): string {
  const at = join(root, recordFile);
  const raised = raisedRecordText(readFileSync(at, "utf8"), gate, measurement, recordFile);

  writeFileSync(at, raised, "utf8");
  return at;
}
