/**
 * @unit for @SCN-LNT-018 — the route into the fitness obligation rule: a scenario carrying the
 * axis tag `@fitness` owes one fitness obligation, keyed by its own @SCN and carrying nothing
 * else (3F-3570, 3F-3582).
 *
 * THE TAG IS THE WHOLE DECLARATION (3F-3582). A manifest list of fitness checks once stood between
 * the tag and the obligation, and this file's fixtures configured one so the obligation would be
 * raised at all. They configure nothing now, and the obligation is raised anyway — which is the
 * change, stated as the fixture's own shape.
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

/** A fitness scenario: the AXIS tag, and nothing else naming what the check is about. */
const fitnessScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @fitness @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

describe("[SCN-LNT-018] a @fitness scenario owes one fitness obligation, from its tag, keyed by its own @SCN", () => {
  it("raises one obligation, at the quality check fitness, carrying nothing else", () => {
    expect(parseScenarios(fitnessScenario)).toEqual([
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

    expect(parseScenarios(source)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "fitness" }],
      },
    ]);
  });

  it("raises two obligations for two @fitness scenarios, keyed apart by their own @SCNs", () => {
    // THE SHAPE A SHARED WORD ONCE TOOK: this repository's own manifest entries gave `ci-run-time`
    // to two checks, and while a word keyed the obligation the two could merge. Each check is its
    // own scenario now, keyed by its own @SCN, and two scenarios are two obligations.
    const source = `@FIT
Feature: fitness

  Rule: the suites stay inside their limits

    @fitness @SCN-AAA-012
    Scenario: the unit suite finishes inside its limit

    @fitness @SCN-AAA-013
    Scenario: the behavioural suite finishes inside its limit
`;
    expect(parseScenarios(source)).toEqual([
      { scnId: "SCN-AAA-012", evidenceObligations: [{ qualityCheck: "fitness" }] },
      { scnId: "SCN-AAA-013", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ]);
  });

  it("raises it for a scenario no manifest entry names, which is the whole of 3F-3582", () => {
    // THE PLANT THIS FILE IS. The reader is HANDED an index — the parameter leaves later, with
    // every call site — and handed an EMPTY one it raises the obligation all the same. A rule that
    // had gone on gating the obligation on an entry would answer [] here.
    expect(parseScenarios(fitnessScenario)).toEqual([
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ]);
  });

  it("leaves the tier obligations of a fitness scenario untouched", () => {
    // The axis tag is answered ALONGSIDE the tier tags, never instead of them. A fitness scenario
    // that also carries a tier owes both, in the order the arms run.
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @unit @fitness @SCN-AAA-001
    Scenario: a check carrying a runnable example too
      Given a step
`;

    expect(parseScenarios(source)).toEqual([
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
