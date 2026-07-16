/**
 * Unit test for the markdown run-provenance header (@SCN-RPT-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-001 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the provenance SECTION in isolation: renderMarkdown(balance, ctx) opens
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
import type { Ledger, Outcome, ScenarioReconciliation } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { isBalanced, reconcile } from "../reconcile/reconcile.js";
import type { RunContext } from "../provenance/provenance.js";
import type { RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import { countRuntimeEvidenceObservationKinds } from "../census/evidenceObservations.js";
import type { EvidenceObservation, Scenario } from "../model.js";

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
};

describe("[SCN-RPT-001] the markdown report opens with a Run provenance header", () => {
  it("renders all four provenance facts: target repo, inputs used, UTC timestamp, source SHA", () => {
    const md = renderMarkdown(balance, ctx);

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
  });

  it("renders a null source SHA as an explicit unknown (non-git target)", () => {
    const md = renderMarkdown(balance, { ...ctx, sourceSha: null });
    expect(md).toContain("unknown (non-git target)");
    // The literal "null" must NOT leak into the human surface.
    expect(md).not.toContain("Source SHA: null");
  });

  it("positions the provenance header above the per-scenario table (sectioned-renderer order)", () => {
    const md = renderMarkdown(balance, ctx);
    expect(md.indexOf("# Evidence Reconciliation")).toBeLessThan(md.indexOf("## Run provenance"));
    expect(md.indexOf("## Run provenance")).toBeLessThan(md.indexOf("| Scenario | Verdict | Reconciling items |"));
  });

  it("keeps the existing scenario table byte-green (the Scenario-CRUD Read regression guard)", () => {
    const md = renderMarkdown(balance, ctx);
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
 * evidence obligation across balance.scenarios[].evidenceObligations[] (the full per-evidence-obligation
 * breakdown — NOT reconcilingItems, which excludes balanced) by its Outcome,
 * kind-agnostically (both runtime and static contribute, keyed only by outcome). All
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
  const spanning: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-A",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "unit", outcome: "satisfied" },
          { qualityCheck: "integration", outcome: "failing" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "integration", outcome: "failing" },
        ],
      },
      {
        // The PST-035-shaped double arm: one out-of-balance scenario, TWO
        // missing evidenceObligations — the source of the 2-scenario /
        // 3-evidenceObligation divergence.
        scnId: "SCN-B",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "unit", outcome: "missing" },
          { qualityCheck: "integration", outcome: "missing" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "unit", outcome: "missing" },
          { qualityCheck: "integration", outcome: "missing" },
        ],
      },
      {
        scnId: "SCN-C",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [
          { qualityCheck: "unit", outcome: "satisfied" },
        ],
        pendingItems: [],
        reconcilingItems: [],
      },
    ],
  };

  it("renders a '### Evidence reconciliation' table with subjects as rows and balanced / out-of-balance as columns", () => {
    const md = renderMarkdown(spanning, ctx);
    expect(md).toContain("### Evidence reconciliation");
    expect(md).toContain("| Subject | Total | Balanced | Out-of-balance | Detail |");
    expect(md).toContain("| --- | --- | --- | --- | --- |");
    // Scenario Reconciliation subject — total 3, balanced 1, out-of-balance 2. The subject
    // is the manifesto's COLLECTION (declared + phantom + suspense), not `Scenario`, which
    // names only the declared thing (3F-1726). The numbers are unchanged by the rename. The
    // substring stops before the (empty) Detail cell, so the assertion is robust to that
    // cell's spacing.
    expect(md).toContain("| Scenario Reconciliation | 3 | 1 | 2 |");
    // Evidence-evidenceObligation subject — total 5, balanced 2, out-of-balance 3.
    expect(md).toContain("| Evidence obligation | 5 | 2 | 3 |");
  });

  it("decomposes the evidence-obligation out-of-balance into its nested reconciling-item causes, with the level split as Detail", () => {
    const md = renderMarkdown(spanning, ctx);
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
    const md = renderMarkdown(spanning, ctx);
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
    const md = renderMarkdown(spanning, ctx);
    expect(/↳ Evidence Observation is passing but fabricated \|[^\d]*0 \|/.test(md)).toBe(true);
  });

  it("renders the nested causes in the fixed order missing → failing → watermelon", () => {
    const md = renderMarkdown(spanning, ctx);
    const iMissing = md.indexOf("| ↳ Evidence Observation is missing |");
    const iFailing = md.indexOf("| ↳ Evidence Observation is failing |");
    const iWatermelon = md.indexOf("| ↳ Evidence Observation is passing but fabricated |");
    expect(iMissing).toBeGreaterThanOrEqual(0);
    expect(iMissing).toBeLessThan(iFailing);
    expect(iFailing).toBeLessThan(iWatermelon);
  });

  it("counts evidenceObligations[] (the full breakdown), not reconcilingItems (which excludes balanced)", () => {
    const md = renderMarkdown(spanning, ctx);
    // reconcilingItems carries only the 3 non-balanced items; the 2 balanced
    // evidence obligations are visible only via evidenceObligations[]. A balanced count of 2
    // in the Evidence-evidence obligation row proves the tally iterates evidenceObligations[].
    expect(md).toContain("| Evidence obligation | 5 | 2 | 3 |");
  });

  it("retires the Axis / Verdict / evidenceObligation-outcome vocabulary (both subjects report into the same binary columns)", () => {
    const md = renderMarkdown(spanning, ctx);
    expect(md).not.toContain("| Axis | Count |");
    expect(md).not.toContain("Verdict —");
    expect(md).not.toContain("Evidence obligation-outcome —");
  });

  it("splits missing by evidenceObligation subject — counting evidenceObligations, not scenarios, in canonical order", () => {
    // SCN-PST-035 carries BOTH a unit and an integration missing arm; SCN-OTH a unit
    // arm. Two out-of-balance scenarios, but THREE missing evidenceObligations — the split must
    // count evidenceObligations (2 unit + 1 integration), the PST-035 double-arm case. Canonical
    // order puts unit before integration; bare evidence types (no @).
    const multiMissing: Ledger = {
      scenarioReconciliations: [
        {
          scnId: "SCN-PST-035",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [
            { qualityCheck: "unit", outcome: "missing" },
            { qualityCheck: "integration", outcome: "missing" },
          ],
          pendingItems: [],
          reconcilingItems: [
            { qualityCheck: "unit", outcome: "missing" },
            { qualityCheck: "integration", outcome: "missing" },
          ],
        },
        {
          scnId: "SCN-OTH-001",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [
            { qualityCheck: "unit", outcome: "missing" },
          ],
          pendingItems: [],
          reconcilingItems: [
            { qualityCheck: "unit", outcome: "missing" },
          ],
        },
      ],
    };
    const md = renderMarkdown(multiMissing, ctx);
    // 2 out-of-balance scenarios, 3 missing evidenceObligations — the divergence
    // again (PST-035's double arm). The Detail split counts evidence obligations: 2 unit + 1 integration.
    expect(md).toContain("| Scenario Reconciliation | 2 | 0 | 2 |");
    expect(md).toContain("| Evidence obligation | 3 | 0 | 3 |");
    expect(md).toContain("2 unit + 1 integration");
    // The missing nested cause carries the full evidence-obligation out-of-balance (3).
    expect(/↳ Evidence Observation is missing \|[^\d]*3 \|/.test(md)).toBe(true);
  });

  it("renders a missing static evidenceObligation as the bare 'lint' bucket, lint-first in the split", () => {
    // A scenario with an integration arm declared BEFORE a static (lint) arm, both
    // missing. The split maps the static evidenceObligation to the bare word "lint"
    // (level-=-tag) and orders it FIRST (canonical order: lint, then the runtime
    // levels) regardless of declaration order.
    const lintAndRuntime: Ledger = {
      scenarioReconciliations: [
        {
          scnId: "SCN-LNT-099",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [
            { qualityCheck: "integration", outcome: "missing" },
            { qualityCheck: "lint", guard: "typecheck", outcome: "missing" },
          ],
          pendingItems: [],
          reconcilingItems: [
            { qualityCheck: "integration", outcome: "missing" },
            { qualityCheck: "lint", guard: "typecheck", outcome: "missing" },
          ],
        },
      ],
    };
    const md = renderMarkdown(lintAndRuntime, ctx);
    // The split maps the static evidenceObligation to the bare word "lint" and orders
    // it FIRST; the nested missing cause carries the full out-of-balance (2).
    expect(md).toContain("1 lint + 1 integration");
    expect(/↳ Evidence Observation is missing \|[^\d]*2 \|/.test(md)).toBe(true);
  });

  it("renders the trial balance under the Summary views heading, before the ledger", () => {
    const md = renderMarkdown(spanning, ctx);
    const iSummary = md.indexOf("## Summary views");
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iSummary).toBeGreaterThanOrEqual(0);
    expect(iSummary).toBeLessThan(iHeadline);
    expect(iHeadline).toBeLessThan(iLedger);
  });

  // The arm @SCN-RPT-004 never had (3F-1726): a fixture carrying a SUSPENSE reconciliation.
  // The old fixtures are declared-only, so they never exercised the divergence that let the
  // an adopter's repository 17-36-50Z run render `141 | 141 | 0` — a clean-looking board — on a run `isBalanced`
  // failed → exit 1. The subject row is the SCENARIO RECONCILIATION (the manifesto's
  // collection: declared + phantom + suspense), so the suspense row is IN the total and, being
  // always out-of-balance, in the out-of-balance column: N+1 | N | 1, never N | N | 0.
  const threeDeclaredPlusSuspense: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-A",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-B",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-C",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        // The suspense reconciliation — credits citing NO scenario, aggregated into one row.
        // ALWAYS out-of-balance (double-entry-manifesto); the 17-36-50Z `(no scenario)` row.
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "unit", outcome: "cites-no-scenario" },
          { qualityCheck: "integration", outcome: "cites-no-scenario" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "unit", outcome: "cites-no-scenario" },
          { qualityCheck: "integration", outcome: "cites-no-scenario" },
        ],
      },
    ],
  };

  it("counts the suspense reconciliation in the trial balance's out-of-balance column (N+1 | N | 1, never N | N | 0)", () => {
    const md = renderMarkdown(threeDeclaredPlusSuspense, ctx);
    // 3 declared (all balanced) + 1 suspense = 4 Scenario Reconciliations, 3 balanced,
    // 1 out-of-balance. The suspense row survives as a sub-count OF the total, never a
    // bucket outside it.
    expect(md).toContain("| Scenario Reconciliation | 4 | 3 | 1 |");
    // The regression the whole slice exists to kill: the declared-only tally rendered the
    // suspense row away, so a failing run's subject row read as a pass.
    expect(md).not.toContain("| Scenario Reconciliation | 3 | 3 | 0 |");
  });

  it("agrees with isBalanced and with the evidence-obligation row's own out-of-balance count", () => {
    const md = renderMarkdown(threeDeclaredPlusSuspense, ctx);
    const scenOutOfBalance = Number(
      /\| Scenario Reconciliation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]
    );
    const oblOutOfBalance = Number(/\| Evidence obligation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]);
    // The three views that DISAGREED in an adopter's repository 17-36-50Z run — the scenario line, the
    // obligation line, and the actual verdict — now agree that the run is out-of-balance.
    expect(isBalanced(threeDeclaredPlusSuspense)).toBe(false);
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
 * Unit test for the markdown static-guard section (@SCN-RPT-005).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-005 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the staticGuardSection in isolation: renderMarkdown filters
 * balance.scenarios[].evidenceObligations[] on kind === "static", pairs each with its
 * enclosing scenario's scnId, and renders a "## Static-guard evidenceObligations" table
 * `| Scenario | Guard | Outcome |` — one row per static evidenceObligation in document
 * order, the outcome carrying its existing ITEM_GLYPH glyph (so the 🍉 watermelon
 * reads at a glance). Runtime evidenceObligations are excluded (the static slice on its
 * own). When no scenario declares a static guard, the section is OMITTED entirely
 * (the warningsSection precedent). Slotted after evidenceObligationCountSection, before
 * warningsSection.
 *
 * Teeth: until the emitter lands and is slotted into SECTIONS, every "## Static-guard
 * evidenceObligations" / row / placement assertion reds (the genuine red→green). Markdown-only
 * — the derived view is NOT duplicated into JSON (project design §3).
 *
 * Parent: (@SCN-RPT-005).
 */
describe("[SCN-RPT-005] the markdown report lists the lint evidence obligations as their own section", () => {
  // A balance whose evidenceObligations mix static-guard and runtime kinds across two
  // scenarios, the static guards spanning balanced and the watermelon. Static
  // evidenceObligations in document order: SCN-A/guard-typecheck (balanced), then
  // SCN-B/guard-lint (the watermelon). Runtime evidenceObligations must NOT appear.
  const spanning: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-A",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "unit", outcome: "satisfied" },
          { qualityCheck: "lint", guard: "guard-typecheck", outcome: "satisfied" },
          { qualityCheck: "integration", outcome: "failing" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "integration", outcome: "failing" },
        ],
      },
      {
        scnId: "SCN-B",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          {
            qualityCheck: "lint", guard: "guard-lint",
            outcome: "watermelon",
          },
          { qualityCheck: "e2e", outcome: "missing" },
        ],
        pendingItems: [],
        reconcilingItems: [
          {
            qualityCheck: "lint", guard: "guard-lint",
            outcome: "watermelon",
          },
          { qualityCheck: "e2e", outcome: "missing" },
        ],
      },
    ],
  };

  it("renders a '### Lint evidence obligations' table with each static row's scenario, guard, and glyphed outcome — including the watermelon", () => {
    const md = renderMarkdown(spanning, ctx);

    expect(md).toContain("### Lint evidence obligations");
    // The total line outcomes how many of the static evidenceObligations reconcile satisfied.
    expect(md).toContain("1 of 2 lint evidence obligations reconcile satisfied.");
    // The table header.
    expect(md).toContain("| Scenario | Guard | Outcome |");
    // The satisfied static guard, glyphed — the outcome shown as its canon description (3F-1626).
    expect(md).toContain("| SCN-A | guard-typecheck | ✓ Evidence Observation is present and passing |");
    // The watermelon static guard, glyphed — the 🍉 reads at a glance.
    expect(md).toContain(
      "| SCN-B | guard-lint | 🍉 Evidence Observation is passing but fabricated |"
    );
  });

  it("excludes the runtime evidenceObligations (the lint slice on its own)", () => {
    const md = renderMarkdown(spanning, ctx);
    // Isolate THIS section's text (heading to the next section heading), so the
    // assertion is about the lint cut, not the ledger that now
    // follows it (the ledger legitimately renders runtime reconciling items).
    const iSection = md.indexOf("### Lint evidence obligations");
    const rest = md.slice(iSection + 1);
    const nextHeading = rest.search(/\n##/);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    // No runtime levels leak into the by-kind static listing.
    expect(section).not.toContain("runtime");
    expect(section).not.toContain("integration");
    expect(section).not.toContain("e2e");
  });

  it("renders the static evidenceObligations in document order", () => {
    const md = renderMarkdown(spanning, ctx);
    const iTypecheck = md.indexOf("guard-typecheck");
    const iLint = md.indexOf("guard-lint");
    expect(iTypecheck).toBeGreaterThanOrEqual(0);
    expect(iLint).toBeGreaterThanOrEqual(0);
    expect(iTypecheck).toBeLessThan(iLint);
  });

  it("omits the section entirely (total line and all) when no scenario declares a lint evidenceObligation", () => {
    const runtimeOnly: Ledger = {
      scenarioReconciliations: [
        {
          scnId: "SCN-A",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "balanced",
          qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
          pendingItems: [],
          reconcilingItems: [],
        },
      ],
    };
    const md = renderMarkdown(runtimeOnly, ctx);
    expect(md).not.toContain("### Lint evidence obligations");
    expect(md).not.toContain("lint evidence obligations reconcile balanced");
  });

  it("slots the lint section after the trial balance and before the ledger (no warnings section)", () => {
    const md = renderMarkdown(spanning, ctx);
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iStatic = md.indexOf("### Lint evidence obligations");
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

/**
 * Unit test for the markdown by-feature grouping (@SCN-RPT-006).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-006 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the byFeatureSection in isolation: renderMarkdown groups the
 * verdict === "out-of-balance" scenarios under their feature code (the <FFF> parsed
 * from each scnId via the shared featureCodeOf parser in src/spec/featureCodes.ts —
 * reused, not re-derived) into a "## Out-of-balance by feature" section, one bullet
 * per feature in first-appearance (document) order with a per-feature count, the
 * balanced scenarios excluded. When no scenario is out of balance the section is
 * OMITTED entirely (the warningsSection / staticGuardSection precedent). Slotted
 * after staticGuardSection, before warningsSection.
 *
 * Teeth: until the emitter lands and is slotted into SECTIONS, every "## Out-of-balance
 * by feature" / grouping / placement assertion reds (the genuine red→green). Markdown-only
 * — the grouped view is NOT duplicated into JSON (project design §3).
 *
 * Parent: (@SCN-RPT-006).
 */
describe("[SCN-RPT-006] the markdown report groups out-of-balance scenarios by feature", () => {
  // A balance whose out-of-balance scenarios span THREE feature codes (LDG ×2,
  // LNT ×1) interleaved with balanced scenarios that must NOT appear. Document
  // order of the out-of-balance scenarios: SCN-LDG-003, SCN-LNT-002, SCN-LDG-007 —
  // so first-appearance feature order is LDG (first seen at SCN-LDG-003), then LNT.
  const spanning: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-LDG-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-LDG-003",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "missing" }],
        pendingItems: [],
        reconcilingItems: [{ qualityCheck: "unit", outcome: "missing" }],
      },
      {
        scnId: "SCN-LNT-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          {
            qualityCheck: "lint", guard: "guard-lint",
            outcome: "watermelon",
          },
        ],
        pendingItems: [],
        reconcilingItems: [
          {
            qualityCheck: "lint", guard: "guard-lint",
            outcome: "watermelon",
          },
        ],
      },
      {
        scnId: "SCN-LNT-009",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [{ qualityCheck: "lint", guard: "guard-lint", outcome: "satisfied" }],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-LDG-007",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ qualityCheck: "integration", outcome: "failing" }],
        pendingItems: [],
        reconcilingItems: [{ qualityCheck: "integration", outcome: "failing" }],
      },
    ],
  };

  it("renders an '### Out-of-balance by feature' table grouping the out-of-balance scenarios under their feature code", () => {
    const md = renderMarkdown(spanning, ctx);

    expect(md).toContain("### Out-of-balance by feature");
    // The total line: 3 of the 5 scenarios are out of balance.
    expect(md).toContain("The 3 of 5 out-of-balance scenarios, grouped by feature:");
    // The table header (FFF prefix only — full names are added separately).
    expect(md).toContain("| Feature | Count | Out-of-balance `@SCN` ids |");
    // LDG carries two out-of-balance scenarios (SCN-LDG-003, SCN-LDG-007).
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    // LNT carries one (SCN-LNT-002).
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  it("excludes the balanced scenarios (this is the discrepancy view)", () => {
    const md = renderMarkdown(spanning, ctx);
    // Bound the assertion to THIS section (heading to next section heading), so it is
    // not fooled by the ledger that now follows and lists every scenario.
    const iSection = md.indexOf("### Out-of-balance by feature");
    const rest = md.slice(iSection + 1);
    const nextHeading = rest.search(/\n##/);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    // The balanced scenarios never surface in the by-feature grouping.
    expect(section).not.toContain("SCN-LDG-001");
    expect(section).not.toContain("SCN-LNT-009");
  });

  it("lists the features in first-appearance (document) order", () => {
    const md = renderMarkdown(spanning, ctx);
    const iTrb = md.indexOf("| LDG |");
    const iLnt = md.indexOf("| LNT |");
    expect(iTrb).toBeGreaterThanOrEqual(0);
    expect(iLnt).toBeGreaterThanOrEqual(0);
    // LDG is first out-of-balance (SCN-LDG-003) so its row leads LNT's.
    expect(iTrb).toBeLessThan(iLnt);
  });

  it("omits the section entirely (total line and all) when no scenario is out of balance", () => {
    const allBalanced: Ledger = {
      scenarioReconciliations: [
        {
          scnId: "SCN-LDG-001",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "balanced",
          qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
          pendingItems: [],
          reconcilingItems: [],
        },
      ],
    };
    const md = renderMarkdown(allBalanced, ctx);
    expect(md).not.toContain("### Out-of-balance by feature");
    expect(md).not.toContain("out-of-balance scenarios, grouped by feature:");
  });

  it("slots the by-feature section after the lint section and before the ledger (no warnings section)", () => {
    // A balance carrying static-guard evidenceObligations and an out-of-balance scenario — so
    // both summary-view sections render and their order can be asserted.
    const withAll: Ledger = {
      scenarioReconciliations: [
        {
          scnId: "SCN-LNT-002",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [
            {
              qualityCheck: "lint", guard: "guard-lint",
              outcome: "watermelon",
            },
          ],
          pendingItems: [],
          reconcilingItems: [
            {
              qualityCheck: "lint", guard: "guard-lint",
              outcome: "watermelon",
            },
          ],
        },
      ],
    };
    const md = renderMarkdown(withAll, ctx);
    const iStatic = md.indexOf("### Lint evidence obligations");
    const iByFeature = md.indexOf("### Out-of-balance by feature");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iStatic).toBeGreaterThanOrEqual(0);
    expect(iByFeature).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iStatic).toBeLessThan(iByFeature);
    expect(iByFeature).toBeLessThan(iLedger);
    // The warnings section dissolved entirely.
    expect(md).not.toContain("## Warnings");
  });

  it("names each feature in full as '<slug> (<FFF>)' when a code→slug map is threaded", () => {
    // The feature-name map (built from discoverFeatures: featureCode → filename slug).
    const featureNames = new Map([
      ["LDG", "ledger"],
      ["LNT", "lint-evidence"],
    ]);
    const md = renderMarkdown(spanning, ctx, undefined, undefined, featureNames);
    // Each Feature cell reads "<full-name> (<FFF>)" — the count + ids columns unchanged.
    expect(md).toContain("| ledger (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| lint-evidence (LNT) | 1 | SCN-LNT-002 |");
  });

  it("falls back to the bare FFF for an uncoded id the map doesn't cover", () => {
    // The map covers LDG but NOT LNT — LNT stands in for an uncoded feature (an
    // @SCN-LNT-* id whose LNT no file declares). featureCodeOf yields the FFF; the map
    // misses; the cell renders the bare FFF (the earlier behaviour, preserved).
    const featureNames = new Map([["LDG", "ledger"]]);
    const md = renderMarkdown(spanning, ctx, undefined, undefined, featureNames);
    expect(md).toContain("| ledger (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  it("renders the bare FFF when no feature-name map is threaded (the 4-arg back-compat path)", () => {
    // The existing callers (and the JSON path) never thread featureNames; the by-feature
    // cut stays byte-identical to its earlier form.
    const md = renderMarkdown(spanning, ctx);
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });
});

/**
 * Unit test for the markdown declared-corpus census (@SCN-RPT-007).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-007 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the declared-corpus census in isolation: since EVERY declared scenario is a
 * ledger row (a zero-evidence scenario is a both-missing row, not a warning excluded to a
 * separate axis), so the declared census is recoverable from the ledger scenario-count ALONE —
 * no `## Declared corpus` section, and no `## Warnings` axis to sum in.
 *
 * Parent: (@SCN-RPT-007).
 */
describe("[SCN-RPT-007] the declared corpus census is recoverable from the ledger scenario-count", () => {
  // A balance carrying three declared scenarios — one balanced, one out-of-balance, and one
  // zero-evidence (a both-missing row, the earlier no-evidence-declared warning). ALL three
  // are ledger rows now, so the declared total is the ledger scenario-count alone.
  const reconciliationFixture: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-A",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-B",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ qualityCheck: "integration", outcome: "missing" }],
        pendingItems: [],
        reconcilingItems: [{ qualityCheck: "integration", outcome: "missing" }],
      },
      {
        scnId: "SCN-C",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ outcome: "both-missing" }],
        pendingItems: [],
        reconcilingItems: [{ outcome: "both-missing" }],
      },
    ],
  };

  it("no longer renders a standalone '## Declared corpus' section (dissolved)", () => {
    const md = renderMarkdown(reconciliationFixture, ctx);
    expect(md).not.toContain("## Declared corpus");
    expect(md).not.toContain("Declared scenarios:");
  });

  it("recovers the declared census from the ledger scenario-count alone — the zero-evidence scenario is a both-missing row, not a warning", () => {
    const md = renderMarkdown(reconciliationFixture, ctx);
    // The ledger summary counts ALL three declared scenarios (1 balanced, 2 out-of-balance —
    // SCN-C's both-missing row is one of them), so the declared total is on the page directly.
    expect(md).toContain("- 3 scenario(s): 1 balanced, 2 out-of-balance.");
    // The zero-evidence scenario is a ledger row (a both-missing item), NOT a warnings entry.
    expect(md).toContain("SCN-C");
    expect(md).toContain("⊘ Evidence Observation and Evidence Obligation are both missing for the Scenario");
    expect(md).not.toContain("## Warnings");
  });

  it("places the ledger summary under the '## Scenario Reconciliations' heading at the end, after Summary views", () => {
    const md = renderMarkdown(reconciliationFixture, ctx);
    const iSummary = md.indexOf("## Summary views");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iCount = md.indexOf("- 3 scenario(s):");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    expect(iSummary).toBeGreaterThanOrEqual(0);
    expect(iSummary).toBeLessThan(iLedger);
    expect(iLedger).toBeLessThan(iCount);
    expect(iCount).toBeLessThan(iTable);
  });
});

/**
 * Unit test for the markdown excluded-occurrence bullet (@SCN-RPT-008).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-008 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the evidenceObligationsSection extension in isolation: when a EvidenceObligations is
 * threaded as the optional third arg, renderMarkdown(balance, ctx, corpus) appends
 * "- M @SCN ids seen in non-tag context, excluded" to the "## Declared corpus"
 * section, after the RPT-007 declared-count bullet. When no corpus is threaded the
 * 2-arg call is byte-green (the RPT-007 section renders without the excluded bullet).
 *
 * Teeth: until the emitter reads the corpus arg, the excluded bullet is absent, so
 * its assertions red (the genuine red→green). The 2-arg omission case is the
 * back-compat guard (the existing byte/JSON guards pass the corpus to nothing).
 *
 * Parent: (@SCN-RPT-008).
 */
describe("[SCN-RPT-008] the markdown report outcomes the excluded non-tag @SCN occurrences", () => {
  const simple: Ledger = {
    scenarioReconciliations: [
      { scnId: "SCN-A", kind: "scenario", evidenceObservations: [], evidenceObligations: [], verdict: "balanced", qualityCheckReconciliations: [], pendingItems: [], reconcilingItems: [] },
    ],
  };
  const evidenceObligations = { rawScnOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [], proseOnlyCodes: [] };

  it("appends a '- M @SCN ids seen in non-tag context, excluded' bullet to the ledger summary when a corpus is threaded", () => {
    const md = renderMarkdown(simple, ctx, evidenceObligations);
    // The bullet now rides in the ledger summary (the Declared-corpus section
    // was dissolved).
    expect(md).toContain("## Scenario Reconciliations");
    expect(md).toContain("- 3 @SCN ids seen in non-tag context, excluded");
  });

  it("places the excluded bullet within the ledger summary, after the scenario-count bullet and above the ledger table", () => {
    const md = renderMarkdown(simple, ctx, evidenceObligations);
    const iCount = md.indexOf("- 1 scenario(s):");
    const iExcluded = md.indexOf("@SCN ids seen in non-tag context, excluded");
    expect(iCount).toBeGreaterThanOrEqual(0);
    expect(iExcluded).toBeGreaterThan(iCount);
    expect(iExcluded).toBeLessThan(md.indexOf("| Scenario | Verdict | Reconciling items |"));
  });

  it("omits the excluded bullet when no corpus is threaded (the 2-arg call still renders the ledger summary)", () => {
    const md = renderMarkdown(simple, ctx);
    // The ledger summary scenario-count still renders.
    expect(md).toContain("- 1 scenario(s): 1 balanced, 0 out-of-balance.");
    // But the excluded bullet is absent, and no standalone Declared-corpus section exists.
    expect(md).not.toContain("@SCN ids seen in non-tag context, excluded");
    expect(md).not.toContain("## Declared corpus");
  });
});

/**
 * Unit test for the reformatted report layout (@SCN-RPT-009).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-009 id matching features/report.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * Proves the summary-first / ledger-last structure in isolation: renderMarkdown opens
 * with `# Evidence Reconciliation` (not `# Ledger`), keeps `## Run provenance`
 * first, groups the derived cuts under `## Summary views` (trial balance →
 * static-guard evidence obligations → out-of-balance by feature), and moves the
 * per-scenario `## Scenario Reconciliations` ledger to the END with its summary lines on top,
 * `## Warnings` last. A pure derive over the balance; markdown-only (the JSON surface
 * is unchanged by the reorg). The RPT-004/005/006/007 scenarios are updated in the
 * same change to the new heading levels / total lines / table form / dissolution.
 */
describe("[SCN-RPT-009] the markdown report renders summary-first, ledger-last", () => {
  // A balance exercising every section: a balanced scenario, two out-of-balance
  // scenarios (one carrying a static-guard watermelon), and a no-evidence-declared
  // warning — so the full section set renders and the ordering can be asserted.
  const reformatted: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-LDG-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-LDG-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "missing" }],
        pendingItems: [],
        reconcilingItems: [{ qualityCheck: "unit", outcome: "missing" }],
      },
      {
        scnId: "SCN-LNT-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "lint", guard: "guard-lint", outcome: "watermelon" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "lint", guard: "guard-lint", outcome: "watermelon" },
        ],
      },
    ],
  };

  it("titles the report '# Evidence Reconciliation', not '# Ledger' or '# Spec reconciliation'", () => {
    const md = renderMarkdown(reformatted, ctx);
    // The H1 opens the report — the report IS the reconciliation. "Ledger" names
    // only the INPUT in canon; the reconciled OUTPUT is never titled "Ledger".
    expect(md.startsWith("# Evidence Reconciliation")).toBe(true);
    // Neither prior H1 (the "# Ledger" original, nor the "# Spec reconciliation" interim)
    // may appear as a line; the per-scenario rows now live under the "## Scenario
    // Reconciliations" H2 (renamed from "## Ledger").
    const lines = md.split("\n");
    expect(lines).not.toContain("# Ledger");
    expect(lines).not.toContain("# Spec reconciliation");
    expect(lines).toContain("## Scenario Reconciliations");
  });

  it("renders the sections in summary-first / ledger-last order", () => {
    const md = renderMarkdown(reformatted, ctx);
    const order = [
      "# Evidence Reconciliation",
      "## Run provenance",
      "## Summary views",
      "### Evidence reconciliation",
      "### Lint evidence obligations",
      "### Out-of-balance by feature",
      "## Scenario Reconciliations",
    ].map((h) => md.indexOf(h));
    // Every section is present...
    for (const i of order) expect(i).toBeGreaterThanOrEqual(0);
    // ...and in strictly increasing document order.
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!).toBeLessThan(order[i]!);
    }
    // The `## Warnings` section dissolved entirely — the ledger is now LAST.
    expect(md).not.toContain("## Warnings");
  });

  it("moves the per-scenario ledger to the end, with its summary lines on top of the table", () => {
    const md = renderMarkdown(reformatted, ctx);
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iSummaryLine = md.indexOf("- 3 scenario(s): 1 balanced, 2 out-of-balance.");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    expect(iLedger).toBeLessThan(iSummaryLine);
    expect(iSummaryLine).toBeLessThan(iTable);
    // The ledger is the LAST major view (the warnings axis dissolved).
    expect(iTable).toBeGreaterThan(md.indexOf("### Out-of-balance by feature"));
  });

  it("labels the ledger's reconciling items by tag (unit / lint), never by the internal kind (runtime / static)", () => {
    const md = renderMarkdown(reformatted, ctx);
    // The runtime evidenceObligation renders its bare LEVEL; the static (@lint) evidenceObligation
    // renders the tag word "lint" — both level-less of the kind axis.
    expect(md).toContain("| SCN-LDG-002 | ✗ out-of-balance | unit ∅ Evidence Observation is missing |");
    expect(md).toContain(
      "| SCN-LNT-001 | ✗ out-of-balance | lint 🍉 Evidence Observation is passing but fabricated |"
    );
    // The kind axis ("runtime" / "static") is never rendered in the report.
    expect(md).not.toContain("runtime/");
    expect(md).not.toContain("static 🍉");
  });
});

/**
 * Unit test for the markdown Test volume cut (@SCN-RPT-010).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-010
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the testVolumeSection in isolation: when a RuntimeEvidenceObservationKindCounts is threaded as
 * the 4th arg, renderMarkdown emits a "### Test volume" cut under Summary views — the
 * balancing identity line ("N evidenceObservations = M attributed + C cites-unknown-scenario + K cites-no-scenario", a derived
 * view) then a by-level evidenceObservation table with ALL four levels (e2e/performance zeros
 * shown — a fixed tally like Evidence reconciliation), levels read as lowercase tag words. When
 * no evidenceObservations is threaded the 3-arg call omits the cut (the back-compat guard).
 *
 * Parent: (@SCN-RPT-010) — the evidenceObservations-reconciliation spine.
 */
describe("[SCN-RPT-010] the markdown report renders the Test volume evidenceObservations reconciliation", () => {
  const balance: Ledger = {
    scenarioReconciliations: [
      { scnId: "SCN-A", kind: "scenario", evidenceObservations: [], evidenceObligations: [], verdict: "balanced", qualityCheckReconciliations: [], pendingItems: [], reconcilingItems: [] },
    ],
  };
  // A evidenceObservations fixture whose kind-counts sum cleanly: raw 5 unit + 3 integration = 8;
  // attributed-to-declared 4 + phantomEvidenceObservation 1 = 5 attributed; suspenseEvidenceObservation 3 ⇒ 8 = 5 + 3.
  const evidenceObservations: RuntimeEvidenceObservationKindCounts = {
    rawByRuntimeQualityCheck: { unit: 5, integration: 3, e2e: 0, performance: 0 },
    attributed: [{ scnId: "SCN-A", qualityCheck: "unit", count: 4 }],
    undemandedCount: 0,
    phantomCount: 1,
    suspenseCount: 3,
  };

  it("[SCN-RPT-010] renders a '### Test volume' section with the three-way balancing identity line", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    expect(md).toContain("### Test volume");
    expect(md).toContain("8 evidence observations = 4 attributed + 1 cites-unknown-scenario + 3 cites-no-scenario.");
  });

  it("renders a by-level evidenceObservation table with all four levels, zeros shown, levels as lowercase tag words", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    expect(md).toContain("| Quality-check | Evidence observations |");
    expect(md).toContain("| unit | 5 |");
    expect(md).toContain("| integration | 3 |");
    expect(md).toContain("| e2e | 0 |");
    expect(md).toContain("| performance | 0 |");
  });

  it("slots Test volume under Summary views, after Evidence reconciliation and before the ledger", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    const iSummary = md.indexOf("## Summary views");
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iVolume = md.indexOf("### Test volume");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iSummary).toBeLessThan(iHeadline);
    expect(iHeadline).toBeLessThan(iVolume);
    expect(iVolume).toBeLessThan(iLedger);
  });

  it("omits the cut entirely when no evidenceObservations aggregate is threaded (the 3-arg back-compat path)", () => {
    const md = renderMarkdown(balance, ctx);
    expect(md).not.toContain("### Test volume");
  });
});

/**
 * Unit test for the per-scenario evidence columns (@SCN-RPT-011).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-011
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the ledger's corpus-driven evidence columns in isolation: when the evidenceObservations
 * aggregate is threaded, each scenario row gains columns (Lint first, then the runtime
 * levels present in demand or evidenceObservations — e2e/performance only when present) with the
 * four-way demand×evidenceObservations cell encoding (`N` backing present / `∅` missing /
 * `(N)` observations at a quality-check never demanded / `—` neither), preceded by the fixed cell
 * key. The cell counts BACKING, not quality. Without it the original three-column ledger is preserved.
 *
 * RECONCILER-TRUE FIXTURE (evidence-manifesto §11A, 3F-1808). The balance and the census are
 * PRODUCED by `reconcile()` + `countRuntimeEvidenceObservationKinds()` over a scenario +
 * observation corpus — never hand-written. The previous hand-built fixture pinned the `(N)` branch
 * with an `attributed` entry at an UNDECLARED pair, a shape the census CANNOT emit (it defines
 * `attributed` as credits matching a DECLARED pair; a credit at an undeclared pair is undemanded).
 * The branch was pinned by impossible data, which is exactly why the undemanded bug survived a
 * green suite. Building the fixture through the reconciler makes that shape UNCONSTRUCTIBLE, and
 * forces the two REAL `(N)` shapes into the corpus:
 *   - UNDEMANDED (SCN-C, @SCN-LDG-008): a credit citing a real scenario at a quality-check it never
 *     declared. The reconciler posts a credit-side `undemanded` row ON the scenario; the census
 *     keeps the credit OUT of `attributed` (into undemandedCount). The cell must NOT read that row
 *     as a demand (it rendered ∅ — "missing" — pre-fix) and must count the (N) off the rows.
 *   - PENDING + ATTRIBUTED (SCN-F, live in production today): a `<qc>pending` obligation partitions
 *     to a one-sided Pending Item and posts NO reconciled row, yet the pending pair STAYS in
 *     evidenceObligationPairs — so the credit citing it IS attributed. Not demanded, count > 0 →
 *     (N). It is IN the fixture and asserted because the fix KEEPS the `attributed` term in the
 *     not-demanded branch: keeping code alive on a rationale nothing asserts is §11A one level up.
 *
 * Parent: (@SCN-RPT-011) — per-scenario evidence columns.
 */
describe("[SCN-RPT-011] the markdown ledger renders per-scenario evidence columns", () => {
  // The CORPUS — declared scenarios + observed evidence, spanning every cell case across
  // Lint / Unit / Integration. The balance below is RECONCILED from it, so every row is a shape
  // the pipeline actually emits:
  //   SCN-A: @unit (2 observations) + two lint guards, one wired (satisfied) one not (watermelon)
  //          → Lint 2 (guards PRESENT), Unit 2
  //   SCN-B: @unit, no observation → Unit ∅
  //   SCN-C: @unit (1 observation) + an integration observation it NEVER demanded → Unit 1,
  //          Integration (1) — the UNDEMANDED shape
  //   SCN-D: @integration (1 observation), no @unit → Unit —, Integration 1
  //   SCN-E: one lint guard, absent → Lint ∅
  //   SCN-F: @unitpending with a unit observation attributed at the pending pair → Unit (1)
  const scenarios: Scenario[] = [
    {
      scnId: "SCN-A",
      evidenceObligations: [
        { qualityCheck: "unit" },
        { qualityCheck: "lint", guard: "guard-x" },
        { qualityCheck: "lint", guard: "guard-y" },
      ],
    },
    { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "integration" }] },
    { scnId: "SCN-E", evidenceObligations: [{ qualityCheck: "lint", guard: "guard-z" }] },
    { scnId: "SCN-F", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    // SCN-C's integration credit cites a quality-check SCN-C never declared → UNDEMANDED.
    { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-C", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-D", status: "passed" },
    // SCN-F's unit obligation is PENDING; the credit still lands at the (declared) pending pair,
    // so the census counts it ATTRIBUTED while the reconciler posts no row → the (N) preserved path.
    { qualityCheck: "unit", scnId: "SCN-F", status: "passed" },
    // The guards: guard-x wired into CI over real source → satisfied; guard-y exists but is not
    // wired → the watermelon (PRESENT, so it counts into the Lint cell); guard-z has no
    // observation at all → missing (∅).
    { qualityCheck: "lint", guard: "guard-x", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "lint", guard: "guard-y", exists: true, enforcedOverRealSource: false },
  ];
  const balance: Ledger = reconcile(scenarios, observations);
  const evidenceObservations: RuntimeEvidenceObservationKindCounts =
    countRuntimeEvidenceObservationKinds({ observations, scenarios });

  it("builds the fixture through the reconciler — the undemanded credit is OUT of attributed, and the pending pair's credit is IN", () => {
    // The fixture's own guard: it can only pin shapes the pipeline emits. The SCN-C integration
    // credit is UNDEMANDED (never attributed — the shape the old hand-built fixture faked), while
    // the SCN-F credit at the PENDING pair IS attributed.
    expect(evidenceObservations.undemandedCount).toBe(1);
    expect(evidenceObservations.attributed).not.toContainEqual({
      scnId: "SCN-C",
      qualityCheck: "integration",
      count: 1,
    });
    expect(evidenceObservations.attributed).toContainEqual({
      scnId: "SCN-F",
      qualityCheck: "unit",
      count: 1,
    });
    // And SCN-F's pending obligation posts a one-sided Pending Item, never a reconciled row.
    const scnF = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-F");
    expect(scnF?.pendingItems).toEqual([{ qualityCheck: "unit" }]);
    expect(scnF?.qualityCheckReconciliations).toEqual([]);
  });

  it("renders corpus-driven columns — Lint first, then the runtime levels present (e2e/performance absent)", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    expect(md).toContain("| Scenario | Lint | Unit | Integration | Verdict | Reconciling items |");
    // e2e / performance are absent from this corpus, so they get no column.
    expect(md).not.toContain("| Performance |");
    expect(md).not.toContain(" E2e ");
  });

  it("encodes the four cell cases — count, ∅, (N), and —", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    // demanded & met → the count; SCN-A: Lint 2 (two guards present), Unit 2.
    expect(md).toContain("| SCN-A | 2 | 2 | — |");
    // demanded & missing → ∅ (missing).
    expect(md).toContain("| SCN-B | — | ∅ | — |");
    // not demanded but present → (N): SCN-C's integration credit is UNDEMANDED — the reconciler
    // posts a credit-side row on SCN-C, which is NOT a demand. Pre-fix the cell read it as one and
    // rendered ∅ ("missing" — write the test), contradicting its own Reconciling-items column.
    expect(md).toContain("| SCN-C | — | 1 | (1) |");
    // declared elsewhere, absent here → —.
    expect(md).toContain("| SCN-D | — | — | 1 |");
    // lint declared but its guard missing → ∅.
    expect(md).toContain("| SCN-E | ∅ | — | — |");
  });

  it("renders (N) for an observation attributed at a PENDING pair — the second, live-today (N) shape", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    // SCN-F's unit obligation is deferred, so it posts no reconciled row (not demanded), but its
    // credit IS attributed at the still-declared pending pair → (1). Dropping the `attributed`
    // term from the not-demanded branch would silently regress this to —.
    expect(md).toContain("| SCN-F | — | (1) | — |");
  });

  it("counts the lint cell by guards PRESENT (balanced or watermelon), not 0/1", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    // SCN-A declares two static guards, both present (one balanced, one watermelon) → 2.
    expect(md).toContain("| SCN-A | 2 |");
  });

  it("renders the fixed cell key before the table, with row 1 reading 'attributed to' (backing, not balanced)", () => {
    const md = renderMarkdown(balance, ctx, undefined, evidenceObservations);
    expect(md).toContain("| `N` | N evidence observations attributed to a declared evidence obligation |");
    expect(md).toContain("| `∅` | evidence obligation declared, no evidence observation — missing |");
    expect(md).toContain("| `(N)` | N evidence observations present, no evidence obligation declared |");
    // The cell counts backing, not quality — the key must NOT claim "balanced".
    expect(md).not.toContain("satisfy a declared evidence obligation (balanced)");
    // The key precedes the ledger table.
    const iKey = md.indexOf("| Cell | Meaning |");
    const iTable = md.indexOf("| Scenario | Lint |");
    expect(iKey).toBeGreaterThanOrEqual(0);
    expect(iKey).toBeLessThan(iTable);
  });

  it("preserves the original three-column ledger when no evidenceObservations is threaded (back-compat)", () => {
    const md = renderMarkdown(balance, ctx);
    expect(md).toContain("| Scenario | Verdict | Reconciling items |");
    expect(md).not.toContain("| Scenario | Lint |");
    expect(md).not.toContain("| Cell | Meaning |");
  });
});

/*
 * [SCN-RPT-012] — the suspense-tests Warnings sub-part — RETIRED (@SCN-LDG-007).
 * A credit citing NO @SCN anchor no longer renders as a Warnings sub-part; it now surfaces as
 * a SUSPENSE-scenario reconciliation row `(no scenario)` in the Ledger (with its locator on a
 * cites-no-scenario item), so its detail lives in exactly one place (no double-report). The
 * suspense render is proven by [SCN-LDG-007] (reconcile.test.ts + ledger.steps.ts); the
 * section-dissolve by report.test.ts [SCN-RMD-003] / json.test.ts [SCN-RPT-010]. The
 * suspense COUNT survives in summary.testVolume (the balance-check identity is kept).
 */

/*
 * [SCN-RPT-013] — the phantom-id Warnings sub-part — RETIRED (@SCN-LDG-006).
 * A credit citing an undeclared @SCN no longer renders as a Warnings sub-part; it now
 * surfaces as a PHANTOM-scenario reconciliation row in the Ledger (with its id + locator),
 * so its detail lives in exactly one place (no double-report). The phantom render is
 * proven by [SCN-LDG-006] (reconcile.test.ts + ledger.steps.ts); the section-dissolve by
 * report.test.ts [SCN-RMD-003] / json.test.ts [SCN-RPT-010].
 */

/**
 * Unit test for the untagged-scenarios census (@SCN-RPT-014).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-014
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * The `## Warnings` section dissolved entirely — untagged scenarios are a
 * declared-side CENSUS fact (on report.evidenceObligations), NOT a warning and NOT a
 * reconciling item, so they re-home into the ledger-summary declared-corpus census
 * (co-located with the excluded-occurrence bullet), listing the count + `feature :
 * scenario` locators (sorted). They render when a corpus is threaded; there is NO
 * `## Warnings` heading anywhere.
 *
 * Parent: (@SCN-RPT-014) — anchor audit: untagged scenarios.
 */
describe("[SCN-RPT-014] the markdown report renders untagged scenarios in the declared-corpus census", () => {
  const balanced: Ledger = {
    scenarioReconciliations: [
      { scnId: "SCN-A", kind: "scenario", evidenceObservations: [], evidenceObligations: [], verdict: "balanced", qualityCheckReconciliations: [], pendingItems: [], reconcilingItems: [] },
    ],
  };
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
    const md = renderMarkdown(balanced, ctx, evidenceObligations);
    expect(md).not.toContain("## Warnings");
    expect(md).toContain("2 scenario(s) carry no @SCN tag:");
    expect(md).toContain("- alpha.feature : a scenario with no anchor");
    expect(md).toContain("- beta.feature : another untagged scenario");
  });

  it("renders the census inside the ledger summary (co-located with the declared corpus), not a warnings surface", () => {
    const md = renderMarkdown(balanced, ctx, evidenceObligations);
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iUntagged = md.indexOf("2 scenario(s) carry no @SCN tag:");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    // The census rides in the ledger summary — after the "## Scenario Reconciliations" heading, above the table.
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeLessThan(iUntagged);
    expect(iUntagged).toBeLessThan(iTable);
  });

  it("sorts the locators by (feature, scenario)", () => {
    const md = renderMarkdown(balanced, ctx, evidenceObligations);
    expect(md.indexOf("alpha.feature")).toBeLessThan(md.indexOf("beta.feature"));
  });

  it("omits the untagged census when no corpus is threaded (back-compat)", () => {
    const md = renderMarkdown(balanced, ctx);
    expect(md).not.toContain("carry no @SCN tag");
    expect(md).not.toContain("## Warnings"); // the warnings axis is gone entirely
  });
});

/**
 * Unit test for the prose-only-codes census (@SCN-RPT-015).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-015
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * The `## Warnings` section dissolved entirely — prose-only codes (@SCN ids
 * mentioned in prose but never tagged anywhere) are a declared-side CENSUS fact (on
 * report.evidenceObligations), NOT a warning, so they re-home into the ledger-summary
 * declared-corpus census, listing the count + the bare codes (sorted), AFTER the untagged
 * sub-part. There is NO `## Warnings` heading anywhere.
 *
 * Parent: (@SCN-RPT-015) — anchor audit: prose-only codes.
 */
describe("[SCN-RPT-015] the markdown report renders prose-only @SCN codes in the declared-corpus census", () => {
  const balanced: Ledger = {
    scenarioReconciliations: [
      { scnId: "SCN-A", kind: "scenario", evidenceObservations: [], evidenceObligations: [], verdict: "balanced", qualityCheckReconciliations: [], pendingItems: [], reconcilingItems: [] },
    ],
  };
  const evidenceObligations = {
    rawScnOccurrences: 0,
    scenarioCount: 0,
    excludedOccurrences: 0,
    untaggedScenarios: [],
    proseOnlyCodes: ["SCN-FOO-001", "SCN-BAR-013"],
  };

  it("lists the prose-only-code count + the bare codes, with NO warnings section", () => {
    const md = renderMarkdown(balanced, ctx, evidenceObligations);
    expect(md).not.toContain("## Warnings");
    expect(md).toContain("2 @SCN code(s) appear only in prose, never as a tag:");
    expect(md).toContain("- SCN-FOO-001");
    expect(md).toContain("- SCN-BAR-013");
  });

  it("sorts the codes", () => {
    const md = renderMarkdown(balanced, ctx, evidenceObligations);
    expect(md.indexOf("SCN-BAR-013")).toBeLessThan(md.indexOf("SCN-FOO-001"));
  });

  it("renders the prose-only census after the untagged census within the ledger summary", () => {
    const evidenceObligationsAll = {
      ...evidenceObligations,
      untaggedScenarios: [{ feature: "x.feature", scenario: "an untagged one" }],
    };
    const md = renderMarkdown(balanced, ctx, evidenceObligationsAll);
    expect(md).not.toContain("## Warnings");
    const iUntagged = md.indexOf("carry no @SCN tag");
    const iProse = md.indexOf("appear only in prose, never as a tag");
    expect(iUntagged).toBeGreaterThanOrEqual(0);
    expect(iProse).toBeGreaterThanOrEqual(0);
    expect(iUntagged).toBeLessThan(iProse);
  });

  it("omits the prose-only census when no corpus is threaded (back-compat)", () => {
    const md = renderMarkdown(balanced, ctx);
    expect(md).not.toContain("appear only in prose");
    expect(md).not.toContain("## Warnings");
  });
});

/**
 * Unit test for the markdown Static guards section (@SCN-USG-001) — the
 * static-axis mirror of ### Test volume. Proves renderMarkdown surfaces the guard
 * reconciliation: the identity line always, the suspenseEvidenceObservation list only when non-empty,
 * and the whole section omitted on the back-compat (no-guards) call. Markdown-only.
 */
describe("[SCN-USG-001] the markdown report renders the Static guards section", () => {
  const emptyBalance: Ledger = { scenarioReconciliations: [] };

  it("renders '### Static guards' with the counts line ONLY — the per-guard detail dissolved to the suspense row", () => {
    const md = renderMarkdown(emptyBalance, ctx, undefined, undefined, undefined, {
      runningGuardCount: 2,
      unattributedStaticGuardCount: 1,
    });
    expect(md).toContain("### Static guards");
    expect(md).toContain("2 guard(s) run, 1 unattributed static-guard(s).");
    // The per-guard DETAIL list dissolved into the suspense-scenario row (@SCN-LDG-007,
    // ruling Q4) — the section carries only the summary-level counts now, no bullets.
    expect(md).not.toContain("- lint:bar");
    expect(md).not.toContain("— a CI guard no @lint declares:");
  });

  it("shows the counts line but omits the list when every running guard is declared", () => {
    const md = renderMarkdown(emptyBalance, ctx, undefined, undefined, undefined, {
      runningGuardCount: 1,
      unattributedStaticGuardCount: 0,
    });
    expect(md).toContain("1 guard(s) run, 0 unattributed static-guard(s).");
    // The counts summarise the volume; the itemised list (only shown when > 0) is omitted.
    expect(md).not.toContain("— a CI guard no @lint declares:");
  });

  it("omits the Static guards section when no guard reconciliation is threaded (back-compat)", () => {
    const md = renderMarkdown(emptyBalance, ctx);
    expect(md).not.toContain("### Static guards");
  });
});

/**
 * Unit test for the flat obligation-summary decomposition (@SCN-RPT-019, 3F-1453).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-019 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the evidenceReconciliationSection decomposes the evidence-obligation
 * out-of-balance into a FLAT list of the nine leaf outcomes — with NO
 * debit/credit/neither group-side subtotal rows. The former grouping emitted both a
 * "↳ <group>-side" subtotal row AND each leaf row at the same "↳" indent, so a naive
 * column-sum double-counted (the live 170 vs 85). Removing the grouping leaves exactly
 * nine counted "↳ <outcome>" rows reconciling to the out-of-balance total once.
 *
 * EXHAUSTIVENESS (3F-1649, superseded as the primary mechanism by 3F-1806):
 * OUT_OF_BALANCE_OUTCOMES USED TO BE a hand-maintained readonly Outcome[] in the renderer, so
 * it could fall behind the union silently — as it did when `broken` (@SCN-LDG-017) joined:
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
 *
 * Parent: (@SCN-RPT-019).
 */
describe("[SCN-RPT-019] the markdown obligation summary lists the nine leaf outcomes with no group rows", () => {
  // A balance whose out-of-balance obligations span all three FORMER groups:
  //   DEBIT   — SCN-A carries a missing obligation.
  //   CREDIT  — the suspense row carries a cites-no-scenario credit.
  //   NEITHER — SCN-C reconciles to zero on both sides (a both-missing row).
  // byOutcome (derived from every row's evidenceObligations[]): missing 1,
  // cites-no-scenario 1, both-missing 1, everything else 0 — out-of-balance = 3.
  const spanning: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-A",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "missing" }],
        pendingItems: [],
        reconcilingItems: [{ qualityCheck: "unit", outcome: "missing" }],
      },
      {
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "tests/stray.test.ts:1" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "tests/stray.test.ts:1" },
        ],
      },
      {
        scnId: "SCN-C",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ outcome: "both-missing" }],
        pendingItems: [],
        reconcilingItems: [{ outcome: "both-missing" }],
      },
    ],
  };

  // The nine out-of-balance leaf outcomes in canonical (model.ts reading) order —
  // satisfied excluded (it is the balanced outcome, not in the out-of-balance decomposition).
  const LEAVES = [
    "missing",
    "failing",
    "watermelon",
    "cites-unknown-scenario",
    "cites-no-scenario",
    // The DEBIT twin of cites-no-scenario (@SCN-LDG-021, 3F-1774) — a real, ordinary scenario
    // carrying no @SCN, whose obligation has no code for an observation to link to. The ninth leaf.
    "no-scn-code",
    "broken",
    "undemanded",
    "both-missing",
  ] as const;

  // The EXHAUSTIVENESS source of truth (3F-1649): a type-forced Record over the whole
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
    broken: true,
    undemanded: true,
    "both-missing": true,
  };
  const EXPECTED_LEAVES = (Object.keys(ALL_OUTCOMES) as Outcome[]).filter(
    (outcome) => outcome !== "satisfied"
  );

  it("decomposes the evidence-obligation out-of-balance into exactly the nine leaf outcome rows", () => {
    const md = renderMarkdown(spanning, ctx);
    // Every leaf outcome renders as a counted "↳ <description>" row — the canon
    // description, not the bare handle (3F-1626), located via the single-sourced map.
    for (const leaf of LEAVES) {
      expect(md).toContain(`| ↳ ${OUTCOME_DESCRIPTION[leaf]} |`);
    }
    // And there are EXACTLY nine "↳" rows in the decomposition — no more (the group-side
    // subtotal rows are gone). Count every "↳ " marker across the rendered document; the
    // only "↳" rows are the nine leaf decomposition rows.
    const arrowRows = md.split("\n").filter((line) => line.includes("↳"));
    expect(arrowRows.length).toBe(9);
  });

  it("renders a leaf row for EVERY Outcome member except satisfied (the exhaustiveness guard)", () => {
    const md = renderMarkdown(spanning, ctx);
    // The rendered leaf set, read back off the markdown, mapped from canon description to
    // handle — the observable form of OUT_OF_BALANCE_OUTCOMES.
    const rendered = new Set(
      md
        .split("\n")
        .filter((line) => line.includes("↳"))
        .map((line) => line.split("|")[1]?.trim().replace("↳ ", ""))
    );
    // Every member of the union except satisfied MUST be there: the derived (3F-1806)
    // OUT_OF_BALANCE_OUTCOMES can never fall behind the Outcome union.
    for (const outcome of EXPECTED_LEAVES) {
      expect(rendered).toContain(OUTCOME_DESCRIPTION[outcome]);
    }
    // And nothing else is: satisfied never renders a leaf row, and no group-side row does.
    expect(rendered.size).toBe(EXPECTED_LEAVES.length);
    expect(rendered).not.toContain(OUTCOME_DESCRIPTION.satisfied);
  });

  it("sums the leaf counts to the evidence-obligation out-of-balance total", () => {
    const md = renderMarkdown(spanning, ctx);
    // The Evidence-obligation subject row's out-of-balance count.
    const oblOutOfBalance = Number(
      /\| Evidence obligation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]
    );
    expect(oblOutOfBalance).toBe(3);
    // Each leaf row's own out-of-balance count, summed.
    let leafSum = 0;
    for (const leaf of LEAVES) {
      const n = Number(
        new RegExp(`↳ ${OUTCOME_DESCRIPTION[leaf]} \\|[^\\d]*(\\d+) \\|`).exec(md)?.[1]
      );
      expect(Number.isNaN(n)).toBe(false);
      leafSum += n;
    }
    expect(leafSum).toBe(oblOutOfBalance);
  });

  it("renders NO debit-side / credit-side / neither-side group subtotal row", () => {
    const md = renderMarkdown(spanning, ctx);
    expect(md).not.toContain("↳ debit-side");
    expect(md).not.toContain("↳ credit-side");
    expect(md).not.toContain("↳ neither-side");
  });
});

/**
 * Unit test for the outcome-description gloss (@SCN-RPT-020, 3F-1626).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-020 id
 * matching features/report.feature, so a grep of the id returns both halves of the pair.
 *
 * The reconciling-item outcome is meaningless to a human as a bare handle in a CI log. This
 * pins that the markdown renders each outcome's CANON DESCRIPTION in place of the handle,
 * EVERYWHERE an outcome surfaces to a reader — the summary `↳` decomposition rows, the
 * per-scenario reconciling-items list, and the lint-obligation table's Outcome column — and
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
  // (unit missing) and a lint watermelon (→ the lint table AND a per-scenario lint item);
  // SCN-B is the degenerate both-missing (neither-side) item; the suspense row carries a
  // credit-side cites-no-scenario item with a locator. The summary `↳` decomposition always
  // renders all nine leaves (zero counts shown), so every outcome's description is on the page.
  const rich: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-A",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "unit", outcome: "missing" },
          { qualityCheck: "lint", guard: "typecheck", outcome: "watermelon" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "unit", outcome: "missing" },
          { qualityCheck: "lint", guard: "typecheck", outcome: "watermelon" },
        ],
      },
      {
        scnId: "SCN-B",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ outcome: "both-missing" }],
        pendingItems: [],
        reconcilingItems: [{ outcome: "both-missing" }],
      },
      {
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          { qualityCheck: "integration", outcome: "cites-no-scenario", locator: "tests/stray.test.ts:1" },
        ],
        pendingItems: [],
        reconcilingItems: [
          { qualityCheck: "integration", outcome: "cites-no-scenario", locator: "tests/stray.test.ts:1" },
        ],
      },
    ],
  };

  it("renders every summary ↳ decomposition row with the canon description, and no bare handle", () => {
    const md = renderMarkdown(rich, ctx);
    // Each out-of-balance leaf carries its canon description in the Subject cell.
    // (`broken` — @SCN-LDG-017 — and `no-scn-code` — @SCN-LDG-021 — are asserted by
    // @SCN-RPT-019's exhaustiveness guard.)
    expect(md).toContain("| ↳ Evidence Observation is missing |");
    expect(md).toContain("| ↳ Evidence Observation is failing |");
    expect(md).toContain("| ↳ Evidence Observation is passing but fabricated |");
    expect(md).toContain("| ↳ Evidence Observation cites an unknown Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites no Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites a Scenario that did not demand it |");
    expect(md).toContain(
      "| ↳ Evidence Observation and Evidence Obligation are both missing for the Scenario |"
    );
    // The bare handle is GONE from the summary Subject cells.
    for (const handle of [
      "missing",
      "failing",
      "watermelon",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "undemanded",
      "both-missing",
    ]) {
      expect(md).not.toContain(`| ↳ ${handle} |`);
    }
  });

  it("renders each per-scenario reconciling item with the canon description, glyph retained", () => {
    const md = renderMarkdown(rich, ctx);
    // Debit runtime item, lint watermelon item, neither-side both-missing item, credit item.
    expect(md).toContain("unit ∅ Evidence Observation is missing");
    expect(md).toContain("lint 🍉 Evidence Observation is passing but fabricated");
    expect(md).toContain(
      "⊘ Evidence Observation and Evidence Obligation are both missing for the Scenario"
    );
    expect(md).toContain(
      "integration ❓ Evidence Observation cites no Scenario (tests/stray.test.ts:1)"
    );
    // The bare handles are gone from the reconciling-items cells (the glyph stays).
    expect(md).not.toContain("∅ missing");
    expect(md).not.toContain("🍉 watermelon");
    expect(md).not.toContain("❓ cites-no-scenario");
  });

  it("renders the lint table's Outcome column with the canon description", () => {
    const md = renderMarkdown(rich, ctx);
    expect(md).toContain("| SCN-A | typecheck | 🍉 Evidence Observation is passing but fabricated |");
  });

  it("single-sources the gloss from OUTCOME_DESCRIPTION — the render cannot drift from the map", () => {
    const md = renderMarkdown(rich, ctx);
    // The rendered gloss is exactly the map's value at each site — so editing the map is the
    // only way to change the render, and a description can never diverge from the outcome it names.
    expect(md).toContain(`↳ ${OUTCOME_DESCRIPTION.missing}`);
    expect(md).toContain(`unit ∅ ${OUTCOME_DESCRIPTION.missing}`);
    expect(md).toContain(`🍉 ${OUTCOME_DESCRIPTION.watermelon}`);
    expect(md).toContain(`⊘ ${OUTCOME_DESCRIPTION["both-missing"]}`);
  });
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
        pendingItems: [{ qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-PDX-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "missing" }],
        reconcilingItems: [{ qualityCheck: "unit", outcome: "missing" }],
        pendingItems: [{ qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-PDX-003",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [],
        reconcilingItems: [],
        pendingItems: [],
      },
    ],
  };

  it("renders a balanced-with-pending row's Pending Item as a distinct ⏳ pending label, not a reconciling error", () => {
    const md = renderMarkdown(pendingBalance, ctx);
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
    const md = renderMarkdown(pendingBalance, ctx);
    const row = rowFor(md, "SCN-PDX-002");
    // The genuine unit error renders as a reconciling item (canon description; 3F-1626).
    expect(row).toMatch(/unit ∅ Evidence Observation is missing/);
    // The deferred integration obligation renders as a distinct Pending Item alongside it.
    expect(row).toMatch(/⏳ pending: integration/);
    expect(row).toContain("✗ out-of-balance");
  });

  it("leaves a clean-balanced row (no Pending Item) rendering the em-dash placeholder — the regression guard", () => {
    const md = renderMarkdown(pendingBalance, ctx);
    const row = rowFor(md, "SCN-PDX-003");
    expect(row).toContain("| SCN-PDX-003 | ✓ balanced | — |");
    expect(row).not.toContain("⏳");
  });

  it("keeps the Pending Item distinct in the wide evidence-column ledger path too", () => {
    // Thread an evidence-observation read so the ledger renders its wide (evidence-column)
    // table — the OTHER row-render path — and assert the ⏳ pending label survives there.
    const evidenceObservations: RuntimeEvidenceObservationKindCounts = {
      rawByRuntimeQualityCheck: { unit: 1, integration: 0, e2e: 0, performance: 0 },
      attributed: [],
      undemandedCount: 0,
      phantomCount: 0,
      suspenseCount: 0,
    };
    const md = renderMarkdown(pendingBalance, ctx, undefined, evidenceObservations);
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
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "missing" }],
        reconcilingItems: [{ qualityCheck: "unit", outcome: "missing" }],
        pendingItems: [{ qualityCheck: "integration" }],
      },
    ],
  };

  it("renders the Pending Items tally (3) in the Evidence reconciliation view, marked with ⏳", () => {
    const md = renderMarkdown(pendingBalance, ctx);
    const section = evidenceReconciliationSection(md);
    expect(section).toMatch(/⏳\s*3 Pending Item/);
  });

  it("keeps the out-of-balance leaf decomposition intact — the tally is NOT a leaf of its own", () => {
    const md = renderMarkdown(pendingBalance, ctx);
    const section = evidenceReconciliationSection(md);
    // The `↳ <description>` leaves still render, unchanged — located by the canon
    // description (3F-1626), not the bare handle.
    for (const leaf of [
      "missing",
      "failing",
      "watermelon",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "undemanded",
      "both-missing",
    ] as const) {
      expect(section).toContain(`↳ ${OUTCOME_DESCRIPTION[leaf]} `);
    }
    // The Pending tally is NEVER a `↳ pending` leaf row — anywhere in the report.
    expect(md).not.toContain("↳ pending");
  });

  it("renders the tally as its OWN line, after the out-of-balance decomposition (not a table row)", () => {
    const md = renderMarkdown(pendingBalance, ctx);
    const iBothMissing = md.indexOf(`↳ ${OUTCOME_DESCRIPTION["both-missing"]}`);
    const iTally = md.search(/⏳\s*3 Pending Item/);
    expect(iBothMissing).toBeGreaterThanOrEqual(0);
    expect(iTally).toBeGreaterThan(iBothMissing);
    // The tally line is not a `| ↳ ... |` table row.
    const tallyLine = md.split("\n").find((l) => /⏳\s*3 Pending Item/.test(l))!;
    expect(tallyLine.startsWith("| ↳")).toBe(false);
  });

  it("omits the tally line entirely when no scenario carries a Pending Item (byte-identical regression)", () => {
    const noPending: Ledger = {
      scenarioReconciliations: [
        {
          scnId: "SCN-PDX-003",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "balanced",
          qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
          reconcilingItems: [],
          pendingItems: [],
        },
      ],
    };
    const md = renderMarkdown(noPending, ctx);
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
    const md = renderMarkdown(contrastBalance, ctx);
    const row = rowFor(md, "SCN-PDD-001");
    expect(row).toContain("| SCN-PDD-001 | ✓ balanced | — |");
    expect(row).not.toContain("⏳");
  });

  it("renders the balanced-with-pending row as ✓ balanced with the ⏳ pending label — owed work, not an error", () => {
    const md = renderMarkdown(contrastBalance, ctx);
    const row = rowFor(md, "SCN-PDD-002");
    expect(row).toContain("✓ balanced");
    expect(row).toMatch(/⏳ pending: integration/);
    // Not the clean-balanced em-dash, and never a reconciling-item error (canon description; 3F-1626).
    expect(row).not.toMatch(/\|\s*—\s*\|/);
    expect(row).not.toMatch(/integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/);
  });

  it("makes the two balanced rows read differently at a glance — the pending cell is not the clean em-dash", () => {
    const md = renderMarkdown(contrastBalance, ctx);
    const cleanCell = exceptionsCell(rowFor(md, "SCN-PDD-001"));
    const pendingCell = exceptionsCell(rowFor(md, "SCN-PDD-002"));
    // Same verdict, different exceptions cell — the at-a-glance distinction the reviewer relies on.
    expect(cleanCell).toBe("—");
    expect(pendingCell).not.toBe(cleanCell);
    expect(pendingCell).toMatch(/⏳ pending: integration/);
  });
});

/**
 * Unit test for the unsound run-integrity stamp (@SCN-RPT-021), over BOTH broken kinds.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-021 id
 * matching features/report.feature, so a grep of the id returns both halves of the pair.
 * @unit ONLY (operator-endorsed): the renderer is a pure function over the report model, and the
 * pipeline manifestation is already carried by @SCN-LDG-017 / @SCN-LDG-018 / @SCN-LDG-019's arms.
 *
 * The customer-visible payoff of the whole `broken` slice (3F-1642, generalised over cucumber by
 * 3F-1654). A `missing` row tells the reader to WRITE A TEST; when the proof exists and merely
 * NEVER RAN, that instruction is wrong. So the markdown NAMES the broken evidence, PRINTS what
 * broke, and STAMPS the run "unsound" — the render headline word (the predicate is
 * `hasBrokenEvidence`; predicate-name ≠ headline-word, per `isBalanced` vs "balanced").
 *
 * TWO INSTANCES, ONE SHAPE (3F-1654). `broken` now has two producers, and the copy must read
 * truthfully over both:
 *   - VITEST — a suite that failed to COLLECT. The runner gives its own message (multi-line, with
 *     a stack), printed VERBATIM: the tool does not interpret it.
 *   - CUCUMBER — a step two or more step definitions match, so it never ran. Cucumber emits NO
 *     `error_message` for an ambiguous step, so there is nothing to quote: the reader SYNTHESISED
 *     the diagnosis upstream (@SCN-LDG-019) and the renderer prints what the item CARRIES. No
 *     per-reader branch here — the difference is already resolved before the renderer sees it.
 * The bounded softening (operator-mandated): pass the runner's words through where it gives them;
 * STATE the diagnosis where it gives none; PRESCRIBE NO CURE, either way. The renderer may name
 * WHAT failed and WHERE. It may never say how to fix it.
 *
 * Teeth (the Update, 3F-1744): today's copy is vitest-shaped — "N proving suites failed to
 * collect", "the collection error the runner reported", and an `OUTCOME_DESCRIPTION.broken` gloss
 * that names a suite's collection. Rendered over a CUCUMBER-broken balance it MISCALLS a
 * step-definition collision a collection failure — the tool lying about what broke. The
 * no-miscall assertions below red against it.
 *
 * Parent: (@SCN-RPT-021).
 */
describe("[SCN-RPT-021] the markdown names the broken evidence and its error, stamped unsound", () => {
  const VITEST_LOCATOR = "tests/harness/cucumber.trigger.test.ts";
  // A REAL vitest collection message: multi-line, with a stack — the shape that forces the
  // verbatim print into a fenced block rather than a table cell.
  const VITEST_MESSAGE =
    "Error: Cannot find package '@cucumber/tag-expressions' imported from " +
    `${VITEST_LOCATOR}\n    at packageResolve (node:internal/modules/esm/resolve:catch)\n    at moduleResolve (node:internal/modules/esm/resolve)`;

  const CUCUMBER_LOCATOR = "features/handover.feature";
  // The message the CUCUMBER reader SYNTHESISES (@SCN-LDG-019, verbatim from `ambiguousMessage`):
  // cucumber gives no error_message for an ambiguous step, so the reader states the diagnosis —
  // what broke, and no cure.
  const CUCUMBER_MESSAGE =
    'The step "When the handover is accepted" is ambiguous — two or more step definitions match ' +
    "it, so the step never ran.";

  /** The row (markdown table line) whose first cell is the given scnId. */
  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };

  /**
   * A declared scenario reconciling `missing` (its proof exists but never ran) alongside the
   * suspense row carrying the `broken` credit for it. The whole point of the slice is that a
   * reader can tell those two rows apart.
   */
  const balanceWithBroken = (
    item: ScenarioReconciliation["reconcilingItems"][number]
  ): Ledger => ({
    scenarioReconciliations: [
      {
        scnId: "SCN-HNS-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "missing" }],
        reconcilingItems: [{ qualityCheck: "unit", outcome: "missing" }],
        pendingItems: [],
      },
      {
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [],
        reconcilingItems: [item],
        pendingItems: [],
      },
    ],
  });

  // The lived an adopter's repository shape (3F-1642): vitest's collection failure.
  const vitestBroken = balanceWithBroken({
    qualityCheck: "unit",
    outcome: "broken",
    locator: VITEST_LOCATOR,
    message: VITEST_MESSAGE,
  });

  // The cucumber instance (3F-1654): an ambiguous step. The item's shape is identical — locator
  // + message — which is exactly why the renderer needs no per-reader branch.
  const cucumberBroken = balanceWithBroken({
    qualityCheck: "integration",
    outcome: "broken",
    locator: CUCUMBER_LOCATOR,
    message: CUCUMBER_MESSAGE,
  });

  /** The run-integrity section alone — where the stamp and the per-item lines live. */
  const integrityOf = (md: string): string => md.slice(md.indexOf("## Run integrity"));

  it("stamps each run unsound, above the summary views", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(balance, ctx);
      // "Unsound" is the RENDER HEADLINE word — the reader's one-glance verdict on run integrity.
      expect(md).toContain("## Run integrity: unsound");
      // Sited between the provenance header and the summary views: the stamp qualifies every
      // count below it (a `missing` in an unsound run may be a broken proof), so it must be read
      // FIRST. @SCN-RPT-009's summary-first / ledger-last ordering is otherwise unchanged.
      const iProvenance = md.indexOf("## Run provenance");
      const iStamp = md.indexOf("## Run integrity: unsound");
      const iSummary = md.indexOf("## Summary views");
      expect(iProvenance).toBeLessThan(iStamp);
      expect(iStamp).toBeLessThan(iSummary);
      // The stamp explains what it INVALIDATES — that a `missing` below may be a broken proof,
      // not an absent one. Without this the word "unsound" is a label with no consequence.
      expect(md).toMatch(/unsound[\s\S]{0,400}missing/i);
    }
  });

  it("names each run's own broken evidence — the file or the feature — and neither miscalls the other's failure a collection failure", () => {
    const vitestMd = renderMarkdown(vitestBroken, ctx);
    const cucumberMd = renderMarkdown(cucumberBroken, ctx);

    // The WHERE-to-fix, each in its own idiom: a test file for vitest, a feature file for
    // cucumber. Both come off the item's `locator` — one field, two producers.
    expect(vitestMd).toContain(VITEST_LOCATOR);
    expect(cucumberMd).toContain(CUCUMBER_LOCATOR);

    // THE UPDATE (3F-1744). The copy is the whole point: an ambiguous cucumber step is neither a
    // "suite" nor a "collection error", so a cucumber-broken report must NOWHERE call it one —
    // not in the run-integrity stamp, not in the verdict gloss, not in the outcome description on
    // the suspense row. That is the tool lying about what broke, in the one place the reader will
    // ever see it.
    expect(cucumberMd).not.toMatch(/collection|collect|proving suite/i);

    // And symmetrically: the vitest report must not borrow cucumber's diagnosis either. The
    // renderer states only what the item CARRIES.
    expect(vitestMd).not.toMatch(/ambiguous|step definition/i);
  });

  it("prints the runner's error verbatim where the runner gives one, and states the diagnosis itself where it does not", () => {
    // VITEST — the runner's own message, VERBATIM (every line, stack included), in a fenced block
    // because it is multi-line. The tool does not interpret it; the reader diagnoses from it.
    const vitestIntegrity = integrityOf(renderMarkdown(vitestBroken, ctx));
    expect(vitestIntegrity).toContain(VITEST_MESSAGE);
    expect(vitestIntegrity).toMatch(/```[\s\S]*Cannot find package[\s\S]*```/);

    // CUCUMBER — the runner gives NOTHING to quote (an ambiguous step's result object is exactly
    // `{ status, duration }`), so the item carries the diagnosis the reader synthesised: WHAT
    // broke — this step, matched twice, never ran. The renderer prints it the same way.
    const cucumberIntegrity = integrityOf(renderMarkdown(cucumberBroken, ctx));
    expect(cucumberIntegrity).toContain(CUCUMBER_MESSAGE);
    expect(cucumberIntegrity).toMatch(/```[\s\S]*is ambiguous[\s\S]*```/);
  });

  it("sends the reader to fix the harness and regenerate — prescribing no cure for the error itself", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(balance, ctx);
      // The one remedy that ALWAYS holds, whatever broke. It POINTS; it does not diagnose a cure.
      expect(md).toMatch(/fix the harness and regenerate/i);
      // REMEDY-NEUTRAL, both kinds. A collection error is equally a missing dep, a syntax error, a
      // bad import, or a top-level throw; an ambiguity is equally either colliding definition's
      // fault. The report must never guess the cure — no `pnpm install`, and no "delete one of the
      // step definitions" either.
      expect(md).not.toMatch(/pnpm install|npm install|yarn install|--frozen-lockfile/i);
      expect(md).not.toMatch(/delete |remove |rename |narrow |disambiguate/i);
    }
  });

  it("carries the locator on the suspense row's broken item — a broken proof, not an absent one", () => {
    const vitestMd = renderMarkdown(vitestBroken, ctx);
    const suspense = rowFor(vitestMd, "(no scenario)");
    // The credit-side locator suffix (ruling Q5), now extended to `broken`: glyph + the canon
    // description (single-sourced from OUTCOME_DESCRIPTION, 3F-1626) + the where-to-fix.
    expect(suspense).toContain(`💥 ${OUTCOME_DESCRIPTION.broken}`);
    expect(suspense).toContain(VITEST_LOCATOR);
    // The row cell carries the error's HEADLINE line only — the verbatim multi-line message
    // lives in the run-integrity section; a stack in a table cell would destroy the table.
    expect(suspense).toContain("Cannot find package '@cucumber/tag-expressions'");
    expect(suspense).not.toContain("at packageResolve");
    // The DISTINCTION the slice exists for: the declared scenario still reads `missing` (honest
    // at its own resolution — no evidence cited it), and it is NOT the broken row. A reader
    // tells "the proof exists and is broken" from "no proof was written".
    const declared = rowFor(vitestMd, "SCN-HNS-002");
    expect(declared).toContain(`∅ ${OUTCOME_DESCRIPTION.missing}`);
    expect(declared).not.toContain("💥");

    // The cucumber row carries the same two halves — the feature file and the synthesised
    // diagnosis — through the identical code path.
    const cucumberSuspense = rowFor(renderMarkdown(cucumberBroken, ctx), "(no scenario)");
    expect(cucumberSuspense).toContain(`💥 ${OUTCOME_DESCRIPTION.broken}`);
    expect(cucumberSuspense).toContain(CUCUMBER_LOCATOR);
    expect(cucumberSuspense).toContain("is ambiguous");
  });

  it("omits the stamp entirely when the run carries no broken evidence (byte-identical regression)", () => {
    // The omit-when-empty precedent (the Pending Items tally): a SOUND run's report must not gain
    // a stray empty section — it renders byte-identically to the pre-slice output.
    const sound: Ledger = {
      scenarioReconciliations: [
        {
          scnId: "SCN-SND-001",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "missing" }],
          reconcilingItems: [{ qualityCheck: "unit", outcome: "missing" }],
          pendingItems: [],
        },
      ],
    };
    const md = renderMarkdown(sound, ctx);
    expect(md).not.toContain("Run integrity");
    expect(md).not.toContain("unsound");
    expect(md).not.toContain("💥");
    // An out-of-balance-but-SOUND run still reads `missing` exactly as it did before the slice —
    // the honest instruction there IS "write the test".
    expect(md).toContain(`unit ∅ ${OUTCOME_DESCRIPTION.missing}`);
  });
});

/**
 * Unit test for the run-verdict headline (@SCN-RPT-022).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-022 id
 * matching features/report.feature, so a grep of the id returns both halves of the pair.
 * @unit ONLY (ticket-endorsed): the renderer is a pure function over the report model. The
 * agreement between this headline and the REAL process exit code is @SCN-CLI-013's arm.
 *
 * A SUPPLEMENT, not the fix (3F-1727). The tally already fails on its own once every Scenario
 * Reconciliation is counted (@SCN-RMD-001, 3F-1724); this makes the failure impossible to MISS.
 * The slice's non-negotiable invariant: a run that exits non-zero NEVER renders a headline that
 * reads as a pass — an adopter's repository 17-36-50Z fault (3F-1703), where `141 | 141 | 0` looked like a
 * clean board on a run that exited 1.
 *
 * The verdict is read off the WHOLE-RUN predicates in the CLI's own dominance order (broken →
 * out-of-balance → pending, cli-balance/cli.ts) — asking the same predicates in the same order
 * is what stops the headline drifting from the exit code it names. Exit 3 is the one code the
 * core cannot assert: `--strict` is a CLI-edge flag invisible to the core, so a balanced run
 * carrying Pending Items names it CONDITIONALLY and never claims it.
 *
 * Parent: (@SCN-RPT-022).
 */
describe("[SCN-RPT-022] the summary opens with the run verdict and the exit code it maps to", () => {
  /** The text from the `## Summary views` heading to the first cut beneath it. */
  const summaryOpening = (md: string): string =>
    md.slice(md.indexOf("## Summary views"), md.indexOf("### Evidence reconciliation"));

  const balancedRow = (): Ledger["scenarioReconciliations"][number] => ({
    scnId: "SCN-VRD-001",
    kind: "scenario",
    evidenceObservations: [],
    evidenceObligations: [],
    verdict: "balanced",
    qualityCheckReconciliations: [{ qualityCheck: "unit", outcome: "satisfied" }],
    reconcilingItems: [],
    pendingItems: [],
  });

  const balanced: Ledger = { scenarioReconciliations: [balancedRow()] };

  // an adopter's repository 17-36-50Z shape in miniature: every DECLARED row balances, and the only
  // out-of-balance row is the SUSPENSE reconciliation — the run that read as a pass.
  const outOfBalance: Ledger = {
    scenarioReconciliations: [
      balancedRow(),
      {
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [],
        reconcilingItems: [{ qualityCheck: "unit", outcome: "cites-no-scenario", locator: "x.test.ts" }],
        pendingItems: [],
      },
    ],
  };

  const broken: Ledger = {
    scenarioReconciliations: [
      balancedRow(),
      {
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [],
        reconcilingItems: [
          { qualityCheck: "unit", outcome: "broken", locator: "tests/harness/x.test.ts", message: "Error: boom" },
        ],
        pendingItems: [],
      },
    ],
  };

  const balancedWithPending: Ledger = {
    scenarioReconciliations: [
      {
        ...balancedRow(),
        pendingItems: [{ qualityCheck: "integration" }],
      },
    ],
  };

  it("opens the summary with the verdict, before any cut of the reconciliation", () => {
    // ALWAYS present — unlike the omit-when-empty unsound stamp, a BALANCED run needs its
    // verdict line too, so the headline is the first thing under the summary heading.
    const opening = summaryOpening(renderMarkdown(balanced, ctx));
    expect(opening).toContain("### Run verdict");
    expect(opening).toMatch(/BALANCED/);
  });

  it("reads BALANCED and exit 0 when every Scenario Reconciliation balances", () => {
    const md = renderMarkdown(balanced, ctx);
    expect(summaryOpening(md)).toContain("**BALANCED**");
    expect(summaryOpening(md)).toContain("exit 0");
  });

  it("reads OUT-OF-BALANCE and exit 1 — never as a pass — when a row does not balance", () => {
    const opening = summaryOpening(renderMarkdown(outOfBalance, ctx));
    // The slice's non-negotiable invariant: the failing run's headline is the FAILURE.
    expect(opening).toContain("**OUT-OF-BALANCE**");
    expect(opening).toContain("exit 1");
    expect(opening).not.toContain("**BALANCED**");
  });

  it("reads UNSOUND and exit 4 when the run carries broken evidence, pre-empting the balance verdict", () => {
    const opening = summaryOpening(renderMarkdown(broken, ctx));
    // The CLI's dominance order, mirrored: a broken run is ALWAYS out-of-balance too (its
    // broken item sits on the suspense row), so `broken` must be asked FIRST or the headline
    // would say exit 1 while the process exits 4.
    expect(opening).toContain("**UNSOUND**");
    expect(opening).toContain("exit 4");
    expect(opening).not.toContain("exit 1");
  });

  it("glosses UNSOUND in reader-agnostic terms — a proof that never ran, not a vitest suite that failed to collect", () => {
    const opening = summaryOpening(renderMarkdown(broken, ctx));

    // `broken` is READER-AGNOSTIC: it covers a vitest suite that failed to collect
    // (@SCN-LDG-017) AND a cucumber step matched by two or more definitions (@SCN-LDG-019).
    // The verdict line is read by the same reader in both cases, so it must name the FACT
    // the two SHARE — a proof never ran — and leave the producer-specific detail to the
    // run-integrity stamp above (@SCN-RPT-021).
    expect(opening).toContain("could not be TRUSTED to reconcile");
    expect(opening).toContain("A proof never ran");

    // The TEETH (3F-1749): the gloss was generalised in 3F-1744 but nothing pinned the text,
    // so it could silently drift BACK to the vitest idiom — which would misdescribe a cucumber
    // ambiguity to the reader's face. An ambiguous step is not a "suite", and it did not fail
    // to "collect". Forbid the vocabulary, not merely require the phrasing.
    expect(opening).not.toMatch(/suite/i);
    expect(opening).not.toMatch(/collect/i);
  });

  it("notes exit 3 under --strict conditionally when a balanced run carries Pending Items — and never asserts it", () => {
    const opening = summaryOpening(renderMarkdown(balancedWithPending, ctx));
    // Balanced is still the verdict — the Pending Items note is a CONDITIONAL rider, because
    // `--strict` is a CLI-edge flag the core cannot see.
    expect(opening).toContain("**BALANCED**");
    expect(opening).toContain("exit 0");
    expect(opening).toMatch(/exit 3 under `--strict`/);
    // A balanced run WITHOUT Pending Items never mentions exit 3 at all.
    expect(summaryOpening(renderMarkdown(balanced, ctx))).not.toContain("exit 3");
  });
});
