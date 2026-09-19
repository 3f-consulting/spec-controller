/**
 * Unit tests for the pending and deferral readings of parseScenarios (@SCN-PND-*), split out of
 * scenarios.test.ts under the max-lines ceiling (3F-3559).
 *
 * Bidirectional evidence: each describe carries the @SCN id of its scenario (Evidence Manifesto §9).
 */

import { describe, it, expect } from "vitest";
import {
  parseScenarios,
  pendingQualityCheck,
} from "./scenarios.js";
import { fitnessChecksOf } from "../domain/fitnessChecks.js";

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
    expect(pendingQualityCheck("fitnesspending")).toBe("fitness");
    // The retired spelling is not an alias (3F-3569): no adopter writes it.
    expect(pendingQualityCheck("lintpending")).toBeNull();
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

  it("defers a FITNESS obligation too — the whole scenario is deferred", () => {
    // Scenario-scope deferral covers EVERY obligation kind, the fitness one included: `@fitness`
    // and the configured row naming the scenario raise it (@SCN-LNT-018). The retired
    // `@lint=<handle>` form this case used to carry raises nothing at all now (@SCN-LNT-007), so
    // it could no longer say whether deferral reached the fitness axis.
    const [scenario] = parseScenarios(asFeature(["@wip @fitness @SCN-XXX-110", "Scenario: a deferred fitness scenario"].join("\n")),
      DEFERRAL_TAGS,
      fitnessChecksOf([{ scn: "SCN-XXX-110" }])
    );
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "fitness", pending: true },
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
