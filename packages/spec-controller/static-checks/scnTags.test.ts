/**
 * Unit tests for the tier-tag floor static check logic (the @unit arm of @SCN-STG-001).
 * The feature-file SOURCES are injected as feature-strings — no disk read — so the
 * rule is proven in isolation: a tier-less non-@wip @SCN scenario reds (and is
 * named); a scenario naming a tier, a pending tier variant, a @lint=<guard>, or
 * carrying @wip passes; a bare Scenario with no @SCN is not checked.
 *
 * Bidirectional evidence (the discipline): the describe string carries the
 * @SCN-STG-001 id matching features/scn-tags.feature and the @integration steps in
 * tests/steps/scnTags.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { lintScnTags } from "./scnTags.js";

describe("[SCN-STG-001] the scn-tags tier-tag floor over injected feature sources", () => {
  it("does not flag scenarios naming a tier, a pending variant, bare @lint, or @wip", () => {
    const source = `@TGT
Feature: a compliant fixture

  @unit @SCN-TGT-001
  Scenario: a unit-tiered scenario
    Given the target source

  @integrationpending @SCN-TGT-002
  Scenario: an integration-pending scenario (the pending variant counts)
    Given the target source

  @lint @SCN-TGT-003
  Scenario: a scenario naming the bare style-lint check

  @wip @SCN-TGT-004
  Scenario: a tier-less scenario that is @wip is exempt
    Given the target source
`;
    const result = lintScnTags([{ slug: "compliant", source }]);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("flags a tier-less non-@wip scenario carrying an @SCN, naming it", () => {
    const source = `@TGT
Feature: a fixture with a tier-less scenario

  @SCN-TGT-001
  Scenario: a scenario that names no evidence tier
    Given the target source
`;
    const result = lintScnTags([{ slug: "tierless", source }]);
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.kind).toBe("missing-tier-tag");
    expect(result.violations[0]?.message).toContain("SCN-TGT-001");
    expect(result.violations[0]?.message).toContain("tierless");
  });

  it("REDS the retired @lint=<guard> form — the floor is not satisfied by a tag naming nothing", () => {
    // THE TRAP INVERTED (@SCN-LNT-007, 3F-2567). This clause used to be the #1 correctness trap in
    // the other direction: spec-controller WROTE lint as @lint=<guard>, so a floor matching only
    // bare @lint false-flagged every static-check scenario. The form now raises NO Evidence
    // Obligation, so recognising it here would be worse than that: a scenario could spell it,
    // satisfy the floor, and owe nothing at all — a tier-less scenario the floor called tiered.
    // Only ONE of the two clauses went; bare @lint stays, and the case above pins it.
    const source = `@STG
Feature: a scenario still spelling the retired form

  @lint=lint:scn-tags @SCN-STG-001
  Scenario: a scenario naming a retired tag form
    Given the target source
`;
    const result = lintScnTags([{ slug: "retired", source }]);
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.kind)).toContain("missing-tier-tag");
  });

  it("ignores a bare Scenario with no @SCN (an untagged scenario)", () => {
    const source = `@TGT
Feature: a fixture with an untagged scenario

  Scenario: a bare scenario with no @SCN id
    Given the target source
`;
    const result = lintScnTags([{ slug: "bare", source }]);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("names every tier-less offender across several feature sources", () => {
    const tierless = `@TGT
Feature: two tier-less scenarios

  @SCN-TGT-001
  Scenario: first tier-less scenario
    Given the target source

  @unit @SCN-TGT-002
  Scenario: a compliant scenario between them
    Given the target source

  @SCN-TGT-003
  Scenario: second tier-less scenario
    Given the target source
`;
    const result = lintScnTags([{ slug: "twin", source: tierless }]);
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.message).join("\n")).toContain("SCN-TGT-001");
    expect(result.violations.map((v) => v.message).join("\n")).toContain("SCN-TGT-003");
    expect(result.violations).toHaveLength(2);
  });
});

describe("[SCN-STG-002] a tag outside the recognised grammar reds the scn-tags static check", () => {
  const RECOGNISED = ["wip", "ignore", "skip", "todo", "pending"];

  it("flags a mistyped tier tag, naming the tag and the tier it resembles", () => {
    const source = `@TGT
Feature: a fixture carrying a typo

  @untit @SCN-TGT-001
  Scenario: a scenario whose only tier-ish tag is a typo
    Given the target source
`;
    const result = lintScnTags([{ slug: "typo", source }], RECOGNISED);

    // Two faults live here at once — the typo, and the tier the typo failed to name.
    // The unrecognised-tag one is what this scenario owns.
    const unrecognised = result.violations.filter((v) => v.kind === "unrecognised-tag");
    expect(result.ok).toBe(false);
    expect(unrecognised).toHaveLength(1);
    expect(unrecognised[0]?.message).toContain("@untit");
    expect(unrecognised[0]?.message).toContain("typo");
    expect(unrecognised[0]?.message).toContain("SCN-TGT-001");
    // The courtesy: the tier it resembles, so the author fixes it rather than hunts it.
    expect(unrecognised[0]?.message).toContain("@unit");
  });

  it("flags a tag that resembles no tier at all — the guess is a courtesy, not the verdict", () => {
    const source = `@TGT
Feature: a fixture carrying an invented tag

  @unit @wibble @SCN-TGT-001
  Scenario: a tiered scenario carrying a tag that means nothing here
    Given the target source
`;
    const result = lintScnTags([{ slug: "invented", source }], RECOGNISED);

    const unrecognised = result.violations.filter((v) => v.kind === "unrecognised-tag");
    expect(unrecognised).toHaveLength(1);
    expect(unrecognised[0]?.message).toContain("@wibble");
    // No tier is close enough to name, so none is named — and it reds regardless.
    expect(unrecognised[0]?.message).not.toContain("did you mean");
  });

  it("leaves a fully recognised tag block alone — tiers, pending variants, bare @lint, the @SCN id", () => {
    const source = `@TGT
Feature: a compliant fixture

  @unit @integrationpending @lint @SCN-TGT-001
  Scenario: a scenario whose every tag is grammar
    Given the target source
`;
    const result = lintScnTags([{ slug: "compliant", source }], RECOGNISED);

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe("[SCN-STG-003] a recognised community deferral tag is not an unrecognised tag", () => {
  /** What `resolveDeferralTags` hands the check over a tree with no config of its own. */
  const RECOGNISED = ["wip", "ignore", "skip", "todo", "pending"];

  it("leaves a tiered scenario carrying @skip alone — the product's own deferral policy is grammar", () => {
    const source = `@TGT
Feature: a fixture carrying community deferral tags

  @unit @skip @SCN-TGT-001
  Scenario: a tiered scenario deferred with @skip
    Given the target source

  @integration @todo @SCN-TGT-002
  Scenario: a tiered scenario deferred with @todo
    Given the target source
`;
    const result = lintScnTags([{ slug: "community", source }], RECOGNISED);

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("still reds a @skip scenario that names no tier — as tier-less, not as unrecognised", () => {
    // The boundary between the two questions. Recognising the tag says nothing about
    // whether the scenario named a tier, and @wip stays the only exemption.
    const source = `@TGT
Feature: a fixture whose deferred scenario names no tier

  @skip @SCN-TGT-001
  Scenario: a deferred scenario that names no evidence tier
    Given the target source
`;
    const result = lintScnTags([{ slug: "deferred-tierless", source }], RECOGNISED);

    expect(result.violations.map((v) => v.kind)).toEqual(["missing-tier-tag"]);
  });

  it("recognises a config-extended tag it is handed — the set is injected, not hard-coded", () => {
    // A target extending the deferral set via specController.deferralTags gets that tag
    // honoured here too. If this module carried its own copy of the starter list, this
    // case would red — which is the whole reason the set is a parameter.
    const source = `@TGT
Feature: a fixture using a project-configured deferral tag

  @unit @blocked @SCN-TGT-001
  Scenario: a tiered scenario deferred with a configured tag
    Given the target source
`;
    const result = lintScnTags([{ slug: "configured", source }], [...RECOGNISED, "blocked"]);

    expect(result.ok).toBe(true);
  });

  it("reds that same configured tag when it is NOT in the set handed to the check", () => {
    // The other half of the previous case: without the injection the tag means nothing,
    // so the pass above is the SET doing the work rather than the tag being harmless.
    const source = `@TGT
Feature: a fixture using a project-configured deferral tag

  @unit @blocked @SCN-TGT-001
  Scenario: a tiered scenario deferred with a configured tag
    Given the target source
`;
    const result = lintScnTags([{ slug: "configured", source }], RECOGNISED);

    expect(result.violations.map((v) => v.kind)).toEqual(["unrecognised-tag"]);
  });
});

describe("[SCN-STG-004] a group-prefixed quality-check tag is outside the grammar", () => {
  /** What `resolveDeferralTags` hands the check over a tree with no config of its own. */
  const RECOGNISED = ["wip", "ignore", "skip", "todo", "pending"];
  /** The registry names BARE tags, so registering `complexity` cannot recognise `fitness=complexity`. */
  const CHECKS = ["complexity", "typecheck"];

  it("reds a group-prefixed check tag, naming the bare tag it should have been", () => {
    const source = `@TGT
Feature: a fixture whose author spelled the group into the tag

  @unit @fitness=complexity @SCN-TGT-001
  Scenario: a tiered scenario carrying a check tag with its group spelled in
    Given the target source
`;
    const result = lintScnTags([{ slug: "grouped", source }], RECOGNISED, CHECKS);

    // The scenario names @unit, so the ONE violation is the grammar question's — the two
    // questions must not bleed, exactly as they must not for @skip (@SCN-STG-003).
    expect(result.violations.map((v) => v.kind)).toEqual(["unrecognised-tag"]);
    expect(result.violations[0]?.message).toContain("@fitness=complexity");
    expect(result.violations[0]?.message).toContain("@complexity");
  });

  it("names the bare tag whatever the group is called — there is no list of group names", () => {
    // The set of group words a codebase might invent is not enumerable, and a list of the ones
    // canon happens to name would green the first one nobody thought of. The rule is the SHAPE.
    const source = `@TGT
Feature: a fixture spelling a different group into the tag

  @behavioural=unit @SCN-TGT-001
  Scenario: a scenario whose tier tag carries a group
    Given the target source
`;
    const result = lintScnTags([{ slug: "behavioural", source }], RECOGNISED, CHECKS);

    const unrecognised = result.violations.filter((v) => v.kind === "unrecognised-tag");
    expect(unrecognised).toHaveLength(1);
    expect(unrecognised[0]?.message).toContain("@unit");
  });
});

describe("[SCN-STG-005] a stepless fitness scenario satisfies the tier floor by its bare check tag alone", () => {
  /** What `resolveDeferralTags` hands the check over a tree with no config of its own. */
  const RECOGNISED = ["wip", "ignore", "skip", "todo", "pending"];
  /** What the target's check registry names — `typecheck` carries no prefix on purpose (3F-2495). */
  const CHECKS = ["complexity", "typecheck"];

  it("passes a stepless scenario whose only tag beside its @SCN is a registered bare check", () => {
    const source = `@TGT
Feature: a target whose fitness checks are stepless scenarios

  @complexity @SCN-TGT-001
  Scenario: the codebase stays inside the complexity thresholds

  @typecheck @SCN-TGT-002
  Scenario: the tree typechecks
`;
    const result = lintScnTags([{ slug: "fitness", source }], RECOGNISED, CHECKS);

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("reds that same tag on a STEPPED scenario — as tier-less, never as unrecognised", () => {
    // The discriminator is the SHAPE, not the tag. A stepped scenario is an example, and a
    // whole-system characteristic cannot satisfy the tier of an example it was never about —
    // which is name-match's own fault arriving in a shorter spelling. The tag is still
    // grammar (it means something here), so the ONE violation is the floor's.
    const source = `@TGT
Feature: a target whose bare check tag rides a stepped scenario

  @complexity @SCN-TGT-001
  Scenario: a stepped scenario carrying a bare check tag and no tier
    Given the target source
`;
    const result = lintScnTags([{ slug: "stepped", source }], RECOGNISED, CHECKS);

    expect(result.violations.map((v) => v.kind)).toEqual(["missing-tier-tag"]);
  });

  it("reds that same stepless scenario when its tag is NOT in the registry handed to the check", () => {
    // The other half: without the injection the tag means nothing, so the pass above is the
    // REGISTRY doing the work rather than steplessness excusing whatever tag it finds. Inferring
    // a check from shape would let a typo satisfy the floor and raise no obligation — the silent
    // slip the floor exists to close.
    const source = `@TGT
Feature: a target whose check tag nothing registers

  @complexity @SCN-TGT-001
  Scenario: the codebase stays inside the complexity thresholds
`;
    const result = lintScnTags([{ slug: "unregistered", source }], RECOGNISED);

    expect(result.violations.map((v) => v.kind)).toEqual([
      "unrecognised-tag",
      "missing-tier-tag",
    ]);
  });

  it("leaves a registered check tag on a tiered stepped scenario alone — grammar wherever it sits", () => {
    // Recognising the tag and satisfying the floor are two questions, exactly as they are for a
    // community deferral tag (@SCN-STG-003). A check tag beside a tier raises no grammar
    // complaint; what it cannot do is stand IN for the tier.
    const source = `@TGT
Feature: a tiered scenario also carrying a check tag

  @unit @complexity @SCN-TGT-001
  Scenario: a stepped scenario naming its tier and a check
    Given the target source
`;
    const result = lintScnTags([{ slug: "both", source }], RECOGNISED, CHECKS);

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

/**
 * @SCN-STG-007 — one check per stepless fitness scenario, enforced from the CORPUS side.
 *
 * THE MIRROR OF @SCN-LNT-008, which enforces the same canon rule from the credit side: one run is
 * not evidence for two scenarios. That arm reds two scenarios reaching one check and has nothing to
 * say about one scenario reaching two, because from the credit's point of view nothing is wrong
 * there — two runs, two credits, both citing honestly. This closes the other direction, at the
 * point of authorship.
 *
 * COMPLEMENTARY TO @SCN-LNT-012, NOT A SUBSTITUTE. That made the model SOUND over the collision
 * (each credit answers its own check); this makes the collision UNCONSTRUCTIBLE from a feature
 * file. Both were ruled in: a registry mapping two handles onto one check reaches the collision
 * with no corpus fault for this check to see, and an author who wrote two tags on one scenario
 * meant two scenarios.
 */
describe("[SCN-STG-007] two bare check tags on one stepless scenario red the tier-tag check", () => {
  /** What `resolveDeferralTags` hands the check over a tree with no config of its own. */
  const RECOGNISED = ["wip", "ignore", "skip", "todo", "pending"];
  /** What the target's check registry names — `typecheck` carries no prefix on purpose (3F-2495). */
  const CHECKS = ["complexity", "typecheck"];

  it("reds a stepless scenario carrying two registered bare check tags, naming BOTH", () => {
    const source = `@TGT
Feature: a target whose stepless scenario claims two checks

  @complexity @typecheck @SCN-TGT-001
  Scenario: the codebase stays inside both thresholds
`;
    const result = lintScnTags([{ slug: "two-checks", source }], RECOGNISED, CHECKS);

    // ONE finding of its own kind, not two of some existing one: the fault is the PAIR, and a
    // per-tag violation would tell an author twice that a tag they wrote is fine on its own.
    expect(result.violations.map((v) => v.kind)).toEqual(["multiple-check-tags"]);
    // BOTH tags named, and the scenario. The author has to choose which scenario keeps which
    // check; a message naming one of them has already chosen for them.
    expect(result.violations[0]?.message).toContain("SCN-TGT-001");
    expect(result.violations[0]?.message).toContain("@complexity");
    expect(result.violations[0]?.message).toContain("@typecheck");
    expect(result.ok).toBe(false);
  });

  it("passes that same scenario once one of the two check tags is removed", () => {
    // THE REMEDY, over the one-tag difference — the pair is what makes the assertion above
    // load-bearing rather than a green that could have come from anywhere.
    const source = `@TGT
Feature: a target whose stepless scenario claims one check

  @complexity @SCN-TGT-001
  Scenario: the codebase stays inside the complexity thresholds
`;
    const result = lintScnTags([{ slug: "one-check", source }], RECOGNISED, CHECKS);

    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("leaves a STEPPED scenario carrying two TIER tags alone — two tiers is legal", () => {
    // The rule is about FITNESS tags on a STEPLESS scenario. A behavioural scenario owed evidence
    // on two tiers is the ordinary shape of most of this corpus, and a rule that counted tags
    // rather than reading the shape and the registry would red every one of them.
    const source = `@TGT
Feature: a target whose behavioural scenario names two tiers

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source
`;
    const result = lintScnTags([{ slug: "two-tiers", source }], RECOGNISED, CHECKS);

    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("leaves a STEPPED scenario carrying two check tags to the FLOOR, not to this rule", () => {
    // STEPLESS IS THE DISCRIMINATOR (@SCN-STG-005). A stepped scenario riding check tags has a
    // different fault — it names no tier — and saying "two checks" at it would send the author to
    // delete a tag when what they owe is a tier. One finding, and it is the floor's.
    const source = `@TGT
Feature: a target whose stepped scenario rides two check tags

  @complexity @typecheck @SCN-TGT-001
  Scenario: a stepped scenario carrying two check tags and no tier
    Given the target source
`;
    const result = lintScnTags([{ slug: "stepped-two", source }], RECOGNISED, CHECKS);

    expect(result.violations.map((v) => v.kind)).toEqual(["missing-tier-tag"]);
  });

  it("reds a @wip stepless scenario carrying two check tags — @wip defers what is OWED, not the shape", () => {
    // ASKED INDEPENDENTLY OF @wip, like the grammar question rather than like the floor. @wip
    // parks a scenario's evidence; it does not license a shape canon does not have, and the split
    // is the same edit whenever it happens. The floor is still exempted, so the ONE finding here
    // is this rule's.
    const source = `@TGT
Feature: a parked target scenario claiming two checks

  @wip @complexity @typecheck @SCN-TGT-001
  Scenario: the codebase stays inside both thresholds
`;
    const result = lintScnTags([{ slug: "wip-two-checks", source }], RECOGNISED, CHECKS);

    expect(result.violations.map((v) => v.kind)).toEqual(["multiple-check-tags"]);
  });

  it("counts only REGISTERED tags — an unregistered second tag is an unrecognised tag, not a second check", () => {
    // REGISTERED, NOT INFERRED, exactly as the floor reads it (@SCN-STG-005). A word the registry
    // does not know names no check, so it cannot be the second one; its fault is that it means
    // nothing here, and the near-miss courtesy is what the author needs.
    const source = `@TGT
Feature: a target whose second tag names no check

  @complexity @smoke @SCN-TGT-001
  Scenario: the codebase stays inside the complexity thresholds
`;
    const result = lintScnTags([{ slug: "unregistered-second", source }], RECOGNISED, CHECKS);

    expect(result.violations.map((v) => v.kind)).toEqual(["unrecognised-tag"]);
  });
});
