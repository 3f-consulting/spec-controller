/**
 * @unit for @SCN-LNT-006 — the fitness half of the obligation rule: a STEPLESS scenario tagged with
 * a REGISTERED bare check owes that check, once — and for @SCN-LNT-010, the same rule read over
 * `lint`, the one bare tag that used to name the whole class.
 *
 * Bidirectional evidence: each describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in tests/steps/lintReconciliation.steps.ts.
 *
 * Its own file rather than a further block in scenarios.test.ts, which sits at a `max-lines`
 * exception — and an exception excuses existing debt, never headroom (complexity-threshold.feature).
 */

import { describe, it, expect } from "vitest";
import { parseScenarios, parseTaggedScenarios } from "./scenarios.js";

/** The registry's answer, as the corpus hop takes it: the bare tags this target's checks run under. */
const REGISTERED = ["complexity", "typecheck"];

const steplessScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @complexity @SCN-FIT-001
    Scenario: the codebase stays under the complexity threshold
`;

describe("[SCN-LNT-006] a stepless scenario's bare check tag raises one fitness Evidence Obligation", () => {
  it("raises exactly one obligation, naming the check the bare tag names", () => {
    expect(parseScenarios(steplessScenario, [], REGISTERED)).toEqual([
      { scnId: "SCN-FIT-001", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }] },
    ]);
  });

  it("raises it ONCE when the same check reaches the scenario twice", () => {
    // A scenario's effective tags are its own plus its Rule's and its Feature's (@SCN-LDG-020), so a
    // check hoisted to the Rule AND repeated on the scenario arrives twice. It is owed once — two
    // obligations for one check would reconcile the second `missing` forever, since one run is one
    // credit and can cite one @SCN.
    const source = `@complexity
Feature: fitness

  @complexity
  Rule: the tree stays inside its thresholds

    @complexity @SCN-FIT-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(source, [], REGISTERED)).toEqual([
      { scnId: "SCN-FIT-001", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }] },
    ]);
  });

  it("raises NOTHING for the same bare tag on a STEPPED scenario", () => {
    // The discriminator, and the reason it is load-bearing. A stepped scenario is a behavioural
    // EXAMPLE; raising a fitness obligation on it would smear a whole-system characteristic across a
    // row it is not about — name-match's own fault, back through a shorter tag. Only the tier
    // obligation survives.
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @unit @complexity @SCN-FIT-002
    Scenario: a behavioural example that happens to carry the tag
      Given a thing
`;

    expect(parseScenarios(source, [], REGISTERED)).toEqual([
      { scnId: "SCN-FIT-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });

  it("raises nothing for a bare tag the registry does not know", () => {
    // @smoke, @wip and every feature code ride the same tag lines. A tag is a check only because the
    // registry says so; inferring it from shape is the reading 3F-2495 already disproved.
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @smoke @SCN-FIT-003
    Scenario: a stepless scenario carrying no registered check
`;

    expect(parseScenarios(source, [], REGISTERED)).toEqual([
      { scnId: "SCN-FIT-003", evidenceObligations: [] },
    ]);
  });

  it("raises nothing when no registry is supplied", () => {
    // The reading is INERT until a target supplies its registry — which is what keeps this additive
    // over a corpus that has not been swept yet.
    expect(parseScenarios(steplessScenario)).toEqual([
      { scnId: "SCN-FIT-001", evidenceObligations: [] },
    ]);
  });

  it("raises one obligation per registered check the scenario carries, in the order its tags name them", () => {
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @typecheck @complexity @SCN-FIT-004
    Scenario: two checks, one scenario
`;

    expect(parseScenarios(source, [], REGISTERED)).toEqual([
      {
        scnId: "SCN-FIT-004",
        evidenceObligations: [
          { qualityCheck: "lint", staticCheck: "typecheck" },
          { qualityCheck: "lint", staticCheck: "complexity" },
        ],
      },
    ]);
  });

  it("defers the fitness obligation with the rest of the scenario's obligations", () => {
    // Scenario-scope deferral (@SCN-PND-016) marks EVERY obligation pending. A fitness obligation is
    // built before that pass, so it is covered by it rather than escaping through a later arm.
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @wip @complexity @SCN-FIT-005
    Scenario: a fitness scenario whose check is not wired yet
`;

    expect(parseScenarios(source, ["wip"], REGISTERED)).toEqual([
      {
        scnId: "SCN-FIT-005",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity", pending: true }],
      },
    ]);
  });

  it("reads steplessness off the corpus walk, not off a second reading of the file", () => {
    // The shape is a property of the scenario, so it travels with the tag set the obligation rule
    // already reads. A separate steplessness reader would be a second walk of the same file, free to
    // disagree with the first about which scenario it is looking at.
    expect(parseTaggedScenarios(steplessScenario)).toEqual([
      { scnId: "SCN-FIT-001", tags: ["complexity", "SCN-FIT-001", "FIT"], stepless: true },
    ]);
  });
});

describe("[SCN-LNT-010] bare @lint is the style-lint check, one peer among many", () => {
  /**
   * THE COMPANY IS THE ASSERTION. Over a registry of one, a peer and a catch-all are the same
   * reading — both raise a single obligation for a scenario carrying a single tag. The peers are
   * registered and never tagged, so the only route by which an obligation for `complexity` or
   * `typecheck` can reach the row below is a rule that reads the registry instead of the scenario.
   */
  const REGISTERED_WITH_LINT = ["lint", "complexity", "typecheck"];

  const bareLintScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @lint @SCN-FIT-001
    Scenario: the source stays inside the style rules
`;

  it("owes the style-lint check alone, never the class it used to name", () => {
    // BOTH SPELLINGS ARE VISIBLE HERE, and telling them apart is the point of asserting the whole
    // obligation. `qualityCheck: "lint"` is the AXIS a fitness obligation is filed under — the twin
    // of `unit` and `integration`, untouched by the unification — while `staticCheck: "lint"` is the
    // demoted TAG, one check among twelve. They share a word and are different facts; a reading that
    // merged them would be invisible in an assertion that checked only one.
    expect(parseScenarios(bareLintScenario, [], REGISTERED_WITH_LINT)).toEqual([
      { scnId: "SCN-FIT-001", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint" }] },
    ]);
  });

  it("owes nothing when the registry does not name it — no residue of its old standing", () => {
    // The demotion in its sharpest form. Every other bare tag is inert until a registry says
    // otherwise (@SCN-LNT-006); `lint` is the one tag for which a reader might still reach for a
    // built-in meaning, because for the whole of name-match it HAD one. A target that runs no style
    // lint owes no style lint, and spelling the tag cannot conjure the obligation.
    expect(parseScenarios(bareLintScenario, [], ["complexity", "typecheck"])).toEqual([
      { scnId: "SCN-FIT-001", evidenceObligations: [] },
    ]);
  });

  it("raises no fitness obligation from a STEPPED scenario, with no exemption for this one tag", () => {
    // Steplessness is the discriminator for every check (@SCN-LNT-006), and `lint` is where an
    // exemption would be most tempting: `lint` is the one bare tag with a prior life as the name
    // of the whole class, so a rule that read it off a STEPPED row would raise an obligation on
    // every behavioural scenario that mentions it — smearing a whole-system characteristic back
    // across the examples the unification just moved it off.
    const stepped = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @unit @lint @SCN-FIT-002
    Scenario: a behavioural example that happens to carry the tag
      Given a thing
`;

    expect(parseScenarios(stepped, [], REGISTERED_WITH_LINT)).toEqual([
      { scnId: "SCN-FIT-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });
});

/**
 * @unit for @SCN-LNT-007 — the retired `@lint=<handle>` form raises NOTHING.
 *
 * Its home is here rather than in `scenarios.test.ts` for that file's own reason: it sits at a
 * `max-lines` exception, and an exception excuses existing debt, never headroom
 * (complexity-threshold.feature). The claim also belongs beside @SCN-LNT-006's, since the two are
 * the same question asked of the two tag forms — one raises, the other no longer can.
 */
describe("[SCN-LNT-007] the retired @lint=<handle> form raises no Evidence Obligation", () => {
  /** The runnable handle a real registered check runs under — the strongest case for the form. */
  const REGISTERED_HANDLE = "lint:feature-codes";

  const retiredForm = (tags: string, steps = "      Given a thing\n"): string =>
    `@FIT
Feature: fitness

  Rule: the retired form is inert

    ${tags} @SCN-FIT-003
    Scenario: a scenario still spelling the retired form
${steps}`;

  it("raises nothing even when the handle it names IS a registered check's script", () => {
    // The re-routing trap: read the handle, look up its check in the registry, raise THAT
    // obligation. The corpus would go on reconciling and nobody would learn the form was retired.
    // `feature-codes` is registered here and the tag names its runnable handle, so a re-routing
    // reader passes a fixture the empty expectation refuses.
    expect(parseScenarios(retiredForm(`@lint=${REGISTERED_HANDLE}`), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-FIT-003", evidenceObligations: [] },
    ]);
  });

  it("raises nothing on a STEPLESS scenario either — the form is dead, not merely mis-shaped", () => {
    // Steplessness is what admits a BARE tag (@SCN-LNT-006). A reader that had merely moved the
    // retired form behind that gate would raise the obligation here and nowhere else, which reads
    // as retirement on the corpus this repository happens to carry.
    expect(parseScenarios(retiredForm(`@lint=${REGISTERED_HANDLE}`, ""), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-FIT-003", evidenceObligations: [] },
    ]);
  });

  it("leaves the scenario's OTHER obligations untouched — the form goes, the row does not", () => {
    // The retired tag is inert, not poisonous: a scenario carrying it alongside a runtime tier
    // still owes that tier. A reader that dropped the whole scenario would take real obligations
    // dark, which is the false-green the deferral-tag distinction exists to keep out (3F-2351).
    expect(parseScenarios(retiredForm(`@unit @lint=${REGISTERED_HANDLE}`), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-FIT-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });

  it("raises nothing for a handle nothing registers — no residual by-name reading survives", () => {
    // The other direction: under name-match the handle needed no registry at all, so an
    // unregistered one is exactly what the retired reader would still have raised.
    expect(parseScenarios(retiredForm("@lint=lint:nobody-registers-this"), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-FIT-003", evidenceObligations: [] },
    ]);
  });
});
