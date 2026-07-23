/**
 * Unit tests for assembleReport — the whole-document report model (@SCN-RMD-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RMD-001 id
 * matching features/report-model.feature, so a grep of the id returns both halves (this
 * @unit + the Cucumber @integration step-block).
 *
 * Proves the assembler + the glue-free JSON serialisation in isolation: assembleReport builds
 * ONE object carrying the whole-document sections in document order (runProvenance renamed
 * from provenance; a materialised summary; evidenceObligations; the reconciliation
 * body; the retired warnings key gone), and renderJson is JUST JSON.stringify of that
 * object (glue-free — no per-key hand-assembly), so the parsed JSON equals the assembled model.
 *
 * Parent: (@SCN-RMD-001).
 */

import { describe, it, expect } from "vitest";
import { assembleReport } from "./report.js";
import { renderJson } from "../render/json.js";
import { renderReport, renderMarkdown } from "../render/markdown.js";
import { parseScenarios } from "../parse/scenarios.js";
import { isBalanced, reconcile } from "../reconcile/reconcile.js";
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
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import type { RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import type { StaticEvidenceObservationKindCounts } from "../census/staticEvidenceObservations.js";

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

const evidenceObligations: EvidenceObligations = {
  rawScnOccurrences: 10,
  scenarioCount: 7,
  excludedOccurrences: 3,
  untaggedScenarios: [],
  proseOnlyCodes: [],
};

describe("[SCN-RMD-001] assembleReport builds one whole-document report model", () => {
  it("carries the sections as top-level keys in document order", () => {
    const report = assembleReport(balance, ctx, evidenceObligations) as unknown as Record<string, unknown>;
    // runProvenance opens; the summary's totals then the LEDGER's detail (chain step 6, RMD-002);
    // the evidenceObligations census follows. The retired `warnings` key is GONE — a zero-evidence
    // scenario is a both-missing row in the ledger, not a separate top-level axis.
    expect(Object.keys(report)).toEqual([
      "runProvenance",
      "summary",
      "ledger",
      "evidenceObligations",
    ]);
    expect(report).not.toHaveProperty("warnings");
  });

  it("renames the provenance section to runProvenance carrying the run facts", () => {
    const report = assembleReport(balance, ctx);
    expect(report.runProvenance.target).toBe("an-adopters-repository");
    expect(report.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    expect(report.runProvenance.runTimestamp).toBe("2026-07-02T08:17:53Z");
  });

  it("materialises the summary totals from the balance", () => {
    const report = assembleReport(balance, ctx);
    // A declared-only balance: every row is a declared scenario, so the totals are the
    // declared rows and the phantom / suspense sub-counts read 0.
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

  // an adopter's repository dogfood shape (3F-1703, run 2026-07-13T17-36-50Z) in miniature: every DECLARED
  // scenario is balanced, yet a credit citing NO scenario posts a `cites-no-scenario` item to
  // the suspense `(no scenario)` row — so the run IS out-of-balance and exits 1. Under the
  // declared-only tally the summary read `total 2, balanced 2, outOfBalance 0`: a failing run
  // rendering a headline that read as a clean pass.
  const balanceWithSuspense: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-TGT-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "satisfied" })],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-TGT-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "satisfied" })],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [qcr({ qualityCheck: "lint", staticGuard: "guard:static", outcome: "cites-no-scenario" })],
        pendingItems: [],
        reconcilingItems: [qcr({ qualityCheck: "lint", staticGuard: "guard:static", outcome: "cites-no-scenario" })],
      },
    ],
  };

  it("counts the suspense reconciliation in the summary totals — a run whose only out-of-balance row is the suspense row tallies 1 out-of-balance, not 0", () => {
    const report = assembleReport(balanceWithSuspense, ctx);
    // The Evidence Reconciliation is ALL Scenario Reconciliations assembled and the summary is
    // its totals (the maintainers' private notes). A suspense reconciliation is ALWAYS
    // out-of-balance, so it counts into the total AND into out-of-balance: 2 declared + 1
    // suspense = 3 rows, 2 balanced, 1 out-of-balance. `suspense` survives as a sub-count — a
    // BREAKDOWN of the total (declared = total − phantom − suspense), not a bucket outside it.
    expect(report.summary.scenarioReconciliations).toEqual({
      total: 3,
      balanced: 2,
      outOfBalance: 1,
      phantom: 0,
      suspense: 1,
    });
    // THE INVARIANT THE BUG BROKE (3F-1703): the tally agrees with `isBalanced` — the predicate
    // the CLI maps to the process exit code. `isBalanced` walks EVERY row's reconcilingItems, so
    // it correctly calls this run out-of-balance (exit 1); the declared-only tally read 0
    // out-of-balance and disagreed, rendering a failing run as a pass.
    expect(isBalanced(balanceWithSuspense)).toBe(false);
    expect(report.summary.scenarioReconciliations.outOfBalance).toBeGreaterThan(0);
  });

  it("counts the phantom reconciliation in the summary totals too — cited-but-undeclared is out-of-balance, not a bucket apart", () => {
    // The phantom row (a credit citing an @SCN no feature declares) is the suspense row's
    // sibling: also ALWAYS out-of-balance, so it also counts into the total and into
    // out-of-balance, with `phantom` surviving as its sub-count.
    const balanceWithPhantom: Ledger = {
      scenarioReconciliations: [
        ...balanceWithSuspense.scenarioReconciliations,
        {
          scnId: "SCN-PHANTOM-999",
          kind: "phantom-scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "cites-unknown-scenario" })],
          pendingItems: [],
          reconcilingItems: [qcr({ qualityCheck: "unit", outcome: "cites-unknown-scenario" })],
        },
      ],
    };
    const report = assembleReport(balanceWithPhantom, ctx);
    expect(report.summary.scenarioReconciliations).toEqual({
      total: 4,
      balanced: 2,
      outOfBalance: 2,
      phantom: 1,
      suspense: 1,
    });
    // The sub-counts reconcile to the total: declared = total − phantom − suspense.
    const t = report.summary.scenarioReconciliations;
    expect(t.total - t.phantom - t.suspense).toBe(2);
    expect(isBalanced(balanceWithPhantom)).toBe(false);
  });

  it("carries no warnings key — the retired authoring-quality axis", () => {
    const report = assembleReport(balance, ctx) as unknown as Record<string, unknown>;
    expect(report).not.toHaveProperty("warnings");
    expect(((report.ledger as { scenarioReconciliations: unknown[] }).scenarioReconciliations)).toHaveLength(2);
  });

  it("renderJson is a glue-free JSON.stringify of the assembled report", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    // Glue-free: the parsed JSON EQUALS the assembled model (no divergent hand-assembly).
    expect(parsed).toEqual(assembleReport(balance, ctx, evidenceObligations));
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
    const parsed = JSON.parse(renderJson(balance, ctx));
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
    const parsed = JSON.parse(renderJson(balance, ctx));
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
    // Driven from REAL reconcile output, not the hand-built `balance` above (evidence-manifesto
    // §11A): the posted entries are what `reconcile` puts on the account, and the shared fixture
    // predates them (the fields are optional for exactly that back-compat, ABSENCE ≡ []). This is
    // also the scenario's Given — "accounts CARRY posted entries" — so a fixture without them
    // would not exercise it.
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
    const parsed = JSON.parse(renderJson(real, ctx));
    const account = parsed.ledger.scenarioReconciliations.find(
      (s: { scnId: string }) => s.scnId === "SCN-AAA-001"
    );
    // The DEBIT it declared (@SCN-LDG-023) and the CREDIT that cites it (@SCN-LDG-022), both
    // findable on the artefact, beside the reconciling items they balance off to.
    expect(account.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
    expect(account.evidenceObservations).toEqual([credit]);
    expect(account.reconcilingItems).toEqual([]);
  });

  it("carries each quality check reconciliation's outcome field with the reconciliation-outcome literals", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));
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
 * Unit tests for the evidenceObservations section (@SCN-RMD-003).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-003.
 *
 * The observed evidence serialises under `evidenceObservations` (was `evidenceObservations`), retiring the
 * made-up "evidenceObservations" word, with `phantom` → `phantomEvidenceObservations` and `unattributed evidence observation` →
 * `suspenseEvidenceObservations`, carrying the fine grain (raw-by-level, attributed counts,
 * phantom / unattributed evidence observation evidenceObservations WITH their file locators). The mapping lives in the
 * assembler; the balancing identity holds by construction.
 */
describe("[SCN-RMD-003] observed evidence serialises as evidenceObservations", () => {
  // A countRuntimeEvidenceObservationKinds-shaped fixture that BALANCES: 5 unit (4 attributed + 1 phantomEvidenceObservation) + 1 integration
  // (1 suspenseEvidenceObservation) = 6 raw = 4 attributed + 1 phantomEvidenceObservation + 1 unattributed evidence observation.
  const evidenceObservations: RuntimeEvidenceObservationKindCounts = {
    rawByRuntimeQualityCheck: { unit: 5, integration: 1, e2e: 0, performance: 0 },
    attributed: [{ scnId: "SCN-RMD-001", qualityCheck: "unit", count: 4 }],
    undemandedCount: 0,
    phantomCount: 1,
    suspenseCount: 1,
  };

  it("carries the observed evidence under the evidenceObservations key", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, undefined, evidenceObservations));
    expect(parsed.evidenceObservations).toBeDefined();
    expect(parsed.evidenceObservations.rawByRuntimeQualityCheck).toEqual({ unit: 5, integration: 1, e2e: 0, performance: 0 });
    expect(parsed.evidenceObservations.attributed).toContainEqual({ scnId: "SCN-RMD-001", qualityCheck: "unit", count: 4 });
  });

  it("dissolves BOTH the phantom and the suspense detail arrays from the section (no double-report)", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, undefined, evidenceObservations));
    // The PHANTOM detail dissolved into the phantom rows (@SCN-LDG-006); the SUSPENSE
    // detail dissolved into the suspense row (@SCN-LDG-007). Neither is a standalone array
    // on the section any more. The retired shortenings are likewise gone.
    expect(parsed.evidenceObservations).not.toHaveProperty("phantomCount");
    expect(parsed.evidenceObservations).not.toHaveProperty("suspenseCount");
    expect(parsed.evidenceObservations).not.toHaveProperty("phantom evidence observation");
    expect(parsed.evidenceObservations).not.toHaveProperty("unattributed evidence observation");
    // But BOTH counts survive in summary.testVolume — the balance-check identity is kept.
    expect(parsed.summary.testVolume.citesUnknownScenario).toBe(1);
    expect(parsed.summary.testVolume.citesNoScenario).toBe(1);
  });

  it("keeps the balancing identity: Σ rawByRuntimeQualityCheck = Σ attributed + phantom + suspense (both counts from summary.testVolume)", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, undefined, evidenceObservations));
    const raw = (Object.values(parsed.evidenceObservations.rawByRuntimeQualityCheck) as number[]).reduce((a, b) => a + b, 0);
    const tv = parsed.summary.testVolume;
    const attributed =
      parsed.evidenceObservations.attributed.reduce((n: number, a: { count: number }) => n + a.count, 0) +
      tv.citesUnknownScenario;
    expect(raw).toBe(attributed + tv.citesNoScenario);
  });
});

/**
 * Unit tests for the static-guard census collapse (@SCN-RMD-004).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-004.
 *
 * The static-guard census is `summary.staticGuards` COUNTS alone (2.4) — the standalone
 * member-list section (`guards` → `staticGuards`, `{ciGuards[], demanded[]}`) COLLAPSED, symmetric
 * with the runtime side. The static guard member detail now lives in the rows (demanded → each scenario's
 * `@lint` sub-row; undemanded → the suspense row's `cites-no-scenario` credit items), so there is
 * no double-report and no census section on the JSON surface.
 */
describe("[SCN-RMD-004] the static-guard census is summary counts, no standalone section", () => {
  const guards: StaticEvidenceObservationKindCounts = { runningGuardCount: 2, uncitedStaticGuardCount: 1 };

  it("carries NO standalone staticGuards (or guards) section — the census collapsed to summary counts", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, undefined, undefined, guards));
    // The member-list section (was `guards`, then `staticGuards`) is gone: the guard detail now
    // lives in the rows, symmetric with the runtime side — no double-report on the JSON surface.
    expect(parsed).not.toHaveProperty("staticGuards");
    expect(parsed).not.toHaveProperty("guards");
  });

  it("materialises the counts under summary.staticGuards ({ runningGuardCount, uncitedStaticGuardCount })", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, undefined, undefined, guards));
    expect(parsed.summary.staticGuards).toEqual({ runningGuardCount: 2, uncitedStaticGuardCount: 1 });
  });
});

/**
 * Unit tests for the materialised summary totals (@SCN-RMD-005).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-005, matching
 * features/report-model.feature, so a grep of the id returns both halves (this @unit + the
 * Cucumber @integration step-block).
 *
 * Completing "the whole document as one report model" (operator ruling — MATERIALISE):
 * the three printed numbers that were renderer arithmetic are now model data on report.summary —
 * the Test-volume totals, the Static-guard totals, and the Lint tally. The two Σ = Σ identity
 * lines are reconciliation facts (a balance check) carried in the model. Matched byte-for-byte to
 * markdown's arithmetic so slice 2 can swap to reads with zero byte change: test-volume attributed
 * is the attributed-to-declared count (phantomEvidenceObservation carried separately); the lint tally counts static
 * evidenceObligations balanced / total (markdown's countStaticEvidenceObligations). testVolume / staticGuards are
 * present only when the evidenceObservations / static guard sibling is threaded; the lint tally is always present.
 */
describe("[SCN-RMD-005] the summary materialises the three report totals", () => {
  // A evidenceObservations fixture with teeth: 6 raw = 4 attributed-to-declared + 1 phantom + 1 unattributed evidence observation, so
  // the 3-way test-volume identity is non-trivial (attributed excludes phantomEvidenceObservation).
  const evidenceObservations: RuntimeEvidenceObservationKindCounts = {
    rawByRuntimeQualityCheck: { unit: 5, integration: 1, e2e: 0, performance: 0 },
    attributed: [
      { scnId: "SCN-RMD-001", qualityCheck: "unit", count: 3 },
      { scnId: "SCN-RMD-002", qualityCheck: "integration", count: 1 },
    ],
    undemandedCount: 0,
    phantomCount: 1,
    suspenseCount: 1,
  };

  // Static-guard kind-counts with teeth: 2 running CI guards = 1 declared + 1 uncited.
  const guards: StaticEvidenceObservationKindCounts = { runningGuardCount: 2, uncitedStaticGuardCount: 1 };

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
          qcr({ qualityCheck: "lint", staticGuard: "lint:foo", outcome: "satisfied" }),
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
          qcr({ qualityCheck: "lint", staticGuard: "lint:bar", outcome: "watermelon" }),
        ],
        pendingItems: [],
        reconcilingItems: [
          qcr({ qualityCheck: "lint", staticGuard: "lint:bar", outcome: "watermelon" }),
        ],
      },
    ],
  };

  it("materialises the test-volume totals (attributed excludes cites-unknown-scenario)", () => {
    const report = assembleReport(balance, ctx, undefined, evidenceObservations);
    expect(report.summary.testVolume).toEqual({
      totalEvidenceObservations: 6,
      attributed: 4,
      citesUnknownScenario: 1,
      citesNoScenario: 1,
    });
  });

  it("keeps the test-volume identity Σ rawByRuntimeQualityCheck = attributed + phantomEvidenceObservation + suspenseEvidenceObservation", () => {
    const report = assembleReport(balance, ctx, undefined, evidenceObservations);
    const tv = report.summary.testVolume!;
    expect(tv.totalEvidenceObservations).toBe(tv.attributed + tv.citesUnknownScenario + tv.citesNoScenario);
  });

  it("materialises the static-guard totals", () => {
    const report = assembleReport(balance, ctx, undefined, undefined, guards);
    expect(report.summary.staticGuards).toEqual({
      runningGuardCount: 2,
      uncitedStaticGuardCount: 1,
    });
  });

  it("carries the 2-field census shape with demanded implicit (no ciGuards/demanded on the surface)", () => {
    const report = assembleReport(balance, ctx, undefined, undefined, guards);
    const sg = report.summary.staticGuards!;
    // demanded is IMPLICIT — running − uncited, never a surface field.
    expect(sg.runningGuardCount - sg.uncitedStaticGuardCount).toBe(1);
    expect(sg).not.toHaveProperty("ciGuards");
    expect(sg).not.toHaveProperty("demanded");
  });

  it("materialises the static-only lint tally (satisfied / total), ignoring runtime evidenceObligations", () => {
    const report = assembleReport(lintBalance, ctx);
    expect(report.summary.lint).toEqual({ satisfied: 1, total: 2 });
  });

  it("omits testVolume / staticGuards when their sibling read is not threaded, but always carries lint", () => {
    const report = assembleReport(balance, ctx);
    expect(report.summary).not.toHaveProperty("testVolume");
    expect(report.summary).not.toHaveProperty("staticGuards");
    // The lint tally is a pure balance derive — always present (this balance declares no static
    // evidenceObligations, so it reads 0 of 0).
    expect(report.summary.lint).toEqual({ satisfied: 0, total: 0 });
  });

  it("carries the three totals through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(lintBalance, ctx, undefined, evidenceObservations, guards));
    expect(parsed.summary.testVolume).toEqual({ totalEvidenceObservations: 6, attributed: 4, citesUnknownScenario: 1, citesNoScenario: 1 });
    expect(parsed.summary.staticGuards).toEqual({ runningGuardCount: 2, uncitedStaticGuardCount: 1 });
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
 * names with no external map. assembleReport takes the code→slug source (a ReadonlyMap) and stores
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
          qcr({ qualityCheck: "lint", staticGuard: "guard-lint", outcome: "watermelon" }),
        ],
        pendingItems: [],
        reconcilingItems: [
          qcr({ qualityCheck: "lint", staticGuard: "guard-lint", outcome: "watermelon" }),
        ],
      },
    ],
  };
  const featureNames = new Map([
    ["LDG", "ledger"],
    ["LNT", "lint-evidence"],
  ]);

  it("materialises the feature titles under metadata as a plain object", () => {
    const report = assembleReport(codedBalance, ctx, undefined, undefined, undefined, featureNames);
    // The titles now live under the small top-level `metadata` object (presentation
    // metadata), not as a top-level `featureNames` sibling of the reconciliation records.
    expect(report.metadata?.featureNames).toEqual({ LDG: "ledger", LNT: "lint-evidence" });
    expect(report).not.toHaveProperty("featureNames");
  });

  it("serialises the feature titles under metadata through the glue-free JSON", () => {
    const parsed = JSON.parse(
      renderJson(codedBalance, ctx, undefined, undefined, undefined, featureNames)
    );
    expect(parsed.metadata.featureNames).toEqual({ LDG: "ledger", LNT: "lint-evidence" });
    expect(parsed).not.toHaveProperty("featureNames");
  });

  it("renderReport names each feature in full sourced from the model, no external map", () => {
    const report = assembleReport(codedBalance, ctx, undefined, undefined, undefined, featureNames);
    const md = renderReport(report);
    expect(md).toContain("| ledger (LDG) | 1 | SCN-LDG-003 |");
    expect(md).toContain("| lint-evidence (LNT) | 1 | SCN-LNT-002 |");
  });

  it("keeps the markdown byte-identical: the model-sourced render equals the map-threaded render", () => {
    const modelSourced = renderReport(
      assembleReport(codedBalance, ctx, undefined, undefined, undefined, featureNames)
    );
    const mapThreaded = renderMarkdown(codedBalance, ctx, undefined, undefined, featureNames);
    expect(modelSourced).toBe(mapThreaded);
  });

  it("omits metadata when no coded feature is declared (no map, or an empty map)", () => {
    // With no feature titles, the whole `metadata` object is omitted (present only
    // when the run declares ≥1 coded feature), and no top-level `featureNames` key appears.
    expect(assembleReport(codedBalance, ctx)).not.toHaveProperty("metadata");
    expect(assembleReport(codedBalance, ctx)).not.toHaveProperty("featureNames");
    expect(
      assembleReport(codedBalance, ctx, undefined, undefined, undefined, new Map())
    ).not.toHaveProperty("metadata");
  });

  it("places metadata last, carrying featureNames — no top-level featureNames sibling", () => {
    const report = assembleReport(
      codedBalance,
      ctx,
      undefined,
      undefined,
      undefined,
      featureNames
    ) as unknown as Record<string, unknown>;
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
 * Slice 1 of the reconciliation-model restructure: the (kind, level) two-axis evidence coordinate
 * collapses to ONE flat quality-check. Each JSON evidence sub-row
 * (evidenceReconciliation[].qualityCheckReconciliations[] / reconcilingItems[]) is keyed by a single qualityCheck
 * field — no kind, no level; a lint sub-row carries qualityCheck "lint" alongside its static guard — and
 * the summary's missing split serialises under missingByQualityCheck. Built through the
 * REAL declared → reconcile → assemble pipeline (parseScenarios, not a hand-seeded balance) and read
 * off the glue-free JSON, so the assertion pins the emitted shape, not an internal type.
 */
describe("[SCN-RMD-008] each reconciled evidence sub-row carries a single quality-check coordinate", () => {
  // A scenario declaring BOTH a runtime (@unit) and a lint (@lint=lint:x) evidence obligation, parsed through
  // the real declared reader; reconciled against NO evidence observations → the runtime evidence obligation is
  // missing and the lint evidence obligation is missing (static guard retained). The
  // glue-free JSON round-trip makes the assertions read the EMITTED shape, type-agnostic.
  const feature = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @lint=lint:x @SCN-RMD-008",
    "    Scenario: a fixture scenario",
    "      Given a fixture step",
  ].join("\n");
  const report = () =>
    JSON.parse(JSON.stringify(assembleReport(reconcile(parseScenarios(feature), []), ctx))) as {
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

  it("carries a lint sub-row's qualityCheck as 'lint' alongside its guard", () => {
    const r = report();
    const lint = r.ledger.scenarioReconciliations
      .flatMap((s) => s.qualityCheckReconciliations)
      .find((o) => o.qualityCheck === "lint");
    expect(lint).toBeDefined();
    expect(lint!.qualityCheck).toBe("lint");
    expect(lint!.staticGuard).toBe("lint:x");
  });

  it("keys a runtime sub-row by its level as the quality-check", () => {
    const r = report();
    const runtime = r.ledger.scenarioReconciliations
      .flatMap((s) => s.qualityCheckReconciliations)
      .find((o) => o.qualityCheck === "unit");
    expect(runtime).toBeDefined();
    expect(runtime).not.toHaveProperty("staticGuard");
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
 * Unit test for the TWO "attributed" counts staying distinct (@SCN-LDG-008, ruling Q1).
 *
 * There are now two different "attributed" numbers, and a reader (JSON + markdown) must not
 * read them as the same number:
 *  - Test-volume `attributed` (summary.testVolume.attributed) = credits that CITE A DECLARED
 *    SCENARIO — this INCLUDES undemanded (a subset), keeping the 3-termed identity
 *    `total = attributed + phantom + suspense`.
 *  - Reconciliation matched-`attributed` (Σ report.evidenceObservations.attributed[].count) =
 *    credits matching a declared (scnId, quality-check) PAIR — this SHRINKS as undemanded breaks
 *    out into its own outcome, which surfaces distinctly in summary.byOutcome.undemanded.
 *
 * The load-bearing assertion: the two numbers DIFFER by exactly byOutcome.undemanded.
 */
describe("[SCN-LDG-008] the two attributed counts stay distinct (ruling Q1)", () => {
  // A balance with an undemanded credit-side item ON a real declared scenario's row (its unit
  // evidence obligation reconciles satisfied; an integration credit is undemanded).
  const undemandedBalance: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-LDG-008",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          qcr({ qualityCheck: "unit", outcome: "satisfied" }),
          qcr({ qualityCheck: "integration", outcome: "undemanded", locator: "src/undemanded.test.ts" }),
        ],
        pendingItems: [],
        reconcilingItems: [
          qcr({ qualityCheck: "integration", outcome: "undemanded", locator: "src/undemanded.test.ts" }),
        ],
      },
    ],
  };
  // The evidence-observation kind-counts: ONE matched credit ((SCN-LDG-008, unit)) + ONE undemanded
  // credit ((SCN-LDG-008, integration) — cites a declared scenario, at an undeclared quality-check).
  const evidenceObservations: RuntimeEvidenceObservationKindCounts = {
    rawByRuntimeQualityCheck: { unit: 1, integration: 1, e2e: 0, performance: 0 },
    attributed: [{ scnId: "SCN-LDG-008", qualityCheck: "unit", count: 1 }],
    undemandedCount: 1,
    phantomCount: 0,
    suspenseCount: 0,
  };

  it("carries undemanded as its OWN entry in summary.byOutcome", () => {
    const report = assembleReport(undemandedBalance, ctx, undefined, evidenceObservations);
    expect(report.summary.evidenceObligations.byOutcome.undemanded).toBe(1);
  });

  it("keeps Test-volume attributed INCLUDING undemanded (cites a declared scenario), so it EXCEEDS the reconciliation matched-attributed by exactly byOutcome.undemanded", () => {
    const report = assembleReport(undemandedBalance, ctx, undefined, evidenceObservations);
    // Test-volume attributed = credits citing a declared scenario = matched (1) + undemanded (1).
    expect(report.summary.testVolume!.attributed).toBe(2);
    // Reconciliation matched-attributed = Σ over the per-(scnId, level) matched-pair array = 1.
    const matched = report.evidenceObservations!.attributed.reduce((n, a) => n + a.count, 0);
    expect(matched).toBe(1);
    // The two are NOT the same number — they differ by exactly the undemanded count.
    expect(report.summary.testVolume!.attributed - matched).toBe(
      report.summary.evidenceObligations.byOutcome.undemanded
    );
  });

  it("keeps the Test-volume identity 3-termed (undemanded is a SUBSET of attributed, not a 4th term)", () => {
    const report = assembleReport(undemandedBalance, ctx, undefined, evidenceObservations);
    const tv = report.summary.testVolume!;
    expect(tv.totalEvidenceObservations).toBe(
      tv.attributed + tv.citesUnknownScenario + tv.citesNoScenario
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
    const report = assembleReport(pendingBalance, ctx);
    // 2 (SCN-PDX-001) + 1 (SCN-PDX-002) + 0 (SCN-PDX-003) = 3 Pending Items.
    expect(report.summary.pending).toBe(3);
  });

  it("counts Pending ITEMS, not scenarios carrying them (SCN-PDX-001 alone carries two)", () => {
    const report = assembleReport(pendingBalance, ctx);
    const scenariosCarryingPending = pendingBalance.scenarioReconciliations.filter(
      (s) => (s.pendingItems ?? []).length > 0
    ).length;
    expect(scenariosCarryingPending).toBe(2);
    // The tally counts items (3), not the 2 scenarios carrying them — the load-bearing distinction.
    expect(report.summary.pending).not.toBe(scenariosCarryingPending);
  });

  it("keeps the tally SEPARATE from the scenario balanced / out-of-balance counts", () => {
    const report = assembleReport(pendingBalance, ctx);
    expect(report.summary.scenarioReconciliations).toEqual({ total: 3, balanced: 2, outOfBalance: 1, phantom: 0, suspense: 0 });
    // The tally is its own number — it coincides with neither verdict count.
    expect(report.summary.pending).not.toBe(report.summary.scenarioReconciliations.balanced);
    expect(report.summary.pending).not.toBe(report.summary.scenarioReconciliations.outOfBalance);
  });

  it("NEVER folds a Pending Item into the evidence-obligation counts (never an out-of-balance outcome, at any count)", () => {
    const report = assembleReport(pendingBalance, ctx);
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

  it("is always present — a pure balance derive reading 0 when no scenario declares a pending obligation", () => {
    const report = assembleReport(balance, ctx);
    // The `balance` fixture (top of file) declares no pending obligations, so the tally reads 0.
    expect(report.summary.pending).toBe(0);
  });

  it("carries the tally through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(pendingBalance, ctx));
    expect(parsed.summary.pending).toBe(3);
  });
});
