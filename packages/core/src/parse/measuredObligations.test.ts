/**
 * @unit for @SCN-CIP-001 — the DEBIT half of the measured fitness check: a STEPLESS scenario
 * tagged with a measured check owes that check once, and its obligation carries the THRESHOLD
 * authored for that scenario.
 *
 * Bidirectional evidence: each describe carries its @SCN id, matching features/ci-run-time.feature
 * and the @integration steps in tests/steps/ciRunTime.steps.ts.
 *
 * Its own file rather than a further block in fitnessObligations.test.ts: that file is
 * @SCN-LNT-006's, the STATIC half of the same rule, and the two differ in exactly the thing worth
 * keeping legible — whether the obligation holds a number.
 */

import { describe, it, expect } from "vitest";

import { thresholdsOf } from "../domain/thresholds.js";
import { parseScenarios } from "./scenarios.js";

/**
 * The target's thresholds, as its manifest holds them: keyed by @SCN, then by bare check tag.
 *
 * The fixture @SCN is `SCN-MSD-001` — a code no feature file in this repository carries. A real
 * `@SCN-CIP-00N` here would read as a claim about this corpus rather than about the rule.
 */
const THRESHOLDS = thresholdsOf({ "SCN-MSD-001": { "ci-run-time": 75 } });

const steplessMeasuredScenario = `@MSD
Feature: measured

  Rule: the suite completes within its CI threshold

    @ci-run-time @SCN-MSD-001
    Scenario: the unit suite completes within its CI threshold
`;

describe("[SCN-CIP-001] a stepless scenario's measured check tag raises one Evidence Obligation carrying its threshold", () => {
  it("raises exactly one obligation, naming the check and carrying its ceiling", () => {
    expect(parseScenarios(steplessMeasuredScenario, [], [], THRESHOLDS)).toEqual([
      {
        scnId: "SCN-MSD-001",
        evidenceObligations: [
          { qualityCheck: "lint", staticCheck: "ci-run-time", measured: true, threshold: 75 },
        ],
      },
    ]);
  });

  it("raises it ONCE when the same measured check reaches the scenario twice", () => {
    // A scenario's effective tags are its own plus its Rule's and its Feature's (@SCN-LDG-020),
    // so one check can reach one scenario twice and is owed once — the same rule the static half
    // obeys (@SCN-LNT-006), reached here through the measured arm.
    const source = `@ci-run-time
Feature: measured

  @ci-run-time
  Rule: the suite completes within its CI threshold

    @ci-run-time @SCN-MSD-001
    Scenario: the unit suite completes within its CI threshold
`;

    expect(parseScenarios(source, [], [], THRESHOLDS)).toEqual([
      {
        scnId: "SCN-MSD-001",
        evidenceObligations: [
          { qualityCheck: "lint", staticCheck: "ci-run-time", measured: true, threshold: 75 },
        ],
      },
    ]);
  });

  it("raises NOTHING for the same measured tag on a STEPPED scenario", () => {
    // Steplessness is the discriminator on this axis exactly as on the static one. A stepped
    // scenario is a behavioural EXAMPLE; a whole-system characteristic raised on it would be the
    // smear name-match produced, reintroduced through the measured arm. Only the tier obligation
    // survives — which is why every scenario in features/ci-run-time.feature can carry the words
    // without owing the check.
    const source = `@MSD
Feature: measured

    @unit @ci-run-time @SCN-MSD-001
    Scenario: an example of something
      Given a step
`;

    expect(parseScenarios(source, [], [], THRESHOLDS)).toEqual([
      { scnId: "SCN-MSD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });

  it("raises the obligation for a check the thresholds name even where the registry does not", () => {
    // THE TAG SET IS THE UNION, and this is the half that is new. A measured check has no runnable
    // script handle, so it never appears in `checkRegistry` and `registeredCheckTags` cannot see
    // it. Were the obligation-raising set the registry's alone, a measured tag would raise nothing
    // at all and the axis would be silent rather than wrong — the worst of the two.
    expect(parseScenarios(steplessMeasuredScenario, [], ["complexity"], THRESHOLDS)).toEqual([
      {
        scnId: "SCN-MSD-001",
        evidenceObligations: [
          { qualityCheck: "lint", staticCheck: "ci-run-time", measured: true, threshold: 75 },
        ],
      },
    ]);
  });

  it("leaves a STATIC check's obligation unmarked and unthresholded", () => {
    // The measured arm must not colour the static one. A registered bare check with no threshold
    // entry is an ordinary static obligation and reconciles by exists / enforced-over-real-source;
    // marking it `measured` would route it to a comparison with no number to compare against.
    const source = `@FIT
Feature: fitness

    @complexity @SCN-FIT-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(source, [], ["complexity"], THRESHOLDS)).toEqual([
      {
        scnId: "SCN-FIT-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }],
      },
    ]);
  });
});
