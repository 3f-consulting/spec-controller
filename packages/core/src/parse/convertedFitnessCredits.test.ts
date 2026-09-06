/**
 * @unit for @SCN-LNT-021 — the CREDIT side of a converted STATIC check: a scenario the fitness
 * pass reported credits the row that raised its Evidence Obligation, citing its own `@SCN`.
 *
 * IT READS THROUGH THE WHOLE RECONCILE COMPOSITION rather than through the report reader alone,
 * for the reason @SCN-LNT-020's file states one Rule above: the claim is that the credit lands on
 * the row the DEBIT was raised on, and two readings agree only when they are taken from one walk of
 * one corpus. A test over the reader in isolation would assert the shape of an observation and
 * leave a composition free to post it against a corpus the obligations never came from, which is
 * the phantom-row fault @SCN-LNT-009 already names.
 *
 * NO CHECK REGISTRY IS CONFIGURED ANYWHERE IN THIS FILE, and that absence is an assertion. The
 * two-hop seam — handle to characteristic, characteristic to `@SCN` — is exactly what conversion
 * retires, so a reading that still needed it would find nothing here and every row would reconcile
 * `missing`.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { CucumberJsonReport } from "./cucumber.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
// @SCN-LNT-022 — the union's OWN discriminators, so "which stream carried this credit" is read
// here exactly as the reconciler reads it.
import { isMeasuredObservation, isStaticCheckObservation } from "../domain/journal.js";
// @SCN-LNT-026 — the run-integrity predicate the CLI and the renderer both ask, so "is this run
// unsound" is read here exactly as they read it rather than re-derived from the items.
import { hasBrokenEvidence } from "../domain/ledger.js";

/**
 * A converted target's corpus: two scenarios, each carrying the bare axis tag and its own `@SCN`,
 * and no characteristic tag anywhere. Neither word the rows name appears in this source, which is
 * what makes every expectation below a claim about the rows rather than about a tag that happens to
 * spell the same word.
 */
const convertedCorpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue
`;

/** The target's manifest — two STATIC rows (neither names a bar) and no check registry at all. */
const manifest = {
  specController: {
    fitnessChecks: [
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" },
      { scn: "SCN-CVT-002", characteristic: "traceability", command: "scn-subissues" },
    ],
  },
};

/**
 * One scenario as the fitness pass's Cucumber report spells it — its tag line, and the one step
 * that ran the row's command.
 *
 * THE STATUS IS A PARAMETER because the credit is about the WIRING and the exit code is about the
 * findings: a scenario present in the report credits its row whichever way its own step went.
 */
function reportedScenario(scnId: string, status: string) {
  return {
    tags: [{ name: "@fitness" }, { name: `@${scnId}` }],
    steps: [
      {
        keyword: "Then ",
        name: "the check reports no violations",
        result: { status, duration: 1 },
      },
    ],
  };
}

/** The pass reported both scenarios: the first found nothing, the second found a violation. */
const fitnessReport: CucumberJsonReport = [
  {
    uri: "features/fitness.feature",
    elements: [
      reportedScenario("SCN-CVT-001", "passed"),
      reportedScenario("SCN-CVT-002", "failed"),
    ],
  },
];

/**
 * The reconcile composition over the planted target — its corpus, its rows and its fitness report,
 * and nothing else. No CI bytes, no scripts, no runtime observations: every credit these rows
 * receive can only have come from the report.
 */
function reconcileConverted(report: CucumberJsonReport): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [convertedCorpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: [],
    killFloor: () => null,
    fitnessReport: report,
  });
}

/**
 * One scenario's row — its verdict, and its reconciled sub-rows.
 *
 * `qualityCheckReconciliations`, not `reconcilingItems`: the latter is the non-balanced subset a
 * row carries when it is out of balance, so a satisfied credit would be invisible in it and every
 * expectation below would be an assertion about the empty list.
 */
function rowOf(reconciliation: EvidenceReconciliation, scnId: string) {
  const row = reconciliation.ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  return { verdict: row?.verdict, items: row?.qualityCheckReconciliations ?? [] };
}

describe("[SCN-LNT-021] a converted static check's scenario in the fitness report credits its own row", () => {
  it("credits the row its own @SCN names, both facts observed and no registry consulted", () => {
    const { verdict, items } = rowOf(reconcileConverted(fitnessReport), "SCN-CVT-001");
    expect(verdict).toBe("balanced");
    expect(items).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "complexity",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "lint", staticCheck: "complexity" },
        evidenceObservation: {
          qualityCheck: "lint",
          staticCheck: "complexity",
          scnId: "SCN-CVT-001",
          checkTag: "complexity",
          // OBSERVED, not inferred: the scenario appearing in the report says the check ran, and
          // the pass runs in the target's own root, so it ran over that root's tree.
          exists: true,
          enforcedOverRealSource: true,
        },
      },
    ]);
  });

  it("credits the scenario the pass reported as FAILED exactly as the one it reported as passed", () => {
    // The discriminator against a reading that filtered the report by status. A check finding
    // violations reds the run through the runner's exit code; the ledger says the check ran.
    const { verdict, items } = rowOf(reconcileConverted(fitnessReport), "SCN-CVT-002");
    expect(verdict).toBe("balanced");
    expect(items.map((item) => [item.staticCheck, item.outcome])).toEqual([
      ["traceability", "satisfied"],
    ]);
  });

  it("credits nothing for a reported scenario no configured row names", () => {
    // The credit's characteristic is read off the ROW, so a scenario no row names has no credit to
    // raise any more than it has an obligation (@SCN-LNT-020). Nothing on the ledger is about it.
    //
    // THE SUSPENSE ROW HERE IS THE OTHER RULE'S (@SCN-LNT-027), and naming whose it is IS the
    // assertion. This report carries neither configured row, so both are unenumerated and both go
    // broken — and SCN-CVT-404, the scenario nobody named, is on the ledger nowhere at all.
    const reconciliation = reconcileConverted([
      {
        uri: "features/fitness.feature",
        elements: [reportedScenario("SCN-CVT-404", "passed")],
      },
    ]);
    expect(reconciliation.ledger.scenarioReconciliations.map((r) => r.scnId)).toEqual([
      "SCN-CVT-001",
      "SCN-CVT-002",
      "(no scenario)",
    ]);
    expect(rowOf(reconciliation, "SCN-CVT-001").items.map((i) => i.outcome)).toEqual(["missing"]);
    expect(suspenseItemsOf(reconciliation).map(([, message]) => message)).toEqual([
      "SCN-CVT-001: the fitness pass's report carried no scenario for this row of " +
        "`specController.fitnessChecks` — so the check did not run.",
      "SCN-CVT-002: the fitness pass's report carried no scenario for this row of " +
        "`specController.fitnessChecks` — so the check did not run.",
    ]);
  });

  it("credits nothing from a report carrying no scenario on the fitness axis — inert on an unconverted target", () => {
    const reconciliation = reconcileConverted([
      {
        uri: "features/behaviour.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-CVT-001" }],
            steps: [{ keyword: "Then ", name: "it holds", result: { status: "passed" } }],
          },
        ],
      },
    ]);
    expect(rowOf(reconciliation, "SCN-CVT-001").items.map((i) => i.outcome)).toEqual(["missing"]);
  });
});

/**
 * @unit for @SCN-LNT-022 — the same reading over a MEASURED row: it raises no credit, because that
 * row's credit is its NUMBER.
 *
 * THE CLAIM IS COUNTED ON THE ROW'S OWN CREDIT LIST, not on its verdict, and the difference is what
 * makes these arms teeth rather than decoration. A second credit here is ABSORBED: the row does
 * carry an Evidence Obligation naming `mutation`, so the stray static credit is not a
 * `no-evidence-obligation` item and never reaches the verdict — the run reads balanced while one
 * obligation holds two credits. So `evidenceObservations` is asserted WHOLE on both rows, and the
 * ledger's static-check total beside it, because those are the two places the double count is
 * legible at all.
 *
 * ONE FACT, ONE SPELLING. Both sides ask `carriesBar` of the same row from the same reading of the
 * same manifest, which is why the two rows below can be identical in every other respect and still
 * be routed to different streams.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

/**
 * A converted target whose two rows differ in exactly ONE thing — one names a bar and the other
 * does not. Same axis tag, same corpus, same report, so every difference below is the bar's doing.
 */
const mixedCorpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-003
    Scenario: the domain's mutation score stays above its floor
`;

/** One STATIC row and one MEASURED row, the second holding a floor its number must clear. */
const mixedManifest = {
  specController: {
    fitnessChecks: [
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" },
      { scn: "SCN-CVT-003", characteristic: "mutation", command: "mutation:score", atLeast: 90 },
    ],
  },
};

/** The pass reported BOTH scenarios — the enumeration a measured check keeps. */
const mixedReport: CucumberJsonReport = [
  {
    uri: "features/fitness.feature",
    elements: [
      reportedScenario("SCN-CVT-001", "passed"),
      reportedScenario("SCN-CVT-003", "passed"),
    ],
  },
];

/** The measured row's own credit — the NUMBER, on the stream that carries numbers. */
const mutationMeasured = { measurements: [{ scnId: "SCN-CVT-003", checkTag: "mutation", measured: 92 }] };

function reconcileMixed(measurements: {
  measurements: readonly unknown[];
}): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [mixedCorpus],
    untaggedScenarios: [],
    packageJson: mixedManifest,
    ciSources: [],
    measurements,
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: [],
    killFloor: () => null,
    fitnessReport: mixedReport,
  });
}

/**
 * Every credit posted to one row, as `[characteristic, which stream carried it]`.
 *
 * The two published predicates rather than a hand-written `"measured" in …`: the union's own
 * discriminators are what the reconciler routes on, and a second reading of "which shape is this"
 * here could class a credit differently from the code under test and then agree with itself.
 */
function creditsOn(reconciliation: EvidenceReconciliation, scnId: string) {
  const row = reconciliation.ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  return (row?.evidenceObservations ?? []).map((observation) =>
    isMeasuredObservation(observation)
      ? [observation.checkTag, "the number"]
      : isStaticCheckObservation(observation)
        ? [observation.staticCheck, "the fitness report"]
        : ["a runtime result", "neither stream"]
  );
}

describe("[SCN-LNT-022] a measured converted check's scenario in the fitness report raises no credit", () => {
  it("posts the measured row exactly one credit — its number, with nothing from the report beside it", () => {
    const reconciliation = reconcileMixed(mutationMeasured);
    expect(creditsOn(reconciliation, "SCN-CVT-003")).toEqual([["mutation", "the number"]]);
    // And the number is what settles the obligation, so the row balances on one credit alone.
    expect(rowOf(reconciliation, "SCN-CVT-003").verdict).toBe("balanced");
    expect(
      rowOf(reconciliation, "SCN-CVT-003").items.map((item) => [item.staticCheck, item.outcome])
    ).toEqual([["mutation", "satisfied"]]);
  });

  it("still credits the STATIC row off that same report — what the reading skips is the bar, not the axis", () => {
    // The discriminator against a cure that stopped reading the report at all: both scenarios are
    // on the axis and both were reported, and only the one whose row names a bar is skipped.
    const reconciliation = reconcileMixed(mutationMeasured);
    expect(creditsOn(reconciliation, "SCN-CVT-001")).toEqual([["complexity", "the fitness report"]]);
    expect(rowOf(reconciliation, "SCN-CVT-001").verdict).toBe("balanced");
  });

  it("counts ONE static check as having run, not two — the measured row is not a static check that ran", () => {
    // Where the double count is legible in the REPORT. A static credit for a measured row is
    // absorbed by the row's own obligation rather than surfacing as an unmatched item, so the
    // verdict says nothing about it; this total is what a reader would see move.
    expect(reconcileMixed(mutationMeasured).summary.staticChecks).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 0,
    });
  });

  it("posts the measured row NO credit at all when no number arrives — the report stands in for nothing", () => {
    // The sharpest arm, and the reason the skip is not merely tidy. A reading that credited a
    // measured scenario off the report would answer this row with a static fact about the tree
    // where a number is owed, leaving a check nothing measured looking observed.
    const reconciliation = reconcileMixed({ measurements: [] });
    expect(creditsOn(reconciliation, "SCN-CVT-003")).toEqual([]);
    expect(rowOf(reconciliation, "SCN-CVT-003").verdict).toBe("out-of-balance");
    expect(
      rowOf(reconciliation, "SCN-CVT-003").items.map((item) => [item.staticCheck, item.outcome])
    ).toEqual([["mutation", "missing"]]);
  });
});

/**
 * @unit for @SCN-LNT-026 — the CREDIT side reads what the report says about the RUNNING: a
 * scenario the fitness pass reported as skipped credits its row only where that row names the
 * ending its command says it examined nothing with, and every other skip is broken evidence.
 *
 * BOTH ARMS FROM ONE REPORT, WHICH IS THE POINT OF THE FIXTURE. The two rows differ in exactly one
 * field and their scenarios are reported identically, so a reading that credited both and a
 * reading that credited neither are each caught by ONE reconciliation rather than by comparing
 * two. Split across two reports the pair could agree by accident.
 *
 * THE CLAIM IS TAKEN THROUGH THE WHOLE RECONCILE COMPOSITION, for @SCN-LNT-021's reason one block
 * above: what is asserted is where the credit LANDS and what the run's verdict then is, and only a
 * single walk of a single corpus can answer both.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

/**
 * Two STATIC rows over the same two scenarios, differing in ONE field: the first names the ending
 * its command says it examined nothing with, the second names none. Neither carries a bar, so both
 * are read by the report reader rather than by the measurement stream.
 */
const skipManifest = {
  specController: {
    fitnessChecks: [
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint", notExaminedExit: 3 },
      { scn: "SCN-CVT-002", characteristic: "traceability", command: "scn-subissues" },
    ],
  },
};

/** The reconcile composition over that manifest and the report handed in — nothing else. */
function reconcileSkipped(report: CucumberJsonReport): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [convertedCorpus],
    untaggedScenarios: [],
    packageJson: skipManifest,
    ciSources: [],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: [],
    killFloor: () => null,
    fitnessReport: report,
  });
}

/** The pass reported BOTH scenarios as skipped — one report, one status, two rows. */
const bothSkipped: CucumberJsonReport = [
  {
    uri: "features/fitness-checks.feature",
    elements: [
      reportedScenario("SCN-CVT-001", "skipped"),
      reportedScenario("SCN-CVT-002", "skipped"),
    ],
  },
];

/** The suspense row's reconciling items, as `[outcome, message]` — where broken evidence surfaces. */
function suspenseItemsOf(reconciliation: EvidenceReconciliation) {
  const row = reconciliation.ledger.scenarioReconciliations.find(
    (r) => r.kind === "suspense-scenario"
  );
  return (row?.qualityCheckReconciliations ?? []).map((item) => [item.outcome, item.message]);
}

describe("[SCN-LNT-026] a skipped fitness scenario credits its row only where that row names its not-examined ending", () => {
  it("credits the row that named its ending, and nothing at all the row that named none", () => {
    // THE DISCRIMINATOR, WHOLE. Both rows are asserted from ONE reconciliation of ONE report: the
    // first balances on a credit, the second reconciles `missing` with no observation carried —
    // "obligation exists, observation none", which is what a proof that never ran leaves behind.
    const reconciliation = reconcileSkipped(bothSkipped);
    expect(rowOf(reconciliation, "SCN-CVT-001")).toEqual({
      verdict: "balanced",
      items: [
        {
          qualityCheck: "lint",
          staticCheck: "complexity",
          outcome: "satisfied",
          evidenceObligation: { qualityCheck: "lint", staticCheck: "complexity" },
          evidenceObservation: {
            qualityCheck: "lint",
            staticCheck: "complexity",
            scnId: "SCN-CVT-001",
            checkTag: "complexity",
            exists: true,
            enforcedOverRealSource: true,
          },
        },
      ],
    });
    expect(rowOf(reconciliation, "SCN-CVT-002")).toEqual({
      verdict: "out-of-balance",
      items: [
        {
          qualityCheck: "lint",
          staticCheck: "traceability",
          outcome: "missing",
          evidenceObligation: { qualityCheck: "lint", staticCheck: "traceability" },
        },
      ],
    });
  });

  it("stamps the run unsound, and says which scenario the pass reported skipped and why that is not a credit", () => {
    // The message is the WHOLE of what the reader gets — a broken item carries no observation — so
    // it is asserted verbatim rather than by a substring: it names the @SCN, says what the report
    // said, says why that is not a credit, and prescribes no cure.
    const reconciliation = reconcileSkipped(bothSkipped);
    expect(
      hasBrokenEvidence({ scenarioReconciliations: reconciliation.ledger.scenarioReconciliations })
    ).toBe(true);
    expect(suspenseItemsOf(reconciliation)).toEqual([
      [
        "broken",
        "SCN-CVT-002: the fitness pass reported this scenario as skipped, and its row of " +
          "`specController.fitnessChecks` names no ending its command says it examined nothing " +
          "with — so the check did not run.",
      ],
    ]);
  });

  it("counts the skipped-and-unnamed row as no static check at all — neither run nor uncited", () => {
    // Where the broken credit would otherwise lie twice. It did not run, so it is not a running
    // static check; and it is not a check nobody named, so it is not an uncited one either.
    expect(reconcileSkipped(bothSkipped).summary.staticChecks).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 0,
    });
  });

  it("still credits both rows off a report that says they RAN — the reading skips a status, not the axis", () => {
    // The discriminator against a cure that stopped crediting skipped-adjacent reports altogether,
    // and @SCN-LNT-021's claim restated over rows one of which names an ending: passed and failed
    // are both "the check ran", whatever the row says about endings.
    const reconciliation = reconcileSkipped([
      {
        uri: "features/fitness-checks.feature",
        elements: [
          reportedScenario("SCN-CVT-001", "passed"),
          reportedScenario("SCN-CVT-002", "failed"),
        ],
      },
    ]);
    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [row.scnId, row.verdict])
    ).toEqual([
      ["SCN-CVT-001", "balanced"],
      ["SCN-CVT-002", "balanced"],
    ]);
    expect(suspenseItemsOf(reconciliation)).toEqual([]);
  });

  it("reads a status nobody anticipated as broken, not as a credit — the default is the safe one", () => {
    // THE FALL-THROUGH IS THE ASSERTION. `pending` is not one of the readings that say a check
    // ran, and the row that names an ending gets no shelter from it: the ending authorises a SKIP,
    // and this is not one. A reading that credited every status it did not recognise would be
    // vouching for a run it cannot describe.
    const reconciliation = reconcileSkipped([
      {
        uri: "features/fitness-checks.feature",
        elements: [reportedScenario("SCN-CVT-001", "pending")],
      },
    ]);
    expect(rowOf(reconciliation, "SCN-CVT-001").items.map((i) => i.outcome)).toEqual(["missing"]);
    // The SECOND item is @SCN-LNT-027's rule over the same report: this one carries the first row's
    // scenario and not the second's, so the second was never enumerated. Asserted here rather than
    // dodged by widening the fixture, because both readings are true of this one report.
    expect(suspenseItemsOf(reconciliation)).toEqual([
      [
        "broken",
        "SCN-CVT-001: the fitness pass reported this scenario's step as pending — so the check " +
          "did not run.",
      ],
      [
        "broken",
        "SCN-CVT-002: the fitness pass's report carried no scenario for this row of " +
          "`specController.fitnessChecks` — so the check did not run.",
      ],
    ]);
  });

  it("reads a reported scenario carrying no step at all as broken", () => {
    // Nothing ran, so nothing can be vouched for. The message says what the report held rather
    // than reaching for a status it never carried.
    const reconciliation = reconcileSkipped([
      {
        uri: "features/fitness-checks.feature",
        elements: [{ tags: [{ name: "@fitness" }, { name: "@SCN-CVT-001" }], steps: [] }],
      },
    ]);
    expect(suspenseItemsOf(reconciliation)).toEqual([
      [
        "broken",
        "SCN-CVT-001: the fitness pass reported this scenario with no step at all — so the check " +
          "did not run.",
      ],
      // And the second row, which this report never carried at all (@SCN-LNT-027).
      [
        "broken",
        "SCN-CVT-002: the fitness pass's report carried no scenario for this row of " +
          "`specController.fitnessChecks` — so the check did not run.",
      ],
    ]);
  });
});
