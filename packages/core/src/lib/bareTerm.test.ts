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

import { fitnessChecksOf } from "../domain/fitnessChecks.js";
import { citationOfCitedRow } from "../parse/fitnessCitations.js";
import { parseTaggedScenarios } from "../parse/scenarios.js";

describe("[SCN-TRM-001] a configured row's scn and characteristic name the row the target authored", () => {
  it("bares both terms of a row padded in front of their sigils", () => {
    // Both terms, because neither is an address on its own. A padded `scn` posts the obligation to
    // no row a corpus can find; a padded `characteristic` reports the row under a word the target
    // never wrote.
    const index = fitnessChecksOf([{ scn: "  @SCN-MSD-001", characteristic: "  @complexity" }]);
    expect(index.get("SCN-MSD-001")).toStrictEqual({ characteristic: "complexity" });
  });

  it("bares a row spelled with a space between the sigil and the term", () => {
    const index = fitnessChecksOf([{ scn: "@ SCN-MSD-001", characteristic: "@ complexity" }]);
    expect(index.get("SCN-MSD-001")).toStrictEqual({ characteristic: "complexity" });
  });

  it("drops a row whose scn is nothing but whitespace and a sigil", () => {
    // Dropped as `fitnessCheckOf` already drops a row naming no scenario — not indexed under `"@"`,
    // a key no lookup asks for.
    const index = fitnessChecksOf([{ scn: "  @  ", characteristic: "complexity" }]);
    expect(index.size).toBe(0);
  });

  it("keeps a doubled sigil and an interior @ exactly as the target spelled them", () => {
    const index = fitnessChecksOf([{ scn: "  @@SCN-MSD-001", characteristic: "  cucumber@e2e  " }]);
    expect(index.get("@SCN-MSD-001")).toStrictEqual({ characteristic: "cucumber@e2e" });
  });
});

describe("[SCN-TRM-001] a check step's id: names the row the target authored", () => {
  const fitnessChecks = fitnessChecksOf([{ scn: "SCN-MSD-001", characteristic: "complexity" }]);

  it("bares a step's id: padded in front of its sigil", () => {
    expect(citationOfCitedRow("  @SCN-MSD-001", fitnessChecks)).toStrictEqual({
      checkTag: "complexity",
      scnId: "SCN-MSD-001",
    });
  });

  it("bares a step's id: spelled with a space between the sigil and the term", () => {
    expect(citationOfCitedRow("@ SCN-MSD-001", fitnessChecks)).toStrictEqual({
      checkTag: "complexity",
      scnId: "SCN-MSD-001",
    });
  });

  it("names no row for a step's id: that is nothing but whitespace and a sigil", () => {
    // Bared to `""`, which no configured row is keyed by — the same "an empty answer is an
    // answer" reading `bareTerm`'s own doc-comment states, read here through the citation route.
    expect(citationOfCitedRow("  @  ", fitnessChecks)).toBeNull();
  });

  it("keeps a doubled sigil exactly as the step's id: spelled it, matching no un-doubled row", () => {
    // `/^@/` strips one leading sigil only (@SCN-LNT-001's pinned reading); a doubled sigil is a
    // different spelling, not whitespace, so it must NOT collapse onto a row named without it.
    expect(citationOfCitedRow("  @@SCN-MSD-001", fitnessChecks)).toBeNull();
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
