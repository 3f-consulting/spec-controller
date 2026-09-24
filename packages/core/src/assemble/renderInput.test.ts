/**
 * Unit tests for assembleRenderInput — the whole-document report model (@SCN-RMD-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RMD-001 id
 * matching features/report-model.feature, so a grep of the id returns both halves (this
 * @unit + the Cucumber @integration step-block).
 *
 * Proves the assembler + the glue-free JSON serialisation in isolation: assembleRenderInput builds
 * ONE object carrying the whole-document sections in document order (runProvenance renamed
 * from provenance; a materialised summary; evidenceObligations; the reconciliation
 * body; the retired warnings key gone), and renderJson is JUST JSON.stringify of that
 * object (glue-free — no per-key hand-assembly), so the parsed JSON equals the assembled model.
 *
 * Parent: (@SCN-RMD-001).
 */

import { describe, it, expect } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { renderJson } from "../render/json.js";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

/**
 * Test-local composition of the Evidence Reconciliation from a Ledger fixture (3F-2233).
 *
 * It states NO rule of its own: `summaryOf` is the concept's OWN tally — the very function its
 * factory calls — so this duplicates nothing. Only the entry path differs. `evidenceReconciliationOf`
 * builds from JOURNAL inputs (what production does); these fixtures already hold a Ledger, so they
 * compose the concept around it rather than re-reconciling.
 */
const __er = (ledger: Ledger, wo = false, wg = false): EvidenceReconciliation => ({
  summary: summaryOf(ledger, wo, wg),
  ledger,
});


// A ledger spanning a balanced scenario and an out-of-balance one with a DOUBLE missing arm
// (unit + integration), so the summary totals have teeth (2 scenarios / 1 balanced; 3
// evidenceObligations / 2 out-of-balance; missing split 1 unit + 1 integration). RECONCILER-TRUE
// (evidence-manifesto §11A): SCN-RMD-001's unit obligation is credited (satisfied); SCN-RMD-002
// declares unit + integration and no credit meets either.
const reportLedger: Ledger = reconcile(
  [
    { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-RMD-002", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
  ],
  [{ qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" }],
);

const ctx: RunContext = {
  target: "an-adopters-repository",
  inputs: { features: "../an-adopters-repository/features" },
  runStart: new Date("2026-07-02T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
};

const evidenceObligations: EvidenceObligations = {
  rawScnOccurrences: 10,
  scenarioCount: 7,
  excludedOccurrences: 3,
  untaggedScenarios: [],
  proseOnlyCodes: [],
};

describe("[SCN-RMD-001] assembleRenderInput builds one whole-document report model", () => {
  it("carries the sections as top-level keys in document order", () => {
    // A reconciliation that judged its corpus (3F-3635) — every `balance` run's, built by the real
    // composition — so its scenario code errors, and the population they were judged over
    // (3F-3666), ride after the ledger's detail and before the census, even when there are none.
    const judged = evidenceReconciliationFromSources({
      featureSources: ["@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: s\n    Given a thing\n", "Feature: plain\n"],
      featureFiles: [
        { slug: "one", featureCode: "ONE" },
        { slug: "plain", featureCode: null },
      ],
      untaggedScenarios: [],
      packageJson: {},
      ciSources: [],
      runtimeObservations: [],
      deferralTags: [],
    });
    const report = assembleRenderInput(judged, ctx, evidenceObligations) as unknown as Record<string, unknown>;
    // runProvenance opens; the summary's totals then the LEDGER's detail (chain step 6, RMD-002);
    // the evidenceObligations census follows. The retired `warnings` key is GONE — a zero-evidence
    // scenario is a both-missing row in the ledger, not a separate top-level axis.
    expect(Object.keys(report)).toEqual([
      "runProvenance",
      "summary",
      "ledger",
      "scenarioCodeErrors",
      "scenarioCodePopulation",
      "evidenceObligations",
    ]);
    // Two files, one of them uncoded: the counts differ, so each is its own (3F-3666).
    expect(report.scenarioCodePopulation).toEqual({ featureFiles: 2, featureCodes: 1 });
    expect(report).not.toHaveProperty("warnings");
  });

  it("renames the provenance section to runProvenance carrying the run facts", () => {
    const report = assembleRenderInput(__er(reportLedger), ctx);
    expect(report.runProvenance.target).toBe("an-adopters-repository");
    expect(report.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    expect(report.runProvenance.runTimestamp).toBe("2026-07-02T08:17:53Z");
  });

  it("materialises the summary totals from the balance", () => {
    const report = assembleRenderInput(__er(reportLedger), ctx);
    // A scenario-only balance: every row is a scenario, so the totals are the
    // scenario rows and the phantom / suspense sub-counts read 0.
    expect(report.summary.scenarioReconciliations).toEqual({ total: 2, balanced: 1, outOfBalance: 1, phantom: 0, suspense: 0 });
    expect(report.summary.evidenceObligations.total).toBe(3);
    expect(report.summary.evidenceObligations.outOfBalance).toBe(2);
    expect(report.summary.evidenceObligations.byOutcome["satisfied"]).toBe(1);
    expect(report.summary.evidenceObligations.byOutcome["missing"]).toBe(2);
    // The missing split counts evidence obligations (not scenarios), keyed by
    // quality-check in canonical order.
    expect(report.summary.evidenceObligations.missingByQualityCheck).toEqual([
      { subject: "unit", count: 1 },
      { subject: "integration", count: 1 },
    ]);
  });

  // an adopter's repository dogfood shape (3F-1703, run 2026-07-13T17-36-50Z) in miniature: every REAL
  // scenario is balanced, yet a credit citing NO scenario posts a `cites-no-scenario` item to
  // the suspense `(no scenario)` row — so the run IS out-of-balance and exits 1. Under the
  // scenario-only tally the summary read `total 2, balanced 2, outOfBalance 0`: a failing run
  // rendering a headline that read as a clean pass.
  // RECONCILER-TRUE (evidence-manifesto §11A): two @unit scenarios, each credited (balanced), and
  // a fitness credit citing no scenario, which reconcile() posts to the suspense row.
  const suspenseScenarios: Scenario[] = [
    { scnId: "SCN-TGT-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-TGT-002", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const suspenseObservations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-TGT-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-TGT-002", status: "passed" },
    { qualityCheck: "fitness", staticCheck: "guard:static", exists: true, enforcedOverRealSource: true },
  ];
  const balanceWithSuspense: Ledger = reconcile(suspenseScenarios, suspenseObservations);

  it("counts the suspense reconciliation in the summary totals — a run whose only out-of-balance row is the suspense row tallies 1 out-of-balance, not 0", () => {
    const report = assembleRenderInput(__er(balanceWithSuspense), ctx);
    // The Evidence Reconciliation is ALL Scenario Reconciliations assembled and the summary is
    // its totals (the maintainers' private notes). A suspense reconciliation is ALWAYS
    // out-of-balance, so it counts into the total AND into out-of-balance: 2 scenario + 1
    // suspense = 3 rows, 2 balanced, 1 out-of-balance. `suspense` survives as a sub-count — a
    // BREAKDOWN of the total (scenario = total − phantom − suspense), not a bucket outside it.
    expect(report.summary.scenarioReconciliations).toEqual({
      total: 3,
      balanced: 2,
      outOfBalance: 1,
      phantom: 0,
      suspense: 1,
    });
    // THE INVARIANT THE BUG BROKE (3F-1703): the tally agrees with `isBalanced` — the predicate
    // the CLI maps to the process exit code. `isBalanced` walks EVERY row's reconcilingItems, so
    // it correctly calls this run out-of-balance (exit 1); the scenario-only tally read 0
    // out-of-balance and disagreed, rendering a failing run as a pass.
    expect(isBalanced(balanceWithSuspense)).toBe(false);
    expect(report.summary.scenarioReconciliations.outOfBalance).toBeGreaterThan(0);
  });

  it("counts the phantom reconciliation in the summary totals too — a phantom scenario is out-of-balance, not a bucket apart", () => {
    // The phantom row is the suspense row's sibling: also ALWAYS out-of-balance, so it also
    // counts into the total and into out-of-balance, with `phantom` surviving as its sub-count.
    const balanceWithPhantom: Ledger = reconcile(suspenseScenarios, [
      ...suspenseObservations,
      { qualityCheck: "unit", scnId: "SCN-PHANTOM-999", status: "passed" },
    ]);
    const report = assembleRenderInput(__er(balanceWithPhantom), ctx);
    expect(report.summary.scenarioReconciliations).toEqual({
      total: 4,
      balanced: 2,
      outOfBalance: 2,
      phantom: 1,
      suspense: 1,
    });
    // The sub-counts reconcile to the total: scenario = total − phantom − suspense.
    const t = report.summary.scenarioReconciliations;
    expect(t.total - t.phantom - t.suspense).toBe(2);
    expect(isBalanced(balanceWithPhantom)).toBe(false);
  });

  it("carries no warnings key — the retired authoring-quality axis", () => {
    const report = assembleRenderInput(__er(reportLedger), ctx) as unknown as Record<string, unknown>;
    expect(report).not.toHaveProperty("warnings");
    expect(((report.ledger as { scenarioReconciliations: unknown[] }).scenarioReconciliations)).toHaveLength(2);
  });

  it("renderJson is a glue-free JSON.stringify of the assembled report", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger, false, false), ctx, evidenceObligations));
    // Glue-free: the parsed JSON EQUALS the assembled model (no divergent hand-assembly).
    expect(parsed).toEqual(assembleRenderInput(__er(reportLedger, false, false), ctx, evidenceObligations));
    // And it carries the renamed provenance + materialised summary on the machine surface.
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.summary.scenarioReconciliations.total).toBe(2);
    expect(parsed).not.toHaveProperty("provenance");
  });
});

/**
 * Unit tests for the LEDGER section (@SCN-RMD-002) — stage 1's READER (3F-1848).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-002.
 *
 * The 3F-1138 error ONE LAYER DOWN. The document IS the Evidence Reconciliation, so a root key
 * named `evidenceReconciliation` was the layer naming itself inside itself — and the grid it names
 * is, by canon, the LEDGER. Root now reads as chain step 6 literally: "The summary has the totals
 * and the ledger the detail."
 *
 * The "not scenarios" half of the 3F-1138 revert HOLDS, kept verbatim — a phantom / suspense is
 * not a scenario. HELD too: each quality check reconciliation keeps its `outcome` field verbatim
 * (the outcome-value rationalisation is still deferred).
 *
 * Code identifiers and JSON keys are ONE vocabulary (manifesto line 3), so the model's
 * `interface Ledger { scenarioReconciliations }` and the JSON `"ledger": { "scenarioReconciliations":
 * [...] }` agree as OBJECTS — a Ledger that holds entries cannot serialise as a bare array of rows.
 */
describe("[SCN-RMD-002] the ledger serialises under the top-level key ledger, beside summary", () => {
  it("carries the grid of Scenario Reconciliations under ledger — never evidenceReconciliation, never scenarios", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger), ctx));
    // ONE VOCABULARY: an OBJECT mirroring `interface Ledger { scenarioReconciliations }`, never a
    // bare array of rows.
    expect(Array.isArray(parsed.ledger)).toBe(false);
    expect(Array.isArray(parsed.ledger.scenarioReconciliations)).toBe(true);
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(2);
    expect(parsed.ledger.scenarioReconciliations[0].scnId).toBe("SCN-RMD-001");
    // The layer no longer names itself inside itself.
    expect(parsed).not.toHaveProperty("evidenceReconciliation");
    // The 1138 revert's surviving half: the grid is NOT under `scenarios` — a phantom / suspense
    // is not a scenario.
    expect(parsed).not.toHaveProperty("scenarios");
  });

  it("carries the ledger BESIDE summary — chain step 6: the summary has the totals and the ledger the detail", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger), ctx));
    // Both at ROOT, and `ledger` follows `summary` in document order — the totals, then the detail.
    const keys = Object.keys(parsed);
    expect(keys).toContain("summary");
    expect(keys).toContain("ledger");
    expect(keys.indexOf("ledger")).toBeGreaterThan(keys.indexOf("summary"));
  });

  it("carries each account's posted evidence obligations and evidence observations alongside its reconciling items", () => {
    // THE READER (parent ruling 2): the posted entries are visible ON THE ARTEFACT, so the
    // double-entry invariant is checkable there — not inferred from which rows survived.
    //
    // Driven from REAL reconcile output over a parsed feature (evidence-manifesto §11A): the posted
    // entries are what `reconcile` puts on the account. This is also the scenario's Given —
    // "accounts CARRY posted entries" — so a fixture without them would not exercise it.
    const feature = [
      "@AAA",
      "Feature: alpha",
      "",
      "  @unit @SCN-AAA-001",
      "  Scenario: a satisfied credit",
      "    Given a thing",
    ].join("\n");
    const credit = { scnId: "SCN-AAA-001", qualityCheck: "unit" as const, status: "passed" as const };
    const real = reconcile(parseScenarios(feature), [credit]);
    const parsed = JSON.parse(renderJson(__er(real), ctx));
    const account = parsed.ledger.scenarioReconciliations.find(
      (s: { scnId: string }) => s.scnId === "SCN-AAA-001"
    );
    // The DEBIT it raised (@SCN-LDG-023) and the CREDIT that cites it (@SCN-LDG-022), both
    // findable on the artefact, beside the reconciling items they balance off to.
    expect(account.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
    expect(account.evidenceObservations).toEqual([credit]);
    expect(account.reconcilingItems).toEqual([]);
  });

  it("carries each quality check reconciliation's outcome field with the reconciliation-outcome literals", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger), ctx));
    const outOfBalance = parsed.ledger.scenarioReconciliations.find(
      (s: { scnId: string }) => s.scnId === "SCN-RMD-002"
    );
    // The flat quality-check coordinate: a runtime sub-row's keys are the flat qualityCheck /
    // outcome (the retired kind / level gone), plus the debit `evidenceObligation` a `missing`
    // reconciliation carries (canon, @SCN-LDG-026 / @SCN-LDG-030 — Obligation Exists, Observation
    // None); the outcome literal survives (the outcome-value rename is still deferred).
    expect(outOfBalance.qualityCheckReconciliations[0].outcome).toBe("missing");
    expect(Object.keys(outOfBalance.qualityCheckReconciliations[0]).sort()).toEqual(
      ["evidenceObligation", "qualityCheck", "outcome"].sort()
    );
  });
});

/**
 * Unit tests for the retired evidence-observation section (@SCN-RMD-003).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-003.
 *
 * The `evidenceObservations` section is RETIRED (3F-2103): the runtime evidence-observation
 * counting folds onto the Ledger (`runtimeObservationTally`), its raw totals re-homed onto
 * `summary.rawByRuntimeQualityCheck`; the per-`(scnId, quality-check)` `attributed[]` did NOT
 * re-home (it re-represented the posted credits the Ledger already carries — retire, don't
 * relocate). The balancing identity holds by construction off the ledger fold.
 */
describe("[SCN-RMD-003] the runtime-observation totals re-home onto summary; no evidenceObservations section", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the balance carries the posted credits the
  // renderers fold. It BALANCES: 5 unit (4 attributed to SCN-RMD-001 + 1 phantom) + 1 integration
  // (1 suspense) = 6 raw = 4 + 1 + 1.
  const rmd003Scenarios: Scenario[] = [{ scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const rmd003Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
  ];
  const rmd003Balance: Ledger = reconcile(rmd003Scenarios, rmd003Observations);

  it("carries NO evidenceObservations section — the raw totals re-home onto summary", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true, false), ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.summary.rawByRuntimeQualityCheck).toEqual({ unit: 5, integration: 1, e2e: 0, performance: 0 });
  });

  it("the phantom and suspense credits live on their ledger rows, not a section detail array", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true, false), ctx));
    // The phantom credit surfaces as a phantom-scenario row (@SCN-LDG-006); the suspense credit as
    // the suspense row (@SCN-LDG-007) — no standalone section array double-reports them.
    const phantom = parsed.ledger.scenarioReconciliations.find((s: { kind: string }) => s.kind === "phantom-scenario");
    const suspense = parsed.ledger.scenarioReconciliations.find((s: { kind: string }) => s.kind === "suspense-scenario");
    expect(phantom.scnId).toBe("SCN-PHX-999");
    expect(suspense.evidenceObservations).toHaveLength(1);
    // But BOTH counts survive in summary.testVolume — the balance-check identity is kept.
    expect(parsed.summary.testVolume.onPhantomScenario).toBe(1);
    expect(parsed.summary.testVolume.onSuspenseScenario).toBe(1);
  });

  it("keeps the balancing identity: Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario (all summary folds)", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true, false), ctx));
    const raw = (Object.values(parsed.summary.rawByRuntimeQualityCheck) as number[]).reduce((a, b) => a + b, 0);
    const tv = parsed.summary.testVolume;
    expect(raw).toBe(tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario);
  });

  it("omits summary.rawByRuntimeQualityCheck + testVolume when the runtime-observation axis is not in play", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance), ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.summary).not.toHaveProperty("rawByRuntimeQualityCheck");
    expect(parsed.summary).not.toHaveProperty("testVolume");
  });
});

/**
 * Unit tests for the static-check census collapse (@SCN-RMD-004).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-004.
 *
 * The static-check census is `summary.staticChecks` COUNTS alone (2.4) — the standalone
 * member-list section (`guards` → `staticChecks`, `{ciGuards[], named[]}`) COLLAPSED, symmetric
 * with the runtime side. The static check member detail now lives in the rows (named → each scenario's
 * fitness sub-row; no-evidence-obligation → the suspense row's `cites-no-scenario` credit items), so there is
 * no double-report and no census section on the JSON surface.
 */
describe("[SCN-RMD-004] the static-check census is summary counts, no standalone section", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the static-check counts are a FOLD OVER
  // THE LEDGER now (3F-2118, `staticObservationTally`), so the numbers derive from the balance, not
  // a hand-built census the assembler could disagree with. 2 running CI checks = 1 cited
  // (lint:foo, citing SCN-RMD-010 and posting to its row) + 1 uncited (lint:bar, no-evidence-obligation,
  // running → the suspense row) → the fold reads {runningStaticCheckCount: 2, uncitedStaticCheckCount: 1}.
  const staticChecksBalance: Ledger = reconcile(
    [{ scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "fitness" }] }],
    [
      { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
    ]
  );

  it("carries NO standalone staticChecks (or guards) section — the census collapsed to summary counts", () => {
    const parsed = JSON.parse(renderJson(__er(staticChecksBalance, false, true), ctx, undefined, undefined));
    // The member-list section (was `guards`, then `staticChecks`) is gone: the guard detail now
    // lives in the rows, symmetric with the runtime side — no double-report on the JSON surface.
    expect(parsed).not.toHaveProperty("staticChecks");
    expect(parsed).not.toHaveProperty("guards");
  });

  it("materialises the counts under summary.staticChecks ({ runningStaticCheckCount, uncitedStaticCheckCount })", () => {
    const parsed = JSON.parse(renderJson(__er(staticChecksBalance, false, true), ctx, undefined, undefined));
    expect(parsed.summary.staticChecks).toEqual({ runningStaticCheckCount: 2, uncitedStaticCheckCount: 1 });
  });
});
