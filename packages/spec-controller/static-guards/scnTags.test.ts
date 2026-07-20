/**
 * Unit tests for the tier-tag floor static guard logic (the @unit arm of @SCN-STG-001).
 * The feature-file SOURCES are injected as feature-strings — no disk read — so the
 * rule is proven in isolation: a tier-less non-@wip @SCN scenario reds (and is
 * named); a scenario declaring a tier, a pending tier variant, a @lint=<guard>, or
 * carrying @wip passes; a bare Scenario with no @SCN is not checked.
 *
 * Bidirectional evidence (the discipline): the describe string carries the
 * @SCN-STG-001 id matching features/scn-tags.feature and the @integration steps in
 * tests/steps/scnTags.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { lintScnTags } from "./scnTags.js";

describe("[SCN-STG-001] the scn-tags tier-tag floor over injected feature sources", () => {
  it("does not flag scenarios declaring a tier, a pending variant, a @lint=<guard>, or @wip", () => {
    const source = `@TGT
Feature: a compliant fixture

  @unit @SCN-TGT-001
  Scenario: a unit-tiered scenario
    Given the target source

  @integrationpending @SCN-TGT-002
  Scenario: an integration-pending scenario (the pending variant counts)
    Given the target source

  @lint=lint:example @SCN-TGT-003
  Scenario: a lint-declared scenario (the =<guard> form counts)
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
  Scenario: a scenario that declares no evidence tier
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
    // The #1 correctness trap: spec-controller declares lint as @lint=<guard>, so a
    // static guard that only matched bare @lint would false-flag every static guard scenario.
    const source = `@STG
Feature: a guard self-declaration

  @lint=lint:scn-tags @SCN-STG-001
  Scenario: a guard scenario declaring its lint tier as @lint=<guard>
    Given the target source
`;
    const result = lintScnTags([{ slug: "guard", source }]);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("ignores a bare Scenario with no @SCN (not a declared scenario)", () => {
    const source = `@TGT
Feature: a fixture with an undeclared scenario

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
