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
