/**
 * Unit test for raw-occurrence counting (@SCN-RPT-008).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-008 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves countScnOccurrences in isolation: it matches every @SCN-FFF-NNN occurrence
 * across the WHOLE source — including the non-tag-line context (prose, comments, step
 * text) the tag-line parseScenarios deliberately ignores — so the delta against
 * parseScenarios(...).length is precisely the ids seen in non-tag context. parseScenarios
 * is unchanged (its existing tests stay green).
 *
 * Teeth: until the counter lands, the stub returns 0, so every count assertion reds
 * (the genuine red→green).
 *
 * Parent: @SCN-RPT-008.
 */

import { describe, it, expect } from "vitest";
import {
  countScnOccurrences,
  parseScenarios,
  parseUntaggedScenarios,
  pendingQualityCheck,
  proseOnlyCodes,
} from "./scenarios.js";

describe("[SCN-RPT-008] countScnOccurrences counts every @SCN occurrence including non-tag context", () => {
  // Two tag-line declarations (@SCN-RPT-001, @SCN-LDG-003) plus two NON-tag mentions
  // (the same @SCN-RPT-001 in prose, @SCN-LNT-005 in a comment). Raw = 4; declared = 2.
  const source = [
    "@RPT @SCN-RPT-001",
    "Scenario: a thing",
    "  Given the rule @SCN-RPT-001 is referenced again in prose",
    "  # see also @SCN-LNT-005 in a comment",
    "",
    "@unit @SCN-LDG-003",
    "Scenario: another",
  ].join("\n");

  it("counts @SCN occurrences across tag lines AND non-tag context (prose, comments)", () => {
    expect(countScnOccurrences(source)).toBe(4);
  });

  it("the delta over parseScenarios length is exactly the non-tag occurrences", () => {
    // parseScenarios reads 2 tag-line scenarios; raw counts 4; excluded = 2.
    const scenarios = parseScenarios(source).length;
    expect(scenarios).toBe(2);
    expect(countScnOccurrences(source) - scenarios).toBe(2);
  });

  it("returns 0 for a source with no @SCN occurrences", () => {
    expect(countScnOccurrences("Feature: nothing\n  Scenario: blank")).toBe(0);
  });
});

/**
 * Unit test for parseUntaggedScenarios (@SCN-RPT-014).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-014
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the new declared-side parse: it counts Gherkin scenario headers (Scenario /
 * Scenario Outline / Scenario Template / Example — NOT Examples:) and returns the names
 * of those whose preceding contiguous tag block carries no @SCN, mirroring parseScenarios's
 * block logic. Asserts REAL parser output, not a hand-seeded list (evidence-manifesto §11A).
 *
 * Parent: @SCN-RPT-014 — anchor audit: untagged scenarios.
 */
describe("[SCN-RPT-014] parseUntaggedScenarios returns the scenarios with no @SCN tag", () => {
  const source = [
    "@UNT",
    "Feature: a fixture",
    "",
    "  Rule: a mix of tagged and untagged scenarios",
    "",
    "    @unit @SCN-UNT-001",
    "    Scenario: a tagged scenario with an anchor",
    "      Given a step",
    "",
    "    Scenario: an untagged scenario",
    "      Given a step",
    "",
    "    Scenario Outline: an untagged outline",
    "      Given <x>",
    "      Examples:",
    "        | x |",
    "        | 1 |",
    "",
    "    @SCN-UNT-002",
    "    Scenario Outline: a tagged outline",
    "      Given <y>",
    "      Examples:",
    "        | y |",
    "        | 2 |",
  ].join("\n");

  it("returns the untagged scenario + outline names, excluding the @SCN-tagged ones", () => {
    expect(parseUntaggedScenarios(source)).toEqual([
      "an untagged scenario",
      "an untagged outline",
    ]);
  });

  it("counts Example: as a scenario but never the Examples: data table", () => {
    const ex = [
      "Feature: examples",
      "  Example: a bare example with no anchor",
      "    Given a step",
      "  @SCN-EX-001",
      "  Example: a tagged example",
      "    Given a step",
      "    Examples:", // the data-table keyword — must NOT count as a scenario
      "      | a |",
      "      | 1 |",
    ].join("\n");
    // Only the untagged "Example:" is returned; the tagged one and the Examples: table are not.
    expect(parseUntaggedScenarios(ex)).toEqual(["a bare example with no anchor"]);
  });

  it("returns nothing when every scenario carries an @SCN tag", () => {
    const allTagged = [
      "@SCN-A-001",
      "Scenario: one",
      "  Given a step",
      "@SCN-A-002",
      "Scenario: two",
      "  Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(allTagged)).toEqual([]);
  });
});

/**
 * Unit test for proseOnlyCodes (@SCN-RPT-015).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-015
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the cross-corpus difference: a code is prose-only iff it appears in non-tag
 * context AND is never an @SCN tag ANYWHERE across the sources. The cross-file union is
 * load-bearing — a code tagged in one file but prosed in another is NOT dangling. Asserts
 * REAL parser output, not a hand-seeded list (evidence-manifesto §11A).
 *
 * Parent: @SCN-RPT-015 — anchor audit: prose-only codes.
 */
describe("[SCN-RPT-015] proseOnlyCodes returns the @SCN codes mentioned in prose but never tagged anywhere", () => {
  // File A tags AAA-001 (and prose-mentions it — legitimate) and prose-mentions a
  // dangling DANGLE-001. File B tags BBB-002, prose-mentions AAA-001 (tagged in A —
  // NOT dangling, the cross-file union) and a dangling DANGLE-002.
  const sourceA = [
    "@RPT @SCN-AAA-001",
    "Scenario: a tagged scenario",
    "  Given @SCN-AAA-001 is referenced again in prose (legitimate — it IS tagged)",
    "  # see also @SCN-DANGLE-001 — a dangling reference, never tagged",
  ].join("\n");
  const sourceB = [
    "@RPT @SCN-BBB-002",
    "Scenario: another tagged scenario",
    "  Given the rule mentions @SCN-AAA-001 (tagged in file A — not dangling)",
    "  # and @SCN-DANGLE-002 — dangling, never tagged anywhere",
  ].join("\n");

  it("returns only the codes that are prosed AND never tagged across the whole corpus", () => {
    expect(proseOnlyCodes([sourceA, sourceB])).toEqual([
      "SCN-DANGLE-001",
      "SCN-DANGLE-002",
    ]);
  });

  it("excludes a code tagged in ANY file even when prosed in another (cross-file union)", () => {
    // AAA-001 is tagged in A and prosed in BOTH A and B — still not prose-only.
    expect(proseOnlyCodes([sourceA, sourceB])).not.toContain("SCN-AAA-001");
    // BBB-002 is tagged (and not prosed) — not in the prose set at all.
    expect(proseOnlyCodes([sourceA, sourceB])).not.toContain("SCN-BBB-002");
  });

  it("excludes a code tagged and prosed in the SAME file (not dangling)", () => {
    const single = [
      "@SCN-SAME-001",
      "Scenario: tagged and mentioned",
      "  Given @SCN-SAME-001 is also in prose here",
    ].join("\n");
    expect(proseOnlyCodes([single])).toEqual([]);
  });
});

/**
 * Unit test for pendingQualityCheck (@SCN-PND-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-001
 * id matching features/pending-items.feature, so a grep of the id returns both halves —
 * this @unit arm (the parse helper in isolation) and the @integration arm
 * (tests/steps/pendingItems.steps.ts, the tag flowing through parseScenarios).
 *
 * Proves the helper that recognises a `<quality-check>pending` tag (evidence-manifesto
 * §11B): each recognised `<qc>pending` maps to its quality-check, and the `pending` suffix
 * is significant — a bare tier tag is NOT a pending recognition.
 *
 * Parent: @SCN-PND-001.
 */
describe("[SCN-PND-001] pendingQualityCheck recognises a <quality-check>pending tag", () => {
  it("maps each recognised <qc>pending tag to its quality-check", () => {
    expect(pendingQualityCheck("lintpending")).toBe("lint");
    expect(pendingQualityCheck("unitpending")).toBe("unit");
    expect(pendingQualityCheck("integrationpending")).toBe("integration");
    expect(pendingQualityCheck("e2epending")).toBe("e2e");
    expect(pendingQualityCheck("performancepending")).toBe("performance");
  });

  it("does not read a bare tier tag as pending — the suffix is significant", () => {
    // The helper's own contract: a bare `@integration` is not a pending recognition
    // (the full parseScenarios-level significance is @SCN-PND-002's scenario).
    expect(pendingQualityCheck("integration")).toBeNull();
    expect(pendingQualityCheck("lint")).toBeNull();
  });
});

/**
 * Unit test for the `pending` suffix significance at the parseScenarios level (@SCN-PND-002).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-002 id
 * matching features/pending-items.feature, so a grep of the id returns both halves — this
 * @unit arm (parseScenarios over inline strings, in isolation) and the @integration arm
 * (tests/steps/pendingItems.steps.ts, over a planted tests/fixtures/ feature-string).
 *
 * Proves the two recognitions never collide: a scenario carrying a bare `@integration`
 * derives `{ qualityCheck: "integration" }` and NO pending obligation; a scenario carrying
 * `@integrationpending` derives `{ qualityCheck: "integration", pending: true }` and NO
 * plain (non-pending) integration obligation. This is the full derivation-loop significance
 * of the `pending` suffix that @SCN-PND-001's helper unit only hints at.
 *
 * Parent: @SCN-PND-002.
 */
describe("[SCN-PND-002] the pending suffix is significant at the parseScenarios level", () => {
  it("a bare @integration scenario derives a plain integration obligation and no pending one", () => {
    const source = [
      "@integration @SCN-XXX-001",
      "Scenario: a bare integration scenario",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(source);
    // Exactly the plain obligation — the object carries no `pending` key.
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario!.evidenceObligations.some((o) => o.pending)).toBe(false);
  });

  it("an @integrationpending scenario derives a pending integration obligation and no plain one", () => {
    const source = [
      "@integrationpending @SCN-XXX-002",
      "Scenario: a deferred integration scenario",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(source);
    // Exactly the pending obligation — and crucially NOT also a plain integration one.
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "integration", pending: true },
    ]);
    expect(
      scenario!.evidenceObligations.some(
        (o) => o.qualityCheck === "integration" && o.pending !== true
      )
    ).toBe(false);
  });
});

/**
 * Unit test for the passthrough of an unrecognised `<x>pending` tag (@SCN-PND-003).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-003 id
 * matching features/pending-items.feature, so a grep of the id returns both halves — this
 * @unit arm (the pendingQualityCheck helper + parseScenarios over inline strings, in
 * isolation) and the @integration arm (tests/steps/pendingItems.steps.ts, over a planted
 * tests/fixtures/ feature-string).
 *
 * Proves the boundary/passthrough rule: a tag OUTSIDE the recognised `<quality-check>pending`
 * lexicon — an unknown `@foopending` (foo ∉ the five checks) or a bare `@pending` — is
 * recognised by nothing and derives NO obligation, exactly like a plain unknown `@foo`. We
 * give special meaning only to our recognised lexicon; we do not police the developer's tags.
 *
 * Parent: @SCN-PND-003.
 */
describe("[SCN-PND-003] an unrecognised <x>pending tag is passed through, ignored like any unknown tag", () => {
  it("the helper returns null for an unknown <x>pending and for bare pending", () => {
    // foo is not one of the five quality-checks, so `foopending` is not in the lexicon.
    expect(pendingQualityCheck("foopending")).toBeNull();
    // Bare `pending` (the slice-4 community deferral tag) is likewise unrecognised at slice 1.
    expect(pendingQualityCheck("pending")).toBeNull();
    // A near-miss with an extra suffix is still not one of the five.
    expect(pendingQualityCheck("unitpendingx")).toBeNull();
  });

  it("an @foopending scenario derives no obligation — exactly like a plain unknown @foo", () => {
    const foopending = parseScenarios(
      ["@foopending @SCN-XXX-003", "Scenario: an unknown pending tag", "  Given a step"].join("\n")
    );
    const foo = parseScenarios(
      ["@foo @SCN-XXX-004", "Scenario: a plain unknown tag", "  Given a step"].join("\n")
    );
    // Both derive an EMPTY obligation set — the unknown `pending` suffix buys no special
    // treatment; the passthrough is identical to any unrecognised tag.
    expect(foopending[0]!.evidenceObligations).toEqual([]);
    expect(foo[0]!.evidenceObligations).toEqual([]);
    expect(foopending[0]!.evidenceObligations).toEqual(foo[0]!.evidenceObligations);
  });

  it("a bare @pending scenario derives no obligation", () => {
    const [scenario] = parseScenarios(
      ["@pending @SCN-XXX-005", "Scenario: a bare pending tag", "  Given a step"].join("\n")
    );
    expect(scenario!.evidenceObligations).toEqual([]);
  });

  it("an unknown <x>pending alongside a recognised tag leaves the recognised obligation intact", () => {
    // The passthrough is silent and local: `@foopending` contributes nothing while a
    // co-located `@unit` still derives its obligation — no error, no diagnostic, no
    // interference with the recognised lexicon.
    const [scenario] = parseScenarios(
      ["@unit @foopending @SCN-XXX-006", "Scenario: a mix", "  Given a step"].join("\n")
    );
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});

/**
 * Unit test for SCENARIO-SCOPE community-tag deferral at the parseScenarios level (@SCN-PND-016).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-016 id
 * matching features/pending-items.feature, so a grep of the id returns both halves — this
 * @unit arm (parseScenarios over inline strings, in isolation) and the @integration arm
 * (tests/steps/pendingItems.steps.ts, over a planted tests/fixtures/ feature-string).
 *
 * Proves the slice-4 foundation: when a scenario's tag block contains a RECOGNISED community
 * deferral tag (bare name ∈ the recognised set — the five DEFAULT_DEFERRAL_TAGS starter tags
 * @wip / @ignore / @skip / @todo / @pending), EVERY declared evidence obligation is marked
 * `pending: true`, reusing the slice-1/2 pending flag. So `@wip @unit @integration` derives two
 * PENDING obligations — the community tag defers the whole scenario, overriding the
 * observation-derived outcome. An UNRECOGNISED tag defers nothing (the negative boundary); and
 * the recognised set is a defaulted PARAM (`deferralTags`), so an injected set governs while the
 * built-in default is unaffected — config injection itself is @SCN-PND-021's job.
 *
 * Parent: @SCN-PND-016.
 */
describe("[SCN-PND-016] a recognised community deferral tag defers every declared obligation on its scenario", () => {
  const COMMUNITY_TAGS = ["@wip", "@ignore", "@skip", "@todo", "@pending"] as const;

  COMMUNITY_TAGS.forEach((tag, i) => {
    it(`${tag} marks both the @unit and @integration obligation pending`, () => {
      const source = [
        `${tag} @unit @integration @SCN-XXX-${100 + i}`,
        "Scenario: a community-deferred scenario declaring unit and integration obligations",
        "  Given a step",
      ].join("\n");
      const [scenario] = parseScenarios(source);
      // Every declared obligation is deferred pending — the community tag defers the whole
      // scenario. Reds today: a community tag is ignored, so the obligations are plain (no pending).
      expect(scenario!.evidenceObligations).toEqual([
        { qualityCheck: "unit", pending: true },
        { qualityCheck: "integration", pending: true },
      ]);
    });
  });

  it("defers a @lint=<guard> obligation too — the whole scenario is deferred", () => {
    // Scenario-scope deferral covers EVERY obligation kind, including a static-guard `@lint`.
    const [scenario] = parseScenarios(
      ["@wip @lint=lint:feature-codes @SCN-XXX-110", "Scenario: a deferred lint scenario", "  Given a step"].join("\n")
    );
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "lint", guard: "lint:feature-codes", pending: true },
    ]);
  });

  it("does not defer for an UNRECOGNISED community-shaped tag — the negative boundary", () => {
    // `@notadeferral` is not in the recognised set, so the obligations stay plain (non-pending):
    // recognition is gated on the set, not on any community-looking tag.
    const [scenario] = parseScenarios(
      ["@notadeferral @unit @integration @SCN-XXX-120", "Scenario: an unrecognised tag", "  Given a step"].join("\n")
    );
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("honours the injected deferralTags param — a custom tag defers, the built-in default does not", () => {
    // parseScenarios(source, deferralTags) takes the recognised set as a defaulted param. Passing
    // a custom set makes `@deferme` defer; under the default set it is unrecognised and does not.
    // (This proves the param is honoured; config INJECTION from package.json is @SCN-PND-021.)
    const source = [
      "@deferme @unit @SCN-XXX-130",
      "Scenario: a custom-deferral-tag scenario",
      "  Given a step",
    ].join("\n");
    expect(parseScenarios(source, ["deferme"])[0]!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
    ]);
    expect(parseScenarios(source)[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});
