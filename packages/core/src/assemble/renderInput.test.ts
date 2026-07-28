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
import { renderJson } from "../render/json.js";
import { renderReport, renderMarkdown } from "../render/markdown.js";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
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

const evidenceObligations: EvidenceObligations = {
  rawScnOccurrences: 10,
  scenarioCount: 7,
  excludedOccurrences: 3,
  untaggedScenarios: [],
  proseOnlyCodes: [],
};

describe("[SCN-RMD-001] assembleRenderInput builds one whole-document report model", () => {
  it("carries the sections as top-level keys in document order", () => {
    const report = assembleRenderInput(__er(balance, false, false), ctx, evidenceObligations) as unknown as Record<string, unknown>;
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
    const report = assembleRenderInput(__er(balance), ctx);
    expect(report.runProvenance.target).toBe("an-adopters-repository");
    expect(report.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    expect(report.runProvenance.runTimestamp).toBe("2026-07-02T08:17:53Z");
  });

  it("materialises the summary totals from the balance", () => {
    const report = assembleRenderInput(__er(balance), ctx);
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

  // an adopter's repository dogfood shape (3F-1703, run 2026-07-13T17-36-50Z) in miniature: every DECLARED
  // scenario is balanced, yet a credit citing NO scenario posts a `cites-no-scenario` item to
  // the suspense `(no scenario)` row — so the run IS out-of-balance and exits 1. Under the
  // scenario-only tally the summary read `total 2, balanced 2, outOfBalance 0`: a failing run
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
    const report = assembleRenderInput(__er(balance), ctx) as unknown as Record<string, unknown>;
    expect(report).not.toHaveProperty("warnings");
    expect(((report.ledger as { scenarioReconciliations: unknown[] }).scenarioReconciliations)).toHaveLength(2);
  });

  it("renderJson is a glue-free JSON.stringify of the assembled report", () => {
    const parsed = JSON.parse(renderJson(__er(balance, false, false), ctx, evidenceObligations));
    // Glue-free: the parsed JSON EQUALS the assembled model (no divergent hand-assembly).
    expect(parsed).toEqual(assembleRenderInput(__er(balance, false, false), ctx, evidenceObligations));
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
    const parsed = JSON.parse(renderJson(__er(balance), ctx));
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
    const parsed = JSON.parse(renderJson(__er(balance), ctx));
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
    const parsed = JSON.parse(renderJson(__er(real), ctx));
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
    const parsed = JSON.parse(renderJson(__er(balance), ctx));
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
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the static-guard counts are a FOLD OVER
  // THE LEDGER now (3F-2118, `staticObservationTally`), so the numbers derive from the balance, not
  // a hand-built census the assembler could disagree with. 2 running CI guards = 1 demanded
  // (lint:foo, posts to its `@lint` row) + 1 uncited (lint:bar, undemanded-running → the suspense
  // row) → the fold reads {runningGuardCount: 2, uncitedStaticGuardCount: 1}.
  const staticGuardsBalance: Ledger = reconcile(
    [{ scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:foo" }] }],
    [
      { qualityCheck: "lint", staticGuard: "lint:foo", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticGuard: "lint:bar", exists: true, enforcedOverRealSource: true },
    ]
  );

  it("carries NO standalone staticGuards (or guards) section — the census collapsed to summary counts", () => {
    const parsed = JSON.parse(renderJson(__er(staticGuardsBalance, false, true), ctx, undefined, undefined));
    // The member-list section (was `guards`, then `staticGuards`) is gone: the guard detail now
    // lives in the rows, symmetric with the runtime side — no double-report on the JSON surface.
    expect(parsed).not.toHaveProperty("staticGuards");
    expect(parsed).not.toHaveProperty("guards");
  });

  it("materialises the counts under summary.staticGuards ({ runningGuardCount, uncitedStaticGuardCount })", () => {
    const parsed = JSON.parse(renderJson(__er(staticGuardsBalance, false, true), ctx, undefined, undefined));
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
 * markdown's arithmetic so slice 2 can swap to reads with zero byte change: test-volume onScenario
 * is the on-a-scenario count (onPhantomScenario carried separately); the lint tally counts static
 * evidenceObligations balanced / total (markdown's countStaticEvidenceObligations). testVolume / staticGuards are
 * present only when the evidenceObservations / static guard sibling is threaded; the lint tally is always present.
 */
describe("[SCN-RMD-005] the summary materialises the three report totals", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the balance folds to the test-volume
  // totals, the lint tally, AND the static-guard totals (3F-2102 + 3F-2118: testVolume,
  // rawByRuntimeQualityCheck AND staticGuards are now Ledger folds, so a hand-built census that
  // disagrees with the balance is no longer constructible). It spans: 6 raw runtime observations =
  // 4 attributed-to-scenario + 1 phantom + 1 suspense (the 3-way test-volume identity is
  // non-trivial, onScenario excludes the phantom); 2 declared lint obligations, 1 satisfied
  // (lint:foo, running) + 1 watermelon (lint:bar, exists-but-unwired — the static-only lint tally
  // reads 1 of 2); and, on the CREDIT side, the static-guard fold — 2 running CI guards = 1
  // demanded (lint:foo, running) + 1 uncited (lint:baz, undemanded-running → the suspense row). The
  // demanded watermelon lint:bar does NOT run, so the running fold excludes it (matching the
  // retired census's running-only filter).
  const rmd005Scenarios: Scenario[] = [
    { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-RMD-002", evidenceObligations: [{ qualityCheck: "integration" }] },
    { scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:foo" }] },
    { scnId: "SCN-RMD-011", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:bar" }] },
  ];
  const rmd005Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-RMD-002", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "lint", staticGuard: "lint:foo", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "lint", staticGuard: "lint:bar", exists: true, enforcedOverRealSource: false },
    // The undemanded-running guard (no @lint declares it) — folds to the suspense row as the
    // 1 uncited static guard, the credit-side teeth of the static-guard fold.
    { qualityCheck: "lint", staticGuard: "lint:baz", exists: true, enforcedOverRealSource: true },
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

  it("materialises the static-guard totals", () => {
    const report = assembleRenderInput(__er(rmd005Balance, false, true), ctx, undefined, undefined);
    expect(report.summary.staticGuards).toEqual({
      runningGuardCount: 2,
      uncitedStaticGuardCount: 1,
    });
  });

  it("carries the 2-field census shape with demanded implicit (no ciGuards/demanded on the surface)", () => {
    const report = assembleRenderInput(__er(rmd005Balance, false, true), ctx, undefined, undefined);
    const sg = report.summary.staticGuards!;
    // demanded is IMPLICIT — running − uncited, never a surface field.
    expect(sg.runningGuardCount - sg.uncitedStaticGuardCount).toBe(1);
    expect(sg).not.toHaveProperty("ciGuards");
    expect(sg).not.toHaveProperty("demanded");
  });

  it("materialises the static-only lint tally (satisfied / total), ignoring runtime evidenceObligations", () => {
    const report = assembleRenderInput(__er(lintBalance), ctx);
    expect(report.summary.lint).toEqual({ satisfied: 1, total: 2 });
  });

  it("omits testVolume / staticGuards when their sibling read is not threaded, but always carries lint", () => {
    const report = assembleRenderInput(__er(balance), ctx);
    expect(report.summary).not.toHaveProperty("testVolume");
    expect(report.summary).not.toHaveProperty("staticGuards");
    // The lint tally is a pure balance derive — always present (this balance declares no static
    // evidenceObligations, so it reads 0 of 0).
    expect(report.summary.lint).toEqual({ satisfied: 0, total: 0 });
  });

  it("carries the three totals through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(__er(rmd005Balance, true, true), ctx));
    expect(parsed.summary.testVolume).toEqual({ totalEvidenceObservations: 6, onScenario: 4, onPhantomScenario: 1, onSuspenseScenario: 1 });
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

  it("omits metadata when no coded feature is declared (no map, or an empty map)", () => {
    // With no feature titles, the whole `metadata` object is omitted (present only
    // when the run declares ≥1 coded feature), and no top-level `featureNames` key appears.
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
    JSON.parse(JSON.stringify(assembleRenderInput(__er(reconcile(parseScenarios(feature), [])), ctx))) as {
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
 * Unit test for the TWO scenario-backing counts staying distinct (@SCN-LDG-008, ruling Q1).
 *
 * There are two different numbers for "credits backing a scenario", and a reader must not
 * read them as the same:
 *  - Test-volume `onScenario` (summary.testVolume.onScenario) = credits that CITE A DECLARED
 *    SCENARIO — this INCLUDES undemanded (a subset), keeping the 3-termed identity
 *    `total = onScenario + onPhantomScenario + onSuspenseScenario`.
 *  - The reconciliation MATCHED-attributed = credits matching a declared (scnId, quality-check)
 *    PAIR — this EXCLUDES undemanded. The retired census materialised it as `attributed[]`; it is
 *    now recovered from the Ledger (`testVolume.onScenario − byOutcome.undemanded`) and checkable
 *    against the demanded credits posted on the row.
 *
 * The load-bearing assertion: the two numbers DIFFER by exactly byOutcome.undemanded.
 */
describe("[SCN-LDG-008] the two scenario-backing counts stay distinct (ruling Q1)", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — a real balance carrying an undemanded
  // credit-side item ON a scenario's row: SCN-LDG-008 declares ONLY unit; a unit credit
  // reconciles satisfied (matched), an integration credit citing it is undemanded (a check it never
  // declared). Both credits POST to the row, so the Ledger fold (3F-2102) counts onScenario = 2.
  const undemandedBalance: Ledger = reconcile(
    [{ scnId: "SCN-LDG-008", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [
      { qualityCheck: "unit", scnId: "SCN-LDG-008", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-LDG-008", status: "passed", locator: "src/undemanded.test.ts" },
    ],
  );

  it("carries undemanded as its OWN entry in summary.byOutcome", () => {
    const report = assembleRenderInput(__er(undemandedBalance, true, false), ctx);
    expect(report.summary.evidenceObligations.byOutcome.undemanded).toBe(1);
  });

  it("keeps Test-volume onScenario INCLUDING undemanded (cites a scenario), so it EXCEEDS the matched-pair count by exactly byOutcome.undemanded", () => {
    const report = assembleRenderInput(__er(undemandedBalance, true, false), ctx);
    // Test-volume onScenario = credits citing a scenario = matched (1) + undemanded (1).
    expect(report.summary.testVolume!.onScenario).toBe(2);
    // The MATCHED-pair count is recovered from the Ledger, not a parallel `attributed[]` store:
    // testVolume.onScenario − byOutcome.undemanded.
    const undemanded = report.summary.evidenceObligations.byOutcome.undemanded;
    const matched = report.summary.testVolume!.onScenario - undemanded;
    expect(matched).toBe(1);
    // And that recovered count equals the credits posted at the DEMANDED (unit) pair on the row —
    // checkable straight off the ledger, where the retired census re-represented it.
    const row = undemandedBalance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-008")!;
    const demandedUnitCredits = row.evidenceObservations.filter((o) => o.qualityCheck === "unit").length;
    expect(demandedUnitCredits).toBe(matched);
    // The two numbers are NOT the same — they differ by exactly the undemanded count.
    expect(report.summary.testVolume!.onScenario - matched).toBe(undemanded);
  });

  it("keeps the Test-volume identity 3-termed (undemanded is a SUBSET of onScenario, not a 4th term)", () => {
    const report = assembleRenderInput(__er(undemandedBalance, true, false), ctx);
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

  it("counts Pending ITEMS, not scenarios carrying them (SCN-PDX-001 alone carries two)", () => {
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

  it("is always present — a pure balance derive reading 0 when no scenario declares a pending obligation", () => {
    const report = assembleRenderInput(__er(balance), ctx);
    // The `balance` fixture (top of file) declares no pending obligations, so the tally reads 0.
    expect(report.summary.pending).toBe(0);
  });

  it("carries the tally through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(__er(pendingBalance), ctx));
    expect(parsed.summary.pending).toBe(3);
  });
});
