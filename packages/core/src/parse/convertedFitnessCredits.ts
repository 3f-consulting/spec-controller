/**
 * The CONVERTED static check's credit reader (@SCN-LNT-021) — the fitness pass's Cucumber report
 * read into one `GuardEvidenceObservation` per scenario a STATIC configured row names.
 *
 * STATIC ONLY, AND THE ROW'S SHAPE IS WHAT SAYS SO (@SCN-LNT-022). A measured row's credit is its
 * NUMBER, which arrives on the measurement stream already citing, so this reader raises none beside
 * it: one Evidence Obligation, one credit. The question is asked through `carriesBar`, the same
 * spelling the obligation side asks it through — which is what makes the two sides' answers one
 * answer rather than two that happen to agree.
 *
 * THE CREDIT ARRIVES ALREADY CITING, WHICH IS THE SEAM CONVERSION RETIRES. An unconverted static
 * check is DISCOVERED as a runnable script handle, and a handle does not know what it is for —
 * hence `checkRegistry`, and hence the corpus lookup behind it (`fitnessCitations`), two hops to
 * recover what the check was about. A converted check is never discovered: it is a scenario that
 * RAN, carrying its own `@SCN` on its own tag line, and the configured row keyed by that `@SCN`
 * carries the characteristic. Both terms of the credit are read off what the pass reported, so
 * nothing is resolved onto it and no registry is consulted here at all.
 *
 * THE TWO FACTS SUCH A CREDIT CARRIES ARE OBSERVED RATHER THAN INFERRED. On the unconverted route
 * `exists` is read from a `package.json` script and `enforcedOverRealSource` from a workflow
 * `run:` step — a file MENTIONING a name. Here the scenario appearing in the report says the check
 * ran, and the fitness pass runs in the target's own root, so it ran over that root's tree. Both
 * are facts about the run itself, which is strictly stronger evidence (`journal.ts` states this on
 * the two fields).
 *
 * THE CREDIT IS ABOUT THE WIRING; THE EXIT CODE IS ABOUT THE FINDINGS. That split is why the
 * status is read for ONE question only — did the check RUN — and never for the check's own
 * verdict. A check finding violations reds the run through the runner's exit code and its row
 * still says the check ran, so `passed` and `failed` are one answer here; a reader that credited
 * only the scenarios that passed would answer the findings question twice and the ran question not
 * at all. This module used to read no status whatsoever and called that deliberate, which was the
 * right rule about findings and the wrong conclusion about running (@SCN-LNT-026): a SKIPPED
 * scenario appears in the report having examined nothing, and cucumber exits 0 for it, so the
 * credit posted, the row read satisfied and nothing anywhere disagreed.
 *
 * WHAT A CREDIT NOW COSTS: TWO FACTS FROM TWO PLACES. The step status comes from the report; the
 * ending a row names comes from the manifest. A hook, a tag filter or a lost `require` can make the
 * report say `skipped` and none of them can reach the manifest to make a row name an ending, so
 * whether a skip is one the check ASKED FOR is settled by a checked-in sentence about that check.
 * That is what the measured side has had all along — its credit is a NUMBER something had to
 * produce — and it is why a measured row already failed closed on a hook while every static row
 * stayed satisfied.
 *
 * AND THE DEFAULT IS `broken`, NOT THE CREDIT. The credit is reached by the readings that say the
 * check ran and by the skip a row asked for; every other reading falls through, an unanticipated
 * status included. A status this reader cannot vouch for is a check whose running it cannot vouch
 * for, and the safe reading is the one that reds.
 *
 * AND THE ROWS ARE READ TOO, NOT ONLY THE REPORT (@SCN-LNT-027). A reported scenario is one half of
 * the reading; the other is every configured row the report never carried, which is broken evidence
 * naming that row. This is the mirror of `unconfiguredFitnessScenarios` — that reads a @fitness
 * scenario no row names, this reads a row no reported scenario names — and it is the one comparison
 * on this axis that survives its own subject vanishing: the rows come from the target's manifest and
 * the enumeration from the pass's report, so emptying either leaves the other standing. Every other
 * reading here loses both sides at once when the corpus goes, and a run over nothing balances.
 *
 * A REPORT NEVER HANDED OVER IS NOT A REPORT CARRYING NOTHING, AND THE OPTIONALITY REACHES THIS
 * FUNCTION RATHER THAN BEING FLATTENED AT THE CALL SITE. `undefined` is a target that converted
 * nothing, or a pass nobody ran: nothing new is raised, the rows reconcile missing by absence and
 * the run is out of balance, exactly as before. An EMPTY report is a pass that ran and did not carry
 * this check, which is fifteen checks that did not run. Calling the first target's set-up broken
 * over a file it has no reason to own is the fault `selfBalanceArgv`'s own header refuses one level
 * up, and it is why `?? []` cannot stand between the caller and this rule.
 *
 * SEPARATE FROM `parse/cucumber`, WHICH READS THE BEHAVIOURAL PASS. That reader turns a reported
 * scenario into a RUNTIME observation levelled by its tier tag; this one turns a reported scenario
 * into a STATIC-check observation named by its configured row. Two reports, two streams, and the
 * fitness pass is its own cucumber call precisely so neither report is asked to be both.
 *
 * PURE AND INJECTED — the report and the rows both arrive as data, read at the app edge from the
 * target's own tree, the stance every reader on this axis takes.
 */

import {
  carriesBar,
  namesNotExaminedEnding,
  type FitnessCheck,
  type FitnessCheckIndex,
} from "../domain/fitnessChecks.js";
import type { GuardEvidenceObservation } from "../model.js";
import { SCN_TAG, type CucumberJsonReport } from "./cucumber.js";
import { FITNESS_AXIS_TAG } from "./scenarios.js";
import { bareTerm } from "../lib/bareTerm.js";

/**
 * The `@SCN` a reported scenario cites, or `null` where its tag line carries none.
 *
 * The report reader's OWN spelling of that tag (`SCN_TAG`), not a second one written here: this
 * reads the same document `parse/cucumber` reads, and two spellings of "which tag on a reported
 * scenario is its `@SCN`" would eventually disagree about a corpus neither of them wrote.
 */
function citedScnOf(tags: readonly { name?: string }[]): string | null {
  for (const tag of tags) {
    const match = SCN_TAG.exec(tag.name ?? "");
    if (match) return match[1]!;
  }
  return null;
}

/**
 * The one status that says a check examined nothing, spelled once. Cucumber's own word, and the
 * word the fitness step definition returns for the third answer — so the two ends of that protocol
 * are reading one string rather than two that agree today.
 */
const SKIPPED = "skipped";

/**
 * What the report said about each of the scenario's OWN steps, in report order.
 *
 * HOOKS ARE NOT THE SCENARIO'S STEPS, AND EXCLUDING THEM IS LOAD-BEARING RATHER THAN TIDY.
 * Cucumber emits every `Before` / `After` it ran as a step of the scenario, marked `hidden` and
 * carrying its own status — so a real pass reports a converted check as TWO entries: a passed hook
 * and the step that ran the command. Counting the hook would make the honest not-examined skip
 * read as a MIXTURE of `passed` and `skipped` rather than as a skip, and the one reading a row is
 * allowed to ask for (@SCN-LNT-023) would be the single thing this rule refused. Measured on this
 * repository's own fitness pass rather than reasoned about.
 *
 * WHAT THE HOOK'S OWN STATUS IS NOT ASKED TO SAY. A `Before` that FAILS leaves the scenario's step
 * `skipped`, which reads here as a skip like any other — broken for a row naming no ending, and
 * for a row that names one the residual 3F-3162 already recorded: the report cannot tell that skip
 * from the one the check asked for. It is not silent either way, because a failed hook fails the
 * scenario and the pass reds on its own.
 */
function stepStatusesOf(scenario: {
  steps?: readonly { hidden?: boolean; result?: { status?: string } }[];
}): readonly string[] {
  return (scenario.steps ?? [])
    .filter((step) => step.hidden !== true)
    .map((step) => step.result?.status ?? "(none reported)");
}

/**
 * Does the report say this check RAN — the whole of the new question, asked in one place.
 *
 * THREE READINGS SAY YES AND EVERYTHING ELSE FALLS THROUGH, which is the fail-safe direction
 * written as a shape rather than as a warning. A step failed, or every step passed: either way the
 * check ran and the exit code carries what it found. Or every step is `skipped` AND the row named
 * the ending its command says it examined nothing with — the check said so about itself, in its
 * own row, beside its own command (@SCN-LNT-023).
 *
 * A MIXED SCENARIO IS NOT A YES, and that is deliberate rather than an oversight about a shape a
 * converted check does not have. A converted scenario carries exactly one step, so the only way to
 * reach a mixture is a corpus that is not what this reader was handed a row for — and a reading
 * that guessed which of two statuses to believe would be vouching for a run it cannot describe.
 */
function reportSaysTheCheckRan(statuses: readonly string[], row: FitnessCheck): boolean {
  if (statuses.some((status) => status === "failed")) return true;
  if (statuses.length > 0 && statuses.every((status) => status === "passed")) return true;
  return (
    statuses.length > 0 &&
    statuses.every((status) => status === SKIPPED) &&
    namesNotExaminedEnding(row)
  );
}

/**
 * WHAT the report said and why that is not a credit — the whole of the report's answer about this
 * check, so it is written as one sentence.
 *
 * IN `ambiguousMessage`'S VOICE, and for its reason: a broken item carries no observation, so this
 * is all a reader gets. It names the subject, states the diagnosis, and prescribes NO cure — which
 * of a hook, a tag filter, a lost `require` or a consumer's own convention produced the skip is
 * not this reader's to say, and naming one would send the reader to the wrong file.
 *
 * THE SKIP ARM SAYS THE SECOND HALF, because for that reading the status alone is not the fault.
 * A skip is a fault exactly where no row asked for it, so the sentence has to name the row's
 * silence or a reader would go looking for a broken command that is working perfectly.
 */
function checkDidNotRunMessage(scnId: string, statuses: readonly string[]): string {
  if (statuses.length === 0) {
    return `${scnId}: the fitness pass reported this scenario with no step at all — so the check did not run.`;
  }
  const said = [...new Set(statuses)].join(", ");
  const step = statuses.length === 1 ? "step" : "steps";
  if (statuses.every((status) => status === SKIPPED)) {
    return (
      `${scnId}: the fitness pass reported this scenario as skipped, and its row of ` +
      "`specController.fitnessChecks` names no ending its command says it examined nothing with — " +
      "so the check did not run."
    );
  }
  return `${scnId}: the fitness pass reported this scenario's ${step} as ${said} — so the check did not run.`;
}

/**
 * ONE reported scenario's credit — the ordinary one where the report says its check ran, and
 * BROKEN evidence where it does not (@SCN-LNT-026).
 *
 * ONE FUNCTION FOR BOTH BECAUSE IT IS ONE DECISION. The two observations differ in what they say
 * about the same check, so writing them apart would put the question in one place and its two
 * answers in two — and the day a field is added to one of them is the day they stop agreeing about
 * anything but the fields somebody remembered.
 *
 * THE BROKEN ONE CARRIES BOTH FACTS AS `false` RATHER THAN OMITTING THEM. `exists` and
 * `enforcedOverRealSource` are OBSERVATIONS on this route — the scenario appearing in the report
 * says the check ran, over the target's own tree — and neither was observed here, so the honest
 * values are the ones that assert nothing. It is also what keeps the roll-up right: a check that
 * did not run is not a running static check.
 *
 * AND IT CARRIES ITS `@SCN` AND ITS CHARACTERISTIC, which are known and true, exactly as cucumber's
 * broken observation carries the `@SCN` its scenario cited. What stops those being read as a
 * citation is the reconciler's two fail-safes — `postingOf` takes `broken` before `scnId`, and the
 * obligation match excludes it — never their absence.
 */
function namedOf(scnId: string, row: FitnessCheck) {
  return {
    qualityCheck: "lint",
    staticCheck: row.characteristic,
    scnId,
    checkTag: row.characteristic,
  } as const;
}

/**
 * The BROKEN shape, spelled once for both the readings that reach it — a reported scenario whose
 * status cannot be vouched for, and a configured row the report never carried at all.
 *
 * ONE SPELLING BECAUSE IT IS ONE OUTCOME. The two readings differ in what they say about the check
 * and in nothing else, so a second construction here would be free to omit a field the first
 * carries — and the day one of them stopped carrying `exists: false` is the day a check that did
 * not run started counting as a running one on exactly half the routes.
 */
function brokenCreditOf(
  scnId: string,
  row: FitnessCheck,
  message: string,
  locator: string | undefined
): GuardEvidenceObservation {
  return {
    ...namedOf(scnId, row),
    exists: false,
    enforcedOverRealSource: false,
    broken: true,
    message,
    ...(locator !== undefined ? { locator } : {}),
  };
}

function creditOf(
  scnId: string,
  row: FitnessCheck,
  statuses: readonly string[],
  locator: string | undefined
): GuardEvidenceObservation {
  if (reportSaysTheCheckRan(statuses, row)) {
    return { ...namedOf(scnId, row), exists: true, enforcedOverRealSource: true };
  }
  return brokenCreditOf(scnId, row, checkDidNotRunMessage(scnId, statuses), locator);
}

/**
 * WHAT the report said about a configured row it never carried, which is nothing at all — the
 * message a row's own absence from the enumeration earns.
 *
 * IT NAMES THE MANIFEST RATHER THAN THE CORPUS, because the manifest is the document this reader
 * actually held. Where the missing scenario should have been written is a real question and not
 * one the report can answer: the corpus it would live in is precisely what the report did not
 * carry. Naming a file this reader never read would be the prescribed cure a broken item refuses.
 */
function rowWasNotEnumeratedMessage(scnId: string): string {
  return (
    `${scnId}: the fitness pass's report carried no scenario for this row of ` +
    "`specController.fitnessChecks` — so the check did not run."
  );
}

/**
 * The credits the REPORT itself raises — one per reported scenario on the axis whose `@SCN` a
 * configured row names — and, beside them, WHICH rows that report enumerated.
 *
 * THE TWO COME BACK TOGETHER BECAUSE THEY ARE ONE WALK. The enumeration is not a second reading of
 * the report taken afterwards: it is what this walk saw, so a row can never be called unenumerated
 * by one pass over a document the other pass read differently.
 */
function reportedCredits(
  report: CucumberJsonReport,
  fitnessChecks: FitnessCheckIndex
): { credits: GuardEvidenceObservation[]; enumerated: ReadonlySet<string> } {
  const credits: GuardEvidenceObservation[] = [];
  const enumerated = new Set<string>();
  for (const feature of report) {
    // WHERE the reader is sent for a check that did not run — the corpus the scenario lives in,
    // which is a real place, unlike a discovered check's config. Carried on the broken credit only;
    // an ordinary credit has its row to be read against and has never needed one.
    const locator = feature.uri ?? feature.name;
    for (const scenario of feature.elements ?? []) {
      const row = rowFor(scenario, fitnessChecks);
      if (row === null) continue;
      // ENUMERATED BEFORE THE BAR IS ASKED ABOUT, and the order is the rule rather than a
      // convenience. A measured row's CREDIT is skipped here (@SCN-LNT-022) and its ENUMERATION
      // never was: its scenario appearing in the report is what says its check ran, exactly as for
      // a static row. Asking `carriesBar` first would leave every measured row looking
      // unenumerated on a report that carried it.
      enumerated.add(row.scnId);
      if (carriesBar(row.check)) continue;
      credits.push(creditOf(row.scnId, row.check, stepStatusesOf(scenario), locator));
    }
  }
  return { credits, enumerated };
}

/**
 * The configured row a reported scenario is about, or `null` where it is about none — the three
 * conditions that admit a scenario to this reading, asked in one place.
 *
 * A SCENARIO OFF THE AXIS, ONE CITING NO `@SCN`, AND ONE NO ROW NAMES ARE ALL THE SAME ANSWER
 * HERE (@SCN-LNT-020): there is no configured row, so there is nothing for this reader to say.
 */
function rowFor(
  scenario: { tags?: readonly { name?: string }[] },
  fitnessChecks: FitnessCheckIndex
): { scnId: string; check: FitnessCheck } | null {
  const tags = scenario.tags ?? [];
  if (!tags.some((tag) => bareTerm(tag.name ?? "") === FITNESS_AXIS_TAG)) return null;
  const scnId = citedScnOf(tags);
  if (scnId === null) return null;
  const check = fitnessChecks.get(scnId);
  return check === undefined ? null : { scnId, check };
}

/**
 * The static credits the fitness pass's report raises — one per reported scenario on the axis whose
 * `@SCN` a configured row names.
 *
 * A SCENARIO WHOSE ROW CARRIES A BAR RAISES NOTHING HERE (@SCN-LNT-022), because that row's credit
 * is its number. A credit raised beside the number would be a SECOND credit answering one Evidence
 * Obligation, and a quiet one: the row does name that characteristic, so the extra credit is
 * absorbed by the row's own obligation rather than surfacing as a `no-evidence-obligation` item —
 * the run reads balanced while the roll-up counts a measured check among the static checks that
 * ran. The scenario is still ENUMERATED, and that has not moved: its appearance in the report is
 * what says the check ran, exactly as for a static row. What it no longer does is post a credit.
 *
 * A SCENARIO NO ROW NAMES RAISES NOTHING, matching the debit side exactly (@SCN-LNT-020): such a
 * scenario has said which axis it is on and then said nothing about what it asserts, so there is no
 * characteristic to credit any more than there is one to owe. Reaching for the axis word itself, or
 * for the nearest characteristic, would invent the term the corpus never wrote.
 *
 * A CONFIGURED ROW THE REPORT NEVER CARRIED RAISES A BROKEN CREDIT, WHATEVER ITS SHAPE
 * (@SCN-LNT-027). The bar decides which stream carries a row's credit and says nothing about
 * whether the check ran, so a MEASURED row is held to this second reading exactly as a static one
 * is: its number is its credit and its scenario is still what says it ran, and a number arriving
 * for a row the pass never enumerated is a number from a route that enumerates nothing.
 *
 * `staticCheck` HOLDS THE CHARACTERISTIC HERE, not a runnable handle, because a converted check has
 * none — it is not invoked by name, it is a scenario that ran. The field is where-to-fix on the
 * unmatched-credit destinations, and for a converted check the characteristic is the whole of what
 * there is to name; `checkTag` is what the reconciler actually matches on, and both hold one word.
 */
export function convertedFitnessCredits(
  report: CucumberJsonReport | undefined,
  fitnessChecks: FitnessCheckIndex
): GuardEvidenceObservation[] {
  if (report === undefined) return [];
  const { credits, enumerated } = reportedCredits(report, fitnessChecks);
  for (const [scnId, row] of fitnessChecks) {
    if (enumerated.has(scnId)) continue;
    // NO LOCATOR, because there is no reported scenario to take a `uri` from. The renderer says so
    // in the reader's hearing rather than this function inventing a path it never read.
    credits.push(brokenCreditOf(scnId, row, rowWasNotEnumeratedMessage(scnId), undefined));
  }
  return credits;
}
