/**
 * @unit for @SCN-TRM-001 — a term names the same pair however its author spaced it around the
 * sigil, at every CORE port that stores a hand-authored term as a key.
 *
 * Bidirectional evidence (Evidence Manifesto §9): every describe below carries [SCN-TRM-001],
 * matching features/term-spelling.feature and the @integration arm in
 * tests/steps/termSpelling.steps.ts. The app-side port — a target's configured deferral tags — is
 * proven by that same @integration arm, which the Rule preamble credits with "a deferral set",
 * because `packages/core` cannot import the app package and a core test that could would be the
 * dependency cycle the seam exists to refuse.
 *
 * WHAT THE PINS ARE ABOUT. A term padded IN FRONT of its sigil — `"  @SCN-MSD-001"` — is the one
 * spelling nothing in this repository generates and the one a target types by hand. Each port
 * stripped the sigil BEFORE trimming, so `/^@/` never matched, the trim then removed the space,
 * and the term was stored still carrying its `@` under a key no bare lookup ever asks for. The
 * miss is silent: a configured row is absent, a step's citation names nothing, and each is a
 * legitimate reading of a key the target never named.
 *
 * THE BOUNDARIES ARE PINNED HERE BECAUSE THEY ONLY EXIST HERE. Whitespace both sides, whitespace
 * between the sigil and the term, a doubled sigil, an interior `@`, and a term that is nothing but
 * whitespace and a sigil are cheap to state over a pure function and expensive to state over a
 * ledger. What the @integration arm adds instead is the seam: a reading correct in isolation and
 * wired to a lookup asking bare reads green here and wrong on the ledger.
 */

import { describe, it, expect } from "vitest";

import { citationOfCitedRow } from "../parse/fitnessCitations.js";
import { resolveDeferralTags } from "../parse/targetManifest.js";
import { parseTaggedScenarios } from "../parse/scenarios.js";

/**
 * THE PORT THIS BLOCK ONCE READ THROUGH WAS `fitnessChecksOf`, the manifest's fitness-check rows.
 * That reader left with the key it read (3F-3582), and the spelling rule it proved did not: it is
 * every `specController.*` port's. So the block re-points at `resolveDeferralTags`, a SURVIVING
 * port that stores a hand-authored term as a key through the same `bareTerm`, and the rule keeps a
 * live witness rather than losing one. `DEFAULT_DEFERRAL_TAGS` is the app's, so the starter set is
 * passed in empty here and the extras are what is read.
 */
describe("[SCN-TRM-001] a configured deferral tag names the term the target authored", () => {
  const configured = (tag: string): readonly string[] =>
    resolveDeferralTags({ specController: { deferralTags: [tag] } }, []);

  it("bares a tag padded in front of its sigil", () => {
    // A padded tag would defer nothing: the lookup asks bare, and a key still carrying its `@` is
    // one no lookup ever asks for.
    expect(configured("  @flaky")).toStrictEqual(["flaky"]);
  });

  it("bares a tag spelled with a space between the sigil and the term", () => {
    expect(configured("@ flaky")).toStrictEqual(["flaky"]);
  });

  it("drops a tag that is nothing but whitespace and a sigil", () => {
    // Dropped rather than stored under `"@"`, a key no lookup asks for.
    expect(configured("  @  ")).toStrictEqual([]);
  });

  it("keeps a doubled sigil exactly as the target spelled it", () => {
    // `/^@/` strips ONE leading sigil; a doubled sigil is a different spelling, not whitespace.
    expect(configured("  @@flaky")).toStrictEqual(["@flaky"]);
  });
});

describe("[SCN-TRM-001] a check step's id: names the scenario the target authored", () => {
  it("bares a step's id: padded in front of its sigil", () => {
    expect(citationOfCitedRow("  @SCN-MSD-001")).toStrictEqual({
      scnId: "SCN-MSD-001",
    });
  });

  it("bares a step's id: spelled with a space between the sigil and the term", () => {
    expect(citationOfCitedRow("@ SCN-MSD-001")).toStrictEqual({
      scnId: "SCN-MSD-001",
    });
  });

  it("cites nothing for a step's id: that is nothing but whitespace and a sigil", () => {
    // Bared to `""`, which is no `@SCN` — the same "an empty answer is an answer" reading
    // `bareTerm`'s own doc-comment states, read here through the citation route.
    expect(citationOfCitedRow("  @  ")).toBeNull();
  });

  it("keeps a doubled sigil exactly as the step's id: spelled it, citing no un-doubled scenario", () => {
    // `/^@/` strips one leading sigil only (@SCN-LNT-001's pinned reading); a doubled sigil is a
    // different spelling, not whitespace, so it bares to `@SCN-MSD-001` — which is not a bare
    // `@SCN` code, so it cites nothing rather than collapsing onto the scenario named without it.
    expect(citationOfCitedRow("  @@SCN-MSD-001")).toBeNull();
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
