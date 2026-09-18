/**
 * @unit for @SCN-LNT-018 — the CONVERTED route into the fitness obligation rule: a scenario
 * carrying the bare axis tag `@fitness` owes the characteristic its CONFIGURED ROW names, once.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 *
 * Its own file rather than a further block in fitnessObligations.test.ts, which reads the OTHER
 * route — a registered bare characteristic tag. Two routes into one rule are two subjects, and the
 * assertion this file exists to make is that they arrive at the SAME obligation.
 */

import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";
import type { FitnessCheckIndex } from "../domain/fitnessChecks.js";

/** The configured rows, as the obligation rule takes them: bare `@SCN` → the characteristic. */
const CONFIGURED: FitnessCheckIndex = new Map([
  ["SCN-AAA-001", { characteristic: "complexity" }],
]);

/**
 * A converted scenario: the bare AXIS tag, and no characteristic tag anywhere on it. The word
 * `complexity` appears nowhere in this source, which is the whole of what makes the expectation
 * below a claim about the row rather than about the tag.
 */
const convertedScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @fitness @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

describe("[SCN-LNT-018] a @fitness scenario owes the characteristic its configured row names", () => {
  it("raises one obligation, naming the characteristic the row names rather than the tag", () => {
    expect(parseScenarios(convertedScenario, [], [], CONFIGURED)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }],
      },
    ]);
  });

  it("raises it ONCE when the axis tag reaches the scenario twice", () => {
    // A scenario's effective tags are its own plus its Rule's and its Feature's (@SCN-LDG-020), so
    // the axis tag can arrive twice. It is owed once: two obligations for one characteristic would
    // reconcile the second `missing` for ever, since one run is one credit and can cite one @SCN.
    const source = `@FIT
Feature: fitness

  @fitness
  Rule: the tree stays inside its thresholds

    @fitness @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(source, [], [], CONFIGURED)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }],
      },
    ]);
  });

  it("raises the SAME obligation a registered bare characteristic tag raises", () => {
    // NOT A SECOND OBLIGATION SHAPE. Every reader downstream — the pair key, the reconciler's
    // static arm, the roll-up — is keyed on this object, so the two routes must be
    // indistinguishable once the obligation is raised. Compared against the OTHER route's own
    // answer rather than against a literal, so a change to the shape moves both or reds here.
    const bareTagScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @complexity @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(convertedScenario, [], [], CONFIGURED)).toEqual(
      parseScenarios(bareTagScenario, [], ["complexity"])
    );
  });

  it("raises nothing when no rows are configured — the reading is inert on an unconverted corpus", () => {
    // What keeps this additive over a corpus nobody has swept: the rows arrive as data, and a
    // target that has configured none owes nothing on this route.
    expect(parseScenarios(convertedScenario)).toEqual([
      { scnId: "SCN-AAA-001", evidenceObligations: [] },
    ]);
  });

  it("leaves the tier obligations of a converted scenario untouched", () => {
    // The axis tag is answered ALONGSIDE the tier tags, never instead of them — the stance the
    // registered-tag arm already takes (@SCN-LNT-006). A converted scenario that also carries a
    // tier owes both, in the order the arms run.
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @unit @fitness @SCN-AAA-001
    Scenario: a converted check carrying a runnable example too
      Given a step
`;

    expect(parseScenarios(source, [], [], CONFIGURED)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "lint", staticCheck: "complexity" },
        ],
      },
    ]);
  });
});
