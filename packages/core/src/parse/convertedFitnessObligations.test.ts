/**
 * @unit for @SCN-LNT-018 — the CONVERTED route into the fitness obligation rule: a scenario
 * carrying the axis tag `@fitness` that a CONFIGURED ROW names owes one fitness obligation, keyed
 * by its own @SCN and naming no characteristic (3F-3570).
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/fitnessReconciliation.steps.ts.
 *
 * Its own file rather than a further block in fitnessObligations.test.ts, which reads the retired
 * `@lint=<handle>` form (@SCN-LNT-007). The registered bare-tag route this file once compared
 * against is gone with `parseScenarios`' check-tag set (3F-3561), so this is the one route in.
 */

import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";
import { fitnessChecksOf, type FitnessCheckIndex } from "../domain/fitnessChecks.js";

/** The configured rows, read through core's own row reader exactly as a target's manifest is. */
const CONFIGURED: FitnessCheckIndex = fitnessChecksOf([{ scn: "SCN-AAA-001", command: "eslint" }]);

/** A converted scenario: the AXIS tag, and nothing else naming what the check is about. */
const convertedScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @fitness @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

describe("[SCN-LNT-018] a @fitness scenario a configured row names owes one fitness obligation keyed by its own @SCN", () => {
  it("raises one obligation, at the quality check fitness, naming no characteristic", () => {
    expect(parseScenarios(convertedScenario, [], CONFIGURED)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "fitness" }],
      },
    ]);
  });

  it("raises it ONCE when the axis tag reaches the scenario twice", () => {
    // A scenario's effective tags are its own plus its Rule's and its Feature's (@SCN-LDG-020), so
    // the axis tag can arrive twice. It is owed once: two obligations for one check would reconcile
    // the second `missing` for ever, since one run is one credit and can cite one @SCN.
    const source = `@FIT
Feature: fitness

  @fitness
  Rule: the tree stays inside its thresholds

    @fitness @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(source, [], CONFIGURED)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "fitness" }],
      },
    ]);
  });

  it("raises two obligations for two scenarios whose rows share a retired characteristic word", () => {
    // THE SHAPE A SHARED WORD ONCE TOOK: this repository's own rows gave `ci-run-time` to two
    // checks. Each check is its own scenario, keyed by its own @SCN, so two rows are two obligations
    // whatever word they still carry.
    const source = `@FIT
Feature: fitness

  Rule: the suites stay inside their limits

    @fitness @SCN-AAA-012
    Scenario: the unit suite finishes inside its limit

    @fitness @SCN-AAA-013
    Scenario: the behavioural suite finishes inside its limit
`;
    const rows = fitnessChecksOf([
      { scn: "SCN-AAA-012", characteristic: "ci-run-time" },
      { scn: "SCN-AAA-013", characteristic: "ci-run-time" },
    ]);
    expect(parseScenarios(source, [], rows)).toEqual([
      { scnId: "SCN-AAA-012", evidenceObligations: [{ qualityCheck: "fitness" }] },
      { scnId: "SCN-AAA-013", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ]);
  });

  it("raises nothing when no rows are configured — the reading is inert on an unconverted corpus", () => {
    // What keeps this additive over a corpus nobody has swept: the rows arrive as data, and a
    // target that has configured none owes nothing on this route.
    expect(parseScenarios(convertedScenario)).toEqual([
      { scnId: "SCN-AAA-001", evidenceObligations: [] },
    ]);
  });

  it("leaves the tier obligations of a converted scenario untouched", () => {
    // The axis tag is answered ALONGSIDE the tier tags, never instead of them. A converted
    // scenario that also carries a tier owes both, in the order the arms run.
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @unit @fitness @SCN-AAA-001
    Scenario: a converted check carrying a runnable example too
      Given a step
`;

    expect(parseScenarios(source, [], CONFIGURED)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "fitness" },
        ],
      },
    ]);
  });
});
