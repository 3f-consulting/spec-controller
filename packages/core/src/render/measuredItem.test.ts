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

/**
 * @unit for @SCN-MUT-006 — the same rendered line when the bar is a FLOOR: the comparison the
 * obligation named, on the page beside the two numbers it qualifies.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-006, matching
 * features/mutation-score.feature and the @integration steps in tests/steps/mutationScore.steps.ts.
 *
 * BOTH SIDES ARE NAMED, which is what makes naming either of them worth anything. A floor reading
 * "at least 91.87" beside a ceiling still reading a bare "threshold 75" leaves the second reader in
 * exactly the ambiguity the first was rescued from, and leaves an unqualified word on the page for
 * a reader to guess the meaning of. The two live @ci-run-time rows are untouched by this: every
 * assertion @SCN-CIP-008 makes over that line is a substring containment, so a named comparison
 * changes nothing it claims.
 */

const floorScenario = (threshold: number | undefined, atLeast: boolean): Scenario[] => [
  {
    scnId: "SCN-MSD-001",
    evidenceObligations: [
      {
        qualityCheck: "lint",
        staticCheck: "mutation",
        measured: true,
        ...(threshold !== undefined ? { threshold } : {}),
        ...(atLeast ? { atLeast: true as const } : {}),
      },
    ],
  },
];

const mutationMeasurement = (measured: number): EvidenceObservation[] => [
  { qualityCheck: "lint", scnId: "SCN-MSD-001", checkTag: "mutation", measured },
];

/** The ledger cell for an arbitrary debit/credit pair — `measuredLine` above, unbound from the ceiling fixture. */
function lineOf(scenarios: Scenario[], observations: EvidenceObservation[]): string {
  const markdown = renderMarkdown(
    evidenceReconciliationOf(scenarios, observations, [], true, true),
    CTX
  );
  const start = markdown.indexOf("## Scenario Reconciliations");
  const ledger = start >= 0 ? markdown.slice(start) : markdown;
  const line = ledger.split("\n").find((l) => l.startsWith("| SCN-MSD-001 "));
  expect(line, "expected a ledger row for SCN-MSD-001").toBeDefined();
  return line!;
}

describe("[SCN-MUT-006] a measured item renders which side of its bar it had to be on", () => {
  it("names a floor as a minimum on a failing row, beside the number that missed it", () => {
    const line = lineOf(floorScenario(91.87, true), mutationMeasurement(91.4));
    expect(line).toContain("mutation");
    expect(line).toContain("91.4");
    expect(line).toContain("at least 91.87");
  });

  it("does not read that floor as a ceiling", () => {
    // The half of the scenario that says RATHER THAN A MAXIMUM. A renderer naming a comparison from
    // a constant would satisfy the assertion above on every row it ever drew; only the negative
    // shows the words came off the obligation.
    expect(lineOf(floorScenario(91.87, true), mutationMeasurement(91.4))).not.toContain("at most");
  });

  it("names a ceiling as a maximum, so the reader of the other row is told which one it is", () => {
    // The at-most side made explicit too. Left implicit it re-creates the ambiguity this scenario
    // exists to remove — one bar qualified, one bare, and nothing on the page saying whether the
    // bare one is the same kind. @SCN-CIP-008 asserts this line by containment of "75", which a
    // named comparison leaves untouched.
    expect(lineOf(floorScenario(75, false), mutationMeasurement(96.4))).toContain("at most 75");
  });

  it("still says so in words when nobody authored a bar, whichever way it would have read", () => {
    // The arm @SCN-CIP-002 made loud on the data and @SCN-CIP-008 made loud on the page, pinned
    // again here because the comparison is rendered in the same expression: a floor with no bar has
    // no number to name a side of, and "no threshold configured" is the sentence that still says
    // so. A blank would put the fault back to sleep and a zero reads as a bar OF zero.
    const line = lineOf(floorScenario(undefined, true), mutationMeasurement(91.4));
    expect(line).toContain("no threshold configured");
    expect(line).not.toContain("at least");
  });

  it("carries the comparison into the JSON on the obligation's own entry", () => {
    // The flag rides the debit through the serialisation that already carries the bar — never a
    // parallel measured-only field, which is what keeps the no-parallel-store round-trip true.
    const json = renderJson(
      evidenceReconciliationOf(floorScenario(91.87, true), mutationMeasurement(91.4), [], true, true),
      CTX
    );
    expect(json).toContain('"threshold": 91.87');
    expect(json).toContain('"atLeast": true');
  });
});
