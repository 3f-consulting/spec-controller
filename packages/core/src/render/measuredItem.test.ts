/**
 * @unit for @SCN-CIP-008 — a measured reconciling item, RENDERED.
 *
 * Bidirectional evidence: the describe carries @SCN-CIP-008, matching features/ci-run-time.feature
 * and the @integration steps in tests/steps/ciRunTime.steps.ts.
 *
 * THE ASSERTIONS ARE ABOUT THE NUMBERS, not about the row being present. A row reading
 * "ci-run-time: failing" and nothing else passes every presence check while telling a reader
 * nothing they can act on — which is exactly the report this axis was filed to stop producing, one
 * level in.
 */

import { describe, it, expect } from "vitest";

import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObligation, EvidenceObservation, Scenario } from "../domain/journal.js";

const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

const measuredObligation = (threshold?: number): EvidenceObligation => ({
  qualityCheck: "lint",
  staticCheck: "ci-run-time",
  measured: true,
  ...(threshold !== undefined ? { threshold } : {}),
});

const scenario = (threshold?: number): Scenario[] => [
  { scnId: "SCN-MSD-001", evidenceObligations: [measuredObligation(threshold)] },
];

const measurement = (measured: number): EvidenceObservation[] => [
  { qualityCheck: "lint", scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured },
];

/**
 * The measured row's RECONCILING-ITEM cell, scoped to the Scenario Reconciliations ledger.
 *
 * Scoped rather than searched whole-document because the report also carries a per-check summary
 * table whose first cells are the same @SCN and the same check tag — a whole-report search would
 * find that row instead and the assertions would be about a different cut of the same fact.
 */
function measuredLine(threshold: number | undefined, observations: EvidenceObservation[]): string {
  const markdown = renderMarkdown(
    evidenceReconciliationOf(scenario(threshold), observations, [], true, true),
    CTX
  );
  const start = markdown.indexOf("## Scenario Reconciliations");
  const ledger = start >= 0 ? markdown.slice(start) : markdown;
  const line = ledger.split("\n").find((l) => l.startsWith("| SCN-MSD-001 "));
  expect(line, "expected a ledger row for SCN-MSD-001").toBeDefined();
  return line!;
}

describe("[SCN-CIP-008] a measured reconciling item renders with its two numbers", () => {
  it("names the check, the measurement and the ceiling on a failing row", () => {
    const line = measuredLine(75, measurement(96.4));
    expect(line).toContain("ci-run-time");
    expect(line).toContain("96.4");
    expect(line).toContain("75");
  });

  it("says so in words when nobody authored a ceiling", () => {
    // Rendered as a blank a reader has to interpret, the fault @SCN-CIP-002 makes loud on the data
    // would go quiet again on the page. A zero would be worse than a blank: it reads as a ceiling
    // OF zero, a different and much louder claim than nobody having set one.
    const line = measuredLine(undefined, measurement(96.4));
    expect(line).toContain("no threshold");
    expect(line).not.toMatch(/threshold of 0\b/);
  });

  it("names the ceiling on a missing row, where there is no measurement to name", () => {
    // The debit stands alone, so the only number there is to render is the bar the suite was
    // supposed to meet. Rendering nothing would leave the loudest row on the ledger the least
    // informative one.
    const line = measuredLine(75, []);
    expect(line).toContain("ci-run-time");
    expect(line).toContain("75");
  });

  it("carries both numbers into the JSON, through the entries that already serialise", () => {
    // The ceiling rides the obligation and the measurement rides the observation — no parallel
    // measured-only field. That is what keeps the no-parallel-store round-trip true: every summary
    // re-folds from the serialised Ledger, so a field that failed to serialise would break the
    // round-trip somewhere far from here rather than in a test about rendering.
    const json = renderJson(
      evidenceReconciliationOf(scenario(75), measurement(96.4), [], true, true),
      CTX
    );
    expect(json).toContain('"threshold": 75');
    expect(json).toContain('"measured": 96.4');
  });

  it("does not count a measurement among the static checks", () => {
    // A measurement rides the same quality-check and is not a static check: nothing read a manifest
    // or a workflow for it. Counted in the static tallies it would report a static-analysis
    // population this tree does not have — the parallel-store fault the Ledger folds exist to
    // foreclose, arriving through the new member rather than through a new store.
    const reconciliation = evidenceReconciliationOf(scenario(75), measurement(96.4), [], true, true);
    expect(reconciliation.summary.staticChecks?.runningStaticCheckCount).toBe(0);
    expect(reconciliation.summary.staticChecks?.uncitedStaticCheckCount).toBe(0);
  });
});
