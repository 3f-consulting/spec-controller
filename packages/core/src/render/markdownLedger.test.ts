/**
 * Unit tests for the markdown renderer — the ledger's evidence columns, the named-corpus census,
 * static checks and the obligation summary.
 *
 * SPLIT FROM `markdown.test.ts`, AND FOR A MECHANICAL REASON. That file measured 1341
 * code lines against the 400-line test ceiling then in force (since retired portfolio-wide; the
 * surviving thresholds live in `eslint.config.mjs`), and the complexity gate raises a touched file's standing findings to errors. No assertion
 * moved in the split. The file-local helpers below are copies of that file's own, which is this tree's
 * convention for test fixtures: a helper shared through a module under `src/` would ship in `dist`.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

/**
 * Test-local composition of the Evidence Reconciliation from a Ledger fixture.
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

const ctx: RunContext = {
  target: "an-adopters-repository",
  inputs: {
    features: "../an-adopters-repository/features",
    vitest: "../an-adopters-repository/vitest-report.json",
  },
  runStart: new Date("2026-06-27T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

/**
 * Unit test for the per-scenario evidence columns.
 *
 * Proves the ledger's corpus-driven evidence columns in isolation: when the evidenceObservations
 * aggregate is threaded, each scenario row gains columns (Fitness first, then the runtime
 * levels present in evidence obligation or evidenceObservations — e2e/performance only when present) with the
 * four-way evidence-obligation×evidenceObservations cell encoding (`N` backing present / `∅` missing /
 * `(N)` observations at a quality-check never named / `—` neither). The cell counts BACKING, not
 * quality. Without the aggregate the original three-column ledger is preserved.
 *
 * RECONCILER-TRUE FIXTURE (evidence-manifesto §11A). The balance and the census are
 * PRODUCED by `reconcile()` + `countRuntimeEvidenceObservationKinds()` over a scenario +
 * observation corpus — never hand-written. The previous hand-built fixture pinned the `(N)` branch
 * with an `attributed` entry at a pair NO scenario names — a shape the census CANNOT emit (it
 * defines `attributed` as credits matching a NAMED pair; a credit at an unnamed pair is no-evidence-obligation).
 * The branch was pinned by impossible data, which is exactly why the no-evidence-obligation bug survived a
 * green suite. Building the fixture through the reconciler makes that shape UNCONSTRUCTIBLE, and
 * forces the two REAL `(N)` shapes into the corpus:
 *   - NO-EVIDENCE-OBLIGATION (SCN-C): a credit citing a real scenario at a quality-check it never
 *     named. The reconciler posts a credit-side `no-evidence-obligation` row ON the scenario; the census
 *     keeps the credit OUT of `attributed` (into noEvidenceObligationCount). The cell must NOT read that row
 *     as an evidence obligation (it rendered ∅ — "missing" — pre-fix) and must count the (N) off the rows.
 *   - PENDING (SCN-F): a `<qc>pending` obligation partitions to a one-sided Pending Item and posts
 *     no RECONCILED row. This bullet used to read "PENDING + ATTRIBUTED … the pending pair STAYS
 *     in evidenceObligationPairs — so the credit citing it IS attributed"; that was the divergence
 *     canon contradicts, and it is closed. A pending obligation names NOTHING, so the
 *     credit citing it is NO-EVIDENCE-OBLIGATION — exactly as when nothing was raised at all — and the
 *     reconciler now posts it as a `no-evidence-obligation` credit on SCN-F's own row.
 *     SCN-F therefore contributes to `noEvidenceObligationCount`, not to `attributed`.
 */
describe("[SCN-RPT-011] the markdown ledger renders per-scenario evidence columns", () => {
  // The CORPUS — scenarios + observed evidence, spanning every cell case across
  // Fitness / Unit / Integration. The balance below is RECONCILED from it, so every row is a shape
  // the pipeline actually emits:
  //   SCN-A: @unit (2 observations) + one fitness check, wired (satisfied) → Fitness F/1, Unit 2
  //   SCN-B: @unit, no observation → Unit ∅
  //   SCN-C: @unit (1 observation) + an integration observation it NEVER named → Unit 1,
  //          Integration (1) — the NO-EVIDENCE-OBLIGATION shape
  //   SCN-D: @integration (1 observation), no @unit → Unit —, Integration 1
  //   SCN-E: one fitness check, absent → Fitness ∅
  //   SCN-F: @unitpending with a unit observation citing the pending pair → NO-EVIDENCE-OBLIGATION
  //   SCN-G: TWO runtime tiers (@unit + @integration), one credit at each → Unit 1, Integration 1
  //          — the MULTI-TIER shape: both cells must render their own count
  //   SCN-H: one fitness check that exists but is not wired — the watermelon → Fitness F/1 (PRESENT)
  // ONE STATIC CHECK PER ROW: one scenario is one fitness check, so no row names two.
  const scenarios: Scenario[] = [
    {
      scnId: "SCN-A",
      evidenceObligations: [
        { qualityCheck: "unit" },
        { qualityCheck: "fitness" },
      ],
    },
    { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "integration" }] },
    { scnId: "SCN-E", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-F", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
    { scnId: "SCN-G", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
    { scnId: "SCN-H", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    // SCN-C's integration credit cites a quality-check SCN-C never named → NO-EVIDENCE-OBLIGATION.
    { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-C", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-D", status: "passed" },
    // SCN-F's unit obligation is PENDING, so it names NOTHING: this credit is NO-EVIDENCE-OBLIGATION, and
    // the reconciler posts it as a no-evidence-obligation credit on SCN-F's row. It used to count
    // ATTRIBUTED here while the reconciler posted no row at all — two classifiers disagreeing.
    { qualityCheck: "unit", scnId: "SCN-F", status: "passed" },
    // The guards: guard-x wired into CI over real source → satisfied (SCN-A); guard-y exists but is
    // not wired → the watermelon (SCN-H; PRESENT, so it counts into the Fitness cell); guard-z has no
    // observation at all → missing (∅, SCN-E). Each cites the one scenario that names it.
    { qualityCheck: "fitness", staticCheck: "guard-x", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "fitness", staticCheck: "guard-y", scnId: "SCN-H", exists: true, enforcedOverRealSource: false },
    // SCN-G's two credits — one at each tier it names. The reconciler posts each
    // as its own credit on SCN-G's row, which is what the two cells read.
    { qualityCheck: "unit", scnId: "SCN-G", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-G", status: "passed" },
  ];
  const balance: Ledger = reconcile(scenarios, observations);

  it("builds the fixture through the reconciler — the no-evidence-obligation credit is OUT of an evidence obligation", () => {
    // The fixture's own guard, read off the LEDGER (the census is retired): it can only
    // pin shapes the pipeline emits. The SCN-C integration credit is NO-EVIDENCE-OBLIGATION — it posts an
    // `no-evidence-obligation` reconciling item on SCN-C's own row, NOT a matched evidence obligation.
    //
    // TWO no-evidence-obligation credits: SCN-C's integration credit (a real scenario at a check it
    // never named) AND SCN-F's unit credit (a real scenario at a check tagged PENDING — which
    // names nothing). Counted off the rows' `no-evidence-obligation` reconciling items.
    const noEvidenceObligation = balance.scenarioReconciliations.flatMap((s) =>
      s.qualityCheckReconciliations.filter((o) => o.outcome === "no-evidence-obligation")
    );
    expect(noEvidenceObligation).toHaveLength(2);
    // SCN-C's integration credit is no-evidence-obligation (never an evidence obligation), and it posted to SCN-C's row.
    const scnC = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-C")!;
    expect(scnC.qualityCheckReconciliations.some((o) => o.qualityCheck === "integration" && o.outcome === "no-evidence-obligation")).toBe(true);
    expect(scnC.qualityCheckReconciliations.some((o) => o.qualityCheck === "integration" && o.outcome === "satisfied")).toBe(false);
  });

  it("renders corpus-driven columns — Fitness first, then the runtime levels present (e2e/performance absent)", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("| Scenario | Fitness | Unit | Integration | Verdict | Reconciling items |");
    // e2e / performance are absent from this corpus, so they get no column.
    expect(md).not.toContain("| Performance |");
    expect(md).not.toContain(" E2e ");
  });

  it("encodes the four cell cases two-sided — named+met, named+missing, no-evidence-obligation, and absent", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    // named & met → letter/count; SCN-A: Fitness F/1 (its one named guard, present), Unit U/2.
    expect(md).toContain("| SCN-A | F/1 | U/2 |  |");
    // named & missing → letter/- (no observation).
    expect(md).toContain("| SCN-B |  | U/- |  |");
    // not named but present → -/N: SCN-C's integration credit is NO-EVIDENCE-OBLIGATION — the reconciler
    // posts a credit-side row on SCN-C, which is NOT an evidence obligation, so the left is `-` and the right is
    // the observation count. The named Unit credit reads U/1 on the same row.
    expect(md).toContain("| SCN-C |  | U/1 | -/1 |");
    // named elsewhere, absent here → blank left/right, and the named Integration reads I/1.
    expect(md).toContain("| SCN-D |  |  | I/1 |");
    // fitness named but its static check missing → F/- (named, no guard present).
    expect(md).toContain("| SCN-E | F/- |  |  |");
  });

  // The MULTI-TIER view mirror. The view-side half of the reconciler's per-tier emission: a
  // scenario NAMING TWO runtime tiers, each carrying one posted credit, renders BOTH cells with
  // their attributed count — the second tier is not lost to the first, and neither cell collapses
  // to ∅. Cited on the `it` (most-specific-citation-wins), so this is a NEW leaf: the enclosing
  // describe's scenario keeps every credit it already held.
  it("[SCN-RPT-018] renders both cells for a scenario naming two runtime tiers — neither collapses to ∅", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    // SCN-G names @unit AND @integration and has one credit at each. Both cells must read
    // their own count: U/1 on the left tier, I/1 on the right. A renderer that levelled the row
    // by a single quality-check would blank one of them.
    expect(md).toContain("| SCN-G |  | U/1 | I/1 |");
  });

  it("renders -/N for a credit at a PENDING pair — no-evidence-obligation (3F-1858), no evidence-obligation letter", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    // SCN-F's unit obligation is @unitpending, so it names NOTHING: the credit citing it reconciles
    // NO-EVIDENCE-OBLIGATION and posts a no-evidence-obligation row on SCN-F → no evidence obligation (left `-`), one observed
    // credit (right 1) → -/1. Read straight off `evidenceObservations` (the multiplicity-correct
    // source), the two-sided cell shows the credit with no evidence-obligation letter beside it.
    expect(md).toContain("| SCN-F |  | -/1 |  |");
  });

  it("counts a watermelon guard as PRESENT on the fitness cell's right side, like a satisfied one", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    // SCN-A's guard is satisfied and SCN-H's is the watermelon: the script exists, so both are
    // present (its inadequacy is the 🍉 in Reconciling items) → F/1 on each, never F/-.
    expect(md).toContain("| SCN-A | F/1 |");
    expect(md).toContain("| SCN-H | F/1 |");
  });

  it("renders the grid with no Cell/Meaning legend — the grid speaks for itself", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    // The legend's own table header, which no legend renders without. Three negatives quoting
    // its ROW WORDING went: subsumed by this one, blind to a legend returning in
    // canon words, and the last retired spelling here — now forbidden tree-wide. Grid stays.
    expect(md).not.toContain("| Cell | Meaning |");
    expect(md).toContain("| Scenario | Fitness |");
  });

  it("preserves the original three-column ledger when no evidenceObservations is threaded (back-compat)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md).toContain("| Scenario | Verdict | Reconciling items |");
    expect(md).not.toContain("| Scenario | Fitness |");
    expect(md).not.toContain("| Cell | Meaning |");
  });
});

/*
 * [SCN-RPT-013] — the phantom-id Warnings sub-part — RETIRED.
 * A credit citing an UNKNOWN @SCN no longer renders as a Warnings sub-part; it now
 * surfaces as a PHANTOM-scenario reconciliation row in the Ledger (with its id + locator),
 * so its detail lives in exactly one place (no double-report). The phantom render is
 * proven by [SCN-LDG-006] (reconcile.test.ts + ledger.steps.ts); the section-dissolve by
 * report.test.ts [SCN-RMD-003] / json.test.ts [SCN-RPT-010].
 */

/**
 * Unit test for the untagged-scenarios census.
 *
 * The `## Warnings` section dissolved entirely — untagged scenarios are an
 * obligation-side CENSUS fact (on report.evidenceObligations), NOT a warning and NOT a
 * reconciling item, so they re-home into the ledger-summary scenario-corpus census
 * (co-located with the excluded-occurrence bullet), listing the count + `feature :
 * scenario` locators (sorted). They render when a corpus is threaded; there is NO
 * `## Warnings` heading anywhere.
 */
describe("[SCN-RPT-014] the markdown report renders untagged scenarios in the named-corpus census", () => {
  // The smallest honest balanced run: a scenario that declares nothing reconciles `both-missing`.
  const balanced: Ledger = reconcile(
    [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }],
  );
  const evidenceObligations = {
    rawScnOccurrences: 0,
    scenarioCount: 0,
    excludedOccurrences: 0,
    untaggedScenarios: [
      { feature: "alpha.feature", scenario: "a scenario with no anchor" },
      { feature: "beta.feature", scenario: "another untagged scenario" },
    ],
    proseOnlyCodes: [],
  };

  it("lists the untagged-scenario count + feature : scenario locators, with NO warnings section", () => {
    const md = renderMarkdown(__er(balanced, false, false), ctx, evidenceObligations);
    expect(md).not.toContain("## Warnings");
    expect(md).toContain("2 scenario(s) carry no @SCN tag:");
    expect(md).toContain("- alpha.feature : a scenario with no anchor");
    expect(md).toContain("- beta.feature : another untagged scenario");
  });

  it("renders the census inside the ledger summary (co-located with the named corpus), not a warnings surface", () => {
    const md = renderMarkdown(__er(balanced, false, false), ctx, evidenceObligations);
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iUntagged = md.indexOf("2 scenario(s) carry no @SCN tag:");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    // The census rides in the ledger summary — after the "## Scenario Reconciliations" heading, above the table.
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeLessThan(iUntagged);
    expect(iUntagged).toBeLessThan(iTable);
  });

  it("sorts the locators by (feature, scenario)", () => {
    const md = renderMarkdown(__er(balanced, false, false), ctx, evidenceObligations);
    expect(md.indexOf("alpha.feature")).toBeLessThan(md.indexOf("beta.feature"));
  });

  it("omits the untagged census when no corpus is threaded (back-compat)", () => {
    const md = renderMarkdown(__er(balanced), ctx);
    expect(md).not.toContain("carry no @SCN tag");
    expect(md).not.toContain("## Warnings"); // the warnings axis is gone entirely
  });
});

/**
 * Unit test for the prose-only-codes census.
 *
 * The `## Warnings` section dissolved entirely — prose-only codes (@SCN ids
 * mentioned in prose but never tagged anywhere) are an obligation-side CENSUS fact (on
 * report.evidenceObligations), NOT a warning, so they re-home into the ledger-summary
 * scenario-corpus census, listing the count + the bare codes (sorted), AFTER the untagged
 * sub-part. There is NO `## Warnings` heading anywhere.
 */
describe("[SCN-RPT-015] the markdown report renders prose-only @SCN codes in the named-corpus census", () => {
  // The smallest honest balanced run: a scenario that declares nothing reconciles `both-missing`.
  const balanced: Ledger = reconcile(
    [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }],
  );
  const evidenceObligations = {
    rawScnOccurrences: 0,
    scenarioCount: 0,
    excludedOccurrences: 0,
    untaggedScenarios: [],
    proseOnlyCodes: ["SCN-FOO-001", "SCN-BAR-013"],
  };

  it("lists the prose-only-code count + the bare codes, with NO warnings section", () => {
    const md = renderMarkdown(__er(balanced, false, false), ctx, evidenceObligations);
    expect(md).not.toContain("## Warnings");
    expect(md).toContain("2 @SCN code(s) appear only in prose, never as a tag:");
    expect(md).toContain("- SCN-FOO-001");
    expect(md).toContain("- SCN-BAR-013");
  });

  it("sorts the codes", () => {
    const md = renderMarkdown(__er(balanced, false, false), ctx, evidenceObligations);
    expect(md.indexOf("SCN-BAR-013")).toBeLessThan(md.indexOf("SCN-FOO-001"));
  });

  it("renders the prose-only census after the untagged census within the ledger summary", () => {
    const evidenceObligationsAll = {
      ...evidenceObligations,
      untaggedScenarios: [{ feature: "x.feature", scenario: "an untagged one" }],
    };
    const md = renderMarkdown(__er(balanced, false, false), ctx, evidenceObligationsAll);
    expect(md).not.toContain("## Warnings");
    const iUntagged = md.indexOf("carry no @SCN tag");
    const iProse = md.indexOf("appear only in prose, never as a tag");
    expect(iUntagged).toBeGreaterThanOrEqual(0);
    expect(iProse).toBeGreaterThanOrEqual(0);
    expect(iUntagged).toBeLessThan(iProse);
  });

  it("omits the prose-only census when no corpus is threaded (back-compat)", () => {
    const md = renderMarkdown(__er(balanced), ctx);
    expect(md).not.toContain("appear only in prose");
    expect(md).not.toContain("## Warnings");
  });
});

/**
 * Unit test for the markdown Static checks section — the
 * static-axis mirror of ### Test volume. Proves renderMarkdown surfaces the guard
 * reconciliation: the identity line always, the suspenseEvidenceObservation list only when non-empty,
 * and the whole section omitted on the back-compat (no-guards) call. Markdown-only.
 */
describe("[SCN-USG-001] the markdown report renders the Static checks section", () => {
  const emptyBalance: Ledger = reconcile([], []);

  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the Static checks counts are a FOLD OVER
  // THE LEDGER now (`staticObservationTally`), so the numbers derive from `balance`, not a
  // hand-built census the renderer could disagree with. Two running CI guards = 1 named
  // (lint:foo, posts to its scenario's `@lint` row) + 1 uncited (lint:bar, no-evidence-obligation, running,
  // folds to the suspense row) → the fold reads {runningStaticCheckCount: 2, uncitedStaticCheckCount: 1}.
  const twoRunningOneUncited: Ledger = reconcile(
    [{ scnId: "SCN-USG-001", evidenceObligations: [{ qualityCheck: "fitness" }] }],
    [
      { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-USG-001", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
    ]
  );
  // One running CI guard, all named → the fold reads {runningStaticCheckCount: 1, uncitedStaticCheckCount: 0}.
  const oneRunningNoneUncited: Ledger = reconcile(
    [{ scnId: "SCN-USG-001", evidenceObligations: [{ qualityCheck: "fitness" }] }],
    [{ qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-USG-001", exists: true, enforcedOverRealSource: true }]
  );

  it("renders '### Static checks' with the counts line ONLY — the per-guard detail dissolved to the suspense row", () => {
    const md = renderMarkdown(__er(twoRunningOneUncited, false, true), ctx);
    expect(md).toContain("### Static checks");
    expect(md).toContain("2 static check(s) run, 1 uncited static check(s).");
    // The per-guard DETAIL list dissolved into the suspense-scenario row (
    // ruling Q4) — the section carries only the summary-level counts now, no bullets. Pinned
    // on the ITEM this fixture would list, not the list's old header prose: the item is what a
    // returning list emits whatever it calls itself (that header pin went).
    expect(md).not.toContain("- lint:bar");
  });

  it("shows the counts line but omits the list when every running guard is named", () => {
    const md = renderMarkdown(__er(oneRunningNoneUncited, false, true), ctx);
    expect(md).toContain("1 static check(s) run, 0 uncited static check(s).");
    // The list (shown only when > 0) is omitted; pinned on the item, per the note above.
    expect(md).not.toContain("- lint:foo");
  });

  it("omits the Static checks section when the static-check axis is not in play (back-compat)", () => {
    const md = renderMarkdown(__er(emptyBalance), ctx);
    expect(md).not.toContain("### Static checks");
  });
});

/**
 * Unit test for the flat obligation-summary decomposition.
 *
 * Proves the evidenceReconciliationSection decomposes the evidence-obligation
 * out-of-balance into a FLAT list of the nine leaf outcomes — with NO
 * debit/credit/neither group-side subtotal rows. The former grouping emitted both a
 * "↳ <group>-side" subtotal row AND each leaf row at the same "↳" indent, so a naive
 * column-sum double-counted (the live 170 vs 85). Removing the grouping leaves exactly
 * ten counted "↳ <outcome>" rows reconciling to the out-of-balance total once.
 *
 * EXHAUSTIVENESS (since superseded as the primary mechanism):
 * OUT_OF_BALANCE_OUTCOMES USED TO BE a hand-maintained readonly Outcome[] in the renderer, so
 * it could fall behind the union silently — as it did when `broken` joined:
 * tallied in byOutcome, compiling clean, and omitted from this table. It is now DERIVED in
 * model.ts from the type-forced OUTCOME_DESCRIPTION, so omission is IMPOSSIBLE, not merely
 * caught. This guard is retained as the END-TO-END backstop: it proves the derivation is
 * actually WIRED INTO the rendered table, and it derives its expectation from its OWN
 * Record<Outcome, true> (type-forced — a new union member fails to compile until it is listed),
 * never a re-read of the renderer's source, or the guard would inherit the weakness it guards
 * against. It proves MEMBERSHIP, not ORDER: row order now lives in OUTCOME_DESCRIPTION's key
 * order (a reorder there is a report change), and pinning it is a separate scenario.
 *
 * Teeth: against the pre-fix renderer the three group-side subtotal rows still render,
 * so the "exactly nine ↳ rows" and "no group row" assertions red (the genuine
 * red→green). Markdown-only — the derived view is NOT duplicated into JSON.
 */
describe("[SCN-RPT-019] the markdown obligation summary lists the ten leaf outcomes with no group rows", () => {
  // A balance whose out-of-balance obligations span all three FORMER groups:
  //   DEBIT   — SCN-A carries a missing obligation.
  //   CREDIT  — the suspense row carries a cites-no-scenario credit.
  //   NEITHER — SCN-C reconciles to zero on both sides (a both-missing row).
  // byOutcome (derived from every row's qualityCheckReconciliations[], the field renamed from
  // `evidenceObligations`): missing 1,
  // cites-no-scenario 1, both-missing 1, everything else 0 — out-of-balance = 3.
  // Reconciler-built (§11A): the out-of-balance obligations span all three FORMER groups — DEBIT
  // (SCN-A carries a missing unit obligation), CREDIT (an uncited unit credit → the suspense row's
  // cites-no-scenario), NEITHER (SCN-C, a zero-obligation scenario cited by nothing → both-missing).
  // byOutcome: missing 1, cites-no-scenario 1, both-missing 1, everything else 0 — out-of-balance 3.
  const spanning: Ledger = reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-C", evidenceObligations: [] },
    ],
    [{ qualityCheck: "unit", scnId: null, status: "passed", locator: "tests/stray.test.ts:1" }]
  );

  // The ten out-of-balance leaf outcomes in canonical (model.ts reading) order —
  // satisfied excluded (it is the balanced outcome, not in the out-of-balance decomposition).
  // Canon groups by reconciling-item shape: a DEBIT block (missing, failing, watermelon,
  // no-scn-code), a CREDIT block (cites-unknown-scenario, cites-no-scenario, no-evidence-obligation), then
  // NEITHER (broken, both-missing). Used below for membership/sum (order-agnostic); the ORDER
  // itself is pinned by its own test against an independent canon literal.
  const LEAVES = [
    "missing",
    "failing",
    "watermelon",
    // The DEBIT twin of cites-no-scenario — a real, ordinary scenario
    // carrying no @SCN, whose obligation has no code for an observation to link to.
    "no-scn-code",
    // The debit-side account whose @SCN code another scenario also carries.
    "duplicate-scn-code",
    "cites-unknown-scenario",
    "cites-no-scenario",
    "no-evidence-obligation",
    "broken",
    "both-missing",
  ] as const;

  // The EXHAUSTIVENESS source of truth: a type-forced Record over the whole
  // Outcome union. A new union member cannot be added without a line here — TypeScript
  // refuses to compile the Record until it is — so the expected leaf set below is DERIVED
  // from the union itself, never hand-transcribed. `satisfied` is the one member excluded
  // from the decomposition (it is the BALANCED outcome).
  const ALL_OUTCOMES: Record<Outcome, true> = {
    satisfied: true,
    failing: true,
    watermelon: true,
    missing: true,
    "cites-unknown-scenario": true,
    "cites-no-scenario": true,
    "no-scn-code": true,
    "duplicate-scn-code": true,
    broken: true,
    "no-evidence-obligation": true,
    "both-missing": true,
  };
  const EXPECTED_LEAVES = (Object.keys(ALL_OUTCOMES) as Outcome[]).filter(
    (outcome) => outcome !== "satisfied"
  );

  it("decomposes the evidence-obligation out-of-balance into exactly the ten leaf outcome rows", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // Every leaf outcome renders as a counted "↳ <description>" row — the canon
    // description, not the bare handle, located via the single-sourced map.
    for (const leaf of LEAVES) {
      expect(md).toContain(`| ↳ ${OUTCOME_DESCRIPTION[leaf]} |`);
    }
    // And there are EXACTLY ten "↳" rows in the decomposition — no more (the group-side
    // subtotal rows are gone). Count every "↳ " marker across the rendered document; the
    // only "↳" rows are the ten leaf decomposition rows.
    const arrowRows = md.split("\n").filter((line) => line.includes("↳"));
    expect(arrowRows.length).toBe(10);
  });

  it("renders a leaf row for EVERY Outcome member except satisfied (the exhaustiveness guard)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // The rendered leaf set, read back off the markdown, mapped from canon description to
    // handle — the observable form of OUT_OF_BALANCE_OUTCOMES.
    const rendered = new Set(
      md
        .split("\n")
        .filter((line) => line.includes("↳"))
        .map((line) => line.split("|")[1]?.trim().replace("↳ ", ""))
    );
    // Every member of the union except satisfied MUST be there: the derived
    // OUT_OF_BALANCE_OUTCOMES can never fall behind the Outcome union.
    for (const outcome of EXPECTED_LEAVES) {
      expect(rendered).toContain(OUTCOME_DESCRIPTION[outcome]);
    }
    // And nothing else is: satisfied never renders a leaf row, and no group-side row does.
    expect(rendered.size).toBe(EXPECTED_LEAVES.length);
    expect(rendered).not.toContain(OUTCOME_DESCRIPTION.satisfied);
  });

  it("sums the leaf counts to the evidence-obligation out-of-balance total", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // The Evidence-obligation subject row's out-of-balance count.
    const oblOutOfBalance = Number(
      /\| Evidence obligation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]
    );
    expect(oblOutOfBalance).toBe(3);
    // Each leaf row's own out-of-balance count, summed. The gloss is REGEX-ESCAPED before
    // interpolation — a canon description may carry regex metacharacters (the `broken` gloss
    // names its producer in parentheses, "(the proving suite failed to collect; …)"), which
    // unescaped would open a capture group and shift the count group.
    let leafSum = 0;
    for (const leaf of LEAVES) {
      const gloss = OUTCOME_DESCRIPTION[leaf].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const n = Number(new RegExp(`↳ ${gloss} \\|[^\\d]*(\\d+) \\|`).exec(md)?.[1]);
      expect(Number.isNaN(n)).toBe(false);
      leafSum += n;
    }
    expect(leafSum).toBe(oblOutOfBalance);
  });

  it("renders NO debit-side / credit-side / neither-side group subtotal row", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).not.toContain("↳ debit-side");
    expect(md).not.toContain("↳ credit-side");
    expect(md).not.toContain("↳ neither-side");
  });

  it("renders the leaf rows in the canon order — debit block, credit block, neither", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // Canon reading order, hardcoded here as the INDEPENDENT source of truth for sequence:
    // a DEBIT block (missing, failing, watermelon, no-scn-code), a CREDIT block
    // (cites-unknown-scenario, cites-no-scenario, no-evidence-obligation), then NEITHER (broken, both-missing).
    // §11A: the expectation is this literal, asserted against the RENDERED ↳ sequence — NOT a
    // re-read of OUTCOME_DESCRIPTION's key order (which would compare the source to itself and
    // prove nothing; that circularity is exactly why the order drifted and a later change could reorder
    // the map safely under a Set-only membership guard). This is the pin that closes it.
    const CANON_LEAF_ORDER: Outcome[] = [
      "missing",
      "failing",
      "watermelon",
      "no-scn-code",
      "duplicate-scn-code",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "no-evidence-obligation",
      "broken",
      "both-missing",
    ];
    // Decode the rendered Subject-cell gloss back to its handle (reverse of the single-sourced
    // map). This uses OUTCOME_DESCRIPTION's TEXT association only — never its key order — so the
    // ORDER under test comes entirely from the rendered document.
    const glossToHandle = new Map(
      (Object.keys(OUTCOME_DESCRIPTION) as Outcome[]).map((handle) => [
        OUTCOME_DESCRIPTION[handle],
        handle,
      ])
    );
    const renderedOrder = md
      .split("\n")
      .filter((line) => line.includes("↳"))
      .map((line) => glossToHandle.get(line.split("|")[1]?.trim().replace("↳ ", "") ?? ""));
    expect(renderedOrder).toEqual(CANON_LEAF_ORDER);
  });
});
