/**
 * Unit test for the markdown run-provenance header (@SCN-RPT-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-001 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the provenance SECTION in isolation: renderMarkdown(__er(balance), ctx) opens
 * with a "## Run provenance" header carrying all four facts — the resolved target
 * repo, the input paths/flags actually used, the run-start timestamp in UTC, and
 * the source SHA (a null SHA rendered as an explicit "unknown (non-git target)") —
 * positioned above the existing per-scenario table (the sectioned renderer's
 * [title, provenance, scenarioTable, …] order). Facts only (project design §5).
 *
 * Teeth: until the provenance emitter lands the header is absent, so every "## Run
 * provenance" / fact assertion reds (the genuine red→green). The byte-green guard
 * (the table header still renders) pins the Scenario-CRUD Read — the existing
 * sections survive the sectioned-renderer refactor.
 *
 * Parent: (@SCN-RPT-001).
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
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

/** A minimal balanced balance — enough for the renderer to produce a report. */
const balance: Ledger = {
  scenarioReconciliations: [
    { scnId: "SCN-RPT-001", kind: "scenario", evidenceObservations: [], evidenceObligations: [], verdict: "balanced", qualityCheckReconciliations: [], pendingItems: [], reconcilingItems: [] },
  ],
};

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

describe("[SCN-RPT-001] the markdown report opens with a Run provenance header", () => {
  it("renders all four provenance facts: target repo, inputs used, UTC timestamp, source SHA", () => {
    const md = renderMarkdown(__er(balance), ctx);

    expect(md).toContain("## Run provenance");
    // Target repo.
    expect(md).toContain("an-adopters-repository");
    // The input paths/flags actually used (the flag handle + its value).
    expect(md).toContain("--features");
    expect(md).toContain("../an-adopters-repository/features");
    expect(md).toContain("--vitest");
    // The run-start timestamp in UTC (second precision; the Z marks UTC).
    expect(md).toContain("2026-06-27T08:17:53Z");
    // The target's source SHA.
    expect(md).toContain("905a987c0ffeeba110000000000000000deadbeef");
    // The TOOL's identity (3F-1916) — which spec-controller produced the run,
    // distinct from the target's source SHA.
    expect(md).toContain("- Tool SHA: 13ee47f271ace511efdb2511276284b4cb50c247");
    expect(md).toContain("- Tool version: 0.1.0");
  });

  it("renders a null source SHA as an explicit unknown (non-git target)", () => {
    const md = renderMarkdown(__er(balance), { ...ctx, sourceSha: null });
    expect(md).toContain("unknown (non-git target)");
    // The literal "null" must NOT leak into the human surface.
    expect(md).not.toContain("Source SHA: null");
  });

  it("renders a null tool SHA as an explicit unknown (not a git checkout), version still shown", () => {
    const md = renderMarkdown(__er(balance), { ...ctx, toolSha: null });
    expect(md).toContain("- Tool SHA: unknown (not a git checkout)");
    expect(md).not.toContain("Tool SHA: null");
    // The version is always present even when the SHA cannot be read.
    expect(md).toContain("- Tool version: 0.1.0");
  });

  it("positions the provenance header above the per-scenario table (sectioned-renderer order)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md.indexOf("# Evidence Reconciliation")).toBeLessThan(md.indexOf("## Run provenance"));
    expect(md.indexOf("## Run provenance")).toBeLessThan(md.indexOf("| Scenario | Verdict | Reconciling items |"));
  });

  it("keeps the existing scenario table byte-green (the Scenario-CRUD Read regression guard)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md).toContain("| Scenario | Verdict | Reconciling items |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| SCN-RPT-001 | ✓ balanced | — |");
  });
});

/**
 * Unit test for the markdown evidenceObligation tally (@SCN-RPT-004).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-004 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the evidenceObligationCountSection in isolation: renderMarkdown counts every
 * reconciled quality-check across balance.scenarioReconciliations[].qualityCheckReconciliations[]
 * (the full per-quality-check breakdown — NOT reconcilingItems, which excludes balanced) by its
 * Outcome. (Prose corrected 3F-1894: the tally iterates `qualityCheckReconciliations`, the field
 * 3F-1846 renamed from the old `evidenceObligations` — which now names the posted DEBITS the tally
 * does not read.) Kind-agnostically (both runtime and static contribute, keyed only by outcome). All
 * four outcomes are always rendered, including a zero count (the watermelon here),
 * in the fixed order balanced → missing → failing →
 * watermelon, each with its ITEM_GLYPH glyph.
 *
 * Teeth: until the emitter lands and is slotted into SECTIONS, every "## Evidence obligation
 * tally" / per-outcome assertion reds (the genuine red→green). Markdown-only — the
 * derived view is NOT duplicated into JSON (project design §3).
 *
 * Parent: (@SCN-RPT-004).
 */
describe("[SCN-RPT-004] the markdown report tallies evidenceObligations by reconciliation outcome", () => {
  // A balance designed to make the scenario-verdict vs evidence-obligation
  // granularity DIVERGE (the whole point of the reshape — the live 43≠44 in
  // miniature): SCN-B carries TWO missing arms (unit + integration), so 2
  // out-of-balance SCENARIOS produce 3 out-of-balance evidence obligations. The fixture
  // must never let the two counts coincide. Totals — scenarios: 3 (balanced 1,
  // out-of-balance 2); evidenceObligations: 5 (balanced 2, missing 2,
  // failing 1, watermelon 0 — out-of-balance 3). 2 ≠ 3.
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A, 3F-1894): the balance is PRODUCED by
  // reconcile() over the corpus below, so every row is a shape the pipeline emits. SCN-A: unit
  // satisfied + integration failing (out-of-balance). SCN-B: the PST-035-shaped double arm — two
  // missing obligations, the source of the 2-scenario / 3-obligation divergence. SCN-C: unit
  // satisfied (balanced).
  const spanning: Ledger = reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
      { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
      { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-A", status: "failed" },
      { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
    ]
  );

  it("renders a '### Evidence reconciliation' table with subjects as rows and balanced / out-of-balance as columns", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain("### Evidence reconciliation");
    expect(md).toContain("| Subject | Total | Balanced | Out-of-balance | Detail |");
    expect(md).toContain("| --- | --- | --- | --- | --- |");
    // Scenario Reconciliation subject — total 3, balanced 1, out-of-balance 2. The subject
    // is the manifesto's COLLECTION (scenario + phantom + suspense), not `Scenario`, which
    // names only the real thing (3F-1726). The numbers are unchanged by the rename. The
    // substring stops before the (empty) Detail cell, so the assertion is robust to that
    // cell's spacing.
    expect(md).toContain("| Scenario Reconciliation | 3 | 1 | 2 |");
    // Evidence-evidenceObligation subject — total 5, balanced 2, out-of-balance 3.
    expect(md).toContain("| Evidence obligation | 5 | 2 | 3 |");
  });

  it("decomposes the evidence-obligation out-of-balance into its nested reconciling-item causes, with the level split as Detail", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // The three non-balanced causes nest (↳) under the evidence-obligation row,
    // populating the out-of-balance column only; missing carries the
    // bare-level split (1 unit + 1 integration — SCN-B's two missing arms). The Subject
    // cell shows the outcome's canon DESCRIPTION, not the bare handle (3F-1626).
    expect(md).toContain("| ↳ Evidence Observation is missing |");
    expect(md).toContain("1 unit + 1 integration");
    expect(md).toContain("| ↳ Evidence Observation is failing |");
    expect(md).toContain("| ↳ Evidence Observation is passing but fabricated |");
  });

  it("reads the scenario / evidence-obligation out-of-balance divergence as a granularity fact (causes reconcile to the evidenceObligation out-of-balance)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const scenOutOfBalance = Number(
      /\| Scenario Reconciliation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]
    );
    const oblOutOfBalance = Number(/\| Evidence \S+ \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]);
    const rbm = Number(/↳ Evidence Observation is missing \|[^\d]*(\d+) \|/.exec(md)?.[1]);
    const pbf = Number(/↳ Evidence Observation is failing \|[^\d]*(\d+) \|/.exec(md)?.[1]);
    const wm = Number(
      /↳ Evidence Observation is passing but fabricated \|[^\d]*(\d+) \|/.exec(md)?.[1]
    );
    // The divergence IS the point of the reshape (the live 43≠44 in miniature):
    // 2 out-of-balance scenarios, 3 out-of-balance evidenceObligations (SCN-B's double
    // missing arm). The test asserts they differ, never coincidentally-equal numbers.
    expect(scenOutOfBalance).toBe(2);
    expect(oblOutOfBalance).toBe(3);
    expect(scenOutOfBalance).not.toBe(oblOutOfBalance);
    // The nested causes reconcile to the evidence-obligation out-of-balance: 2 + 1 + 0 = 3.
    expect(rbm + pbf + wm).toBe(oblOutOfBalance);
  });

  it("always renders the watermelon cause even at zero (a zero watermelon is itself a fact)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(/↳ Evidence Observation is passing but fabricated \|[^\d]*0 \|/.test(md)).toBe(true);
  });

  it("renders the nested causes in the fixed order missing → failing → watermelon", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iMissing = md.indexOf("| ↳ Evidence Observation is missing |");
    const iFailing = md.indexOf("| ↳ Evidence Observation is failing |");
    const iWatermelon = md.indexOf("| ↳ Evidence Observation is passing but fabricated |");
    expect(iMissing).toBeGreaterThanOrEqual(0);
    expect(iMissing).toBeLessThan(iFailing);
    expect(iFailing).toBeLessThan(iWatermelon);
  });

  it("counts qualityCheckReconciliations (the full breakdown), not reconcilingItems (which excludes balanced)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // reconcilingItems carries only the 3 non-balanced items; the 2 balanced quality-checks are
    // visible only via qualityCheckReconciliations[]. A balanced count of 2 in the
    // Evidence-obligation row proves the tally iterates qualityCheckReconciliations[] (the field
    // 3F-1846 renamed from `evidenceObligations`), not the posted debits.
    expect(md).toContain("| Evidence obligation | 5 | 2 | 3 |");
  });

  it("retires the Axis / Verdict / evidenceObligation-outcome vocabulary (both subjects report into the same binary columns)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).not.toContain("| Axis | Count |");
    expect(md).not.toContain("Verdict —");
    expect(md).not.toContain("Evidence obligation-outcome —");
  });

  it("splits missing by evidenceObligation subject — counting evidenceObligations, not scenarios, in canonical order", () => {
    // Reconciler-built (§11A): SCN-PST-035 raises unit + integration, SCN-OTH-001 unit; no
    // credits, so all three obligations reconcile `missing` — 2 out-of-balance scenarios but 3
    // missing obligations (2 unit + 1 integration). The split must count OBLIGATIONS, which is
    // what the PST-035 double-arm case separates. Bare evidence types (no @), unit before integration.
    const multiMissing: Ledger = reconcile(
      [
        { scnId: "SCN-PST-035", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
        { scnId: "SCN-OTH-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      []
    );
    const md = renderMarkdown(__er(multiMissing), ctx);
    // 2 out-of-balance scenarios, 3 missing evidenceObligations — the divergence
    // again (PST-035's double arm). The Detail split counts evidence obligations: 2 unit + 1 integration.
    expect(md).toContain("| Scenario Reconciliation | 2 | 0 | 2 |");
    expect(md).toContain("| Evidence obligation | 3 | 0 | 3 |");
    expect(md).toContain("2 unit + 1 integration");
    // The missing nested cause carries the full evidence-obligation out-of-balance (3).
    expect(/↳ Evidence Observation is missing \|[^\d]*3 \|/.test(md)).toBe(true);
  });

  it("renders a missing static evidenceObligation as the bare 'fitness' bucket, fitness-first in the split", () => {
    // Reconciler-built (§11A): the integration arm is RAISED BEFORE the fitness arm, both missing
    // (no runtime credit, no static-check observation) — the split still orders fitness FIRST,
    // canonically, whatever order the tags name them in.
    const lintAndRuntime: Ledger = reconcile(
      [
        {
          scnId: "SCN-LNT-099",
          evidenceObligations: [{ qualityCheck: "integration" }, { qualityCheck: "fitness" }],
        },
      ],
      []
    );
    const md = renderMarkdown(__er(lintAndRuntime), ctx);
    // The split maps the static evidenceObligation to the bare word "fitness" and orders
    // it FIRST; the nested missing cause carries the full out-of-balance (2).
    expect(md).toContain("1 fitness + 1 integration");
    expect(/↳ Evidence Observation is missing \|[^\d]*2 \|/.test(md)).toBe(true);
  });

  it("renders the evidence reconciliation under the Summary views heading, before the ledger", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iSummary = md.indexOf("## Summary views");
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iSummary).toBeGreaterThanOrEqual(0);
    expect(iSummary).toBeLessThan(iHeadline);
    expect(iHeadline).toBeLessThan(iLedger);
  });

  // The arm @SCN-RPT-004 never had (3F-1726): a fixture carrying a SUSPENSE reconciliation.
  // The old fixtures are scenario-only, so they never exercised the divergence that let the
  // an adopter's repository 17-36-50Z run render `141 | 141 | 0` — a clean-looking board — on a run `isBalanced`
  // failed → exit 1. The subject row is the SCENARIO RECONCILIATION (the manifesto's
  // collection: scenario + phantom + suspense), so the suspense row is IN the total and, being
  // always out-of-balance, in the out-of-balance column: N+1 | N | 1, never N | N | 0.
  // Reconciler-built (§11A): three scenarios each balanced (unit satisfied), plus two
  // uncited credits (unit + integration, scnId null) the reconciler aggregates into ONE suspense
  // row — ALWAYS out-of-balance (double-entry-manifesto); the 17-36-50Z `(no scenario)` row.
  const threeNamedPlusSuspense: Ledger = reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-B", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
      { qualityCheck: "unit", scnId: null, status: "passed" },
      { qualityCheck: "integration", scnId: null, status: "passed" },
    ]
  );

  it("counts the suspense reconciliation in the evidence reconciliation's out-of-balance column (N+1 | N | 1, never N | N | 0)", () => {
    const md = renderMarkdown(__er(threeNamedPlusSuspense), ctx);
    // 3 scenario (all balanced) + 1 suspense = 4 Scenario Reconciliations, 3 balanced,
    // 1 out-of-balance. The suspense row survives as a sub-count OF the total, never a
    // bucket outside it.
    expect(md).toContain("| Scenario Reconciliation | 4 | 3 | 1 |");
    // The regression the whole slice exists to kill: the scenario-only tally rendered the
    // suspense row away, so a failing run's subject row read as a pass.
    expect(md).not.toContain("| Scenario Reconciliation | 3 | 3 | 0 |");
  });

  it("agrees with isBalanced and with the evidence-obligation row's own out-of-balance count", () => {
    const md = renderMarkdown(__er(threeNamedPlusSuspense), ctx);
    const scenOutOfBalance = Number(
      /\| Scenario Reconciliation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]
    );
    const oblOutOfBalance = Number(/\| Evidence obligation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]);
    // The three views that DISAGREED in an adopter's repository 17-36-50Z run — the scenario line, the
    // obligation line, and the actual verdict — now agree that the run is out-of-balance.
    expect(isBalanced(threeNamedPlusSuspense)).toBe(false);
    expect(scenOutOfBalance).toBe(1);
    expect(oblOutOfBalance).toBe(2);
    // Both non-zero: neither view can read as a pass while the other fails. (They differ by
    // granularity on purpose — one suspense ROW carries two uncited-credit ITEMS.)
    expect(scenOutOfBalance).toBeGreaterThan(0);
    expect(oblOutOfBalance).toBeGreaterThan(0);
    // The suspense row's items land on the `cites-no-scenario` leaf, reconciling to the
    // evidence-obligation out-of-balance.
    const citesNoScenario = OUTCOME_DESCRIPTION["cites-no-scenario"];
    expect(
      new RegExp(`↳ ${citesNoScenario} \\|[^\\d]*2 \\|`).test(md)
    ).toBe(true);
  });
});

/**
 * Unit test for the markdown fitness-obligation section (@SCN-RPT-005).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-005 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Markdown-only — the derived view is deliberately NOT duplicated into JSON (project design §3).
 *
 * Parent: (@SCN-RPT-005).
 */
describe("[SCN-RPT-005] the markdown report lists the fitness evidence obligations as their own section", () => {
  // Reconciler-built (§11A): SCN-A raises unit + the guard-typecheck fitness check + integration
  // (unit passing, guard wired → satisfied, integration failing); SCN-B raises the guard-lint
  // fitness check (exists-but-unwired → the watermelon) + e2e (no credit → missing). Runtime
  // obligations must NOT leak into the fitness-only section.
  const spanning: Ledger = reconcile(
    [
      {
        scnId: "SCN-A",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "fitness" },
          { qualityCheck: "integration" },
        ],
      },
      {
        scnId: "SCN-B",
        evidenceObligations: [{ qualityCheck: "fitness" }, { qualityCheck: "e2e" }],
      },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-A", status: "failed" },
      { qualityCheck: "fitness", staticCheck: "lint:guard-typecheck", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", staticCheck: "lint:guard-lint", scnId: "SCN-B", exists: true, enforcedOverRealSource: false },
    ]
  );

  it("renders a '### Fitness evidence obligations' table with each fitness row's scenario and glyphed outcome — including the watermelon", () => {
    const md = renderMarkdown(__er(spanning), ctx);

    expect(md).toContain("### Fitness evidence obligations");
    // The total line states how many of the fitness evidence obligations reconcile satisfied.
    expect(md).toContain("1 of 2 fitness evidence obligations reconcile satisfied.");
    // The table header — the scenario and its outcome, and no check column (3F-3525): what a check
    // is about is its scenario's title, and no report rolls a check up by a word.
    expect(md).toContain("| Scenario | Outcome |");
    expect(md).not.toContain("| Scenario | Static check | Outcome |");
    // The satisfied fitness obligation, glyphed — the outcome shown as its canon description (3F-1626).
    expect(md).toContain("| SCN-A | ✓ Evidence Observation satisfies its Evidence Obligation |");
    // The watermelon, glyphed — the 🍉 reads at a glance.
    expect(md).toContain("| SCN-B | 🍉 Evidence Observation is passing but fabricated |");
  });

  it("excludes the runtime evidenceObligations (the fitness slice on its own)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // Isolate THIS section's text (heading to the next section heading), so the
    // assertion is about the fitness cut, not the ledger that now
    // follows it (the ledger legitimately renders runtime reconciling items).
    const iSection = md.indexOf("### Fitness evidence obligations");
    const rest = md.slice(iSection + 1);
    const nextHeading = rest.search(/\n##/);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    // No runtime levels leak into the by-kind static listing.
    expect(section).not.toContain("runtime");
    expect(section).not.toContain("integration");
    expect(section).not.toContain("e2e");
  });

  it("renders the fitness evidenceObligations in document order", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // Read inside the section: the rows are named by @SCN (no check column since 3F-3525), and the
    // ledger below names the same scenarios again.
    const section = md.slice(md.indexOf("### Fitness evidence obligations"), md.indexOf("## Scenario Reconciliations"));
    const iA = section.indexOf("| SCN-A |");
    const iB = section.indexOf("| SCN-B |");
    expect(iA).toBeGreaterThanOrEqual(0);
    expect(iB).toBeGreaterThanOrEqual(0);
    expect(iA).toBeLessThan(iB);
  });

  it("omits the section entirely (total line and all) when no scenario names a fitness evidenceObligation", () => {
    const runtimeOnly: Ledger = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
    );
    const md = renderMarkdown(__er(runtimeOnly), ctx);
    expect(md).not.toContain("### Fitness evidence obligations");
    expect(md).not.toContain("fitness evidence obligations reconcile satisfied");
  });

  it("slots the fitness section after the evidence reconciliation and before the ledger (no warnings section)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iStatic = md.indexOf("### Fitness evidence obligations");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iHeadline).toBeGreaterThanOrEqual(0);
    expect(iStatic).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iHeadline).toBeLessThan(iStatic);
    expect(iStatic).toBeLessThan(iLedger);
    // The warnings section dissolved entirely.
    expect(md).not.toContain("## Warnings");
  });
});
