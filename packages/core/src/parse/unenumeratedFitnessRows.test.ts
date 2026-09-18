/**
 * @unit for @SCN-LNT-027 — the ROWS are the side the record cannot erase: a configured row whose
 * step a handed-over CI run record never carried is broken evidence, and a run handed NO record
 * raises none of it.
 *
 * ITS OWN FILE, BESIDE `unconfiguredFitnessScenarios.test.ts` AND FOR THAT FILE'S REASON. The two
 * are mirrors — that one reads a `@fitness` scenario no row names, this one a row no recorded step
 * names — and each is about the half of the pair its own fixture is built to lose. The arms beside
 * it under `assemble/` read what the record SAYS about a step; nothing here has a step to say
 * anything about.
 *
 * THE FIXTURE'S CORPUS CARRIES ONE OF THE TWO ROWS, WHICH IS THE SHAPE THE RULE EXISTS FOR. The
 * unrecorded row has no scenario, so nothing on the corpus side raises an Evidence Obligation for
 * it — it is raised from the ROW instead (3F-3472), and until that rule it produced NOTHING
 * anywhere and the run read balanced over it. That is the emptied corpus in miniature: what the
 * corpus and the record lose together, the manifest keeps.
 *
 * BOTH ARMS FROM ONE TARGET. Handed the record, the run is unsound; handed nothing, it is out of
 * balance exactly as it was. Two fixtures could have agreed by accident, and one default is all
 * that separates the two facts — a reader taking `undefined` for an empty record would call every
 * configured row broken on the first target whose pipeline dumps none.
 *
 * IT READS THROUGH THE WHOLE RECONCILE COMPOSITION rather than through the record reader alone, for
 * @SCN-LNT-021's reason: what is asserted is where a credit LANDS and what the run's verdict then
 * is, and only a single walk of a single corpus can answer both.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { CiStepRecord } from "./ciStepRecord.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
// @SCN-LNT-027 — the run-integrity predicate the CLI and the renderer both ask, so "is this run
// unsound" is read here exactly as they read it rather than re-derived from the items.
import { hasBrokenEvidence } from "../domain/ledger.js";

/** A corpus carrying only the FIRST of the two scenarios the rows below name. */
const halfEmptiedCorpus = `@CVT
Feature: a converted target's fitness corpus, carrying one of its two configured scenarios

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
`;

/** The target's manifest — two STATIC rows, one per scenario the corpus was meant to carry. */
const manifest = {
  specController: {
    fitnessChecks: [
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" },
      { scn: "SCN-CVT-002", characteristic: "traceability", command: "scn-subissues" },
    ],
  },
};

/**
 * The record of a run that carried the first row's step and no step for the second.
 *
 * THE STEP THAT WROTE THE RECORD IS IN IT, as it must be for the document to exist at all, and no
 * configured row answers that step's id — so a reader that had quietly taken the record's size for
 * its enumeration would still see two entries here.
 */
const firstOnly: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

/** The message a row's own absence from the record earns, spelled once for every arm. */
function noStepRecorded(scnId: string): string {
  return (
    `${scnId}: the CI run's record carries no step for this row of ` +
    "`specController.fitnessChecks` — so the check did not run."
  );
}

/**
 * The reconcile composition over the half-emptied corpus, `ciStepRecord` OMITTED where no record
 * was handed over.
 *
 * THE KEY IS ABSENT RATHER THAN `undefined`, because that is the shape the application layer hands
 * in: a consumer whose pipeline dumps no record reaches the reader with none at all. Spelling it as
 * an empty object here would test the two facts the composition is supposed to keep apart as one.
 */
function reconcileUnenumerated(record?: CiStepRecord): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [halfEmptiedCorpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [],
    runtimeObservations: [],
    deferralTags: [],
    ...(record === undefined ? {} : { ciStepRecord: record }),
  });
}

/** The suspense row's reconciling items, as `[outcome, message]` — where broken evidence surfaces. */
function suspenseItemsOf(reconciliation: EvidenceReconciliation) {
  const row = reconciliation.ledger.scenarioReconciliations.find(
    (r) => r.kind === "suspense-scenario"
  );
  return (row?.qualityCheckReconciliations ?? []).map((item) => [item.outcome, item.message]);
}

describe("[SCN-LNT-027] a configured row the CI run's record never carried is broken evidence", () => {
  it("names the row the record carried no step for, and stamps the run unsound", () => {
    // THE WHOLE LEDGER, because what this fixture is for is what USED to be absent from it: the
    // second row had no scenario, no obligation and no credit, so the run balanced over a check
    // nothing recorded. Asserting the rows whole is what made that absence visible, and it is what
    // now shows the row on the books — its own out-of-balance row, raised from the manifest and
    // sitting beside the suspense row the withheld step earned it.
    const reconciliation = reconcileUnenumerated(firstOnly);
    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [row.scnId, row.verdict])
    ).toEqual([
      ["SCN-CVT-001", "balanced"],
      ["(no scenario)", "out-of-balance"],
      ["SCN-CVT-002", "out-of-balance"],
    ]);
    expect(suspenseItemsOf(reconciliation)).toEqual([["broken", noStepRecorded("SCN-CVT-002")]]);
    expect(
      hasBrokenEvidence({ scenarioReconciliations: reconciliation.ledger.scenarioReconciliations })
    ).toBe(true);
  });

  it("raises none of it for a run handed NO record — both rows reconcile missing and the run is merely out of balance", () => {
    // THE DISCRIMINATOR AGAINST FLATTENING THE TWO FACTS. Flatten them and this arm reads unsound,
    // which would call a consumer whose pipeline dumps no record broken over a file it has no
    // reason to own — and would move every target reconciling today without one from a run out of
    // balance to a run that could not be trusted to disagree.
    const reconciliation = reconcileUnenumerated();
    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => item.outcome),
      ])
    ).toEqual([
      ["SCN-CVT-001", "out-of-balance", ["missing"]],
      // THE ROW WHOSE DEBIT NO RUN INPUT DECIDES (3F-3472). It is raised from the manifest alone,
      // so withholding the record moves it not at all — which is the half of this target the
      // no-record arm would otherwise be read as not seeing.
      ["SCN-CVT-002", "out-of-balance", ["missing"]],
    ]);
    expect(suspenseItemsOf(reconciliation)).toEqual([]);
    expect(
      hasBrokenEvidence({ scenarioReconciliations: reconciliation.ledger.scenarioReconciliations })
    ).toBe(false);
  });

  it("reads a record handed over carrying NOTHING as every configured row unrecorded", () => {
    // The pipeline that lost its check steps, whole: the run happened and this record is what it
    // wrote. Every row the manifest names is a check that record did not carry, and the manifest is
    // the side it could not erase.
    expect(suspenseItemsOf(reconcileUnenumerated({}))).toEqual([
      ["broken", noStepRecorded("SCN-CVT-001")],
      ["broken", noStepRecorded("SCN-CVT-002")],
    ]);
  });

  it("counts an unrecorded row as no static check at all — neither run nor uncited", () => {
    // Where a broken credit would otherwise be counted twice over. It did not run, so it is not a
    // running static check; a scenario DID name its characteristic, so it is not an uncited one.
    expect(reconcileUnenumerated(firstOnly).summary.staticChecks).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 0,
    });
  });
});
