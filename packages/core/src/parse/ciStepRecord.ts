/**
 * THE CI RUN'S OWN RECORD of what each of its steps did — the observation side of the fitness
 * axis, and the second of this axis's two readers (@SCN-LNT-021, @SCN-LNT-028).
 *
 * THE OTHER ONE READS A DIFFERENT DOCUMENT AND ANSWERS A DIFFERENT QUESTION. `runningStaticChecks`
 * and `checkScriptsRunInCI` read the workflow FILE and answer "is this check wired into this
 * pipeline, and which row does its step cite" — a fact about a repository, true between runs. This
 * reads the RUN's record and answers "did it run this time, and what did it find" — a fact about
 * one afternoon. Neither can be got from the other's document, which is why there are two.
 *
 * THE RECORD IS THE CONSUMER'S, WRITTEN BY NEITHER PARTY. It is what a job's own `toJSON(steps)`
 * dumps: one entry per step that carried an `id:`, keyed by that id, each carrying the step's
 * `outcome` and its `conclusion`. Nothing here executes a check, and nothing asks a consumer to
 * move a command out of their pipeline — the check already ran, as their own CI step.
 *
 * THE KEY IS THE CITATION. A step's `id:` is the `@SCN` of the configured row it answers, so an
 * entry naming a configured row is read for its verdict, and that verdict answers the one fitness
 * obligation the row's scenario raises (3F-3525). An entry no configured row answers is
 * not this reader's business: `checkout` and `setup-node` are not checks, and silence about them
 * is the correct report rather than a gap in one.
 *
 * AND THE ROWS ARE READ TOO, NOT ONLY THE RECORD (@SCN-LNT-027). An entry is one half of the
 * reading; the other is every configured row the record held no entry for, which is broken evidence
 * naming that row. It is the one comparison on this axis that survives its own subject vanishing:
 * the rows come from the target's manifest and the enumeration from the run's own record, so
 * emptying either leaves the other standing. Every other reading here loses both sides at once when
 * a check stops being wired, and a run over nothing balances.
 *
 * A RECORD NEVER HANDED OVER IS NOT A RECORD CARRYING NOTHING, AND THE OPTIONALITY REACHES THIS
 * MODULE rather than being flattened at the call site. `undefined` is a consumer whose pipeline
 * dumps no record, or a run nobody recorded: nothing is raised, the rows reconcile missing by
 * absence and the run is out of balance, exactly as before. An EMPTY record is a run that happened
 * and named not one of these steps, which is every configured check that did not run. Calling the
 * first consumer's set-up broken over a file they have no reason to own is the fault the
 * self-reconciliation gate already refuses one level up.
 *
 * PURE AND INJECTED, like every reader on this axis: the record arrives as data, parsed at the app
 * edge from the target's own evidence, and the rows arrive from the target's own manifest.
 */

import type { FitnessCheckIndex } from "../domain/fitnessChecks.js";
import type { EvidenceStatus } from "../domain/journal.js";
import type { FitnessEvidenceObservation } from "../model.js";

/**
 * ONE STEP'S ENTRY in the record, as the dump wrote it.
 *
 * BOTH FIELDS ARE OPTIONAL BECAUSE THE DOCUMENT IS SOMEBODY ELSE'S. It is JSON a consumer's CI
 * wrote and this reader was handed; a shape that declared either field present would be asserting
 * something about a file nobody here validated, and the first record written by a provider that
 * spells things differently would be a type error wearing a crash.
 */
export interface CiStepRecordEntry {
  /**
   * WHAT THE STEP ACTUALLY DID — pre-`continue-on-error`, and the field this axis reads.
   *
   * `success`, `failure`, `skipped` or `cancelled` on the provider this reader was built against.
   * It is a string rather than a union for the reason the two fields are optional: the document is
   * the consumer's, and a status nobody anticipated is a reading to fall through rather than a
   * value the type system can forbid a foreign file from containing.
   */
  readonly outcome?: string;
  /**
   * WHAT THE JOB WAS TOLD — post-`continue-on-error`, and the laundered value.
   *
   * Carried on the type because it is in the document, and read by nothing: a step marked
   * `continue-on-error: true` that failed reports `success` here, so a reader taking this field is
   * green over a masked failure. WHICH of the two fields a reader must take is its own claim with
   * its own scenario (3F-3264); what this type does is stop the laundered one being reachable by
   * accident under a name that reads like the real one.
   */
  readonly conclusion?: string;
}

/**
 * THE RECORD — every step that carried an `id:`, keyed by that id.
 *
 * A step with no `id:` is absent from it entirely, which is the provider's own arrangement and not
 * a loss: a step nobody named cites nothing, and the record has no key to file it under.
 */
export type CiStepRecord = Readonly<Record<string, CiStepRecordEntry>>;

/** The provider's own two words for a step that RAN, spelled once each. */
const SUCCESS = "success";
const FAILURE = "failure";
/** And its word for a step that did not — the one reading a ROW can ask to be credited for. */
const SKIPPED = "skipped";

/**
 * WHAT THIS READER MAKES OF ONE STEP — the credit it raises and what that credit says, or `null`
 * where it has no reading at all (@SCN-LNT-021, @SCN-LNT-028).
 *
 * THE THREE STATES ARE A SHAPE RATHER THAN A CONVENTION. `null` is no credit; an object is a
 * credit; and `status` present on that object is a verdict the check itself reached. Spelling "no
 * credit" and "a credit with nothing to say" as one value — an absent status — is what let a skip
 * a row asked for be indistinguishable from a skip nobody did.
 */
type StepReading = { readonly status?: EvidenceStatus } | null;

/**
 * WHAT THE CHECK ITSELF SAID, read off the step's own result — or `null` where this reader has no
 * reading for what the record says (@SCN-LNT-021, @SCN-LNT-028).
 *
 * TWO READINGS SAY WHAT THE CHECK DID AND EVERYTHING ELSE FALLS THROUGH, which is the fail-safe
 * direction written as a shape rather than as a warning. A step that succeeded ran and found
 * nothing; a step that failed ran and found something; and both of those are facts about a check,
 * which is why both raise a credit and the credit carries WHICH. Every other reading — any skip
 * whatever its cause, `cancelled`, a status nobody anticipated, or no entry for the row at all —
 * is a step this reader cannot vouch for having run, and what such a step earns is BROKEN evidence
 * rather than the credit (@SCN-LNT-026): the `null` is a fall-through to the other shape, never a
 * silence.
 *
 * THERE IS NO THIRD READING FOR "THE COMMAND EXAMINED NOTHING", AND THE REASON IS THAT A SKIP
 * CANNOT MEAN IT (3F-3252). A row used to declare the ending its command says so with, and the
 * retired fitness pass SPAWNED that command and compared the number. Here nothing of ours spawns
 * anything: the consumer's CI runs it, and a command that examines nothing still RUNS — it exits,
 * so its step reads success or failure. It is never `skipped`. A step is skipped when a condition
 * went false, when the job was cancelled, or when somebody moved it — and none of those is the
 * check examining nothing.
 *
 * SO A READING THAT FORGAVE A SKIP ON THE STRENGTH OF A DECLARED ENDING WOULD BE A HATCH. The
 * declaration could only be read for WHETHER it was named — no code crosses a step record to check
 * it against — so `if: false` beside a declared ending would read SATISFIED for ever: a check
 * switched off, green in the ledger, through the product's own configuration, and single-entry in
 * the double-entry product. The field is gone rather than guarded.
 *
 * A CONSUMER WHOSE COMMAND GENUINELY EXAMINES NOTHING SAYS SO IN THEIR OWN `run:` LINE —
 * `eslint || [ $? -eq 3 ]` — where it becomes an honest success their CI records. That is their
 * business, on their side of the boundary, and it needs nothing from our row.
 *
 * THE VERDICT IS CARRIED RATHER THAN COLLAPSED, and that is what this route does not share with
 * the retired fitness pass's reader. While a runner ran the checks, a check that found violations
 * reddened the run through the runner's exit code and its credit only had to say the check ran — so passed
 * and failed were honestly one answer there. A CI step's exit code reaches this ledger nowhere: if
 * the credit does not carry the verdict, nothing does.
 */
function readingOf(outcome: string | undefined): StepReading {
  if (outcome === SUCCESS) return { status: "passed" };
  if (outcome === FAILURE) return { status: "failed" };
  return null;
}

/**
 * WHAT THE RECORD SAID AND WHY THAT IS NOT A CREDIT — the whole of the record's answer about this
 * check, so it is written as one sentence (@SCN-LNT-026).
 *
 * IT IS ALL A READER GETS, which is why it says three things and no more. A broken item carries no
 * Evidence Observation, so this sentence names the subject, states the diagnosis, and prescribes NO
 * cure — which of a condition that went false, a cancelled job, a step somebody moved or a provider
 * that spells things differently produced the reading is not this reader's to say, and naming one
 * would send the reader to the wrong file.
 *
 * THE SKIP ARM NAMES THE THREE THINGS THAT CAUSE A SKIP, because a reader meeting this line will
 * otherwise go hunting for a broken command that is working perfectly. No row can excuse a skip:
 * a command that examines nothing still runs and still ends, so a skip is never that (3F-3252).
 */
function checkDidNotRunMessage(scnId: string, outcome: string | undefined): string {
  if (outcome === undefined) {
    return `${scnId}: the CI run's record carries no outcome for this check's step — so the check did not run.`;
  }
  if (outcome === SKIPPED) {
    return `${scnId}: the CI run's record says this check's step was skipped — so the check did not run.`;
  }
  return `${scnId}: the CI run's record says this check's step ended \`${outcome}\` — so the check did not run.`;
}

/**
 * ONE ENTRY'S CREDIT — the ordinary one where the record says what the check did, and BROKEN
 * evidence where it does not (@SCN-LNT-026).
 *
 * ONE FUNCTION FOR BOTH BECAUSE IT IS ONE DECISION. The two observations differ in what they say
 * about the same check, so writing them apart would put the question in one place and its two
 * answers in two — and the day a field is added to one of them is the day they stop agreeing about
 * anything but the fields somebody remembered.
 *
 * THE BROKEN ONE CARRIES BOTH FACTS AS `false` RATHER THAN OMITTING THEM. `exists` and
 * `enforcedOverRealSource` are OBSERVATIONS on this route — the record saying a step ran is what
 * says the check exists and ran over the consumer's own checkout — and neither was observed here,
 * so the honest values are the ones that assert nothing. It is also what keeps the roll-up right: a
 * check that did not run is not a running static check.
 *
 * AND IT CARRIES ITS `@SCN`, which is known and true. What stops that
 * being read as a citation is the reconciler's two fail-safes — `postingOf` takes `broken` before
 * `scnId`, and the obligation match excludes it — never their absence.
 */
function namedOf(citedScn: string) {
  return {
    qualityCheck: "fitness",
    // THE STEP'S OWN `id:` AS THE CHECK THAT RAN, because a check the record names has no runnable
    // handle to put there: the record knows a step id and nothing else, and that id is the row's
    // `@SCN` (3F-3525). `staticCheck` is where-to-fix, and the step carrying that id is exactly
    // where a reader goes to fix it.
    staticCheck: citedScn,
    scnId: citedScn,
  } as const;
}

/**
 * The BROKEN shape, spelled once for both the readings that reach it — an entry whose outcome this
 * reader cannot vouch for (@SCN-LNT-026), and a configured row the record held no entry for at all
 * (@SCN-LNT-027).
 *
 * ONE SPELLING BECAUSE IT IS ONE OUTCOME. The two readings differ in what they say about the check
 * and in nothing else, so a second construction here would be free to omit a field the first
 * carries — and the day one of them stopped carrying `exists: false` is the day a check that did
 * not run started counting as a running one on exactly half the routes.
 */
function brokenCreditOf(citedScn: string, message: string): FitnessEvidenceObservation {
  return {
    ...namedOf(citedScn),
    exists: false,
    enforcedOverRealSource: false,
    broken: true,
    message,
  };
}

function creditOf(
  citedScn: string,
  reading: StepReading,
  outcome: string | undefined
): FitnessEvidenceObservation {
  if (reading === null) {
    return brokenCreditOf(citedScn, checkDidNotRunMessage(citedScn, outcome));
  }
  return {
    ...namedOf(citedScn),
    // OBSERVED, NOT INFERRED, which is why both are asserted at all. The step RAN — that is what
    // the record says — and it ran in the target's own checkout, over the target's own tree.
    // Neither is the manifest-mentions-a-name reading the discovered route takes.
    exists: true,
    enforcedOverRealSource: true,
    // THE VERDICT THE STEP REACHED, AND EVERY CREDIT CARRIES ONE. A step that ran reached either
    // `passed` or `failed`; a step that did not is not a credit at all but broken evidence, so
    // there is no third shape here (3F-3252).
    ...reading,
  };
}

/**
 * WHAT the record said about a configured row it held no entry for, which is nothing at all — the
 * message a row's own absence from the record earns (@SCN-LNT-027).
 *
 * IT NAMES THE MANIFEST RATHER THAN THE PIPELINE, because the manifest is the document this reader
 * actually held. Which step should have carried the row's code is a real question and not one the
 * record can answer: the entry it would live in is precisely what the record did not carry. Naming
 * a workflow file this reader never read would be the prescribed cure a broken item refuses.
 *
 * IT IS NOT THE SENTENCE AN ENTRY WITH NO OUTCOME EARNS, and the two are kept apart because they
 * send a reader to different places. That one is a step this run recorded and said nothing about;
 * this one is a step the run did not record at all.
 */
function rowHasNoEntryMessage(scnId: string): string {
  return (
    `${scnId}: the CI run's record carries no step for this row of ` +
    "`specController.fitnessChecks` — so the check did not run."
  );
}

/**
 * The credits a CI RUN'S OWN RECORD raises — one per entry naming a configured row, carrying
 * WHAT ITS STEP DID: `satisfied` off a step that succeeded (@SCN-LNT-021) and `failing` off one
 * that failed (@SCN-LNT-028). There is no third answer: a step the record says was skipped is
 * broken evidence, whatever its row says (3F-3252).
 *
 * AND BROKEN EVIDENCE OFF EVERY OTHER READING (@SCN-LNT-026), which is why this is one per configured
 * entry rather than one per entry that said something. The credit set is CLOSED to the three readings
 * that say what the check did; a skip no row asked for, a `cancelled` step, a status nobody
 * anticipated are each a step whose running this reader cannot vouch for, and the safe answer is the
 * loud one — no Evidence Observation, the obligation reconciling missing by absence, and the run
 * stamped unsound. Raising nothing at all would leave a check that stopped running indistinguishable
 * from one nobody ever wrote, and send the reader to write it.
 *
 * THE CREDIT ARRIVES ALREADY CITING, WHICH IS THE SEAM THIS ROUTE RETIRES (@SCN-LNT-021). A
 * DISCOVERED check is found as a runnable script handle, and a handle does not know what it is
 * for — hence the (now-retired) registry, and hence the corpus lookup behind it. Here the
 * entry's key IS the code of the row it answers: one term, and no registry consulted at all.
 *
 * `failing`, AND THE THREE NEIGHBOURS IT IS NOT. `broken` is the never-ran case: it carries no
 * Evidence Observation and stamps the run unsound, so reading a failed step as broken would throw
 * away the one thing the check actually said. `missing` says no evidence, and there is evidence.
 * A credit that said only "it ran" leaves the row balanced over a check that found violations,
 * which is this axis's own headline fault arriving by the front door. What is left is the word
 * every other axis already uses for present-and-failing.
 *
 * THE VERDICT TRAVELS ON THE OBSERVATION BECAUSE NOTHING ELSE CARRIES IT ANY MORE. While a runner
 * ran the checks, a check that found violations reddened the run through the runner's exit code
 * and the credit only had to say the check ran. A CI step's exit code reaches this ledger nowhere.
 *
 * BOTH `exists` AND `enforcedOverRealSource` ARE OBSERVED HERE, NOT INFERRED, which is why they
 * are asserted at all. The step RAN — that is what the record says — and it ran in the target's
 * own checkout, over the target's own tree. Neither is the manifest-mentions-a-name reading the
 * discovered route takes.
 *
 * AN ENTRY NO CONFIGURED ROW ANSWERS IS NOT THIS READER'S BUSINESS. `checkout`, `setup-node` and
 * the dump step itself are steps and not checks, and silence about them is the correct report.
 *
 * AND A CONFIGURED ROW NO ENTRY ANSWERS RAISES A BROKEN CREDIT (@SCN-LNT-027), which is why this
 * walks the ROWS as well as the record. The rows are the denominator, and a check quietly lifted
 * out of a pipeline goes dark on the side the pipeline cannot reach.
 */
export function ciStepRecordCredits(
  record: CiStepRecord | undefined,
  fitnessChecks: FitnessCheckIndex
): FitnessEvidenceObservation[] {
  if (record === undefined) return [];
  const credits: FitnessEvidenceObservation[] = [];
  const recorded = new Set<string>();
  for (const [citedScn, step] of Object.entries(record)) {
    if (!fitnessChecks.has(citedScn)) continue;
    recorded.add(citedScn);
    // NO `continue` ON A READING THIS READER HAS NONE FOR (@SCN-LNT-026). Every configured row the
    // record holds an entry for raises something; which of the two shapes it raises is the
    // credit builder's answer, and the fall-through reaches the loud one rather than the exit.
    credits.push(creditOf(citedScn, readingOf(step.outcome), step.outcome));
  }
  // AND THE ROWS ARE WALKED TOO, NOT ONLY THE RECORD (@SCN-LNT-027). The rows come from the
  // target's manifest and the enumeration from the run's own record, so a row the record held no
  // entry for is a check that did not run — broken evidence naming that row.
  for (const scnId of fitnessChecks) {
    if (recorded.has(scnId)) continue;
    credits.push(brokenCreditOf(scnId, rowHasNoEntryMessage(scnId)));
  }
  return credits;
}
