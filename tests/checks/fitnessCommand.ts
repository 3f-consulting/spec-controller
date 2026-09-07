/**
 * THE COMMAND HALF OF A CONVERTED FITNESS CHECK (@SCN-LNT-023) — the row's command, run, and
 * its exit code read as the scenario's verdict.
 *
 * THIS MODULE CANNOT REACH THE MEASUREMENT HALF, AND THAT SEPARATION IS ONLY HALF TRUE — READ THIS
 * BEFORE WIDENING THE FITNESS PROFILE'S REQUIRE LIST (3F-3190).
 *
 * The separation holds where it can be held: this module's entire import list is `node:child_process`,
 * `node:fs`, `node:path` and core's `/internal` — NO local module at all. `fitnessMeasurement.ts`
 * imports this one; nothing here imports it back, and there is no re-export propping the edge up.
 * So a STATIC row's code path genuinely never reaches the measurement protocol.
 *
 * IT DOES NOT HOLD AT THE CUCUMBER LOAD, AND THAT IS ACCEPTED RATHER THAN ENGINEERED AROUND.
 * `tests/steps/fitness.steps.ts` carries BOTH step definitions and is fixed by 3F-3146 as the single
 * file the `fitness` profile requires. So the process running a static row still LOADS the file that
 * can post a measurement, even though the row's own code never calls into it. Splitting that steps
 * file would reintroduce the coupling 3F-3114 removed, which is a worse trade than the residual.
 *
 * WHAT THAT MEANS FOR YOU. If you widen the profile's require list, you are changing the only thing
 * standing between these two halves at run time — the fact that one file is loaded rather than two.
 * The module graph will still look separated and will no longer be the whole story. Say what you are
 * giving up in the same commit.
 *
 * IT RUNS THE COMMAND. ALWAYS. There is no read-an-artefact second shape in this model: what a
 * target puts BEHIND the command is the target's business, and a target that types a sweep there
 * gets the sweep inside its fitness pass, which is exactly what it asked for. One shape means the
 * row stays three fields and the pass does the same thing for every check that converts.
 *
 * THE EXIT CODE ANSWERS ONE QUESTION AND THE SCENARIO ANSWERS THE OTHER. `did the check run` is
 * answered by the scenario appearing in the fitness pass's report, which the credit reader takes;
 * `did it find anything` is answered here. Two questions, two mechanisms — which is why nothing in
 * this module posts a credit, and why a command exiting 0 having examined nothing cannot pass as
 * silence: its silence is only ever half the answer.
 *
 * AND THE SECOND QUESTION HAS THREE ANSWERS (3F-3169). A check finds nothing, or finds something,
 * or could not examine anything at all — the last being the ordinary state of a check whose input
 * only CI holds, which is where `lint:scn-subissues` arrived when 3F-3163 taught it to say so. The
 * third answer is not a pass and not a fault: the step definition turns it into a cucumber SKIP, so
 * the scenario stays in the report (the credit still says the check ran) while the report says
 * plainly that it did not examine anything, and the pass's own exit code is untouched.
 *
 * THE THIRD ANSWER IS THE ROW'S TO ASK FOR, AND THIS MODULE KNOWS NO CODE OF ITS OWN (3F-3170). It
 * is heard from a row that NAMES the code its command says it with, and from no other row; a row
 * silent on the point keeps the two-answer reading, where every ending but a clean one is a fault.
 * One code fixed here for every target would be this module telling a consumer's command what its
 * own answers mean — and the first attempt at that took a code this product's own `balance` already
 * spends on a pending-items verdict under `--strict`. The whole reasoning, and the two uses that
 * keep the field from being a cul-de-sac, are at `FitnessCommandRow.notExaminedExit` below.
 *
 * AND THE READING OF THAT CODE IS THE LEDGER'S, NOT THIS MODULE'S (3F-3177). Both sides of a
 * configured row now ask what ending it named — this side to compare an exit code against, the
 * credit side to tell a skip the check asked for from one a hook produced — so the reading lives
 * once, at `notExaminedEndingOf` in `packages/core/src/domain/fitnessChecks.ts`, and is imported
 * back here. The REFUSAL below did not go with it, and the reason is written at both sites.
 *
 * WITH TWO ENDINGS THE ROW MAY NOT SPEND, REFUSED WHERE THE ROWS ARE READ (@SCN-LNT-025). A row
 * naming the ending of a clean run, or of a run that found something, is asking for the third answer
 * on one of the two endings the pass reads everything else by — and a refusal that waited for the
 * run would fire on the very run whose failure it swallows. Which two, and why every other ending
 * stays the row's, is at `refuseAnEndingTheProtocolSpends`.
 *
 * WHY THIS IS A MODULE AND NOT THE STEP DEFINITION ITSELF. `tests/steps/fitness.steps.ts` is the
 * cucumber wiring — a hook that reads the running scenario's tag line and one step that calls in
 * here — and wiring is the one part no unit test can reach. Everything a verdict depends on is
 * here instead, with the process injected, so resolving a row and reading an exit code are proved
 * without spawning anything and the step definition holds no reasoning of its own.
 *
 * THE PROCESS IS INJECTED, WHICH IS THE WHOLE OF THE SEAM. `spawnFitnessCommand` is the one
 * implementation that reaches a shell; every other export takes it as an argument. A verdict rule
 * that spawned for itself would be provable only by planting executables, and the arms that matter
 * — a command that exits non-zero saying nothing, a command killed before it answered — are ones a
 * plant can barely stage.
 *
 * WHAT IS HERE, AND WHAT IS NEXT DOOR (3F-3196). This module is the STATIC half: read a target's
 * rows into an index, classify an exit code, and reach a shell. The MEASURED half — read a number
 * off what a command printed and post it as this run's credit — is `fitnessMeasurement.ts`, and
 * the edge between them runs ONE WAY. That module imports this one for the index type, the quoting
 * and the sentence a scenario no row names is told; nothing here imports it back, so a static
 * row's path never reaches the posting code. A re-export in this direction would restore exactly
 * the reachability the split removed, and would satisfy the letter of it while undoing the point.
 *
 * Parent: 3F-3138 — the general shape of a converted fitness check.
 */

/**
 * WHY IT IS STILL HERE (3F-3198). PROTOCOL by 3F-3190's discriminator — it reads a target's
 * configured rows into an index, runs a row's command and classifies the exit code — and held in this
 * tree by the boundary rule at `checkTree.ts`: the four core symbols it imports come from the UNPUBLISHED
 * `./internal`, so under `packages/spec-controller/src` this module would travel in the tarball and
 * throw ERR_PACKAGE_PATH_NOT_EXPORTED on first load (@SCN-API-007, measured). What it DOES says move;
 * what it IMPORTS says it cannot, and the import is the stronger reading.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  bareTerm,
  fitnessChecksOf,
  notExaminedEndingOf,
  type FitnessCheckIndex,
} from "@3f-consulting/spec-controller-core/internal";
// AND THIS MODULE IMPORTS NO CHECK'S OWN EXIT CODE, WHICH IS THE SHAPE OF THE 3F-3170 REPAIR. It
// briefly imported `NOT_EXAMINED_EXIT_CODE` from `scnSubIssueGate.ts` so the pass and the one
// check answering that way shared a spelling — but a pass that knows any check's code is a pass
// reading one check's answers into every target's commands. The code now arrives on the row beside
// the command it is about, and this module knows no check by name.

/**
 * What one configured row says about the command it names — the command itself, and the one thing
 * about how that command SPEAKS the pass has to be told rather than assume.
 */
export interface FitnessCommandRow {
  /** The command line the row names, run as the target wrote it. */
  readonly command: string;
  /**
   * The exit code by which THIS row's command says it examined nothing, or `null` where the row
   * says nothing on the point — which is every row that has not asked for the third answer.
   *
   * WHY IT IS THE ROW'S TO SAY, AND NOT THE PASS'S (3F-3170). What an exit code MEANS is a property
   * of the command, and the first attempt at fixing one code for every target picked one this
   * product's own `balance` already spends on a pending-items verdict under `--strict`
   * (`src/cli-balance/cli.ts`). A consumer with `balance --strict` behind a fitness row would have
   * had that red silently re-read as a check that examined nothing — the exact substitution this
   * product exists to catch, made by the product. A rarer code is not the repair either: the claim
   * that a code will not collide is the claim that just failed, sysexits already spends 64–78, and
   * 128+n is signal termination. The row carries the command, so it is where the command's own
   * taxonomy belongs.
   *
   * TWO ENDINGS CANNOT ARRIVE HERE AT ALL (@SCN-LNT-025). A row spending the ending of a clean run,
   * or of a run that found something, is refused where the rows are read — so this field carries
   * either an ending a target chose for its own command, or nothing.
   *
   * `null` IS A REAL ANSWER AND THE SAFE ONE. A row silent on the point gets the two-answer reading
   * — every non-zero ending is a fault — which is what every row got before any row could ask, so
   * nothing already written changes meaning by standing still. Opt-in, per row, never inferred: a
   * check able to answer honestly that there was nothing here to look at is the unusual one, and the
   * row saying so is what makes it a statement rather than an accident.
   *
   * AND WHY THE FIELD EXISTS AT ALL, WHICH IS NOT THE CHECK THAT PROMPTED IT. `lint:scn-subissues`
   * is this field's FIRST MEMBER, not its reason: the third answer is close to unreachable for that
   * check locally, needing a changed scenario AND no ticket handle AND no readable pull-request
   * body, and this repository's `[3F-NNNN]` commit subjects supply the handle every time. A
   * mechanism built for a case that almost never fires is a cul-de-sac and a later reader would be
   * right to delete it. Two things keep it:
   *
   *   1. A CONSUMER'S ROW whose command legitimately has no subject in some run — a check over a
   *      directory a given build does not check out, a sweep whose input a nightly produces. That
   *      is the general case; ours is one special case of it.
   *   2. 3F-3162'S DISCRIMINATOR. That ticket asks how to tell an honest skip in the fitness pass
   *      from an incidental one — a hook, a tag filter, a shared background quietly satisfying a
   *      whole axis. This field answers it: a skip is honest EXACTLY where a row named the code
   *      that produced it, and every other route to `skipped` is broken evidence (@SCN-LNT-026). That
   *      second use is the LEDGER'S, which is why the reading moved to
   *      `packages/core/src/domain/fitnessChecks.ts` at 3F-3177 and this field is read through it.
   *      A hook can make the report say `skipped` and cannot reach the manifest to name an ending,
   *      so the two facts come from two places and the pairing cannot be forged.
   */
  readonly notExaminedExit: number | null;
}

/**
 * The command each configured row names, keyed by the bare `@SCN` that row is about.
 *
 * SEPARATE FROM `FitnessCheckIndex`, WHICH THE LEDGER READS, and deliberately so: that index
 * holds the characteristic and the bar — the DEBIT's half of the row — and states in its own header
 * that the command is the COMMAND half and nothing on that side reads it. This is that half. The
 * two readings share the row and the key, and the COMMAND is still read on this side alone.
 *
 * ONE FIELD IS NOW READ BY BOTH, AND IT IS NOT A BORROWING (3F-3177). `notExaminedExit` is on both
 * indexes because both sides genuinely ask about it — this one needs the VALUE, to tell an ending
 * its row named from every other ending a command can have; the ledger needs only WHETHER one was
 * named, which is how it tells a skip the check asked for from a skip a hook produced. Neither side
 * reads it its own way: the ONE reading is `notExaminedEndingOf`, imported from the ledger's file,
 * and this index keeps only what it must compare an exit code against.
 */
export type FitnessCommandIndex = ReadonlyMap<string, FitnessCommandRow>;

/** What running one row's command produced, as much of it as a verdict or a message reads. */
export interface FitnessCommandResult {
  /** The exit code, or `null` where the command never got to answer with one. */
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** How the pass reaches a process — injected, so every verdict below is provable without one. */
export type RunFitnessCommand = (command: string) => FitnessCommandResult;

/**
 * The three answers a converted static check's command can give the pass.
 *
 * THREE, BECAUSE TWO CANNOT SAY THE ONE THING A CHECK OUTSIDE CI MOST NEEDS TO (3F-3169). `clean`
 * and `fault` between them assume the check got to look; `not-examined` is the answer of a check
 * whose input was not there to be examined — an absent pull-request body on a laptop being the
 * lived case. Folding that into `fault` reds an honest tree; folding it into `clean` is the silence
 * fault, in the repository that names it.
 *
 * `not-examined` IS REACHABLE ONLY FOR A ROW THAT NAMED ITS CODE (3F-3170), so a target that has
 * never written the field has a two-valued verdict in practice and the third value costs it
 * nothing.
 */
export type FitnessVerdict = "clean" | "not-examined" | "fault";

/**
 * What running one row's command came to, and the sentence that goes with it where there is one.
 *
 * `fault` IS NON-NULL EXACTLY WHEN THE VERDICT IS `fault`, and the two other verdicts carry no
 * sentence at all. A clean run has nothing to say; a check that examined nothing is the ORDINARY
 * state of a check whose input only CI holds, and narrating it on every local run would train the
 * reader to scroll past the one line that is ever going to matter.
 */
export interface FitnessCheckOutcome {
  readonly verdict: FitnessVerdict;
  /** Why the scenario fails, verbatim for whoever has to fix it; `null` unless the verdict is a fault. */
  readonly fault: string | null;
}

/**
 * The command each row of a target's `specController.fitnessChecks` names, keyed by the bare `@SCN`
 * that row is about.
 *
 * BOTH TERMS OR NEITHER, which is the stance the ledger's reading of these same rows takes. A row
 * naming a scenario and no command, or a command and no scenario, says nothing this can act on —
 * half-reading it would either leave a scenario resolving to a command the target never wrote or
 * attach a command to no scenario at all. A row spelling a blank command is the same fault with a
 * quieter spelling, so it is dropped by the same clause.
 *
 * THE `@SCN` IS STORED BARE, through the ONE reading of what a term bare is. The running scenario's
 * tag line arrives bare, so a row filed under `"@SCN-FIT-002"` would be filed under a key no lookup
 * ever asks for — the silent-miss class `bareTerm` exists to close.
 *
 * A HALF-WRITTEN ROW IS DROPPED, NOT THROWN ON. Configuration is data from outside, and a reader
 * that threw on a typo would turn one bad character into a pass that produced no verdict at all. A
 * dropped row leaves its scenario naming no command, which is a fault this module reports loudly at
 * the scenario it belongs to.
 *
 * A ROW SPENDING ONE OF THE PROTOCOL'S OWN ENDINGS IS REFUSED OUTRIGHT, WHICH IS THE OTHER ANSWER
 * AND NOT AN EXCEPTION TO THAT ONE (@SCN-LNT-025). The rows above said something incomplete; that
 * row says something complete and false, and acting on it reclassifies a pass or a finding
 * silently. Dropping it would report its scenario as one no configured row names, while the row sits
 * in the manifest — so the read stops instead, naming the row and the value. The reasoning, and why
 * exactly two endings and no others, is at `refuseAnEndingTheProtocolSpends`.
 */
export function fitnessCommandsOf(entries: unknown): FitnessCommandIndex {
  const commands = new Map<string, FitnessCommandRow>();
  if (!Array.isArray(entries)) return commands;
  for (const entry of entries as readonly unknown[]) {
    const row = entry as
      | { scn?: unknown; command?: unknown; notExaminedExit?: unknown }
      | null
      | undefined;
    if (typeof row?.scn !== "string" || typeof row.command !== "string") continue;
    const scnId = bareTerm(row.scn);
    if (scnId === "" || row.command.trim() === "") continue;
    // ONE READING, TWO CONSUMERS, ONE REFUSAL — AT THE PASS (3F-3177). The reading is the
    // ledger's (`notExaminedEndingOf`, imported above): both sides of the row ask what ending it
    // named, and two copies of that reading would eventually answer a target's `7.5` differently.
    // The REFUSAL stays HERE and must not be pulled in beside it: `fitnessChecksOf` is what
    // `balance` reads a CONSUMER'S manifest through, and a throw on that path turns one bad
    // character in a stranger's `package.json` into a run that produces no verdict at all, which is
    // loud nowhere. This path is about to ACT on the value, which is where refusing belongs.
    const notExaminedExit = notExaminedEndingOf(row.notExaminedExit);
    refuseAnEndingTheProtocolSpends(scnId, notExaminedExit);
    commands.set(scnId, { command: row.command, notExaminedExit });
  }
  return commands;
}

/** The ending by which a command says it found nothing — the pass's own, and no row's to spend. */
const CLEAN_RUN_ENDING = 0;

/** The ending by which a command says it found something — likewise the pass's own. */
const VIOLATION_ENDING = 1;

/**
 * Refuse a row that spends one of the two endings THE PROTOCOL ITSELF READS on the third answer
 * (@SCN-LNT-025) — and refuse it here, where the rows are READ, rather than when a command ends
 * that way.
 *
 * WHY THESE TWO AND NO OTHERS, WHICH IS THE PART A LATER READER MUST NOT TIDY. A row naming a clean
 * run's ending would report a check that examined nothing on exactly the runs where that check
 * worked, leaving it no way left to say it passed. A row naming a violation's ending would turn
 * every finding that check makes into a check that examined nothing — a red arriving as a
 * non-failure, at whatever scale the check runs, on the one ending the whole of the tooling world
 * agrees means `I found something`. Both are the silence fault this repository exists to name,
 * arriving through its own configuration.
 *
 * AND EVERY OTHER ENDING STAYS THE ROW'S, INCLUDING THE TWO THIS PRODUCT ITSELF SPENDS. `balance`
 * answers 2 for a usage fault and 4 for an unsound run (`src/cli-balance/cli.ts`), and a row naming
 * either is still read as written. The field says what THAT row's command means by an ending, which
 * is the row author's sentence to write and not the pass's to have opinions about — the whole of
 * the 3F-3170 repair, which this refusal must not quietly undo. So this is NOT an allow-list of
 * permitted endings and must not be tidied into one: the two refusals are against the PROTOCOL'S
 * own fixed points, a pass and a violation, and not against anyone's taxonomy.
 *
 * AND AT THE PASS'S READ, NEVER AT THE LEDGER'S — ONE READING, TWO CONSUMERS, ONE REFUSAL
 * (3F-3177). The reading of what ending a row named is the ledger's now (`notExaminedEndingOf`,
 * `packages/core/src/domain/fitnessChecks.ts`), because the credit side asks the same row the same
 * question. This throw did NOT go with it and must not be moved there for tidiness: `fitnessChecksOf`
 * is what `balance` reads a CONSUMER'S manifest through, so a throw on that path turns one bad
 * character in a stranger's `package.json` into a run that produces no verdict at all — loud
 * nowhere, and precisely the reasoning that reader's own header gives for dropping a malformed row
 * rather than throwing on it. A refusal belongs where a run is about to ACT on the value; the ledger
 * only ever asks whether a value was named.
 *
 * AT THE READ, WHICH IS THE WHOLE OF WHY IT IS HERE RATHER THAN IN `fitnessCheckOutcome`. A refusal
 * deferred to the run fires only on the run that takes the bad path — and for the row naming a
 * violation's ending, the bad path IS the run where a real finding was made, which is exactly the
 * run whose failure it would swallow. A validation that fires only when the bad path is taken is a
 * validation that hides the bad path.
 *
 * IT THROWS WHERE A HALF-WRITTEN ROW IS DROPPED, AND THE DIFFERENCE IS WHAT EACH ROW SAID. A row
 * naming no scenario or no command is an incomplete sentence — there is nothing to act on, and its
 * scenario says so loudly at the scenario. This row is a COMPLETE and actionable sentence that is
 * false about the protocol: acted on it reclassifies silently, and dropped it would leave its
 * scenario reporting that no configured row names it while the row sits there in the manifest,
 * sending its author to write a row they have already written.
 */
function refuseAnEndingTheProtocolSpends(scnId: string, named: number | null): void {
  if (named !== CLEAN_RUN_ENDING && named !== VIOLATION_ENDING) return;
  const collapse =
    named === CLEAN_RUN_ENDING
      ? "a clean run ends that way, so this row reports a check that examined nothing on exactly " +
        "the runs where the check worked, and leaves it no way to say it passed"
      : "an ordinary violation ends that way, so this row turns every finding the check makes into " +
        "a check that examined nothing, and a red into a non-failure";
  // The ROW and the VALUE, because a refusal saying only that the configuration is wrong sends the
  // reader hunting through every row a target carries for the one that said it.
  throw new Error(
    `${scnId}: notExaminedExit: ${named} is refused where the rows are read, because ${collapse}. ` +
      "These two endings are refused as the PROTOCOL'S own — a pass and a violation — and not " +
      "against any tool's taxonomy: every other ending is the row's to name, 2 and 4 included, " +
      "though this product's own `balance` spends them on a usage fault and an unsound run. What " +
      "an ending MEANS is a property of the command, and the row is where the command is written " +
      "down."
  );
}

/**
 * The same, read from the manifest at the root the fitness pass is running in.
 *
 * THE ROOT IS WHERE THE PASS RUNS, and that is what makes `enforcedOverRealSource` an OBSERVED fact
 * on this route rather than one inferred from a workflow file: the rows come from the target's own
 * manifest and the commands run against the tree beside it.
 */
export function fitnessCommandsAt(root: string): FitnessCommandIndex {
  return fitnessCommandsOf(fitnessRowsAt(root));
}

/**
 * The rows as the LEDGER reads them, at the root the fitness pass is running in.
 *
 * THE MEASURED HALF READS ONLY THE CHARACTERISTIC OFF THIS, AND IT READS IT THROUGH THE
 * LEDGER'S OWN READER. The word a measured credit cites is the same word the Evidence Obligation was raised
 * against, so a second reading of "what characteristic does this row name" would let the credit post
 * under one spelling while the debit stood under another — one row, an obligation with no credit and
 * a credit with no obligation, and loud nowhere. The BAR on these rows is not this module's business
 * and nothing here reaches for it.
 */
export function fitnessChecksAt(root: string): FitnessCheckIndex {
  return fitnessChecksOf(fitnessRowsAt(root));
}

/**
 * The rows themselves, as the target's manifest spells them, before either reading of them.
 *
 * ONE READ FOR TWO READINGS. The pass takes the command half of a row and the ledger's reader
 * takes the characteristic half, and both are asked at the same moment about the same file — so the
 * FILE is read once here and each reader is handed the same rows. Two reads would be two chances
 * for a manifest edited mid-pass to hand one half of the pass a row the other half never saw.
 */
function fitnessRowsAt(root: string): unknown {
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: unknown };
  };
  return manifest.specController?.fitnessChecks;
}

/* ═══ CLASSIFYING WHAT ONE ROW'S COMMAND CAME TO ═════════════════════════════════════════════ */

/**
 * What the command said, on either stream, or a plain statement that it said nothing.
 *
 * EXPORTED BECAUSE THE MEASURED HALF QUOTES THE SAME WAY, AND FOR THE SAME REASON (3F-3196).
 * `fitnessMeasurement.ts` reads a number off a command's output and has to say what a command that
 * printed no usable one actually said — the identical sentence, over the identical result shape. A
 * second copy over there would drift the day one of them learnt to truncate. It lives on THIS side
 * because the shape it quotes is this side's, and the edge only ever points this way.
 */
export function quoted(result: FitnessCommandResult): string {
  const said = [result.stdout, result.stderr]
    .map((stream) => stream.trim())
    .filter((stream) => stream !== "")
    .join("\n");
  // A silent non-zero exit is a fault report of its own, and a message that trailed off into
  // nothing would read as though the quoting had broken rather than as what the command did.
  return said === "" ? "(it printed nothing)" : said;
}

/**
 * What a scenario no configured row names is told, and the one remedy it is sent to.
 *
 * EXPORTED FOR THE MEASURED HALF, WHICH MEETS THE SAME SCENARIO (3F-3196). A measured scenario
 * missing its row is missing it in exactly the sense this sentence describes, and the remedy is the
 * same one — write the row. The sentence is about the INDEX, which is this side's, so it is stated
 * here once and read across rather than said twice in two wordings.
 */
export const NO_ROW =
  "no row of specController.fitnessChecks names this scenario, so there is no command to run. " +
  "Write its row: the @SCN it is about, the characteristic it asserts, and the command that " +
  "returns a violation.";

/**
 * Run the check the running scenario's `@SCN` names, and answer which of the three things it came
 * to: it found nothing, it found a violation, or it could not examine anything at all.
 *
 * A SCENARIO NO ROW NAMES IS A FAULT, and nothing is run for it. Such a scenario has said which
 * axis it is on and then said nothing about what it asserts, so nothing was examined — and letting
 * it pass would put a scenario in the fitness pass's report saying a check ran when no check ran at
 * all, which is the enumeration this axis exists to gain telling the first lie it is capable of.
 * The ledger says the same thing from the other side (@SCN-LNT-020 raises no Evidence Obligation
 * and reports the scenario as one no configured row names), and the two are deliberately not one
 * mechanism: the run reds where the person is, the reconciliation reds where the row is missing.
 * It is emphatically NOT the third verdict either: a scenario naming no check is a corpus fault
 * somebody has to fix, not a check that looked and found no input.
 *
 * `null` STATUS IS ITS OWN SENTENCE. A command killed by a signal, or one that could not be
 * started, never answered with a code — folding it into the non-zero arm would print `exited null`
 * at somebody trying to work out what their check did.
 *
 * THE MESSAGE NAMES THE COMMAND AND QUOTES IT, because a fitness scenario that reds is a violation
 * somebody has to go and fix, and a bare exit code sends them to work out which of a target's rows
 * spoke before they can begin.
 */
export function fitnessCheckOutcome(
  scnId: string,
  commands: FitnessCommandIndex,
  run: RunFitnessCommand
): FitnessCheckOutcome {
  const row = commands.get(scnId);
  if (row === undefined) return { verdict: "fault", fault: `${scnId}: ${NO_ROW}` };
  const command = row.command;
  const result = run(command);
  if (result.status === 0) return { verdict: "clean", fault: null };
  // THE ROW'S OWN CODE, AND ONLY WHERE THE ROW NAMED ONE (3F-3170). A row silent on the point never
  // reaches this branch, so every non-zero ending of its command stays a fault — the reading every
  // row had before any row could ask. And it is ONE code rather than a range: widening to "any
  // non-zero that is not 1" would hand the third answer to every check that broke, and the code a
  // target spends on a usage error is routinely the neighbour of the one it says this with.
  if (row.notExaminedExit !== null && result.status === row.notExaminedExit) {
    return { verdict: "not-examined", fault: null };
  }
  const how = result.status === null ? "did not run to completion" : `exited ${result.status}`;
  return { verdict: "fault", fault: `${scnId}: \`${command}\` ${how}.\n${quoted(result)}` };
}

/**
 * The one implementation that reaches a shell.
 *
 * `shell: true` BECAUSE THE ROW HOLDS A COMMAND LINE, not an argument list — `eslint src/` states
 * its own scope in the same string, which is the reason the row needs no fourth field for scope.
 * Splitting it here would be this module inventing a quoting grammar the target never agreed to.
 *
 * BOTH STREAMS ARE CAPTURED RATHER THAN INHERITED, so the failure message can quote what the
 * command said. Inheriting would print the findings straight through — which reads well until the
 * pass runs several checks and the reader has to work out which of them spoke.
 */
export const spawnFitnessCommand: RunFitnessCommand = (command) => {
  const finished = spawnSync(command, { shell: true, encoding: "utf8" });
  return {
    status: finished.status,
    stdout: finished.stdout ?? "",
    stderr: finished.stderr ?? "",
  };
};
