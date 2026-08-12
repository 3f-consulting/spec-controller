/**
 * Unit coverage for the GHERKIN TAG LINE — the @unit arm of @SCN-VOC-013
 * (features/vocabulary-audit.feature), which is the surface `scanFile` could not see.
 *
 * WHY THIS IS ITS OWN FILE rather than another block in `vocabAudit.test.ts`. That file
 * carries a `max-lines` exception frozen at its measured code-line count (@SCN-CPX-002), and
 * an exception excuses the
 * debt already there and buys NOT ONE LINE of headroom — appending here would have redded the
 * reconciliation as a regression. The split is the ratchet doing its job, not a workaround: a
 * new scanning surface earns a file, and the pressure to create one is exactly what a frozen
 * ceiling is for.
 *
 * NOT EXEMPT (3F-2399). This file was on the audit's exempt list from 3F-2313 until the
 * corpus it feeds the classifier — the retired tag, a planted `supply`, a bare `guard`
 * handle — moved to `tests/fixtures/vocab/retiredTerms.ts`, where every banned word is a
 * mention by construction. It is now audited like any other code, which is the end state
 * 3F-2378 set and this sub-issue closes: no CODE file is exempt.
 *
 * Parent: 3F-2313 — audit the vocabulary on Gherkin tag lines.
 */

import { describe, it, expect } from "vitest";
import { auditFiles, scanFile } from "./vocabAudit.js";
import { DEFAULT_DEFERRAL_TAGS } from "../src/deferralTags.js";
import { CANONICAL, RETIRED, RETIRED_TAG_PHRASE } from "../../../tests/fixtures/vocab/retiredTerms.js";


describe("[SCN-VOC-013] the Gherkin tag line — author-chosen vocabulary vs the tag grammar", () => {
  // THE SURFACE THE SCANNER COULD NOT SEE. Every `.feature` line whose trimmed form began
  // with `@` was skipped WHOLESALE, so the one surface where a retired TAG lives was the one
  // surface the audit could not read (3F-2289 planted the retired tag there and got no row,
  // while the same token in a comment, an identifier, a string and a doc all fired).
  //
  // WHY THESE ASSERT ON `scanFile`'s SEGMENTS AND NOT ONLY ON THE MANIFEST. A manifest-only
  // green for a grammar token is AMBIGUOUS: `tgt` and `wip` are unknown words, and an unknown
  // word does not flag in PROSE mode anyway — so "no row" would be equally true of an
  // exemption that fired and of one that was never written. The SEGMENT list is the direct
  // output of the taxonomy, so asserting the grammar token produces NO SEGMENT proves the
  // exemption itself, not a coincidence downstream of it. That is what keeps these greens
  // from being green-by-erosion.
  const path = "features/tag-shapes.feature";

  /** One tag line carrying every shape the measured tree actually contains. */
  const everyShape = [
    "@TGT",
    "Feature: a corpus whose tag lines carry every measured shape",
    "",
    "  Rule: the shapes coexist",
    "",
    `    @unit @integration @wip @skip @lint=guard:domain-purity @${RETIRED_TAG_PHRASE} @SCN-TGT-001`,
    "    Scenario: the shapes coexist on one tag line",
    "      Given a step",
    "",
  ].join("\n");

  /** The texts `scanFile` emitted for the file, in order — the taxonomy's direct output. */
  const segmentTexts = (source: string): string[] =>
    scanFile(path, source).map((s) => s.text);

  it("[SCN-VOC-013] REDS the retired tag on a tag line, renaming it to the canon", () => {
    // The whole point of the Rule, and the case 3F-2289 proved invisible. Both halves of the
    // phrase are individually approved, so this reds only because the phrase arm
    // (@SCN-VOC-006) is reached at all — which it now is, on a tag line, in PROSE mode.
    const { manifest } = auditFiles([{ path, content: everyShape }]);
    const row = manifest.find((r) => r.current === RETIRED.tagPhraseFirst && r.file === path);
    expect(row).toBeDefined();
    expect(row!.new).toBe(CANONICAL.tag);
    expect(row!.action).toBe("rename");
    expect(row!.surface).toBe("feature");
    expect(row!.line).toBe(6);
  });

  it("[SCN-VOC-013] reds a plain BANNED word on a tag line too — the rule is not phrase-only", () => {
    // `supply` is a plain adopted row, the strongest matcher, and it flags in both modes. If
    // only the phrase arm reached tag lines the Rule would be a special case rather than a
    // segmentation fix.
    const source = ["@TGT", "Feature: f", "", "  @unit @supply-chain", "  Scenario: s", "    Given a step", ""].join("\n");
    expect(
      auditFiles([{ path, content: source }]).manifest.some((r) => r.current === "supply")
    ).toBe(true);
  });

  it("[SCN-VOC-013] the `@SCN-<FFF>-<NNN>` scenario id yields NO segment — and the BLANKING is why", () => {
    // NAMING THE RIGHT MECHANISM. `isStructuralTag` has no arm for a scenario id, deliberately:
    // SCN_TOKEN_RE blanks every id at the top of `scanFile`, so one can never reach the tag
    // walk. An earlier draft carried an id arm anyway "for explicitness" and a mutation probe
    // killed the idea — deleting that arm left the whole suite green, because it was
    // unreachable. Unreachable code that reads as a safeguard is worse than none.
    //
    // So this asserts the blanking, which is the true exemption: the WELL-FORMED id vanishes,
    // while an id-SHAPED token that SCN_TOKEN_RE does not match (letters where the number goes
    // — a real shape in tests/fixtures/pending-tags/) survives to be judged as any other tag.
    // The pair is what makes this a statement about the blanking rather than about tags.
    const texts = segmentTexts(everyShape);
    expect(texts).not.toContain("SCN-TGT-001");
    expect(texts.some((t) => t.toUpperCase().includes("SCN"))).toBe(false);

    const placeholder = ["@TGT", "Feature: f", "", "  @SCN-TGT-NNN", "  Scenario: s", "    Given a step", ""].join("\n");
    expect(segmentTexts(placeholder)).toContain("SCN-TGT-NNN");
  });

  it("[SCN-VOC-013] the `@<FFF>` feature-code header tag yields NO segment — the same ID scheme", () => {
    // The category the ticket's taxonomy missed, and the second largest in the tree (57
    // occurrences). It IS the `<FFF>` slot inside every scenario id — allocated in
    // featureCodes.ts's REGISTRY, held unique by lint:feature-codes — so it is grammar on
    // exactly the reasoning that exempts the id itself.
    expect(segmentTexts(everyShape)).not.toContain("TGT");
  });

  it("[SCN-VOC-013] the tier tags yield NO segment — scnTags.ts's own predicate, imported", () => {
    // Single-sourced deliberately: a second copy of the tier list would agree with
    // scnTags.ts by diligence and then drift — the agreeing-by-copy @SCN-VOC-008 removed for
    // `.gitignore` and @SCN-VOC-010 for the canon table.
    const texts = segmentTexts(everyShape);
    for (const grammar of ["unit", "integration"]) expect(texts).not.toContain(grammar);
  });

  it("[SCN-VOC-013] EVERY community deferral tag yields NO segment — the SET, not one word", () => {
    // THE ARM THAT STOPPED NAMING A TAG IT DOES NOT OWN (3F-2655). It used to read
    // `bare === "wip"` — a hard-coded community tag inside a guard, the same fault
    // `lint:scn-tags` carried at its tier floor, one module over. It greened the one word
    // whoever wrote it happened to think of and left `@skip`, `@todo`, `@ignore` and
    // `@pending` — the product's own parking policy, every one of them — to be read as
    // authored vocabulary.
    //
    // ASSERTED OVER THE WHOLE SET, and `wip` is deliberately not the only member checked: a
    // case naming `wip` alone passes under the rule this replaces, so it could not have told
    // the two apart. The list is read from the same starter set `resolveDeferralTags` unions
    // its config onto, so it cannot drift from the policy it claims to mirror.
    const texts = segmentTexts(everyShape);
    for (const tag of DEFAULT_DEFERRAL_TAGS) {
      const line = ["@TGT", "Feature: f", "", `  @unit @${tag} @SCN-TGT-001`, "  Scenario: s", "    Given a step", ""].join("\n");
      expect(segmentTexts(line)).not.toContain(tag);
    }
    expect(texts).not.toContain("wip");
    expect(texts).not.toContain("skip");
  });

  it("[SCN-VOC-013] the retired `@lint=<handle>` tag yields NO segment — via the VALUE-DROP", () => {
    // WHICH RULE HOLDS IT GREEN, RE-MEASURED (3F-2624). It used to be `isTierTag`, which
    // recognised the whole `lint=<handle>` token so that a bare-`lint`-only match would not
    // false-flag every static-check scenario. 3F-2567 deleted that clause — the form raises no
    // Evidence Obligation, so granting it the tier floor would call a scenario tiered while it
    // owed nothing — and the two rules SWAPPED: the token now reaches `authoredTags` as the KEY
    // `lint`, which is still a tier tag (bare `@lint` is a registered check), while the VALUE is
    // dropped by the `key=value` rule. Mutation-probed 2026-08-11, both ways: removing the
    // value-drop reds this case; the `lint=` clause it used to credit no longer exists to remove.
    const texts = segmentTexts(everyShape);
    expect(texts.some((t) => t.includes("guard"))).toBe(false);
    expect(texts).not.toContain("lint");
    expect(
      auditFiles([{ path, content: everyShape }]).manifest.some((r) => r.current === "guard")
    ).toBe(false);
  });

  it("[SCN-VOC-013] a NON-tier `@key=value` tag drops its VALUE and judges only the KEY", () => {
    // THE VALUE-DROP OVER A NON-TIER KEY. The case above now shares this rule (3F-2624), but
    // only for a key that IS a tier: it says nothing about what happens when the key itself must
    // be judged. `owner` is not a tier, so the key becomes a segment; `supply` sits in the VALUE
    // and must never be read as vocabulary — 3F-1929's ruling that a name-of-a-thing is a value.
    // This tree carries ZERO non-tier valued tags, so no run over it can tell the rule from its
    // absence and only a constructed case can.
    const source = ["@TGT", "Feature: f", "", "  @unit @owner=guard-supply-team", "  Scenario: s", "    Given a step", ""].join("\n");
    expect(segmentTexts(source)).toContain("owner");
    expect(
      auditFiles([{ path, content: source }]).manifest.some((r) => r.current === "supply")
    ).toBe(false);
  });

  it("[SCN-VOC-013] an unrecognised TIER tag falls through to the vocabulary walk", () => {
    // The ticket asked whether an unknown tier tag should be a separate, useful error. It
    // arrives for free and needs no second check: `@untit` is not `isTierTag`, so it is
    // author-chosen and meets the vocabulary like any other tag. Judging the closed tier SET
    // itself stays lint:scn-tags' ground.
    const source = ["@TGT", "Feature: f", "", "  @untit", "  Scenario: s", "    Given a step", ""].join("\n");
    expect(segmentTexts(source)).toContain("untit");
  });

  it("[SCN-VOC-013] a line is a TAG LINE only when EVERY token starts with `@` — prose is scanned as prose", () => {
    // scnTags.ts → parseScenarios' existing definition, reused rather than re-invented. The
    // old `trim().startsWith("@")` also swallowed a PROSE line that merely OPENS with a tag
    // reference; two such lines live in tests/fixtures/pending-tags/ and were silently
    // unscanned. Here the line carries a banned word, so the difference is observable.
    const source = ["@TGT", "Feature: f", "", "  Rule: r", "", "    @PDL / a supply of rows", "", "    @unit", "    Scenario: s", "      Given a step", ""].join("\n");
    expect(
      auditFiles([{ path, content: source }]).manifest.some((r) => r.current === "supply")
    ).toBe(true);
  });
});
