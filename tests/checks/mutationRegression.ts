/**
 * The per-mutant comparison — a kill an earlier run made that this run does not (@SCN-MRG-001), a
 * kill this run makes that the earlier one did not (@SCN-MRG-002), the record's own entries this
 * run never names, which are counted rather than read as either (@SCN-MRG-004), and a record that
 * was never a record at all, which settles nothing (@SCN-MRG-005);
 * features/mutation-regression.feature.
 *
 * THE COMPARISON IS THE DETECTOR AND A BAR IS NOT. A suite killing 807 of 836 mutants loses one
 * kill and still scores 96.4%, which clears every conventional break threshold there is. The fault
 * this repository exists to catch therefore cannot be seen from a score at all; it is only visible
 * one mutant at a time, by asking of each kill an earlier run made whether this run still makes it.
 *
 * NOTHING HERE READS A FILE, A CLOCK OR AN ENVIRONMENT. Two lists of mutants in, a list of lost
 * kills out — so the rule can be put in front of every status a run can reach, including the ones
 * this repository's own suite will not produce to order. Where the record came from and what a
 * process does with the verdict are the edge's, and a comparison that reached for either would be
 * one nothing could hand a second pair of reports to.
 *
 * WHICH IS WHY A RECORD THAT IS NOT ONE IS REFUSED HERE RATHER THAN AT THE EDGE. The text arrives
 * as text and an absent record as no text at all, so the four ways a record can fail to be one are
 * all decided in one place, by a rule a scenario can read. Refused at the reader, "I found no
 * record" cannot reach a verdict: there is no list of mutants on that side of the union to hand on,
 * and an empty one is exactly what compares cleanly against everything and reports no lost kill.
 *
 * AND NOTHING HERE ASKS ANYBODY FOR ANYTHING. The mechanism this module replaces held a pair of
 * numbers a person typed, and refused any tree that had got better than them until somebody typed
 * the new pair in — which made the commonest move a change makes, more mutants with their kills
 * intact, arrive as a red. Per mutant there is nothing to record: a gain is named, the run ends
 * clean, and the next run's record is this run's report.
 */

/**
 * One mutant, as a mutation report files it — the identity and the outcome, and nothing else.
 *
 * THE IDENTITY IS FIVE FIELDS AND IT IS NOT A CHOICE. A report gives a mutant no id that survives
 * into another run, so the only thing two reports can be joined on is what both of them say about
 * it: the file it was made in, the mutator that made it, what the code was replaced with, and the
 * span it occupies. Measured on this repository's own artefacts, that key matches a night's report
 * against a fresh run exactly, and it is the key the one lost kill among 836 was found by.
 */
export interface Mutant {
  readonly file: string;
  readonly mutatorName: string;
  readonly replacement: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly status: string;
}

/**
 * A kill the record held that this run no longer makes.
 *
 * BOTH STATUSES TRAVEL WITH IT, because "a kill was lost" is a sentence with two halves and the
 * second one is where the fix is. A mutant that used to be killed and now survives is an assertion
 * that stopped firing; one that used to be killed and is now never-covered is a test that left the
 * suite. Those are different repairs, and a report carrying only the loss makes its reader go and
 * find out which.
 */
export interface LostKill {
  readonly file: string;
  readonly line: number;
  readonly mutatorName: string;
  readonly recordedStatus: string;
  readonly currentStatus: string;
}

/**
 * A kill this run makes that the record did not.
 *
 * THE SAME FIVE FACTS A LOSS CARRIES, because a gain is that loss read the other way round, and a
 * reader asking "what got better" wants the file, the line and the mutator for the reason a reader
 * asking "what broke" does. Carried rather than counted: a gain a comparison can only total is a
 * gain nobody can go and look at.
 */
export interface Gain {
  readonly file: string;
  readonly line: number;
  readonly mutatorName: string;
  readonly recordedStatus: string;
  readonly currentStatus: string;
}

/**
 * The statuses that are a kill.
 *
 * A TIMEOUT IS A KILL AND NOT A NEAR-MISS. The mutant changed the code enough that the suite never
 * came back, which is the suite noticing — the same event as an assertion firing, reached by a
 * slower road. So a mutant that used to time out and now survives has lost a kill, and a reader
 * watching only for killed-turned-survived never sees it go.
 */
const DETECTED: readonly string[] = ["Killed", "Timeout"];

/**
 * Whether the suite noticed this mutant.
 *
 * THE UNDETECTED SIDE IS THE COMPLEMENT, NEVER A LIST OF ITS OWN, and that is the half a list gets
 * wrong. Removing the one test that covered a killed mutant returns it as never-covered rather than
 * as survived — the coverage leaves with the assertion — so a comparison spelling the loss as
 * "survived" watches the fault it exists for go straight past. Spelled as everything that is not a
 * kill, a status this module has never heard of is undetected by construction.
 */
function isDetected(mutant: Mutant): boolean {
  return DETECTED.includes(mutant.status);
}

/** A JSON object — not a list, and not the null a bare `typeof` reads as one. */
function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The key two reports are joined on.
 *
 * SERIALISED RATHER THAN CONCATENATED, because a mutator's replacement is arbitrary source text and
 * any separator picked to glue these fields together is text that a replacement may contain. Joined
 * with one, two different mutants can spell the same key, and the mutant they are confused with is
 * by definition on the same line of the same file — which is exactly where a reader would never
 * look for the fault.
 */
function identityOf(mutant: Mutant): string {
  return JSON.stringify([
    mutant.file,
    mutant.mutatorName,
    mutant.replacement,
    mutant.startLine,
    mutant.startColumn,
    mutant.endLine,
    mutant.endColumn,
  ]);
}

/** One mutant as a report files it, read into the shape the comparison joins on. */
function mutantFrom(file: string, raw: Record<string, unknown>): Mutant {
  const location = isMapping(raw["location"]) ? raw["location"] : {};
  const start = isMapping(location["start"]) ? location["start"] : {};
  const end = isMapping(location["end"]) ? location["end"] : {};
  return {
    file,
    mutatorName: String(raw["mutatorName"]),
    replacement: String(raw["replacement"]),
    startLine: Number(start["line"]),
    startColumn: Number(start["column"]),
    endLine: Number(end["line"]),
    endColumn: Number(end["column"]),
    status: String(raw["status"]),
  };
}

/**
 * Every mutant a mutation-report document holds, flattened out of the per-file grouping it arrived
 * in.
 *
 * THE GROUPING IS PRESENTATION AND THE FILE NAME IS NOT. A report files its mutants under the path
 * they were made in and repeats that path nowhere inside the entry, so the key is the only place a
 * mutant's file is written down — which makes flattening the step that reads it rather than the
 * step that discards it.
 */
function mutantsIn(document: unknown): readonly Mutant[] {
  const files = isMapping(document) ? document["files"] : undefined;
  if (!isMapping(files)) return [];
  return Object.entries(files).flatMap(([file, entry]) => {
    const mutants = isMapping(entry) ? entry["mutants"] : undefined;
    if (!Array.isArray(mutants)) return [];
    return mutants.filter(isMapping).map((raw) => mutantFrom(file, raw));
  });
}

/**
 * A record that was there, was readable, was a mutation report, and held mutants to compare.
 */
export interface SettledRecord {
  readonly settled: true;
  readonly mutants: readonly Mutant[];
}

/**
 * A record that settled nothing, and what was looked for when it did not.
 *
 * IT CARRIES NO MUTANTS, AND THAT IS THE WHOLE MECHANISM. A reading that could hand back an empty
 * list would be handing the comparison a population of nothing, which compares cleanly against
 * anything at all and reports no lost kill — a true sentence about what was read and a false one
 * about the record. With no list on this side of the union there is nothing to pass on, so "I found
 * no record" cannot arrive at a verdict wearing "I found no regression"'s words.
 */
export interface UnsettledRecord {
  readonly settled: false;
  readonly lookedFor: string;
  readonly because: string;
}

/** What reading a record produced — its mutants, or the reason there are none to have. */
export type RecordReading = SettledRecord | UnsettledRecord;

/** A record that settled nothing, by the name it was looked for under and the reading it got. */
function unsettled(lookedFor: string, because: string): UnsettledRecord {
  return { settled: false, lookedFor, because };
}

/**
 * The record under a name, or the reason there is no record under it.
 *
 * THE TEXT ARRIVES AS TEXT, AND ABSENCE ARRIVES AS NOTHING AT ALL. This module reads no file, so
 * the one fact only a filesystem can learn — that there is nothing at the name — is handed in as
 * the absence of any text, and what that absence MEANS is decided here with the other three. The
 * alternative is an edge that decides for itself, which is an edge with a rule in it that no
 * scenario is reading.
 *
 * FOUR WAYS TO FAIL TO BE A RECORD, AND THEY ARE FOUR DIFFERENT REPAIRS, so each is said in its own
 * words rather than folded into one refusal. Nothing there is a placement that fetched nothing or a
 * sweep that has not run. Unreadable is something at the name that no run wrote. Readable and not a
 * report is the wrong artefact entirely. And a report holding no mutant is the one that would go
 * past a reader guarding only against damage: it is well-formed, and it compares cleanly against
 * every run there is.
 */
export function recordIn(lookedFor: string, text: string | undefined): RecordReading {
  if (text === undefined) {
    return unsettled(lookedFor, "there is nothing there to read");
  }

  let document: unknown;
  try {
    document = JSON.parse(text) as unknown;
  } catch {
    return unsettled(lookedFor, "what is there is not readable");
  }

  if (!isMapping(document) || !isMapping(document["files"])) {
    return unsettled(lookedFor, "what is there is not a mutation record");
  }

  const mutants = mutantsIn(document);
  if (mutants.length === 0) {
    return unsettled(lookedFor, "it is a mutation record holding no mutant");
  }

  return { settled: true, mutants };
}

/**
 * A record that settled nothing, as a sentence that cannot be mistaken for a clean comparison.
 *
 * IT NAMES WHAT WAS LOOKED FOR, because "there is no record" sends its reader hunting for a thing
 * only the run knows the name of. It names which of the four readings it got, because those are
 * four different repairs. And it ends on the clause that keeps the two sentences apart: no mutant
 * was compared, so nothing has been observed about whether a kill was lost.
 */
export function describeUnsettled(reading: UnsettledRecord): string {
  return (
    `${reading.lookedFor} settles nothing — ${reading.because}. ` +
    `This run has compared no mutant, so it has not observed that no kill was lost.`
  );
}

/**
 * The record's mutants paired with this run's, wherever both sides name the same one.
 *
 * A MUTANT ONLY ONE SIDE HOLDS IS COMPARED AGAINST NOTHING, and the `undefined` below is where that
 * is said. The two sides are joined on an exact key, so a mutant the record holds and this run's
 * report does not name has been put to no question at all — reading it as a loss would send its
 * reader hunting an assertion that is still there, over a run that never mutated the file.
 */
function comparedPairs(
  recorded: readonly Mutant[],
  current: readonly Mutant[],
): readonly (readonly [was: Mutant, now: Mutant])[] {
  const thisRun = new Map(current.map((mutant) => [identityOf(mutant), mutant]));
  return recorded.flatMap((was) => {
    const now = thisRun.get(identityOf(was));
    return now === undefined ? [] : [[was, now] as const];
  });
}

/** One compared mutant, written down by the facts a reader needs to go and look at it. */
function moveBetween(was: Mutant, now: Mutant) {
  return {
    file: was.file,
    line: was.startLine,
    mutatorName: was.mutatorName,
    recordedStatus: was.status,
    currentStatus: now.status,
  };
}

/** The kills the recorded run made that this run does not. */
export function lostKills(
  recorded: readonly Mutant[],
  current: readonly Mutant[],
): readonly LostKill[] {
  return comparedPairs(recorded, current)
    .filter(([was, now]) => isDetected(was) && !isDetected(now))
    .map(([was, now]) => moveBetween(was, now));
}

/**
 * The kills this run makes that the recorded run did not.
 *
 * A GAIN IS A DIRECTION AND NOT A DIFFERENCE. Both halves below are load-bearing: without the first
 * every mutant this run kills is a gain, including the ones the record already killed; without the
 * second every mutant the record did not detect is one, including a mutant that merely moved from
 * surviving to never being covered. Neither of those is a kill that was not there before, and a
 * comparison naming them says nothing by saying it about everything.
 *
 * NOTHING IS ASKED OF ANYBODY, WHICH IS THE POINT OF NAMING IT AT ALL. A gain costs no kill, so the
 * verdict stays clean and no command exists to record it. It is still named, because a comparison
 * that reds on an improvement and one that never looked at an improvement are the same build from
 * outside — both silent about the mutant that got better.
 */
export function gains(
  recorded: readonly Mutant[],
  current: readonly Mutant[],
): readonly Gain[] {
  return comparedPairs(recorded, current)
    .filter(([was, now]) => !isDetected(was) && isDetected(now))
    .map(([was, now]) => moveBetween(was, now));
}

/**
 * The three numbers a comparison ends on — what it could see, what it lost, and what it could not
 * see at all.
 *
 * THE THIRD NUMBER IS WHY THIS EXISTS. The other two are the verdict; alone they are a verdict with
 * no scope attached, and "no kill was lost" is the same sentence whether it was reached over a
 * record's 836 mutants or over 41 of them. Stated beside the number compared, the uncompared say
 * how much of the record the answer is about — which is the difference between a detector and a
 * detector-shaped silence.
 */
export interface Comparison {
  readonly compared: number;
  readonly lost: number;
  readonly uncompared: number;
}

/**
 * The record's own entries that this run's report does not name.
 *
 * THE EXACT JOIN LEAVES THESE BEHIND AND A LOOSER ONE WOULD NOT, which is the trade this function
 * exists to make visible. A push that edits a source file moves every mutant below the edit, so the
 * record still holds them at spans this run names nothing at. Joined more loosely they would each
 * find a partner that is not them, and the pairing would be reported as a movement neither made.
 *
 * SO THEY ARE COUNTED RATHER THAN CLASSIFIED. This run was put to no question about any of them:
 * the kill may still be being made a few lines further down, or the code may be gone. Neither a
 * loss nor a gain — but not nothing either, because how many of the record went unasked is what
 * says how much of it the verdict is about.
 *
 * BUILT FROM ITS OWN LOOKUP, NOT AS THE REMAINDER OF THE PAIRS. A count derived by subtracting the
 * compared from the record's length agrees with the pairing by construction, so the two can never
 * disagree and nothing is checking that they do not. Asked separately, "every mutant the record
 * held was compared or was not" is an assertion with something to say.
 */
function uncomparedIn(
  recorded: readonly Mutant[],
  current: readonly Mutant[],
): readonly Mutant[] {
  const thisRun = new Set(current.map(identityOf));
  return recorded.filter((was) => !thisRun.has(identityOf(was)));
}

/**
 * This run read against the record, totalled.
 *
 * THE LOST COUNT IS THE LOST LIST'S OWN LENGTH, never a second filter that happens to agree. Two
 * readings of "lost" written down separately are two arbiters, and they agree until one is edited.
 */
export function comparisonOf(
  recorded: readonly Mutant[],
  current: readonly Mutant[],
): Comparison {
  return {
    compared: comparedPairs(recorded, current).length,
    lost: lostKills(recorded, current).length,
    uncompared: uncomparedIn(recorded, current).length,
  };
}

/**
 * One lost kill, as a sentence somebody who did not write the test can act on.
 *
 * THE FILE, THE LINE, THE MUTATOR AND BOTH STATUSES — enough to open the file, find the change, and
 * know which repair it is. A count on its own sends its reader to a report of 836 entries to work
 * out which one moved, which is the same as not saying.
 */
export function describeLostKill(lost: LostKill): string {
  return (
    `${lost.file}:${lost.line} — the ${lost.mutatorName} mutant was ` +
    `${lost.recordedStatus} in the record and is ${lost.currentStatus} now.`
  );
}

/**
 * The comparison's three numbers, as one sentence.
 *
 * THE SCOPE TRAVELS WITH THE VERDICT OR IT IS NOT A VERDICT. "No kill was lost" is the same five
 * words whether the comparison could see a record's 836 mutants or 41 of them, and only one of
 * those runs has said anything. Saying how many were compared and how many were compared by nothing
 * alongside the losses is what lets a reader tell the two apart without going and counting.
 *
 * ONE SHAPE, WHATEVER THE NUMBERS ARE. No plural is inflected and no clause drops out when a count
 * is zero: a line whose shape changes with its values is a line a reader has to parse afresh each
 * run, and a clean comparison that silently sheds half its sentence is the one worth reading most
 * carefully.
 */
export function describeComparison(comparison: Comparison): string {
  const held = comparison.compared + comparison.uncompared;
  return (
    `${comparison.compared} of the record's ${held} mutants were compared, ` +
    `${comparison.lost} of them a lost kill; ${comparison.uncompared} were compared by nothing, ` +
    `because this run's report does not name them.`
  );
}
