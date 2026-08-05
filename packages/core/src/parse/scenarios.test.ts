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

// The recognised community deferral tags, passed EXPLICITLY into `parseScenarios`. The core
// default is now `[]` (a policy-free pure core recognises only what it is told); the starter
// policy lives in the app (`packages/spec-controller/src/deferralTags.ts`). These @unit tests
// inject the set to exercise scenario-scope deferral — mirroring the app always passing its
// resolved (starter ∪ config) set at the ingest edge.
const DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];


/**
 * Give a fixture the `Feature:` header every real feature file has.
 *
 * These fixtures were written as headerless FRAGMENTS, which the old hand-rolled tag-line scan
 * tolerated because it never parsed Gherkin at all. The corpus is now read from the real Gherkin
 * AST (@SCN-LDG-020), and a headerless fragment is NOT valid Gherkin — cucumber rejects it
 * outright ("expected: #Tag..."), and @SCN-CLI-016 refuses such a file at the CLI edge. So the
 * fixtures gain the header they always implicitly needed; every assertion below is unchanged.
 */
const asFeature = (source: string): string => `Feature: a fixture feature\n\n${source}`;

describe("[SCN-RPT-008] countScnOccurrences counts every @SCN occurrence including non-tag context", () => {
  // Two TAG-LINE occurrences (@SCN-RPT-001, @SCN-LDG-003) plus two NON-tag mentions
  // (the same @SCN-RPT-001 in prose, @SCN-LNT-005 in a comment). Raw = 4; read as scenarios = 2.
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
    const scenarios = parseScenarios(asFeature(source)).length;
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
 * Proves the new obligation-side parse: it counts Gherkin scenario headers (Scenario /
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
    expect(parseUntaggedScenarios(asFeature(source))).toEqual([
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
    const [scenario] = parseScenarios(asFeature(source));
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
    const [scenario] = parseScenarios(asFeature(source));
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
    const foopending = parseScenarios(asFeature(["@foopending @SCN-XXX-003", "Scenario: an unknown pending tag", "  Given a step"].join("\n"))
    );
    const foo = parseScenarios(asFeature(["@foo @SCN-XXX-004", "Scenario: a plain unknown tag", "  Given a step"].join("\n"))
    );
    // Both derive an EMPTY obligation set — the unknown `pending` suffix buys no special
    // treatment; the passthrough is identical to any unrecognised tag.
    expect(foopending[0]!.evidenceObligations).toEqual([]);
    expect(foo[0]!.evidenceObligations).toEqual([]);
    expect(foopending[0]!.evidenceObligations).toEqual(foo[0]!.evidenceObligations);
  });

  // (A bare `@pending` scenario is NO LONGER a witness here: bare `pending` is a recognised
  // community DEFERRAL tag (a DEFAULT_DEFERRAL_TAG), so a zero-obligation `@pending` scenario
  // synthesises a scenario-scope Pending Item (@SCN-PND-022) — it is INSIDE the deferral lexicon,
  // not an unknown tag. Its obligation-scope absence stays proven by the `pendingQualityCheck`
  // helper test above; its synthesis by the [SCN-PND-022] arm.)

  it("an unknown <x>pending alongside a recognised tag leaves the recognised obligation intact", () => {
    // The passthrough is silent and local: `@foopending` contributes nothing while a
    // co-located `@unit` still derives its obligation — no error, no diagnostic, no
    // interference with the recognised lexicon.
    const [scenario] = parseScenarios(asFeature(["@unit @foopending @SCN-XXX-006", "Scenario: a mix", "  Given a step"].join("\n"))
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
 * @wip / @ignore / @skip / @todo / @pending), EVERY evidence obligation the scenario raises is marked
 * `pending: true`, reusing the slice-1/2 pending flag. So `@wip @unit @integration` derives two
 * PENDING obligations — the community tag defers the whole scenario, overriding the
 * observation-derived outcome. An UNRECOGNISED tag defers nothing (the negative boundary); and
 * the recognised set is a defaulted PARAM (`deferralTags`), so an injected set governs while the
 * built-in default is unaffected — config injection itself is @SCN-PND-021's job.
 *
 * Parent: @SCN-PND-016.
 */
describe("[SCN-PND-016] a recognised community deferral tag defers every named obligation on its scenario", () => {
  const COMMUNITY_TAGS = ["@wip", "@ignore", "@skip", "@todo", "@pending"] as const;

  COMMUNITY_TAGS.forEach((tag, i) => {
    it(`${tag} marks both the @unit and @integration obligation pending`, () => {
      const source = [
        `${tag} @unit @integration @SCN-XXX-${100 + i}`,
        "Scenario: a community-deferred scenario naming unit and integration obligations",
        "  Given a step",
      ].join("\n");
      const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
      // Every obligation the scenario raises is deferred pending — the community tag defers the whole
      // scenario. Reds today: a community tag is ignored, so the obligations are plain (no pending).
      expect(scenario!.evidenceObligations).toEqual([
        { qualityCheck: "unit", pending: true },
        { qualityCheck: "integration", pending: true },
      ]);
    });
  });

  it("defers a @lint=<guard> obligation too — the whole scenario is deferred", () => {
    // Scenario-scope deferral covers EVERY obligation kind, including a static-check `@lint`.
    const [scenario] = parseScenarios(asFeature(["@wip @lint=lint:feature-codes @SCN-XXX-110", "Scenario: a deferred lint scenario", "  Given a step"].join("\n")),
      DEFERRAL_TAGS
    );
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:feature-codes", pending: true },
    ]);
  });

  it("does not defer for an UNRECOGNISED community-shaped tag — the negative boundary", () => {
    // `@notadeferral` is not in the recognised set, so the obligations stay plain (non-pending):
    // recognition is gated on the set, not on any community-looking tag.
    const [scenario] = parseScenarios(asFeature(["@notadeferral @unit @integration @SCN-XXX-120", "Scenario: an unrecognised tag", "  Given a step"].join("\n"))
    );
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("honours the injected deferralTags param — a custom tag defers, the built-in default does not", () => {
    // parseScenarios(asFeature(source), deferralTags) takes the recognised set as a defaulted param. Passing
    // a custom set makes `@deferme` defer; under the default set it is unrecognised and does not.
    // (This proves the param is honoured; config INJECTION from package.json is @SCN-PND-021.)
    const source = [
      "@deferme @unit @SCN-XXX-130",
      "Scenario: a custom-deferral-tag scenario",
      "  Given a step",
    ].join("\n");
    expect(parseScenarios(asFeature(source), ["deferme"])[0]!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
    ]);
    expect(parseScenarios(asFeature(source))[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});

/**
 * Unit test for the OBLIGATION-SCOPE vs SCENARIO-SCOPE contrast at the parseScenarios level
 * (@SCN-PND-017).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-017 id
 * matching features/pending-items.feature, so a grep of the id returns both halves — this
 * @unit arm (parseScenarios over inline strings, in isolation) and the @integration arm
 * (tests/steps/pendingItems.steps.ts, over a planted tests/fixtures/ feature-string).
 *
 * Pins the SCOPE distinction: a `<qc>pending` tag (slice-1 obligation-scope) defers ONLY its own
 * obligation — a `@unit @integrationpending` scenario derives a NON-pending unit obligation
 * alongside a pending integration one. This CONTRASTS with the scenario-scope community tag
 * (@SCN-PND-016), which would defer BOTH: adding a `@wip` to the same scenario marks the unit
 * obligation pending too. The scenario-scope machinery must never over-reach into a bare tier
 * obligation absent a community tag.
 *
 * Parent: @SCN-PND-017.
 */
describe("[SCN-PND-017] `@integrationpending` defers only its own obligation (obligation-scope), not the whole scenario", () => {
  it("derives a non-pending unit obligation alongside a pending integration one — obligation-scope", () => {
    // `@unit @integrationpending`, NO community tag: the bare `@unit` obligation stays plain
    // (non-pending), while `@integrationpending` derives a deferred, one-sided obligation. The
    // `<qc>pending` deferral is scoped to its own check — it does NOT defer the whole scenario.
    const source = [
      "@unit @integrationpending @SCN-XXX-140",
      "Scenario: an obligation-scope-deferred scenario, no community tag",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source));
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration", pending: true },
    ]);
  });

  it("contrasts with the scenario-scope community tag — adding @wip defers the unit obligation too", () => {
    // The load-bearing contrast: the SAME `@unit @integrationpending` scenario, now ALSO carrying a
    // recognised community tag (@wip, scenario-scope), defers BOTH obligations. So obligation-scope
    // (integration only) and scenario-scope (every obligation) are distinct — the community tag
    // reaches the bare unit obligation, the bare `@integrationpending` never does.
    const source = [
      "@wip @unit @integrationpending @SCN-XXX-141",
      "Scenario: the same scenario, now scenario-scope deferred",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
      { qualityCheck: "integration", pending: true },
    ]);
  });
});

/**
 * Unit test for the COMPOSITION of the two deferral sources at the parseScenarios level
 * (@SCN-PND-018).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-018 id
 * matching features/pending-items.feature, so a grep of the id returns both halves — this
 * @unit arm (parseScenarios over inline strings, in isolation) and the @integration arm
 * (tests/steps/pendingItems.steps.ts, over a planted tests/fixtures/ feature-string).
 *
 * Pins that SCENARIO-SCOPE (@SCN-PND-016 — a recognised community tag defers every obligation) and
 * OBLIGATION-SCOPE (@SCN-PND-017 — `@<qc>pending` defers only its own check) COMPOSE without
 * interference. A `@wip @unit @integrationpending` scenario: the bare `@unit` obligation is deferred
 * by `@wip` alone (there is no `@unitpending`); the `@integration` obligation is deferred by
 * `@integrationpending` AND overlappingly by `@wip` (the scenario-scope post-pass mark is idempotent
 * on the already-pending obligation). So BOTH obligations are pending — one owed from each source.
 * Neither source suppresses the other.
 *
 * Parent: @SCN-PND-018.
 */
describe("[SCN-PND-018] a scenario-scope `@wip` and an obligation-scope `@integrationpending` compose — both obligations pending", () => {
  it("defers the bare unit by the scenario-scope `@wip` and the integration by the obligation-scope `@integrationpending` — both pending", () => {
    // `@wip @unit @integrationpending`: `@integrationpending` derives a pending integration
    // obligation (obligation-scope); `@wip` marks EVERY obligation pending (scenario-scope), reaching
    // the bare `@unit` one and idempotently re-marking the already-pending integration one. Both
    // obligations end pending — one from each source, composing without interference.
    const source = [
      "@wip @unit @integrationpending @SCN-XXX-160",
      "Scenario: a composition scenario — scenario-scope over obligation-scope",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
      { qualityCheck: "integration", pending: true },
    ]);
  });

  it("the scenario-scope source overlaps the obligation-scope one on integration — the mark is idempotent, no duplicate obligation", () => {
    // The overlap on the integration check: `@integrationpending` already flags it pending, and the
    // `@wip` post-pass marks it pending again — idempotent, never a second integration obligation.
    // Exactly one integration obligation (pending) and one unit obligation (pending), in tag order.
    const source = [
      "@wip @unit @integrationpending @SCN-XXX-161",
      "Scenario: overlap on the integration obligation",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    const integration = scenario!.evidenceObligations.filter((o) => o.qualityCheck === "integration");
    expect(integration).toEqual([{ qualityCheck: "integration", pending: true }]);
    expect(scenario!.evidenceObligations).toHaveLength(2);
  });
});

/**
 * Unit test for the NEGATIVE BOUNDARY of scenario-scope community-tag deferral at the
 * parseScenarios level (@SCN-PND-020).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-020 id
 * matching features/pending-items.feature, so a grep of the id returns both halves — this
 * @unit arm (parseScenarios over inline strings, in isolation) and the @integration arm
 * (tests/steps/pendingItems.steps.ts, over a planted tests/fixtures/ feature-string).
 *
 * Pins the negative boundary of @SCN-PND-016: a tag NOT in the recognised deferral set — an
 * unregistered project tag like `@foo`, neither a DEFAULT_DEFERRAL_TAGS community tag nor a
 * `<qc>pending` obligation-scope tag — is given NO special meaning and defers NOTHING. A `@foo
 * @unit` scenario derives a PLAIN (non-pending) unit obligation: the scenario-scope deferral is
 * gated on membership of the recognised set, never on any tag that merely looks like a deferral.
 * This is the slice-1 lexicon principle at scenario-scope — everything outside the recognised set
 * passes through untouched, exactly like the obligation-scope `<x>pending` passthrough
 * (@SCN-PND-003).
 *
 * Parent: @SCN-PND-020.
 */
describe("[SCN-PND-020] an unrecognised tag is given no special meaning — it defers nothing", () => {
  it("derives a plain (non-pending) obligation for a scenario carrying an unrecognised @foo tag", () => {
    // `@foo @unit`, no recognised deferral tag: `@foo` is not in the recognised set, so the bare
    // `@unit` obligation stays plain (no pending flag) — the scenario-scope machinery does not
    // over-reach into a tag that merely looks community-shaped.
    const source = [
      "@foo @unit @SCN-XXX-200",
      "Scenario: a scenario carrying an unrecognised tag alongside a named unit obligation",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source));
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });

  it("an unrecognised tag derives exactly what no extra tag would — the tag buys no special treatment", () => {
    // Passthrough PARITY: the `@foo` scenario derives exactly the obligation set a bare `@unit`
    // scenario (no extra tag at all) does — an unrecognised tag is inert, changing nothing.
    const withFoo = parseScenarios(asFeature(["@foo @unit @SCN-XXX-201", "Scenario: with an unrecognised tag", "  Given a step"].join("\n"))
    );
    const withoutFoo = parseScenarios(asFeature(["@unit @SCN-XXX-202", "Scenario: without any extra tag", "  Given a step"].join("\n"))
    );
    expect(withFoo[0]!.evidenceObligations).toEqual(withoutFoo[0]!.evidenceObligations);
    expect(withFoo[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});

/**
 * Unit test for INTERPRETATION 2 — the synthesised scenario-scope pending obligation at the
 * parseScenarios level (@SCN-PND-022).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-022 id
 * matching features/pending-items.feature, so a grep of the id returns both halves — this @unit
 * arm (parseScenarios over inline strings, in isolation, plus the reconcile.test.ts partition
 * arm) and the @integration arm (tests/steps/pendingItems.steps.ts, the full pipeline over a
 * planted tests/fixtures/ feature-string).
 *
 * Pins the close-out of the slice-4 Rule: a scenario carrying a recognised deferral tag but
 * raising ZERO evidence obligations (a bare `@wip` — no evidence tag) synthesises ONE
 * scenario-scope pending obligation `{ pending: true }` with NO `qualityCheck` (undefined =
 * scenario-scope). The reconcile partition (reconcile.test.ts) then routes it to one
 * `qualityCheck`-less Pending Item — so the scenario is deferred (pending), not both-missing.
 * The synthesis is GATED on a recognised deferral tag (the negative boundary) and fires ONLY on
 * the zero-obligation case (a `@wip` that DOES raise obligations keeps marking each pending, no extra
 * synthesised one — the @SCN-PND-016 path, unchanged).
 *
 * Parent: @SCN-PND-022.
 */
describe("[SCN-PND-022] a deferred scenario naming no obligations synthesises one scenario-scope pending obligation", () => {
  it("a bare @wip scenario (no evidence tag) derives ONE scenario-scope pending obligation with no qualityCheck", () => {
    // A bare `@wip` scenario raises zero obligations. Reds today: the scenario-scope post-pass
    // is a no-op on an empty obligation list, so parseScenarios emits `[]` and the scenario
    // reconciles both-missing downstream. Interpretation 2 synthesises ONE `qualityCheck`-less
    // pending obligation instead — the whole scenario is deferred.
    const source = [
      "@wip @SCN-XXX-210",
      "Scenario: a bare @wip scenario naming no obligations",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([{ pending: true }]);
  });

  it("does NOT synthesise for a NON-deferred scenario naming no obligations — the negative boundary", () => {
    // Without a recognised deferral tag, a zero-obligation scenario stays zero-obligation (it
    // reconciles both-missing downstream, unchanged). The synthesis is gated on the deferral tag,
    // never fired for a bare scenario that merely happens to raise nothing.
    const [scenario] = parseScenarios(asFeature(["@SCN-XXX-211", "Scenario: a bare scenario, no deferral tag", "  Given a step"].join("\n"))
    );
    expect(scenario!.evidenceObligations).toEqual([]);
  });

  it("still marks named obligations pending when the @wip scenario DOES name them — no spurious synthesised obligation", () => {
    // The synthesis is ONLY for the zero-obligation case. A `@wip` scenario that RAISES a `@unit`
    // obligation marks it pending (the @SCN-PND-016 scenario-scope path, unchanged) and adds NO
    // extra synthesised obligation — the list is exactly the one deferred obligation.
    const [scenario] = parseScenarios(asFeature(["@wip @unit @SCN-XXX-212", "Scenario: a @wip scenario naming a unit obligation", "  Given a step"].join("\n")),
      DEFERRAL_TAGS
    );
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "unit", pending: true }]);
  });

  it("synthesises for a project-configured deferral tag too — a custom tag on a zero-obligation scenario defers scenario-scope", () => {
    // The synthesis is gated on membership of the INJECTED deferralTags set (not the built-in
    // default alone): a project-configured `@deferme` on a zero-obligation scenario synthesises the
    // scenario-scope pending obligation, exactly like a built-in `@wip`.
    const source = [
      "@deferme @SCN-XXX-213",
      "Scenario: a custom-deferral-tag scenario naming no obligations",
      "  Given a step",
    ].join("\n");
    expect(parseScenarios(asFeature(source), ["deferme"])[0]!.evidenceObligations).toEqual([{ pending: true }]);
    // Under the built-in default set, `@deferme` is unrecognised → no synthesis (zero obligations).
    expect(parseScenarios(asFeature(source))[0]!.evidenceObligations).toEqual([]);
  });
});

/**
 * @unit for @SCN-LDG-020 (3F-1775) — the PARSED corpus is what CUCUMBER runs.
 *
 * Bidirectional evidence: the describe carries the @SCN-LDG-020 id matching
 * features/ledger.feature and the @integration steps in tests/steps/ledger.steps.ts.
 *
 * The corpus was read by a hand-rolled TAG-LINE SCAN that saw only the contiguous tag block
 * directly above a `Scenario:`. Gherkin does not work that way: a scenario INHERITS the tags of
 * its Feature and of any enclosing Rule, and cucumber applies them. A tier hoisted to the
 * Feature/Rule line — idiomatic, valid Gherkin — was therefore INVISIBLE, so its obligation was
 * never RAISED and its missing evidence could never reconcile `missing`: the run read BALANCED
 * while cucumber named a tier nothing proved. Extraction now comes from the real AST.
 */
describe("[SCN-LDG-020] a scenario's named tags include the ones it inherits from its Feature and Rule", () => {
  it("inherits an evidence tier from the FEATURE — the false-green that reads BALANCED today", () => {
    // THE HEADLINE. cucumber names unit AND integration of this scenario. The scan saw only
    // @unit, so the integration obligation was never RAISED — and an obligation that was never
    // raised can never reconcile `missing`.
    const source = `@AAA @integration
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.scnId).toBe("SCN-AAA-001");
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("inherits an evidence tier from an enclosing RULE", () => {
    const source = `@AAA
Feature: alpha

  @integration
  Rule: alpha behaves

    @unit @SCN-AAA-001
    Scenario: alpha works
      Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("does NOT invent a phantom scenario from a tag block above a Rule — the over-read (operator: give it teeth)", () => {
    // THE SECOND BUG. Any non-tag line FLUSHED the accumulated block, so a tag block above a
    // `Rule:` was emitted AS IF it were a scenario. The corpus did not merely under-read — it
    // INVENTED. Exactly one real scenario lives here, and the AST knows it.
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    @SCN-AAA-002
    Scenario: alpha works
      Given a thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(1);
    // The one real scenario, carrying its OWN id and the tier inherited from the Rule.
    expect(scenarios[0]!.scnId).toBe("SCN-AAA-002");
    expect(scenarios[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });

  it("inherits a @lint=<guard> obligation and a community deferral tag, like any other tag", () => {
    // Inheritance is not tier-only: EVERY tag inherits, exactly as cucumber resolves them.
    const lintSource = `@AAA @lint=lint:feature-codes
Feature: alpha

  @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;
    expect(parseScenarios(lintSource)[0]!.evidenceObligations).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:feature-codes" },
    ]);

    // A deferral tag on the Feature defers every scenario beneath it — the whole-file @wip.
    const deferredSource = `@AAA @wip
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;
    expect(parseScenarios(deferredSource, ["wip"])[0]!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
    ]);
  });

  it("inherits an @SCN from the Rule — parity with cucumber, which inherits EVERY tag", () => {
    // Operator ruling: follow cucumber. Excluding @SCN would invent a rule cucumber does not
    // have. Both scenarios beneath therefore carry the inherited id — a corpus-authoring fault,
    // but a VISIBLE one (whether it should red is the deferred policy question, 3F-1774's sibling).
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works
      Given another thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(2);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-001", "SCN-AAA-001"]);
  });

  it("is BYTE-IDENTICAL on a file that uses no inheritance — the regression bar", () => {
    // The whole existing corpus is of this shape (verified: no .feature hoists a tier), so the
    // rewrite must not move a single obligation on it.
    const source = `@AAA
Feature: alpha

  @unit @integration @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  @unit @lint=lint:scn-tags @SCN-AAA-002
  Scenario: beta works
    Given another thing
`;
    expect(parseScenarios(source)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-AAA-002",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "lint", staticCheck: "lint:scn-tags" },
        ],
      },
    ]);
  });
  it("makes a duplicate scnId VISIBLE — two scenarios sharing an inherited @SCN are TWO scenarios, never deduped", () => {
    // THE OPERATOR'S GUARDRAIL (3F-1775). A hoisted @SCN is inherited by every scenario beneath
    // it, so two scenarios can carry one id. The parser must NOT quietly collapse them: if it did,
    // the unproven scenario would vanish and the run would read balanced. It emits BOTH — and the
    // CLI then REFUSES the corpus (exit 2), because evidence citing a duplicated id cannot be
    // attributed to either scenario and any verdict over it would be a guess.
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works, and NOTHING proves it
      Given another thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(2);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-001", "SCN-AAA-001"]);
  });

  it("THROWS on unparseable source — an empty corpus balances against anything, so it never returns one", () => {
    // The silent-empty-corpus is the false-green species itself: a debit side of zero balances
    // against any evidence. @SCN-CLI-016 refuses such a file at the CLI edge long before this, so
    // the throw is unreachable in a real run — it is the floor that stops a future caller
    // re-opening the hole quietly.
    expect(() => parseScenarios("not gherkin at all {{{")).toThrow(/not valid Gherkin/);
  });
});
