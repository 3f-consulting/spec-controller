/**
 * Unit tests for the markdown renderer — the outcome glosses and Pending Items (@SCN-RPT-020,
 * @SCN-RPT-025, @SCN-PND-010, @SCN-PND-011, @SCN-PND-012). Each describe carries its own @SCN id
 * and its own bidirectional-evidence note.
 *
 * SPLIT FROM `markdown.test.ts` AT 3F-3541, AND FOR A MECHANICAL REASON. That file measured 1341
 * code lines against the 400-line test ceiling then in force (retired portfolio-wide on
 * 2026-09-18, 3F-2320; the surviving thresholds moved into `eslint.config.mjs` at 3F-3607),
 * and the complexity gate raises a touched file's standing findings to errors. No assertion
 * moved in the split. The file-local helpers below are copies of that file's own, which is this tree's
 * convention for test fixtures: a helper shared through a module under `src/` would ship in `dist`.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";
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
 * Unit test for the outcome-description gloss (@SCN-RPT-020, 3F-1626).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-020 id
 * matching features/report.feature, so a grep of the id returns both halves of the pair.
 *
 * The reconciling-item outcome is meaningless to a human as a bare handle in a CI log. This
 * pins that the markdown renders each outcome's CANON DESCRIPTION in place of the handle,
 * EVERYWHERE an outcome surfaces to a reader — the summary `↳` decomposition rows, the
 * per-scenario reconciling-items list, and the fitness-obligation table's Outcome column — and
 * that the handle is GONE. Single-source: the descriptions come from `OUTCOME_DESCRIPTION`
 * (model.ts), so the render cannot drift from the map (the drift class the census / views were
 * burned by). The JSON keeps the bare handle (proven separately in json.test.ts); this is the
 * markdown-only human axis. The glyph is retained; only the word changes.
 *
 * Teeth: while the renderer emits the bare handle (`↳ missing`, `unit ∅ missing`,
 * `🍉 watermelon`) every description assertion reds and every `not`-handle assertion reds — the
 * genuine red→green.
 *
 * Parent: (@SCN-RPT-020).
 */
describe("[SCN-RPT-020] the markdown renders each outcome's canon description, not the bare handle", () => {
  // A balance rich enough to exercise all three render sites: SCN-A carries a runtime debit
  // (unit missing) and a fitness watermelon (→ the fitness table AND a per-scenario fitness item);
  // SCN-B is the degenerate both-missing (neither-side) item; the suspense row carries a
  // credit-side cites-no-scenario item with a locator. The summary `↳` decomposition always
  // renders all nine leaves (zero counts shown), so every outcome's description is on the page.
  // Reconciler-built (§11A): rich enough to exercise all three render sites — SCN-A carries a
  // runtime debit (unit missing) and a fitness watermelon (→ the fitness table AND a per-scenario fitness
  // item); SCN-B is the degenerate both-missing (neither-side); an uncited integration credit posts
  // the suspense row's credit-side cites-no-scenario item with a locator.
  const rich: Ledger = reconcile(
    [
      {
        scnId: "SCN-A",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }],
      },
      { scnId: "SCN-B", evidenceObligations: [] },
    ],
    [
      // CITES SCN-A (3F-2625) — it answered that obligation by handle until the by-handle arm was
      // deleted, which `typecheck` was uniquely able to do: it is the one check whose runnable
      // handle and bare check tag are the same word.
      { qualityCheck: "fitness", staticCheck: "typecheck", scnId: "SCN-A", exists: true, enforcedOverRealSource: false },
      { qualityCheck: "integration", scnId: null, status: "passed", locator: "tests/stray.test.ts:1" },
    ]
  );

  it("renders every summary ↳ decomposition row with the canon description, and no bare handle", () => {
    const md = renderMarkdown(__er(rich), ctx);
    // Each out-of-balance leaf carries its canon description in the Subject cell.
    // (`broken` — @SCN-LDG-017 — and `no-scn-code` — @SCN-LDG-021 — are asserted by
    // @SCN-RPT-019's exhaustiveness guard.)
    expect(md).toContain("| ↳ Evidence Observation is missing |");
    expect(md).toContain("| ↳ Evidence Observation is failing |");
    expect(md).toContain("| ↳ Evidence Observation is passing but fabricated |");
    expect(md).toContain("| ↳ Evidence Observation cites an unknown Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites no Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites a Scenario with no matching Evidence Obligation |");
    expect(md).toContain(
      "| ↳ Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited |"
    );
    // The bare handle is GONE from the summary Subject cells.
    for (const handle of [
      "missing",
      "failing",
      "watermelon",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "no-evidence-obligation",
      "both-missing",
    ]) {
      expect(md).not.toContain(`| ↳ ${handle} |`);
    }
  });

  it("renders each per-scenario reconciling item with the canon description, glyph retained", () => {
    const md = renderMarkdown(__er(rich), ctx);
    // Debit runtime item, fitness watermelon item, neither-side both-missing item, credit item.
    expect(md).toContain("unit ∅ Evidence Observation is missing");
    expect(md).toContain("fitness 🍉 Evidence Observation is passing but fabricated");
    expect(md).toContain(
      "⊘ Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"
    );
    expect(md).toContain(
      "integration ❓ Evidence Observation cites no Scenario (tests/stray.test.ts:1)"
    );
    // The bare handles are gone from the reconciling-items cells (the glyph stays).
    expect(md).not.toContain("∅ missing");
    expect(md).not.toContain("🍉 watermelon");
    expect(md).not.toContain("❓ cites-no-scenario");
  });

  it("renders the fitness table's Outcome column with the canon description", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain("| SCN-A | 🍉 Evidence Observation is passing but fabricated |");
  });

  it("single-sources the gloss from OUTCOME_DESCRIPTION — the render cannot drift from the map", () => {
    const md = renderMarkdown(__er(rich), ctx);
    // The rendered gloss is exactly the map's value at each site — so editing the map is the
    // only way to change the render, and a description can never diverge from the outcome it names.
    expect(md).toContain(`↳ ${OUTCOME_DESCRIPTION.missing}`);
    expect(md).toContain(`unit ∅ ${OUTCOME_DESCRIPTION.missing}`);
    expect(md).toContain(`🍉 ${OUTCOME_DESCRIPTION.watermelon}`);
    expect(md).toContain(`⊘ ${OUTCOME_DESCRIPTION["both-missing"]}`);
  });
});

/**
 * Unit test for the outcome-gloss canon pin (@SCN-RPT-025, 3F-1832).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-025 id
 * matching features/report.feature, so a grep of the id returns both halves of the pair.
 *
 * The SINGLE OWNER of the outcome gloss TEXT: OUTCOME_DESCRIPTION[handle] === the manifesto's
 * Outcome column, for every handle. Orthogonal to @SCN-RPT-020 (which owns render-single-sourcing
 * — the renderer shows the map's value and the bare handle appears nowhere); THIS owns
 * value-equals-canon, the different subject that let three glosses (`satisfied`, `both-missing`,
 * `broken`) drift from canon while RPT-020 stayed green.
 *
 * CANON is an INDEPENDENT literal here (never a re-read of OUTCOME_DESCRIPTION), so the assertion
 * pins the value against the manifesto, not the source against itself (double-entry). Keyed by the
 * type-forced `Outcome` union (a `Record<Outcome, string>`): a new union member cannot compile
 * without a canon row here, so a new outcome can never ship without its manifesto gloss.
 *
 * Teeth: while `satisfied` reads "…is present and passing", `both-missing` "…are both missing for
 * the Scenario", and `broken` "The proof never ran — the behaviour was never exercised", each of
 * those three rows reds — the genuine red→green; correcting the three values in model.ts verbatim
 * to the manifesto Outcome column greens it.
 *
 * Parent: (@SCN-RPT-025).
 */
describe("[SCN-RPT-025] every outcome glosses as the manifesto's canon Outcome text", () => {
  // The manifesto Outcome column, verbatim — the INDEPENDENT source of truth (not a re-read of
  // OUTCOME_DESCRIPTION). Type-forced over the whole Outcome union: a new member cannot join the
  // union without a canon gloss here, so the pin can never fall behind the outcomes it governs.
  const CANON_OUTCOME_TEXT: Record<Outcome, string> = {
    satisfied: "Evidence Observation satisfies its Evidence Obligation",
    missing: "Evidence Observation is missing",
    failing: "Evidence Observation is failing",
    watermelon: "Evidence Observation is passing but fabricated",
    "no-scn-code": "Evidence Obligation has no @SCN code for an Evidence Observation to link to",
    "duplicate-scn-code": "Evidence Obligation's @SCN code is carried by another Scenario",
    "cites-unknown-scenario": "Evidence Observation cites an unknown Scenario",
    "cites-no-scenario": "Evidence Observation cites no Scenario",
    "no-evidence-obligation": "Evidence Observation cites a Scenario with no matching Evidence Obligation",
    broken:
      "Evidence Observation ATTEMPT errored before it could cite a Scenario (the proving suite failed to collect; behaviour never exercised)",
    "both-missing":
      "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited",
  };

  it.each(Object.entries(CANON_OUTCOME_TEXT) as [Outcome, string][])(
    'the "%s" outcome glosses as the manifesto canon text',
    (handle, canon) => {
      expect(OUTCOME_DESCRIPTION[handle]).toBe(canon);
    }
  );
});

/**
 * Unit test for the Pending Item's per-scenario render label (@SCN-PND-010).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-PND-010 id matching features/pending-items.feature, so a grep of the id
 * returns both halves of the pair. The @integration arm
 * (tests/steps/pendingItems.steps.ts) proves the same render distinction through the
 * real parse→reconcile→renderMarkdown pipeline over a planted fixture; this @unit arm
 * proves the renderer in isolation over hand-built balances carrying `pendingItems`.
 *
 * Proves the per-scenario render distinction: a scenario's Pending Item(s) surface on
 * its rendered Scenario Reconciliation row with a ⏳ pending label VISIBLY DISTINCT from
 * a reconciling item (an error), never mixed into the reconciling-item list. A
 * balanced-with-pending row shows the label instead of the clean-balanced em-dash; a
 * mixed row shows the reconciling-item error AND the Pending Item as separate categories.
 *
 * Teeth: until `renderRowExceptions` emits the pending label the renderer ignores
 * `pendingItems` entirely — a balanced-with-pending row renders as a clean `—`, a mixed
 * row shows only its `unit ∅ missing` error — so every ⏳ assertion reds (the genuine
 * red→green). The clean-balanced regression row (no pending) pins that the em-dash
 * placeholder survives where there is no Pending Item.
 *
 * Parent: (@SCN-PND-010).
 */
describe("[SCN-PND-010] the markdown report renders a Pending Item distinct from a reconciling item", () => {
  /** The row (markdown table line) whose first cell is the given scnId. */
  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };

  /**
   * A hand-built balance carrying the three contrasting shapes:
   *   - SCN-PDX-001 balanced-with-pending — a sole deferred obligation, no reconciling items.
   *   - SCN-PDX-002 mixed — a genuine missing-unit reconciling item PLUS a deferred Pending Item.
   *   - SCN-PDX-003 clean-balanced — no reconciling items, no pending items (the regression row).
   */
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A, 3F-1894): the three contrasting shapes are
  // PRODUCED by reconcile() over a corpus.
  //   - SCN-PDX-001 balanced-with-pending: a sole `<integration>pending` obligation partitions to a
  //     one-sided Pending Item, no reconciled rows → balanced.
  //   - SCN-PDX-002 mixed: a unit obligation with no credit (missing) PLUS a deferred integration.
  //   - SCN-PDX-003 clean-balanced: a unit obligation with a passing credit (satisfied) → the same
  //     `— ` exceptions cell as an empty row, but a shape the reconciler emits (a zero-obligation
  //     scenario would reconcile both-missing, not clean-balanced).
  const pendingBalance: Ledger = reconcile(
    [
      { scnId: "SCN-PDX-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
      {
        scnId: "SCN-PDX-002",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
      },
      { scnId: "SCN-PDX-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [{ qualityCheck: "unit", scnId: "SCN-PDX-003", status: "passed" }]
  );

  it("renders a balanced-with-pending row's Pending Item as a distinct ⏳ pending label, not a reconciling error", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const row = rowFor(md, "SCN-PDX-001");
    // The Pending Item surfaces with its own label — distinct from a reconciling item.
    expect(row).toMatch(/⏳ pending: integration/);
    expect(row).toContain("✓ balanced");
    // It is NOT rendered as a reconciling-item error (no missing/failing outcome for it).
    // Reconciling items now render the canon description, not the handle (3F-1626).
    expect(row).not.toMatch(/integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/);
    // And the exceptions cell is NOT the clean-balanced em-dash placeholder.
    expect(row).not.toMatch(/\|\s*—\s*\|$/);
  });

  it("renders a mixed row's error and Pending Item as separate, distinctly-labelled categories", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const row = rowFor(md, "SCN-PDX-002");
    // The genuine unit error renders as a reconciling item (canon description; 3F-1626).
    expect(row).toMatch(/unit ∅ Evidence Observation is missing/);
    // The deferred integration obligation renders as a distinct Pending Item alongside it.
    expect(row).toMatch(/⏳ pending: integration/);
    expect(row).toContain("✗ out-of-balance");
  });

  it("leaves a clean-balanced row (no Pending Item) rendering the em-dash placeholder — the regression guard", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const row = rowFor(md, "SCN-PDX-003");
    expect(row).toContain("| SCN-PDX-003 | ✓ balanced | — |");
    expect(row).not.toContain("⏳");
  });

  it("keeps the Pending Item distinct in the wide evidence-column ledger path too", () => {
    // Turn the runtime-observation axis on so the ledger renders its wide (evidence-column)
    // table — the OTHER row-render path — and assert the ⏳ pending label survives there.
    const md = renderMarkdown(__er(pendingBalance, true, false), ctx);
    expect(rowFor(md, "SCN-PDX-001")).toMatch(/⏳ pending: integration/);
    expect(rowFor(md, "SCN-PDX-002")).toMatch(/⏳ pending: integration/);
    // Still never rendered as a reconciling-item error anywhere (canon description; 3F-1626).
    expect(md).not.toMatch(/integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/);
  });
});

/**
 * Unit test for the Summary's Pending Items tally (@SCN-PND-011).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-011 id
 * matching features/pending-items.feature, so a grep of the id returns both halves. The
 * @integration arm (tests/steps/pendingItems.steps.ts) proves the same tally through the real
 * parse→reconcile→assemble→render pipeline over a planted fixture; this @unit arm proves the
 * renderer in isolation over hand-built balances carrying `pendingItems`.
 *
 * Proves the `### Evidence reconciliation` view carries a SEPARATE Pending Items tally, off the
 * materialised `summary.pending` count. Hard constraint (3F-1453 line, endorsed): the tally is
 * NEVER an out-of-balance leaf of its own — the `↳ <outcome>` leaf decomposition stays intact
 * and unchanged, and no `↳ pending` row is ever emitted. The tally is its OWN line (a Pending
 * Item is deferred, not out-of-balance). Rendered only when the run genuinely carries Pending
 * Items (the omit-when-empty precedent), so a zero-pending report stays byte-identical.
 *
 * Teeth: until the emitter reads `summary.pending`, no tally line renders — the ⏳ assertions
 * red (the genuine red→green). The zero-pending regression row pins the byte-identical omission.
 *
 * Parent: (@SCN-PND-011).
 */
describe("[SCN-PND-011] the markdown Summary tallies Pending Items separately from the verdict counts", () => {
  /** The `### Evidence reconciliation` section slice (heading to the next section heading). */
  const evidenceReconciliationSection = (md: string): string => {
    const i = md.indexOf("### Evidence reconciliation");
    expect(i, "expected the Evidence reconciliation section").toBeGreaterThanOrEqual(0);
    const rest = md.slice(i + 1);
    const next = rest.search(/\n#{2,3} /);
    return next >= 0 ? rest.slice(0, next) : rest;
  };

  // A balance carrying 3 Pending Items (two on SCN-PDX-001, one on SCN-PDX-002) alongside a
  // genuine missing-unit error — so the out-of-balance leaf decomposition renders AND the
  // Pending tally is distinct from it.
  // Reconciler-built (§11A): 3 Pending Items (two on SCN-PDX-001, one on SCN-PDX-002) alongside a
  // genuine missing-unit error on SCN-PDX-002 — so the out-of-balance leaf decomposition renders
  // AND the Pending tally is distinct from it.
  const pendingBalance: Ledger = reconcile(
    [
      {
        scnId: "SCN-PDX-001",
        evidenceObligations: [{ qualityCheck: "unit", pending: true }, { qualityCheck: "integration", pending: true }],
      },
      {
        scnId: "SCN-PDX-002",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
      },
    ],
    []
  );

  it("renders the Pending Items tally (3) in the Evidence reconciliation view, marked with ⏳", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const section = evidenceReconciliationSection(md);
    expect(section).toMatch(/⏳\s*3 Pending Item/);
  });

  it("keeps the out-of-balance leaf decomposition intact — the tally is NOT a leaf of its own", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const section = evidenceReconciliationSection(md);
    // The `↳ <description>` leaves still render, unchanged — located by the canon
    // description (3F-1626), not the bare handle.
    for (const leaf of [
      "missing",
      "failing",
      "watermelon",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "no-evidence-obligation",
      "both-missing",
    ] as const) {
      expect(section).toContain(`↳ ${OUTCOME_DESCRIPTION[leaf]} `);
    }
    // The Pending tally is NEVER a `↳ pending` leaf row — anywhere in the report.
    expect(md).not.toContain("↳ pending");
  });

  it("renders the tally as its OWN line, after the out-of-balance decomposition (not a table row)", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const iBothMissing = md.indexOf(`↳ ${OUTCOME_DESCRIPTION["both-missing"]}`);
    const iTally = md.search(/⏳\s*3 Pending Item/);
    expect(iBothMissing).toBeGreaterThanOrEqual(0);
    expect(iTally).toBeGreaterThan(iBothMissing);
    // The tally line is not a `| ↳ ... |` table row.
    const tallyLine = md.split("\n").find((l) => /⏳\s*3 Pending Item/.test(l))!;
    expect(tallyLine.startsWith("| ↳")).toBe(false);
  });

  it("omits the tally line entirely when no scenario carries a Pending Item (byte-identical regression)", () => {
    const noPending: Ledger = reconcile(
      [{ scnId: "SCN-PDX-003", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-PDX-003", status: "passed" }]
    );
    const md = renderMarkdown(__er(noPending), ctx);
    // No pending items → no tally line, no ⏳ marker, the report unchanged from before this slice.
    expect(md).not.toContain("Pending Item");
    expect(md).not.toContain("⏳");
  });
});

/**
 * Unit test for the balanced-with-pending vs clean-balanced render contrast (@SCN-PND-012).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-012 id
 * matching features/pending-items.feature, so a grep of the id returns both halves of the pair.
 * The @integration arm (tests/steps/pendingItems.steps.ts) proves the same same-verdict
 * distinction through the real parse→reconcile→renderMarkdown pipeline over a planted fixture;
 * this @unit arm proves the renderer in isolation over hand-built balances carrying `pendingItems`.
 *
 * The DISTINCT assertion from @SCN-PND-010: that scenario pinned the pending-vs-ERROR contrast
 * (a Pending Item labelled apart from a reconciling item, on an out-of-balance/mixed row). This
 * pins the SAME-VERDICT contrast — TWO rows that are BOTH `✓ balanced`, one clean (its empty
 * reconciling items rendered as the em-dash `—`, nothing outstanding) and one carrying a Pending
 * Item (rendered as the `⏳ pending: <check>` label, owed work). The reviewer tells "balanced,
 * nothing outstanding" from "balanced, with owed/deferred work" at a glance, the Pending Item
 * never reading as an error.
 *
 * Teeth: until `renderRowExceptions` emits the pending label for a balanced row the two balanced
 * rows would render IDENTICALLY (both the clean `—`), collapsing the distinction — so the
 * differ-at-a-glance assertion reds (the genuine red→green). The clean-balanced row pins that the
 * `—` placeholder is exactly what a nothing-outstanding balanced row shows.
 *
 * Parent: (@SCN-PND-012).
 */
describe("[SCN-PND-012] a balanced-with-pending row is visibly distinguished from a clean-balanced one", () => {
  /** The row (markdown table line) whose first cell is the given scnId. */
  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };
  /** The exceptions cell (fourth pipe-delimited field) of a rendered scenario row. */
  const exceptionsCell = (row: string): string => (row.split("|")[3] ?? "").trim();

  /**
   * A hand-built balance carrying the same-verdict contrast — BOTH rows verdict `balanced`:
   *   - SCN-PDD-001 clean-balanced — no reconciling items, no pending items (the em-dash row).
   *   - SCN-PDD-002 balanced-with-pending — a sole deferred obligation, no reconciling items.
   */
  const contrastBalance: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-PDD-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [],
        reconcilingItems: [],
        pendingItems: [],
      },
      {
        scnId: "SCN-PDD-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [],
        reconcilingItems: [],
        pendingItems: [{ qualityCheck: "integration" }],
      },
    ],
  };

  it("renders the clean-balanced row as ✓ balanced with the em-dash placeholder — nothing outstanding", () => {
    const md = renderMarkdown(__er(contrastBalance), ctx);
    const row = rowFor(md, "SCN-PDD-001");
    expect(row).toContain("| SCN-PDD-001 | ✓ balanced | — |");
    expect(row).not.toContain("⏳");
  });

  it("renders the balanced-with-pending row as ✓ balanced with the ⏳ pending label — owed work, not an error", () => {
    const md = renderMarkdown(__er(contrastBalance), ctx);
    const row = rowFor(md, "SCN-PDD-002");
    expect(row).toContain("✓ balanced");
    expect(row).toMatch(/⏳ pending: integration/);
    // Not the clean-balanced em-dash, and never a reconciling-item error (canon description; 3F-1626).
    expect(row).not.toMatch(/\|\s*—\s*\|/);
    expect(row).not.toMatch(/integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/);
  });

  it("makes the two balanced rows read differently at a glance — the pending cell is not the clean em-dash", () => {
    const md = renderMarkdown(__er(contrastBalance), ctx);
    const cleanCell = exceptionsCell(rowFor(md, "SCN-PDD-001"));
    const pendingCell = exceptionsCell(rowFor(md, "SCN-PDD-002"));
    // Same verdict, different exceptions cell — the at-a-glance distinction the reviewer relies on.
    expect(cleanCell).toBe("—");
    expect(pendingCell).not.toBe(cleanCell);
    expect(pendingCell).toMatch(/⏳ pending: integration/);
  });
});
