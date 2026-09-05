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
 *
 * AND @SCN-LNT-019 — which of the two obligation shapes the converted route raises, decided by the
 * ROW'S SHAPE: a row carrying a bar is measured and one carrying none is static. It reads the same
 * rule from the same direction, so it lands beside @SCN-LNT-018 rather than in a file of its own,
 * and the identity claim at the foot is against the THRESHOLD-registry route's measured answer.
 */

import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";
import type { FitnessCheckRegistry } from "../domain/fitnessChecks.js";

/** The configured rows, as the obligation rule takes them: bare `@SCN` → the characteristic. */
const CONFIGURED: FitnessCheckRegistry = new Map([
  ["SCN-FIT-001", { characteristic: "complexity" }],
]);

/**
 * A converted scenario: the bare AXIS tag, and no characteristic tag anywhere on it. The word
 * `complexity` appears nowhere in this source, which is the whole of what makes the expectation
 * below a claim about the row rather than about the tag.
 */
const convertedScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @fitness @SCN-FIT-001
    Scenario: the codebase stays under the complexity threshold
`;

describe("[SCN-LNT-018] a @fitness scenario owes the characteristic its configured row names", () => {
  it("raises one obligation, naming the characteristic the row names rather than the tag", () => {
    expect(parseScenarios(convertedScenario, [], [], new Map(), CONFIGURED)).toEqual([
      {
        scnId: "SCN-FIT-001",
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

    @fitness @SCN-FIT-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(source, [], [], new Map(), CONFIGURED)).toEqual([
      {
        scnId: "SCN-FIT-001",
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

    @complexity @SCN-FIT-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(convertedScenario, [], [], new Map(), CONFIGURED)).toEqual(
      parseScenarios(bareTagScenario, [], ["complexity"])
    );
  });

  it("raises nothing when no rows are configured — the reading is inert on an unconverted corpus", () => {
    // What keeps this additive over a corpus nobody has swept: the rows arrive as data, and a
    // target that has configured none owes nothing on this route.
    expect(parseScenarios(convertedScenario)).toEqual([
      { scnId: "SCN-FIT-001", evidenceObligations: [] },
    ]);
  });

  it("leaves the tier obligations of a converted scenario untouched", () => {
    // The axis tag is answered ALONGSIDE the tier tags, never instead of them — the stance the
    // registered-tag arm already takes (@SCN-LNT-006). A converted scenario that also carries a
    // tier owes both, in the order the arms run.
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @unit @fitness @SCN-FIT-001
    Scenario: a converted check carrying a runnable example too
      Given a step
`;

    expect(parseScenarios(source, [], [], new Map(), CONFIGURED)).toEqual([
      {
        scnId: "SCN-FIT-001",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "lint", staticCheck: "complexity" },
        ],
      },
    ]);
  });
});

/** The converted rows for @SCN-LNT-019 — one floor, one bar nothing can read, one no bar at all. */
const BY_SHAPE: FitnessCheckRegistry = new Map([
  ["SCN-FIT-002", { characteristic: "mutation", bar: { threshold: 90, atLeast: true } }],
  ["SCN-FIT-003", { characteristic: "coverage", bar: null }],
  ["SCN-FIT-001", { characteristic: "complexity" }],
]);

/** A converted scenario per row, in the order the expectations below read them. */
const byShapeCorpus = `@FIT
Feature: fitness

  Rule: the tree stays inside its bars

    @fitness @SCN-FIT-002
    Scenario: the tree stays above its mutation floor

    @fitness @SCN-FIT-003
    Scenario: the tree stays above its coverage floor

    @fitness @SCN-FIT-001
    Scenario: the codebase stays under the complexity threshold
`;

describe("[SCN-LNT-019] the row's shape decides which obligation the converted route raises", () => {
  it("raises measured where the row names a bar and static where it names none, in one read", () => {
    // WHOLE-CORPUS equality, so a rule that raised the measured shape for all three — or the static
    // shape for all three — reds as firmly as one that dropped a row.
    expect(parseScenarios(byShapeCorpus, [], [], new Map(), BY_SHAPE)).toEqual([
      {
        scnId: "SCN-FIT-002",
        evidenceObligations: [
          {
            qualityCheck: "lint",
            staticCheck: "mutation",
            measured: true,
            threshold: 90,
            atLeast: true,
          },
        ],
      },
      {
        // MEASURED WITH NO BAR is the legal, loud shape (@SCN-CIP-002). The flag routes the
        // obligation to the comparison arm and the missing bar is what that arm then reports;
        // marking it measured only where a bar was read would send an un-authored one down the
        // static route, to be reported as a check nobody wrote.
        scnId: "SCN-FIT-003",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "coverage", measured: true }],
      },
      {
        scnId: "SCN-FIT-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }],
      },
    ]);
  });

  it("carries a ceiling row's bar sparsely — the number, and no direction beside it", () => {
    // The direction is the TARGET's to author, never the engine's to infer from the characteristic
    // (@SCN-MUT-001): a row naming `atMost` lands exactly the keys it landed before floors existed.
    const ceiling: FitnessCheckRegistry = new Map([
      ["SCN-FIT-001", { characteristic: "ci-run-time", bar: { threshold: 75 } }],
    ]);

    expect(parseScenarios(convertedScenario, [], [], new Map(), ceiling)).toEqual([
      {
        scnId: "SCN-FIT-001",
        evidenceObligations: [
          { qualityCheck: "lint", staticCheck: "ci-run-time", measured: true, threshold: 75 },
        ],
      },
    ]);
  });

  it("raises the SAME obligation the threshold-registry route raises for a measured check", () => {
    // The two routes differ in where the bar was AUTHORED — a field of the converted row, or an
    // entry under `specController.thresholds` — and in nothing downstream of that. Compared against
    // the other route's own answer rather than against a literal, so a change to the measured shape
    // moves both or reds here.
    const byThresholdRegistry = `@FIT
Feature: fitness

  Rule: the tree stays inside its bars

    @mutation @SCN-FIT-002
    Scenario: the tree stays above its mutation floor
`;
    const converted = `@FIT
Feature: fitness

  Rule: the tree stays inside its bars

    @fitness @SCN-FIT-002
    Scenario: the tree stays above its mutation floor
`;

    expect(parseScenarios(converted, [], [], new Map(), BY_SHAPE)).toEqual(
      parseScenarios(
        byThresholdRegistry,
        [],
        [],
        new Map([["SCN-FIT-002", new Map([["mutation", { threshold: 90, atLeast: true }]])]])
      )
    );
  });
});
