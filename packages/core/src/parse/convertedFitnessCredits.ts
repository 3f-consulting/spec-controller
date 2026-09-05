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
 * THE CREDIT IS ABOUT THE WIRING; THE EXIT CODE IS ABOUT THE FINDINGS. No step's status is read
 * here, and that is deliberate rather than unfinished: a static check's ledger row has never
 * carried the check's own verdict — a check finding violations reds the run through the runner's
 * exit code, and the ledger says the check ran. A reader that credited only the scenarios that
 * passed would answer the findings question twice and the ran question not at all.
 *
 * SEPARATE FROM `parse/cucumber`, WHICH READS THE BEHAVIOURAL PASS. That reader turns a reported
 * scenario into a RUNTIME observation levelled by its tier tag; this one turns a reported scenario
 * into a STATIC-check observation named by its configured row. Two reports, two streams, and the
 * fitness pass is its own cucumber call precisely so neither report is asked to be both.
 *
 * PURE AND INJECTED — the report and the rows both arrive as data, read at the app edge from the
 * target's own tree, the stance every reader on this axis takes.
 */

import { carriesBar, type FitnessCheckRegistry } from "../domain/fitnessChecks.js";
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
 * `staticCheck` HOLDS THE CHARACTERISTIC HERE, not a runnable handle, because a converted check has
 * none — it is not invoked by name, it is a scenario that ran. The field is where-to-fix on the
 * unmatched-credit destinations, and for a converted check the characteristic is the whole of what
 * there is to name; `checkTag` is what the reconciler actually matches on, and both hold one word.
 */
export function convertedFitnessCredits(
  report: CucumberJsonReport,
  fitnessChecks: FitnessCheckRegistry
): GuardEvidenceObservation[] {
  const credits: GuardEvidenceObservation[] = [];
  for (const feature of report) {
    for (const scenario of feature.elements ?? []) {
      const tags = scenario.tags ?? [];
      if (!tags.some((tag) => bareTerm(tag.name ?? "") === FITNESS_AXIS_TAG)) continue;
      const scnId = citedScnOf(tags);
      if (scnId === null) continue;
      const row = fitnessChecks.get(scnId);
      if (row === undefined || carriesBar(row)) continue;
      credits.push({
        qualityCheck: "lint",
        staticCheck: row.characteristic,
        scnId,
        checkTag: row.characteristic,
        exists: true,
        enforcedOverRealSource: true,
      });
    }
  }
  return credits;
}
