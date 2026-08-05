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
  it("does not flag scenarios naming a tier, a pending variant, a @lint=<guard>, or @wip", () => {
    const source = `@TGT
Feature: a compliant fixture

  @unit @SCN-TGT-001
  Scenario: a unit-tiered scenario
    Given the target source

  @integrationpending @SCN-TGT-002
  Scenario: an integration-pending scenario (the pending variant counts)
    Given the target source

  @lint=lint:example @SCN-TGT-003
  Scenario: a lint-tiered scenario (the =<guard> form counts)
    Given the target source

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

  it("accepts the @lint=<guard> form specifically (a bare-@lint regex would miss it)", () => {
    // The #1 correctness trap: spec-controller WRITES lint as @lint=<guard>, so a
    // static check that only matched bare @lint would false-flag every static check scenario.
    const source = `@STG
Feature: a guard naming its own lint tier

  @lint=lint:scn-tags @SCN-STG-001
  Scenario: a guard scenario naming its lint tier as @lint=<guard>
    Given the target source
`;
    const result = lintScnTags([{ slug: "guard", source }]);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
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

  it("leaves a fully recognised tag block alone — tiers, pending variants, @lint=<guard>, the @SCN id", () => {
    const source = `@TGT
Feature: a compliant fixture

  @unit @integrationpending @lint=lint:example @SCN-TGT-001
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
