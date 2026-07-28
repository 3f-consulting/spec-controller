/**
 * Step definitions for features/warnings.feature (a scenario declaring no evidence
 * evidence obligations is both-missing, superseding the retired no-evidence-declared
 * warning).
 *
 * @SCN-WRN-001 — bidirectional evidence marker for features/warnings.feature
 * (Evidence Manifesto §9). The @integration arm exercises the declared → reconcile
 * → render markdown wiring end-to-end (cross-component), complementing the @unit
 * test that proves reconcile()'s both-missing shape in isolation.
 *
 * Assertions are ROW-SCOPED, not a bare regex over the whole report: the scenario must
 * carry a both-missing item on its OWN ledger row AND read out-of-balance, and the report
 * must carry NO "## Warnings" section at all (the axis dissolved). A loose /both-missing/
 * match would be toothless; scoping gives teeth — it reds if the scenario is swept to a
 * warnings surface (the earlier behaviour) instead of surfaced as a ledger row.
 *
 * The When phrase is deliberately distinct from ledger's "the reconciler
 * runs" (Cucumber step patterns are global; a duplicate would be ambiguous) and
 * keeps this scenario's shared outcome in this module.
 *
 * Evidence: @SCN-WRN-001 — the bidirectional reconciler.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { parseScenarios, evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObservation } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;

// A RunContext fixture — the sibling provenance arg renderMarkdown now requires.
// This @WRN assertion is SECTION/ROW-SCOPED to the warnings surface +
// the verdict table, so the provenance header above leaves it byte-green.
const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

/**
 * Extract a scenario's OWN ledger row cells from the `## Scenario Reconciliations` section — the row is
 * `| <scnId> | <verdict> | <reconciling items> |`; returns the verdict + items cells so an
 * assertion scopes to the row, not the whole report. Matched on the FIRST cell equalling
 * the scnId, and scoped past the `## Scenario Reconciliations` heading, so the by-feature cut's scnId mention
 * can't shadow the ledger row.
 */
function ledgerRowCells(scnId: string): { verdict: string; items: string } {
  const ledgerStart = markdown.indexOf("## Scenario Reconciliations");
  const ledger = ledgerStart >= 0 ? markdown.slice(ledgerStart) : markdown;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line.split("|").map((c) => c.trim());
    return cells[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${markdown}`);
  const cells = row.split("|").map((c) => c.trim());
  return { verdict: cells[2] ?? "", items: cells[3] ?? "" };
}

// @SCN-WRN-001
Given(
  "a scenario {string} with no evidence-obligation tags",
  function (scnId: string) {
    // Build the declared side through the REAL declared reader from a feature
    // snippet whose ONLY tag is the @SCN id — no @unit/@integration/@e2e/
    // @performance/@lint — so the reader emits `evidence obligations: []` (the zero-evidence obligation
    // case). The @integration arm thereby exercises the parse → declared seam, not
    // a hand-seeded Scenario the reader never produces.
    const feature = [
      "@WRN",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
    evidenceObservations = [];
  }
);

// @SCN-WRN-001
When("the reconciler runs over the scenarios", function () {
  markdown = renderMarkdown(evidenceReconciliationOf(scenarios, evidenceObservations), CTX);
});

// @SCN-WRN-001
Then(
  "the ledger reports {string} as a both-missing reconciliation, out of balance",
  function (scnId: string) {
    // The zero-evidence scenario now surfaces as a both-missing ROW in the ledger (NOT a
    // warning excluded from the tally): its OWN ledger row must carry a both-missing item
    // and read out-of-balance. Row-scoped, so it reds if the scenario is instead swept to a
    // warnings surface (the earlier behaviour) and carries no ledger row at all.
    const { verdict, items } = ledgerRowCells(scnId);
    // The reconciling item renders the outcome's canon description, not the handle (3F-1626).
    assert.ok(
      items.includes("Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"),
      `expected ${scnId}'s reconciling items to include a both-missing item; got "${items}"`
    );
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance; got "${verdict}"`
    );
  }
);

// @SCN-WRN-001
Then("the report carries no warnings section", function () {
  // The warnings axis dissolved entirely: the "## Warnings" heading is gone from
  // the markdown surface. Reds against the earlier renderer that still emits it.
  assert.ok(
    !markdown.includes("## Warnings"),
    `expected NO "## Warnings" section (dissolved); got:\n${markdown}`
  );
});
