/**
 * Unit tests for the report model's summary totals, feature titles, sub-row coordinates, scenario
 * counts and Pending Items tally (@SCN-RMD-005, @SCN-RMD-006, @SCN-RMD-008, @SCN-LDG-008,
 * @SCN-PND-011). Each describe carries its own @SCN id and its own bidirectional-evidence note.
 *
 * SPLIT FROM `renderInput.test.ts` AT 3F-3537, AND FOR A MECHANICAL REASON. That file measured 626
 * code lines against the test ceiling of 400 (`tests/checks/complexityThresholds.mjs`), and the
 * complexity gate raises a touched file's standing findings to errors. No assertion moved in the
 * split. The file-local helpers below are copies of that file's own, which is this tree's
 * convention for test fixtures: a helper shared through a module under `src/` would ship in `dist`.
 */

import { describe, it, expect } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { renderJson } from "../render/json.js";
import { renderReport, renderMarkdown } from "../render/markdown.js";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { makeQualityCheckReconciliation, OUTCOME_SIDE_PROFILE } from "../model.js";
import type { Ledger } from "../model.js";
// @SCN-LDG-030: fixtures must mint branded Quality Check Reconciliations via the smart constructor.
// This helper supplies canon-correct PLACEHOLDER sides (content is immaterial to these assembler
// tests, which tally by OUTCOME, not by side presence — only side PRESENCE is constrained by the
// invariant) so each fixture routes through the constructor.
function qcr(
  fields: Parameters<typeof makeQualityCheckReconciliation>[0],
): ReturnType<typeof makeQualityCheckReconciliation> {
  const profile = OUTCOME_SIDE_PROFILE[fields.outcome];
  return makeQualityCheckReconciliation({
    ...fields,
    ...(profile.obligation === "Exists" && fields.evidenceObligation === undefined
      ? { evidenceObligation: { qualityCheck: "unit" } }
      : {}),
    ...(profile.observation === "Exists" && fields.evidenceObservation === undefined
      ? { evidenceObservation: { qualityCheck: "unit", scnId: "SCN-FIXTURE-001", status: "passed" } }
      : {}),
  });
}
import type { RunContext } from "../provenance/provenance.js";
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

// A balance spanning a balanced scenario and an out-of-balance one with a DOUBLE missing arm
// (unit + integration), so the summary totals have teeth (2 scenarios / 1 balanced; 3
// evidenceObligations / 2 out-of-balance; missing split 1 unit + 1 integration).
const balance: Ledger = {
  scenarioReconciliations: [
    {
      scnId: "SCN-RMD-001",
      kind: "scenario",
      evidenceObservations: [],
      evidenceObligations: [],
      verdict: "balanced",
      qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "satisfied" })],
      pendingItems: [],
      reconcilingItems: [],
    },
    {
      scnId: "SCN-RMD-002",
      kind: "scenario",
      evidenceObservations: [],
      evidenceObligations: [],
      verdict: "out-of-balance",
      qualityCheckReconciliations: [
        qcr({ qualityCheck: "unit", outcome: "missing" }),
        qcr({ qualityCheck: "integration", outcome: "missing" }),
      ],
      pendingItems: [],
      reconcilingItems: [
        qcr({ qualityCheck: "unit", outcome: "missing" }),
        qcr({ qualityCheck: "integration", outcome: "missing" }),
      ],
    },
  ],
};

const ctx: RunContext = {
  target: "an-adopters-repository",
  inputs: { features: "../an-adopters-repository/features" },
  runStart: new Date("2026-07-02T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
};

/**
 * Unit tests for the materialised summary totals (@SCN-RMD-005).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-005, matching
 * features/report-model.feature, so a grep of the id returns both halves (this @unit + the
 * Cucumber @integration step-block).
 *
 * Completing "the whole document as one report model" (operator ruling — MATERIALISE):
 * the three printed numbers that were renderer arithmetic are now model data on report.summary —
 * the Test-volume totals, the Static-check totals, and the Lint tally. The two Σ = Σ identity
 * lines are reconciliation facts (a balance check) carried in the model. Matched byte-for-byte to
 * markdown's arithmetic so slice 2 can swap to reads with zero byte change: test-volume onScenario
 * is the on-a-scenario count (onPhantomScenario carried separately); the lint tally counts static
 * evidenceObligations balanced / total (markdown's countStaticEvidenceObligations). testVolume / staticChecks are
 * present only when the evidenceObservations / static check sibling is threaded; the lint tally is always present.
 */
describe("[SCN-RMD-005] the summary materialises the three report totals", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the balance folds to the test-volume
  // totals, the lint tally, AND the static-check totals (3F-2102 + 3F-2118: testVolume,
  // rawByRuntimeQualityCheck AND staticChecks are now Ledger folds, so a hand-built census that
  // disagrees with the balance is no longer constructible). It spans: 6 raw runtime observations =
  // 4 attributed-to-scenario + 1 phantom + 1 suspense (the 3-way test-volume identity is
  // non-trivial, onScenario excludes the phantom); 2 lint obligations, 1 satisfied
  // (lint:foo, running) + 1 watermelon (lint:bar, exists-but-not-enforced — the static-only lint
  // tally reads 1 of 2); and, on the CREDIT side, the static-check fold — 3 checks that ran = 2
  // named (lint:foo, enforced; lint:bar, the watermelon: it ran and its job survived its red) + 1
  // uncited (lint:baz, no-evidence-obligation, running → the suspense row). The census counts what
  // RAN, and lint:bar's enforcing nothing is its row's answer, not the census's (3F-3280, ruled
  // 2026-09-17: change the count, not the word).
  const rmd005Scenarios: Scenario[] = [
    { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-RMD-002", evidenceObligations: [{ qualityCheck: "integration" }] },
    { scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "foo" }] },
    { scnId: "SCN-RMD-011", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "bar" }] },
  ];
  const rmd005Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-RMD-002", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "lint", staticCheck: "lint:foo", checkTag: "foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "lint", staticCheck: "lint:bar", checkTag: "bar", scnId: "SCN-RMD-011", exists: true, enforcedOverRealSource: false },
    // The no-evidence-obligation running check — no scenario cites it — folds to the suspense row as
    // the 1 uncited static check, the credit-side teeth of the static-check fold.
    { qualityCheck: "lint", staticCheck: "lint:baz", exists: true, enforcedOverRealSource: true },
  ];
  const rmd005Balance: Ledger = reconcile(rmd005Scenarios, rmd005Observations);

  // A balance carrying static (@lint) evidenceObligations so the lint tally is non-trivial: 2 static
  // evidenceObligations, 1 balanced (satisfied) + 1 not — satisfied 1 of 2. The runtime evidenceObligations must
  // NOT count towards the static-only lint tally (summary.byOutcome is kind-agnostic; the lint tally
  // is not).
  const lintBalance: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-RMD-010",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          qcr({ qualityCheck: "lint", staticCheck: "foo", outcome: "satisfied" }),
          qcr({ qualityCheck: "unit", outcome: "missing" }),
        ],
        pendingItems: [],
        reconcilingItems: [qcr({ qualityCheck: "unit", outcome: "missing" })],
      },
      {
        scnId: "SCN-RMD-011",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          qcr({ qualityCheck: "lint", staticCheck: "bar", outcome: "watermelon" }),
        ],
        pendingItems: [],
        reconcilingItems: [
          qcr({ qualityCheck: "lint", staticCheck: "bar", outcome: "watermelon" }),
        ],
      },
    ],
  };

  it("materialises the test-volume totals (onScenario excludes onPhantomScenario)", () => {
    const report = assembleRenderInput(__er(rmd005Balance, true, false), ctx);
    expect(report.summary.testVolume).toEqual({
      totalEvidenceObservations: 6,
      onScenario: 4,
      onPhantomScenario: 1,
      onSuspenseScenario: 1,
    });
  });

  it("re-homes the raw per-quality-check totals onto summary (folded from the Ledger, 3F-2102)", () => {
    const report = assembleRenderInput(__er(rmd005Balance, true, false), ctx);
    // A materialised Ledger fold (the retired section's raw totals, re-homed testVolume-adjacent):
    // 4 unit (3 attributed to SCN-RMD-001 + 1 phantom) + 2 integration (1 attributed + 1 suspense).
    expect(report.summary.rawByRuntimeQualityCheck).toEqual({ unit: 4, integration: 2, e2e: 0, performance: 0 });
  });

  it("keeps the test-volume identity Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario", () => {
    const report = assembleRenderInput(__er(rmd005Balance, true, false), ctx);
    const tv = report.summary.testVolume!;
    expect(tv.totalEvidenceObservations).toBe(tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario);
  });

  it("materialises the static-check totals", () => {
    const report = assembleRenderInput(__er(rmd005Balance, false, true), ctx, undefined, undefined);
    expect(report.summary.staticChecks).toEqual({
      runningStaticCheckCount: 3,
      uncitedStaticCheckCount: 1,
    });
  });

  it("carries the 2-field census shape, with the evidence-obligation count implicit", () => {
    const report = assembleRenderInput(__er(rmd005Balance, false, true), ctx, undefined, undefined);
    const sg = report.summary.staticChecks!;
    // The evidence-obligation count is IMPLICIT — running − uncited, never a surface field.
    expect(sg.runningStaticCheckCount - sg.uncitedStaticCheckCount).toBe(2);
    // 3F-2291: this pin was two `not.toHaveProperty` negatives naming the
    // fields the 2-field census must NOT carry, one of them a word retired by that ticket.
    // Renaming a word inside a negative assertion empties it silently — it would then pin
    // the absence of a field that never existed at all — so the pin is restated POSITIVELY
    // over the exact key set. Strictly stronger: it now excludes every extra field, not
    // only the two that happened to be named.
    expect(Object.keys(sg).sort()).toEqual(["runningStaticCheckCount", "uncitedStaticCheckCount"]);
  });

  it("materialises the static-only lint tally (satisfied / total), ignoring runtime evidenceObligations", () => {
    const report = assembleRenderInput(__er(lintBalance), ctx);
    expect(report.summary.lint).toEqual({ satisfied: 1, total: 2 });
  });

  it("omits testVolume / staticChecks when their sibling read is not threaded, but always carries lint", () => {
    const report = assembleRenderInput(__er(balance), ctx);
    expect(report.summary).not.toHaveProperty("testVolume");
    expect(report.summary).not.toHaveProperty("staticChecks");
    // The lint tally is a pure balance derive — always present (this balance carries no static
    // obligations, so it reads 0 of 0).
    expect(report.summary.lint).toEqual({ satisfied: 0, total: 0 });
  });

  it("carries the three totals through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(__er(rmd005Balance, true, true), ctx));
    expect(parsed.summary.testVolume).toEqual({ totalEvidenceObservations: 6, onScenario: 4, onPhantomScenario: 1, onSuspenseScenario: 1 });
    expect(parsed.summary.staticChecks).toEqual({ runningStaticCheckCount: 3, uncitedStaticCheckCount: 1 });
    expect(parsed.summary.lint).toEqual({ satisfied: 1, total: 2 });
  });
});

/**
 * Unit tests for the feature titles on the report model (@SCN-RMD-006).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-006, matching
 * features/report-model.feature, so a grep of the id returns both halves (this @unit + the
 * Cucumber @integration step-block).
 *
 * The by-feature cut's feature titles (`feature-code → slug`) are MATERIALISED onto the report
 * under the small top-level `metadata` object (report.metadata.featureNames — moved
 * out from a top-level `featureNames` sibling of the reconciliation records), so the published
 * JSON carries them and a render from the saved report alone reconstructs the by-feature
 * names with no external map. assembleRenderInput takes the code→slug source (a ReadonlyMap) and stores
 * it under `metadata.featureNames` as a plain object, only when non-empty, as the LAST document key
 * (the retired warnings key no longer trails it). The markdown stays byte-identical: renderReport
 * reads the titles off `metadata.featureNames`, matching the prior map-threaded render exactly.
 */
describe("[SCN-RMD-006] the report model carries the feature titles", () => {
  // Two out-of-balance scenarios in two coded features (LDG, LNT), so the by-feature cut is
  // non-empty and the feature-title path is exercised.
  const codedBalance: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-LDG-003",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "missing" })],
        pendingItems: [],
        reconcilingItems: [qcr({ qualityCheck: "unit", outcome: "missing" })],
      },
      {
        scnId: "SCN-LNT-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          qcr({ qualityCheck: "lint", staticCheck: "guard-lint", outcome: "watermelon" }),
        ],
        pendingItems: [],
        reconcilingItems: [
          qcr({ qualityCheck: "lint", staticCheck: "guard-lint", outcome: "watermelon" }),
        ],
      },
    ],
  };
  const featureNames = new Map([
    ["LDG", "ledger"],
    ["LNT", "lint-evidence"],
  ]);

  it("materialises the feature titles under metadata as a plain object", () => {
    const report = assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames);
    // The titles now live under the small top-level `metadata` object (presentation
    // metadata), not as a top-level `featureNames` sibling of the reconciliation records.
    expect(report.metadata?.featureNames).toEqual({ LDG: "ledger", LNT: "lint-evidence" });
    expect(report).not.toHaveProperty("featureNames");
  });

  it("serialises the feature titles under metadata through the glue-free JSON", () => {
    const parsed = JSON.parse(
      renderJson(__er(codedBalance, false, false), ctx, undefined, featureNames)
    );
    expect(parsed.metadata.featureNames).toEqual({ LDG: "ledger", LNT: "lint-evidence" });
    expect(parsed).not.toHaveProperty("featureNames");
  });

  it("renderReport names each feature in full sourced from the model, no external map", () => {
    const report = assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames);
    const md = renderReport(report);
    expect(md).toContain("| ledger (LDG) | 1 | SCN-LDG-003 |");
    expect(md).toContain("| lint-evidence (LNT) | 1 | SCN-LNT-002 |");
  });

  it("keeps the markdown byte-identical: the model-sourced render equals the map-threaded render", () => {
    const modelSourced = renderReport(
      assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames)
    );
    const mapThreaded = renderMarkdown(__er(codedBalance, false, false), ctx, undefined, featureNames);
    expect(modelSourced).toBe(mapThreaded);
  });

  it("omits metadata when no coded feature is named (no map, or an empty map)", () => {
    // With no feature titles, the whole `metadata` object is omitted (present only
    // when the run carries ≥1 coded feature), and no top-level `featureNames` key appears.
    expect(assembleRenderInput(__er(codedBalance), ctx)).not.toHaveProperty("metadata");
    expect(assembleRenderInput(__er(codedBalance), ctx)).not.toHaveProperty("featureNames");
    expect(
      assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, new Map())
    ).not.toHaveProperty("metadata");
  });

  it("places metadata last, carrying featureNames — no top-level featureNames sibling", () => {
    const report = assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames) as unknown as Record<string, unknown>;
    const keys = Object.keys(report);
    // The titles now nest under `metadata` (presentation metadata), which is the LAST document
    // key — NOT a top-level `featureNames` sibling of the reconciliation records.
    expect(keys).toContain("metadata");
    expect(keys).not.toContain("featureNames");
    expect(keys[keys.length - 1]).toBe("metadata");
    expect((report.metadata as Record<string, unknown>).featureNames).toEqual({
      LDG: "ledger",
      LNT: "lint-evidence",
    });
    expect(report).not.toHaveProperty("warnings");
  });
});

/**
 * Unit tests for the flat quality-check coordinate (@SCN-RMD-008).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-008, matching
 * features/report-model.feature, so a grep of the id returns both halves (this @unit + the
 * Cucumber @integration step-block).
 *
 * Built through the REAL parse → reconcile → assemble pipeline (parseScenarios, not a
 * hand-seeded balance) and read off the glue-free JSON, so the assertion pins the EMITTED
 * shape, not an internal type.
 */
describe("[SCN-RMD-008] each reconciled evidence sub-row carries a single quality-check coordinate", () => {
  const feature = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    // STEPLESS, carrying a runtime tier AND a registered bare check — the TWO-AXIS row this
    // sub-row is read from (@SCN-LNT-004). The fitness obligation is raised off the registered
    // bare TAG and never off the shape (@SCN-LNT-006), and the retired `@lint=<handle>` rider
    // this fixture used to carry raises
    // nothing at all (@SCN-LNT-007), so it can no longer produce the lint sub-row under test.
    "    @unit @x @SCN-RMD-008",
    "    Scenario: a fixture scenario",
  ].join("\n");
  const report = () =>
    JSON.parse(JSON.stringify(assembleRenderInput(__er(reconcile(parseScenarios(feature, [], ["x"]), [])), ctx))) as {
      ledger: {
        scenarioReconciliations: Array<{
          qualityCheckReconciliations: Array<Record<string, unknown>>;
          reconcilingItems: Array<Record<string, unknown>>;
        }>;
      };
      summary: { evidenceObligations: Record<string, unknown> };
    };

  it("keys each evidence sub-row by a single qualityCheck field with no kind or level", () => {
    const r = report();
    const qualityCheckReconciliations = r.ledger.scenarioReconciliations.flatMap((s) => [...s.qualityCheckReconciliations, ...s.reconcilingItems]);
    expect(qualityCheckReconciliations.length).toBeGreaterThan(0);
    for (const row of qualityCheckReconciliations) {
      expect(typeof row.qualityCheck).toBe("string");
      expect(row).not.toHaveProperty("kind");
      expect(row).not.toHaveProperty("level");
    }
  });

  it("carries a lint sub-row's qualityCheck as 'lint' alongside its check", () => {
    const r = report();
    const lint = r.ledger.scenarioReconciliations
      .flatMap((s) => s.qualityCheckReconciliations)
      .find((o) => o.qualityCheck === "lint");
    expect(lint).toBeDefined();
    expect(lint!.qualityCheck).toBe("lint");
    expect(lint!.staticCheck).toBe("x");
  });

  it("keys a runtime sub-row by its level as the quality-check", () => {
    const r = report();
    const runtime = r.ledger.scenarioReconciliations
      .flatMap((s) => s.qualityCheckReconciliations)
      .find((o) => o.qualityCheck === "unit");
    expect(runtime).toBeDefined();
    expect(runtime).not.toHaveProperty("staticCheck");
  });

  it("carries the missing split under missingByQualityCheck, keyed by quality-check", () => {
    const eo = report().summary.evidenceObligations;
    expect(eo).toHaveProperty("missingByQualityCheck");
    const split = eo.missingByQualityCheck as Array<{ subject: string; count: number }>;
    // lint first (the canonical quality-check order), then the runtime level.
    expect(split).toEqual([
      { subject: "lint", count: 1 },
      { subject: "unit", count: 1 },
    ]);
  });
});

/**
 * Unit test for the TWO scenario-backing counts staying distinct (@SCN-LDG-008, ruling Q1).
 *
 * There are two different numbers for "credits backing a scenario", and a reader must not
 * read them as the same:
 *  - Test-volume `onScenario` (summary.testVolume.onScenario) = credits that CITE A REAL
 *    SCENARIO — this INCLUDES no-evidence-obligation (a subset), keeping the 3-termed identity
 *    `total = onScenario + onPhantomScenario + onSuspenseScenario`.
 *  - The reconciliation MATCHED-attributed = credits matching a NAMED (scnId, quality-check)
 *    PAIR — this EXCLUDES no-evidence-obligation. The retired census materialised it as `attributed[]`; it is
 *    now recovered from the Ledger (`testVolume.onScenario − byOutcome.no-evidence-obligation`) and checkable
 *    against the named credits posted on the row.
 *
 * The load-bearing assertion: the two numbers DIFFER by exactly byOutcome.no-evidence-obligation.
 */
describe("[SCN-LDG-008] the two scenario-backing counts stay distinct (ruling Q1)", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — a real balance carrying a no-evidence-obligation
  // credit-side item ON a scenario's row: SCN-LDG-008 raises ONLY unit; a unit credit
  // reconciles satisfied (matched), an integration credit citing it is no-evidence-obligation (a check it never
  // named). Both credits POST to the row, so the Ledger fold (3F-2102) counts onScenario = 2.
  const noEvidenceObligationBalance: Ledger = reconcile(
    [{ scnId: "SCN-LDG-008", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [
      { qualityCheck: "unit", scnId: "SCN-LDG-008", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/no-evidence-obligation.test.ts" },
    ],
  );

  it("carries no-evidence-obligation as its OWN entry in summary.byOutcome", () => {
    const report = assembleRenderInput(__er(noEvidenceObligationBalance, true, false), ctx);
    expect(report.summary.evidenceObligations.byOutcome["no-evidence-obligation"]).toBe(1);
  });

  it("keeps Test-volume onScenario INCLUDING no-evidence-obligation (cites a scenario), so it EXCEEDS the matched-pair count by exactly byOutcome.no-evidence-obligation", () => {
    const report = assembleRenderInput(__er(noEvidenceObligationBalance, true, false), ctx);
    // Test-volume onScenario = credits citing a scenario = matched (1) + no-evidence-obligation (1).
    expect(report.summary.testVolume!.onScenario).toBe(2);
    // The MATCHED-pair count is recovered from the Ledger, not a parallel `attributed[]` store:
    // testVolume.onScenario − byOutcome.no-evidence-obligation.
    const noEvidenceObligation = report.summary.evidenceObligations.byOutcome["no-evidence-obligation"];
    const matched = report.summary.testVolume!.onScenario - noEvidenceObligation;
    expect(matched).toBe(1);
    // And that recovered count equals the credits posted at the NAMED (unit) pair on the row —
    // checkable straight off the ledger, where the retired census re-represented it.
    const row = noEvidenceObligationBalance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-008")!;
    const unitEvidenceObligationCredits = row.evidenceObservations.filter((o) => o.qualityCheck === "unit").length;
    expect(unitEvidenceObligationCredits).toBe(matched);
    // The two numbers are NOT the same — they differ by exactly the no-evidence-obligation count.
    expect(report.summary.testVolume!.onScenario - matched).toBe(noEvidenceObligation);
  });

  it("keeps the Test-volume identity 3-termed (no-evidence-obligation is a SUBSET of onScenario, not a 4th term)", () => {
    const report = assembleRenderInput(__er(noEvidenceObligationBalance, true, false), ctx);
    const tv = report.summary.testVolume!;
    expect(tv.totalEvidenceObservations).toBe(
      tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario
    );
  });
});

/**
 * Unit tests for the materialised Pending Items tally (@SCN-PND-011).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-PND-011, matching
 * features/pending-items.feature, so a grep of the id returns both halves (this @unit + the
 * Cucumber @integration step-block).
 *
 * The summary materialises a Pending Items tally — a count of the Pending Items across the
 * reconciliation (one per deferred `<quality-check>pending` obligation), SEPARATE from the
 * scenario balanced / out-of-balance counts and the evidence-obligation counts. Hard constraint
 * (3F-1453 line, endorsed): a Pending Item is deferred, NOT out-of-balance, so the tally is NEVER
 * folded into `evidenceObligations.byOutcome` (the out-of-balance leaf outcomes — at any leaf
 * count; the constraint is categorical, not arithmetic) nor into the evidence-obligation total —
 * it is its OWN count. It counts Pending ITEMS, not
 * scenarios-carrying-pending (mirroring the out-of-balance decomposition, which counts
 * obligations, not scenarios). Being a pure balance derive (like the lint tally), it is ALWAYS
 * present. The glue-free JSON carries it with no renderer glue.
 */
describe("[SCN-PND-011] the summary materialises a Pending Items tally, separate from the verdict counts", () => {
  // A balance with teeth: SCN-PDX-001 carries TWO Pending Items (balanced), SCN-PDX-002 ONE
  // (out-of-balance via a genuine missing unit error), SCN-PDX-003 NONE (balanced). So Pending
  // Items = 3 across 2 scenarios; scenarios: 3 (balanced 2, out-of-balance 1); evidence
  // obligations: 2 (1 satisfied, 1 missing). The tally (3) coincides with none of them.
  const pendingBalance: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-PDX-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [],
        reconcilingItems: [],
        pendingItems: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-PDX-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "missing" })],
        reconcilingItems: [qcr({ qualityCheck: "unit", outcome: "missing" })],
        pendingItems: [{ qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-PDX-003",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "satisfied" })],
        reconcilingItems: [],
        pendingItems: [],
      },
    ],
  };

  it("materialises summary.pending counting Pending Items across the rows", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    // 2 (SCN-PDX-001) + 1 (SCN-PDX-002) + 0 (SCN-PDX-003) = 3 Pending Items.
    expect(report.summary.pending).toBe(3);
  });

  it("counts Pending ITEMS, not scenarios carrying them (one row alone carries two)", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    const scenariosCarryingPending = pendingBalance.scenarioReconciliations.filter(
      (s) => (s.pendingItems ?? []).length > 0
    ).length;
    expect(scenariosCarryingPending).toBe(2);
    // The tally counts items (3), not the 2 scenarios carrying them — the load-bearing distinction.
    expect(report.summary.pending).not.toBe(scenariosCarryingPending);
  });

  it("keeps the tally SEPARATE from the scenario balanced / out-of-balance counts", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    expect(report.summary.scenarioReconciliations).toEqual({ total: 3, balanced: 2, outOfBalance: 1, phantom: 0, suspense: 0 });
    // The tally is its own number — it coincides with neither verdict count.
    expect(report.summary.pending).not.toBe(report.summary.scenarioReconciliations.balanced);
    expect(report.summary.pending).not.toBe(report.summary.scenarioReconciliations.outOfBalance);
  });

  it("NEVER folds a Pending Item into the evidence-obligation counts (never an out-of-balance outcome, at any count)", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    // The evidence-obligation total counts the two REAL obligations (1 satisfied + 1 missing) —
    // the three Pending Items are NOT obligations, so they never inflate it.
    expect(report.summary.evidenceObligations.total).toBe(2);
    expect(report.summary.evidenceObligations.outOfBalance).toBe(1);
    expect(report.summary.evidenceObligations.byOutcome.satisfied).toBe(1);
    expect(report.summary.evidenceObligations.byOutcome.missing).toBe(1);
    // There is NO `pending` key among the reconciliation outcomes — a Pending Item is a
    // structurally distinct category, never one of the out-of-balance leaves, at any leaf count.
    expect(report.summary.evidenceObligations.byOutcome).not.toHaveProperty("pending");
  });

  it("is always present — a pure balance derive reading 0 when no scenario names a pending obligation", () => {
    const report = assembleRenderInput(__er(balance), ctx);
    // The `balance` fixture (top of file) raises no pending obligations, so the tally reads 0.
    expect(report.summary.pending).toBe(0);
  });

  it("carries the tally through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(__er(pendingBalance), ctx));
    expect(parsed.summary.pending).toBe(3);
  });
});
