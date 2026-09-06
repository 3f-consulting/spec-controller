/**
 * @unit for @SCN-TRM-001 — a term names the same pair however its author spaced it around the
 * sigil, at every CORE port that stores a hand-authored term as a key.
 *
 * Bidirectional evidence (Evidence Manifesto §9): every describe below carries [SCN-TRM-001],
 * matching features/term-spelling.feature and the @integration arm in
 * tests/steps/termSpelling.steps.ts. The app-side ports — a target's configured deferral tags and
 * the measurement artefact's row identity — are pinned in
 * tests/checks/termSpelling.test.ts, because `packages/core` cannot
 * import the app package and a core test that could would be the dependency cycle the seam exists
 * to refuse.
 *
 * WHAT THE PINS ARE ABOUT. A term padded IN FRONT of its sigil — `"  @SCN-MSD-001"` — is the one
 * spelling nothing in this repository generates and the one a target types by hand. Each port
 * stripped the sigil BEFORE trimming, so `/^@/` never matched, the trim then removed the space,
 * and the term was stored still carrying its `@` under a key no bare lookup ever asks for. The
 * miss is silent: `thresholdFor` answers null, a row is dropped, a registry entry is absent, and
 * every one of those is a legitimate reading of a key the target never named.
 *
 * THE BOUNDARIES ARE PINNED HERE BECAUSE THEY ONLY EXIST HERE. Whitespace both sides, whitespace
 * between the sigil and the term, a doubled sigil, an interior `@`, and a term that is nothing but
 * whitespace and a sigil are cheap to state over a pure function and expensive to state over a
 * ledger. What the @integration arm adds instead is the seam: a reading correct in isolation and
 * wired to a lookup asking bare reads green here and wrong on the ledger.
 */

import { describe, it, expect } from "vitest";

import { checkRegistryOf, checkTagOfScript, registeredCheckTags } from "../domain/checkRegistry.js";
import { measuredCheckTags, thresholdFor, thresholdsOf } from "../domain/thresholds.js";
import { parseMeasuredEvidenceObservations } from "../parse/measurements.js";
import { parseTaggedScenarios } from "../parse/scenarios.js";

describe("[SCN-TRM-001] a threshold's two key levels name the pair the target authored", () => {
  it("bares a key padded IN FRONT of its sigil, at both levels", () => {
    // The defect itself. `"  @SCN-MSD-001".replace(/^@/, "")` matches nothing — the anchor is
    // defeated by the space — and the trim that follows leaves `"@SCN-MSD-001"` in the registry
    // while every lookup asks for `"SCN-MSD-001"`. The bar the target plainly authored is dormant.
    const registry = thresholdsOf({ "  @SCN-MSD-001": { "  @ci-run-time": 75 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
  });

  it("bares a key padded on BOTH sides of its sigil", () => {
    const registry = thresholdsOf({ "  @SCN-MSD-001  ": { "  @ci-run-time  ": 75 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
  });

  it("bares a key spelled with a space BETWEEN the sigil and the term", () => {
    // Not sanitiser creep, and the test is the same one the leading pad fails: under a single
    // leading trim `"@ SCN-MSD-001"` stores `" SCN-MSD-001"`, which is the same silent miss in a
    // narrower spelling. After this, nothing reaches storage carrying whitespace or a sigil.
    const registry = thresholdsOf({ "@ SCN-MSD-001": { "@ ci-run-time": 75 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
  });

  it("names no pair at all for a key that is nothing but whitespace and a sigil", () => {
    // An empty term is dropped exactly as an empty one already is — it is not stored as `"@"`,
    // which is a key nobody can ask for and a bar that can never be settled.
    const registry = thresholdsOf({ "  @  ": { "ci-run-time": 75 } });
    expect(thresholdFor(registry, "", "ci-run-time")).toBeNull();
    expect(measuredCheckTags(registry)).toStrictEqual([]);
  });

  it("drops a check key that is nothing but whitespace and a sigil, leaving the scenario unnamed", () => {
    const registry = thresholdsOf({ "SCN-MSD-001": { "  @  ": 75 } });
    expect(measuredCheckTags(registry)).toStrictEqual([]);
    expect(thresholdFor(registry, "SCN-MSD-001", "@")).toBeNull();
  });

  it("keeps a DOUBLED sigil's second @, because a second @ is a different spelling and not whitespace", () => {
    // `/^@/` strips one. This is @SCN-LNT-001's pinned "strips only a leading @" read the other
    // way round, and it is stated here so the omission is not silent.
    const registry = thresholdsOf({ "  @@SCN-MSD-001": { "ci-run-time": 75 } });
    expect(thresholdFor(registry, "@SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
  });

  it("keeps an @ spelled INSIDE a term, however the term is padded", () => {
    // The must-not-move boundary, restated over a padded key: `thresholds.test.ts` pins the
    // unpadded `"cucumber@e2e"`, and trimming first must not turn the interior @ into a leading one.
    const registry = thresholdsOf({ "  @SCN-MSD-001": { "  cucumber@e2e  ": 75 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "cucumber@e2e")).toStrictEqual({ threshold: 75 });
  });
});

describe("[SCN-TRM-001] a check-registry tag names the check the target authored", () => {
  it("bares a tag padded in front of its sigil", () => {
    const registry = checkRegistryOf({ "lint:complexity": "  @complexity" });
    expect(checkTagOfScript(registry, "lint:complexity")).toBe("complexity");
  });

  it("bares a tag spelled with a space between the sigil and the term", () => {
    const registry = checkRegistryOf({ "lint:complexity": "@ complexity" });
    expect(checkTagOfScript(registry, "lint:complexity")).toBe("complexity");
  });

  it("drops an entry whose tag is nothing but whitespace and a sigil", () => {
    // Dropped as an empty entry already is, rather than registering the handle against `"@"` — a
    // tag no corpus carries, so the check would resolve to no scenario and land in suspense
    // looking like a check nobody named.
    const registry = checkRegistryOf({ "lint:complexity": "  @  " });
    expect(checkTagOfScript(registry, "lint:complexity")).toBeNull();
    expect(registeredCheckTags(registry)).toStrictEqual([]);
  });

  it("keeps a doubled sigil and an interior @ exactly as the target spelled them", () => {
    const registry = checkRegistryOf({ doubled: "  @@complexity", interior: "  cucumber@e2e  " });
    expect(checkTagOfScript(registry, "doubled")).toBe("@complexity");
    expect(checkTagOfScript(registry, "interior")).toBe("cucumber@e2e");
  });
});

describe("[SCN-TRM-001] a measurement row's two terms name the row the target authored", () => {
  it("bares both terms of a row padded in front of their sigils", () => {
    // Both terms, because neither is an address on its own (@SCN-LNT-012). A padded @SCN posts the
    // credit to a row nothing raised; a padded check tag settles an obligation nobody owes.
    const [observation] = parseMeasuredEvidenceObservations({
      measurements: [{ scnId: "  @SCN-MSD-001", checkTag: "  @ci-run-time", measured: 40 }],
    });
    expect(observation?.scnId).toBe("SCN-MSD-001");
    expect(observation?.checkTag).toBe("ci-run-time");
    expect(observation?.measured).toBe(40);
  });

  it("bares a term spelled with a space between the sigil and the term", () => {
    const [observation] = parseMeasuredEvidenceObservations({
      measurements: [{ scnId: "@ SCN-MSD-001", checkTag: "@ ci-run-time", measured: 40 }],
    });
    expect(observation?.scnId).toBe("SCN-MSD-001");
    expect(observation?.checkTag).toBe("ci-run-time");
  });

  it("drops a row whose term is nothing but whitespace and a sigil, as it drops a row missing one", () => {
    // The row is dropped rather than posted under `"@"`. A credit addressed to a term no corpus
    // carries is the phantom row this axis exists to keep unreachable.
    expect(
      parseMeasuredEvidenceObservations({
        measurements: [{ scnId: "  @  ", checkTag: "ci-run-time", measured: 40 }],
      })
    ).toStrictEqual([]);
    expect(
      parseMeasuredEvidenceObservations({
        measurements: [{ scnId: "SCN-MSD-001", checkTag: "  @  ", measured: 40 }],
      })
    ).toStrictEqual([]);
  });

  it("keeps a doubled sigil and an interior @ exactly as the artefact spelled them", () => {
    const [observation] = parseMeasuredEvidenceObservations({
      measurements: [{ scnId: "  @@SCN-MSD-001", checkTag: "  cucumber@e2e  ", measured: 40 }],
    });
    expect(observation?.scnId).toBe("@SCN-MSD-001");
    expect(observation?.checkTag).toBe("cucumber@e2e");
  });
});

describe("[SCN-TRM-001] the corpus read takes the same reading, though no whitespace can reach it", () => {
  it("bares every tag the Gherkin parser hands it", () => {
    // NOT a defect and never was — the parser tokenises, so `tag.name` is `"@unit"` and nothing
    // else. This port takes the shared reading anyway, so the count of readings stays at one
    // without a hand-written exception naming the copy that was allowed to stay (3F-2960's Ruling
    // 2). The pin is here to say the adoption changed nothing.
    const [scenario] = parseTaggedScenarios(
      `@TRM\nFeature: f\n\n  @unit @SCN-TRM-900\n  Scenario: s\n    Given a step\n`
    );
    expect(scenario?.scnId).toBe("SCN-TRM-900");
    expect(scenario?.tags).toContain("unit");
    expect(scenario?.tags).toContain("TRM");
    expect(scenario?.tags.some((tag) => tag.startsWith("@"))).toBe(false);
  });
});
