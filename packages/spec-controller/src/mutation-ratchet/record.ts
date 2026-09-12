/**
 * A GATE'S RECORD — the pair of counts it last banked, and the allowance stated against them
 * (@SCN-MUT-012, 3F-2790, 3F-3337).
 *
 * THE RATCHET THAT ONCE RECONCILED AGAINST THIS IS GONE; THE READER IS NOT (3F-3337). What reaches
 * this module now is the engine's `mutationGate` bar kind, through `ingestQualityChecks.ts`: a
 * target may author a fitness row whose bar names a gate rather than a figure, and the kill floor
 * that gate's record implies is the bar the ledger then holds it to. That is a published
 * capability, decided over a TARGET'S record, and this repository no longer keeps one of its own.
 * @SCN-MUT-012 and @SCN-MUT-013 are what specify it — the second carrying, as its own Examples,
 * the record that holds no gate of that name, the record that is not there to be read and the
 * record holding text nothing can read as a record.
 *
 * THE RECORD IS TWO COUNTS, NEVER A BARE SCORE, and that is the load-bearing choice this whole
 * module exists to make possible. A mutation score is detected over total, so it falls for two
 * entirely unrelated reasons: a mutant this suite used to kill now survives, which is the fault
 * the gate exists for; or new mutable code arrived carrying survivors with it, which is no fault
 * at all. One number reds on both, and the only cheap way out of a red for the second is to widen
 * the bar — which is how a floor loses its teeth. Keeping `detected` and `total` apart is what
 * lets the verdict tell them apart: kills lost is stated directly, and a growing population moves
 * `total` while leaving `detected` alone.
 *
 * NOTHING HERE NAMES A PROJECT, A CHECK, A RUNNER, A WORKFLOW OR A REPOSITORY. The record's text
 * arrives as a string and the name it is filed under arrives beside it, because which file holds a
 * project's bars, and what its gates are called, are that project's own facts. This module has an
 * opinion about the SHAPE of a record and none about whose it is.
 *
 * MALFORMED MEANS NO BAR, NEVER A DEFAULTED ONE. Every refusal below is a record a lenient reader
 * answers with a bar nobody wrote — an absent section read as "no gates to enforce", a gate that
 * measured nothing read as scoring zero, an allowance nobody justified read as justified. The bar
 * is then enforced as though somebody had written it, and the only symptom is a build that has
 * quietly stopped being able to red. So each one is refused by name, and the refusal says which
 * record it read and where in that record the fault is (@SCN-MUT-013, 3F-2792).
 *
 * IT IS NOT A STATIC CHECK, and takes no `static-check:` prefix. A static check is a pure function
 * of the checked-out tree; the record this reads feeds a reconciler that judges a MEASUREMENT,
 * which by construction is not in the tree — the standing ruling every scheduled-sweep reader in
 * this portfolio already carries.
 */

import { parse } from "yaml";

/**
 * The name a record is filed under when its caller does not choose one.
 *
 * A DEFAULT, NEVER A CONSTANT THE READER GOES LOOKING FOR. Which file holds a project's bars is
 * that project's own fact, and a caller naming its own is answered by that name — this is only
 * what stands in when none is given, and it is exported so a caller happy with the convention does
 * not have to respell it and get one character of it wrong.
 *
 * IT MOVED HERE FROM `reconcile.ts` WHEN THE RATCHET LEFT (3F-3337), unchanged. The entry that used
 * to sit beside it reconciled a gate against this record; what is left reading a record is this
 * module, so the default name sits with the reader that defaults to it.
 */
export const RECORD_FILE = "quality-thresholds.yml";

/**
 * The section of a record file that holds every gate's counts.
 *
 * EXPORTED SO THE RECORDER CANNOT HOLD A SECOND COPY OF IT. `ratchet.ts` finds the same section in
 * the same text in order to rewrite two of its lines, and two spellings of one name is the
 * agreeing-until-somebody-edits-one shape this whole library exists to remove.
 *
 * The SECTION name is this module's, and the gate names inside it are the project's. A record file
 * is a project's own document and may hold whatever else that project keeps in it; what this module
 * asks of it is one section, under one name, so a project can file its mutation bars beside the
 * rest of its policy rather than in a file of their own.
 */
const MUTATION_GATES = "mutation-gates";

/**
 * The document itself, when the fault is above any one gate — a record whose top level is not a
 * mapping of sections, or one the YAML parser could not read at all.
 *
 * A PLACEHOLDER RATHER THAN A GATE NAME, and it is spelled here so the two readers that use it
 * cannot drift apart. A refusal always names a section and a key so that a reader who has one
 * message in front of them never has to work out which shape of message they are holding.
 */
const WHOLE_DOCUMENT = "<document>";

/** The key a document-level refusal names, there being no gate to name. */
const DOCUMENT_ROOT = "root";

/** The key a section-level refusal names, the fault being the section itself rather than a gate. */
const WHOLE_SECTION = "<section>";

/**
 * The field a refusal names when the fault is the ASK rather than a field of a gate's block — a
 * gate the record does not hold at all.
 *
 * EXPORTED FOR THE SAME REASON AS THE SECTION NAME: `ratchet.ts` refuses the same way when it is
 * asked to raise a gate no block is written for, and a refusal a reader has to recognise in two
 * spellings is one they will eventually parse wrongly.
 */
const WHOLE_GATE = "<gate>";

/**
 * Raised when a record cannot be read as a bar.
 *
 * IT NAMES THE SECTION, THE GATE AND THE FIELD, because a record file is a wall of near-identical
 * gate blocks and a bare "invalid config" over one of them leaves a reader opening the file and
 * reading every block to find out which. The four together are enough to put a cursor on the line.
 *
 * ONE TYPE FOR EVERY FAULT, INCLUDING THE ONES THIS MODULE DOES NOT DETECT ITSELF. A caller is
 * told to catch this and nothing else, so anything it does not cover is something that caller
 * sails past — which is why the YAML parser's own errors are normalised into it rather than left
 * to travel under their own name. That is what makes "a malformed record fails loudly" a property
 * of the reader rather than a property of the field checks alone.
 */
export class MalformedRecordError extends Error {
  constructor(
    /** The name the record was filed under, as the caller handed it over. */
    readonly recordFile: string,
    /** The section the fault sits in, or `<document>` when it sits above every section. */
    readonly section: string,
    /** The gate the fault sits under, or a placeholder when the fault is the section itself. */
    readonly key: string,
    /** The field the fault sits at. */
    readonly field: string,
    detail: string,
  ) {
    super(`${recordFile}: ${section} "${key}" is malformed at ${field}: ${detail}`);
    this.name = "MalformedRecordError";
  }
}

/**
 * The allowance a record STATES against a gate's counts — how many kills may be lost before the
 * gate reds, and why that many.
 *
 * COUNTED IN MUTANTS, WITH ITS REASON, and the unit is the point. A mutant is the unit the fault
 * arrives in, so the arithmetic downstream is exact rather than a rounding argument; and a
 * non-zero allowance that cannot say why it exists is head-room rather than tolerance, which is
 * why the reason travels with the number rather than in a comment beside it.
 */
export interface GateAllowance {
  /** Whole mutants of tolerance. Zero seats the floor exactly on the record. */
  readonly mutants: number;
  /** Why the allowance exists. */
  readonly reason: string;
}

/** One gate's last-banked measurement, and the allowance stated against it. */
export interface GateRecord {
  /** The gate's name, as the record files it — the project's own word, never this module's. */
  readonly gate: string;
  /** Mutants the suite detected. */
  readonly detected: number;
  /** Every mutant the gate measured, detected or not. */
  readonly total: number;
  readonly allowance: GateAllowance;
}

/** A mutation score, as a percentage, computed from counts rather than read off a report. */
function scoreOf(detected: number, total: number): number {
  return (detected / total) * 100;
}

/**
 * The failing floor: the record's counts with its allowance spent out of the DETECTED count.
 *
 * SPENT FROM THE NUMERATOR, not subtracted from the score, because the allowance is counted in
 * mutants and a mutant is worth a different number of points in every gate — the same allowance
 * taken off two scores would mean two different things in two gates of different sizes.
 *
 * A REPORTED FIGURE, NOT THE DECISION VARIABLE. The verdict decides on COUNTS — fewer kills than
 * the record less its allowance — and prints this floor beside it so a reader has the bar in the
 * units the sweep speaks. The two agree exactly while the mutant population is unchanged, and part
 * company the moment it moves: a grown population drags the measured score below this floor with
 * no kill lost at all, and that case is green. Reading this floor AS the gate would put the
 * judgement back on the score, which is the confusion the counts model exists to prevent.
 */
export function floorOf(record: GateRecord): number {
  return scoreOf(record.detected - record.allowance.mutants, record.total);
}

/**
 * The failing floor in MUTANTS: the record's kills with its allowance spent out of them.
 *
 * `floorOf`'s TWIN WITHOUT THE DIVISION, and the division is the whole difference. A percentage is
 * two facts folded into one, and folding them is what makes a floor fall when new mutable code
 * arrives carrying survivors — no kill lost, and the bar missed anyway. Subtracting the allowance
 * and stopping leaves a whole number of mutants that moves only when a mutant this suite used to
 * kill stops dying, which is the one fact a bar on this axis is about.
 *
 * `total` NEVER ENTERS IT, and that is the population-independence rather than a simplification.
 * A reader holding this number can be handed a run over any population at all and still be asking
 * the only question worth asking of it.
 *
 * HERE RATHER THAN AT ITS CALLER, for the reason `floorOf` is here: how an allowance is spent is a
 * fact about the record, and a caller computing `detected - slack` itself would be a second place
 * holding it — agreeing until the day one of them is edited.
 */
export function killFloorOf(record: GateRecord): number {
  return record.detected - record.allowance.mutants;
}

/**
 * Read the record's text into a document mapping.
 *
 * THE YAML PARSER'S OWN DETECTIONS ARE REAL, AND THEY ARRIVE UNDER SOMEONE ELSE'S NAME. A gate
 * recorded twice raises `YAMLParseError` before this module sees a mapping at all — a genuine
 * catch, and one a caller that was told to catch `MalformedRecordError` walks straight past. So it
 * is caught here and re-raised as this module's own refusal, carrying the parser's message as the
 * detail so nothing about WHAT was wrong is lost on the way across.
 */
function documentOf(text: string, recordFile: string): Record<string, unknown> {
  let read: unknown;
  try {
    read = parse(text);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new MalformedRecordError(recordFile, WHOLE_DOCUMENT, DOCUMENT_ROOT, "yaml", detail);
  }
  if (!isMapping(read)) {
    throw new MalformedRecordError(
      recordFile,
      WHOLE_DOCUMENT,
      DOCUMENT_ROOT,
      DOCUMENT_ROOT,
      "the top level must be a mapping of sections.",
    );
  }
  return read;
}

/** Whether a value read out of the record is a block of named fields, rather than a list or scalar. */
function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The section holding every gate, refused when it is absent or holds no gate.
 *
 * REQUIRED, NEVER DEFAULTED, and the two refusals are one fault at two depths. A record with no
 * section reads as "no gates to enforce"; a section with no gate reads as a bar that enforces
 * nothing. Both hand back a green that was never earned, which is the vacuous pass this whole
 * apparatus exists to close, so neither is allowed to be the answer.
 */
function gatesSectionOf(text: string, recordFile: string): [string, unknown][] {
  const section = documentOf(text, recordFile)[MUTATION_GATES];
  if (!isMapping(section)) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      WHOLE_SECTION,
      MUTATION_GATES,
      "the section is missing, or is not a mapping of gate name to record.",
    );
  }
  const entries = Object.entries(section);
  if (entries.length === 0) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      WHOLE_SECTION,
      MUTATION_GATES,
      "at least one gate must be recorded — an empty section is a bar that enforces nothing.",
    );
  }
  return entries;
}

/**
 * One field, read as a whole, non-negative count of mutants.
 *
 * THE UNIT IS THE MUTANT, so a fraction is not a smaller count — it is a number that came from
 * somewhere other than counting, and the arithmetic downstream is exact precisely because nothing
 * here ever rounds.
 */
function countAt(
  gate: string,
  entry: Record<string, unknown>,
  field: string,
  recordFile: string,
): number {
  const raw = entry[field];
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      field,
      "expected a whole number of mutants.",
    );
  }
  return raw;
}

/**
 * The allowance the record states, refused when it cannot be spent or cannot say why it exists.
 *
 * AN ALLOWANCE NOBODY CAN JUSTIFY IS HEAD-ROOM, NOT TOLERANCE, and head-room admitted at read time
 * is a bar nobody wrote being enforced as though somebody had. It is refused HERE rather than left
 * to the reconciler, because by the time a verdict is being computed the unjustified allowance has
 * already become part of the bar. A ZERO allowance needs no reason: there is nothing to justify.
 *
 * WIDER THAN THE KILLS IT IS SPENT FROM IS THE OTHER WAY THE SAME BAR VANISHES. The allowance comes
 * out of the recorded kills, so one wider than them puts the floor below zero, and a gate whose
 * floor is below zero cannot red for any measurement at all.
 */
function allowanceOf(
  gate: string,
  entry: Record<string, unknown>,
  detected: number,
  recordFile: string,
): GateAllowance {
  const mutants = countAt(gate, entry, "slack-mutants", recordFile);
  if (mutants > detected) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      "slack-mutants",
      `${mutants} is wider than the ${detected} kills it is spent from.`,
    );
  }
  const stated = entry["slack-reason"];
  const reason = typeof stated === "string" ? stated.trim() : "";
  if (mutants > 0 && reason === "") {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      "slack-reason",
      "a non-zero allowance must say why it exists — one nobody can justify is head-room.",
    );
  }
  return { mutants, reason };
}

/**
 * One gate's entry, read into its record.
 *
 * `total` IS READ AND REFUSED BEFORE `detected`, WHICH IS THE ORDER AND NOT AN ACCIDENT. A gate
 * that measured no mutants has no score — the division is undefined — so there is nothing for a
 * kill count to be compared against, and refusing at `detected` first would name the wrong field
 * in the message a reader is trying to act on.
 */
function recordOf(gate: string, raw: unknown, recordFile: string): GateRecord {
  if (!isMapping(raw)) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      "<entry>",
      "expected a block of fields.",
    );
  }
  const total = countAt(gate, raw, "total", recordFile);
  if (total === 0) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      "total",
      "a gate that measured no mutants has no score.",
    );
  }
  const detected = countAt(gate, raw, "detected", recordFile);
  if (detected > total) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      "detected",
      `${detected} kills over ${total} mutants — a gate cannot detect more than it measured.`,
    );
  }
  return { gate, detected, total, allowance: allowanceOf(gate, raw, detected, recordFile) };
}

/**
 * Read every gate's record out of a record file's text.
 *
 * @param text the record file's own bytes, as authored
 * @param recordFile the name the record is filed under, so a refusal can say which file it read
 * @throws MalformedRecordError when the text cannot be read as a bar — one type for every fault,
 *   the YAML parser's own included, so a caller told to catch this catches all of them.
 */
export function parseGateRecords(text: string, recordFile: string): Map<string, GateRecord> {
  return new Map(
    gatesSectionOf(text, recordFile).map(([gate, raw]) => [gate, recordOf(gate, raw, recordFile)]),
  );
}

/**
 * The bar the record holds for one named gate, refused when the record holds no such gate.
 *
 * A GATE WITH NO RECORD IS THE ONE FAULT IN THIS MODULE THAT LOOKS LIKE NOTHING AT ALL. Every
 * refusal above is a record somebody wrote badly, sitting in the file a reader would go and open.
 * This one is a record that reads perfectly, asked for a gate it never held — a gate name mistyped
 * where the caller states it. The lenient answer is not a wrong bar but NO bar, which reads
 * downstream as a gate with nothing to enforce, and it greens for as long as the typo survives.
 * Nothing about the record is wrong, so nobody is ever sent to look at it (@SCN-MUT-013, 3F-2793).
 *
 * AND THE REFUSAL LISTS THE GATES THE RECORD DOES HOLD. A record's gates are near-neighbours by
 * construction — a project names them after the scopes it is quarantining from each other — so a
 * refusal naming only the gate that was asked for sends its reader to open the file and compare
 * spellings by eye. Listing what is held turns the typo into a one-line diagnosis.
 *
 * UNDER THE ONE REFUSAL TYPE, like every fault above it. A caller is told to catch
 * `MalformedRecordError` and nothing else, so an unrecorded gate raised under a second type is a
 * fault that caller sails straight past — the very hole the YAML parser's own errors are
 * normalised to close.
 *
 * @param gate the gate to resolve, as the caller names it — never a name this module knows
 * @param records every gate the record holds, as `parseGateRecords` read them
 * @param recordFile the name the record is filed under, so a refusal can say which file it read
 * @throws MalformedRecordError when the record holds no such gate, listing the gates it does hold
 */
export function gateRecordFor(
  gate: string,
  records: Map<string, GateRecord>,
  recordFile: string,
): GateRecord {
  const record = records.get(gate);
  if (record === undefined) {
    throw new MalformedRecordError(
      recordFile,
      MUTATION_GATES,
      gate,
      WHOLE_GATE,
      `no bar is recorded for this gate (recorded: ${[...records.keys()].join(", ")}).`,
    );
  }
  return record;
}
