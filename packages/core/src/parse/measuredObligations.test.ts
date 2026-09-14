/**
 * @unit for @SCN-CIP-001 — the DEBIT half of the measured fitness check: a scenario tagged with a
 * measured check owes that check once, STEPS OR NONE, and its obligation carries the THRESHOLD
 * authored for THAT scenario's own @SCN.
 *
 * Bidirectional evidence: each describe carries its @SCN id, matching features/ci-run-time.feature
 * and the @integration steps in tests/steps/ciRunTime.steps.ts.
 *
 * Its own file rather than a further block in fitnessObligations.test.ts: that file is
 * @SCN-LNT-006's, the STATIC half of the same rule, and the two differ in exactly the thing worth
 * keeping legible — whether the obligation holds a number.
 *
 * WHAT THEY NO LONGER DIFFER IN IS THE SHAPE THE OBLIGATION IS RAISED FROM. Steplessness was one
 * proxy across both halves, so it went from both at once (3F-3115): the registered check tag is the
 * discriminator on the static half and the threshold registry's tag is the discriminator here, and
 * the steps are read by neither.
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

describe("[SCN-CIP-001] a scenario's measured check tag raises one Evidence Obligation carrying its threshold, steps or none", () => {
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

  it("raises the same obligation on a STEPPED scenario, carrying THAT row's own ceiling", () => {
    // THE STEPS ARE NOT THE DISCRIMINATOR (3F-3115), and the measured half never had one of its own
    // to lose: steplessness was a single proxy across both halves of one rule. A fitness scenario
    // handed a runnable example keeps the ceiling it was written to be held to. The stepped row
    // below carries a tier tag TOO, which is the sharpest reading — the measured obligation is
    // raised ALONGSIDE the tier rather than instead of it. Whether a corpus may hold such a row is
    // @SCN-STG-005's question; what is read here is the parser.
    //
    // AND THE TWO CEILINGS DIFFER, which is the other half of this arm. One characteristic over two
    // scenarios with two bars is the arrangement canon names for this axis, so an engine keying the
    // threshold by the TAG would hand 75 to both rows and pass an assertion written with one number.
    const thresholds = thresholdsOf({
      "SCN-MSD-001": { "ci-run-time": 75 },
      "SCN-MSD-002": { "ci-run-time": 150 },
    });

    const source = `@MSD
Feature: measured

  Rule: the suites complete within their CI thresholds

    @ci-run-time @SCN-MSD-001
    Scenario: the unit suite completes within its CI threshold

    @unit @ci-run-time @SCN-MSD-002
    Scenario: the same suite, now carrying a runnable example
      Given a step, which is the whole of what makes this row STEPPED
`;

    expect(parseScenarios(source, [], [], thresholds)).toEqual([
      {
        scnId: "SCN-MSD-001",
        evidenceObligations: [
          { qualityCheck: "lint", staticCheck: "ci-run-time", measured: true, threshold: 75 },
        ],
      },
      {
        scnId: "SCN-MSD-002",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "lint", staticCheck: "ci-run-time", measured: true, threshold: 150 },
        ],
      },
    ]);
  });

  it("raises the obligation for a check the thresholds name even where the registry does not", () => {
    // THE TAG SET IS THE UNION, and this is the half that is new. A measured check has no runnable
    // script handle, so it is never discoverable by one. Were the obligation-raising set built from
    // discovered handles alone, a measured tag would raise nothing at all and the axis would be
    // silent rather than wrong — the worst of the two.
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

    @complexity @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(source, [], ["complexity"], THRESHOLDS)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }],
      },
    ]);
  });
});

/**
 * @unit for @SCN-MUT-001 — the OBLIGATION half of the bare form: what a manifest entry written as a
 * number and nothing else puts on the ledger once a bar can carry a comparison.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-001, matching features/mutation-score.feature
 * and the @integration steps in tests/steps/mutationScore.steps.ts. The registry-side reading it
 * consumes is pinned in ../domain/thresholds.test.ts.
 *
 * The assertion is `toStrictEqual` on the WHOLE obligation, which is the point of the scenario
 * rather than a stylistic preference: two @ci-run-time rows are live in this repository's own
 * manifest in exactly this form, and what they promise is that the widening leaves what they
 * serialise alone. A field-by-field read would pass over an added term; this cannot.
 */
const BARE_MUTATION_THRESHOLDS = thresholdsOf({ "SCN-MSD-001": { mutation: 91.87 } });

const steplessMutationScenario = `@MSD
Feature: measured

  Rule: the domain core is mutated at least as hard as its bar

    @mutation @SCN-MSD-001
    Scenario: the domain core is mutated at least as hard as its bar
`;

describe("[SCN-MUT-001] a bare-number threshold raises an obligation read at-most, unchanged", () => {
  it("raises exactly the obligation a measured check already raised, and nothing more", () => {
    expect(parseScenarios(steplessMutationScenario, [], [], BARE_MUTATION_THRESHOLDS)).toStrictEqual(
      [
        {
          scnId: "SCN-MSD-001",
          evidenceObligations: [
            { qualityCheck: "lint", staticCheck: "mutation", measured: true, threshold: 91.87 },
          ],
        },
      ]
    );
  });

  it("names no comparison of its own, so nothing reads the bar the other way", () => {
    // Sparse, not defaulted. The absence IS the at-most reading, so an obligation that carried
    // `atLeast: false` would be saying the same thing in a term two live rows would have to grow.
    const [scenario] = parseScenarios(steplessMutationScenario, [], [], BARE_MUTATION_THRESHOLDS);
    expect(Object.keys(scenario!.evidenceObligations[0]!).sort()).toStrictEqual([
      "measured",
      "qualityCheck",
      "staticCheck",
      "threshold",
    ]);
  });
});

/**
 * @unit for @SCN-MUT-002 — the OBLIGATION half of the object form: what a manifest entry naming
 * its comparison puts on the ledger, and that the engine reads the comparison the entry gave it.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-002, matching features/mutation-score.feature
 * and the @integration steps in tests/steps/mutationScore.steps.ts. The registry-side reading it
 * consumes is pinned in ../domain/thresholds.test.ts.
 */
const FLOOR_MUTATION_THRESHOLDS = thresholdsOf({ "SCN-MSD-001": { mutation: { atLeast: 91.87 } } });

describe("[SCN-MUT-002] an at-least threshold raises an obligation read the other way", () => {
  it("raises the measured obligation carrying the bar AND the side of it that satisfies", () => {
    expect(
      parseScenarios(steplessMutationScenario, [], [], FLOOR_MUTATION_THRESHOLDS)
    ).toStrictEqual([
      {
        scnId: "SCN-MSD-001",
        evidenceObligations: [
          {
            qualityCheck: "lint",
            staticCheck: "mutation",
            measured: true,
            threshold: 91.87,
            atLeast: true,
          },
        ],
      },
    ]);
  });

  it("carries the comparison the manifest authored, never one read off the check tag", () => {
    // THE SAME `mutation` TAG, WRITTEN AS A CEILING. A mutation score is a floor in every
    // repository there is, so an engine holding a roster of what a bare tag MEANS would overrule
    // this entry and be right about it — which is the name-matching @SCN-LNT-005 puts in the
    // target's hands. A target authoring a mutation ceiling is wrong OUT LOUD instead.
    const ceiling = thresholdsOf({ "SCN-MSD-001": { mutation: { atMost: 91.87 } } });
    const [scenario] = parseScenarios(steplessMutationScenario, [], [], ceiling);
    expect(scenario!.evidenceObligations[0]).toStrictEqual({
      qualityCheck: "lint",
      staticCheck: "mutation",
      measured: true,
      threshold: 91.87,
    });
  });
});

/**
 * @unit for @SCN-MUT-003 — the OBLIGATION half of an entry whose comparison the registry does not
 * recognise: raised, measured, and carrying no bar for the arm that reports one.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-003, matching features/mutation-score.feature
 * and the @integration steps in tests/steps/mutationScore.steps.ts. The registry-side reading it
 * consumes is pinned in ../domain/thresholds.test.ts.
 *
 * The assertion is `toStrictEqual` on the WHOLE obligation for the reason @SCN-MUT-001's is: what
 * this scenario forbids is an ADDED key — a `threshold` the engine supplied a direction for — and a
 * field-by-field read is exactly the read that would pass over one.
 */
const UNREADABLE_MUTATION_THRESHOLDS = thresholdsOf({
  "SCN-MSD-001": { mutation: { direction: "up", value: 91.87 } },
});

describe("[SCN-MUT-003] an entry naming no comparison it recognises raises an obligation with no bar", () => {
  it("raises the measured obligation with no bar on it at all", () => {
    expect(
      parseScenarios(steplessMutationScenario, [], [], UNREADABLE_MUTATION_THRESHOLDS)
    ).toStrictEqual([
      {
        scnId: "SCN-MSD-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "mutation", measured: true }],
      },
    ]);
  });

  it("never defaults the unread comparison to the ceiling a bare number would have meant", () => {
    // The one cheap wrong answer, named. Absent IS at-most on this obligation (@SCN-MUT-001), so an
    // engine that filled the number in and left the comparison off would produce a bar read as a
    // CEILING of 91.87 — under which every mutation score there is passes, and a suite with no
    // teeth reports as a suite in perfect health. The absence of the number is what refuses that.
    const [scenario] = parseScenarios(
      steplessMutationScenario,
      [],
      [],
      UNREADABLE_MUTATION_THRESHOLDS
    );
    expect(Object.keys(scenario!.evidenceObligations[0]!).sort()).toStrictEqual([
      "measured",
      "qualityCheck",
      "staticCheck",
    ]);
  });
});
