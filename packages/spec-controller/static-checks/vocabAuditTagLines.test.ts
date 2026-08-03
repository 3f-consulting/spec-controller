/**
 * Unit coverage for the GHERKIN TAG LINE — the @unit arm of @SCN-VOC-013
 * (features/vocabulary-audit.feature), which is the surface `scanFile` could not see.
 *
 * WHY THIS IS ITS OWN FILE rather than another block in `vocabAudit.test.ts`. That file
 * carries a `max-lines` exception frozen at 801 (@SCN-CPX-002), and an exception excuses the
 * debt already there and buys NOT ONE LINE of headroom — appending here would have redded the
 * reconciliation as a regression. The split is the ratchet doing its job, not a workaround: a
 * new scanning surface earns a file, and the pressure to create one is exactly what a frozen
 * ceiling is for.
 *
 * SELF-EXEMPT (3F-2313). This file is listed in `vocabAuditCli.ts`'s `SELF_EXEMPT_PATHS` on
 * the ORIGINAL meta-mention ground (operator ruling 2026-07-02) rather than
 * `vocabAuditCli.test.ts`'s narrower one: it feeds a banned-word corpus — the retired tag
 * `@ci-performance`, a planted `supply`, a bare `guard` handle — straight to the classifier,
 * exactly as `vocabAudit.test.ts` does. Auditing it for the words it must name is a
 * guaranteed false positive. The entry is PINNED in `vocabAuditCli.test.ts`'s exact-path
 * case, so deleting it reds rather than quietly widening the blind spot.
 *
 * Parent: 3F-2313 — audit the vocabulary on Gherkin tag lines.
 */

import { describe, it, expect } from "vitest";
import { auditFiles, scanFile } from "./vocabAudit.js";


describe("[SCN-VOC-013] the Gherkin tag line — author-chosen vocabulary vs the tag grammar", () => {
  // THE SURFACE THE SCANNER COULD NOT SEE. Every `.feature` line whose trimmed form began
  // with `@` was skipped WHOLESALE, so the one surface where a retired TAG lives was the one
  // surface the audit could not read (3F-2289 planted `@ci-performance` there and got no row,
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
    "    @unit @integration @wip @lint=guard:domain-purity @ci-performance @SCN-TGT-001",
    "    Scenario: the shapes coexist on one tag line",
    "      Given a step",
    "",
  ].join("\n");

  /** The texts `scanFile` emitted for the file, in order — the taxonomy's direct output. */
  const segmentTexts = (source: string): string[] =>
    scanFile(path, source).map((s) => s.text);

  it("[SCN-VOC-013] REDS the retired tag `@ci-performance`, renaming it to the canon `ci-run-time`", () => {
    // The whole point of the Rule, and the case 3F-2289 proved invisible. `ci` and
    // `performance` are BOTH individually approved, so this reds only because the phrase arm
    // (@SCN-VOC-006) is reached at all — which it now is, on a tag line, in PROSE mode.
    const { manifest } = auditFiles([{ path, content: everyShape }]);
    const row = manifest.find((r) => r.current === "ci" && r.file === path);
    expect(row).toBeDefined();
    expect(row!.new).toBe("ci-run-time");
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

  it("[SCN-VOC-013] the tier tags and `@wip` yield NO segment — scnTags.ts's own predicate, imported", () => {
    // Single-sourced deliberately: a second copy of the tier list would agree with
    // scnTags.ts by diligence and then drift — the agreeing-by-copy @SCN-VOC-008 removed for
    // `.gitignore` and @SCN-VOC-010 for the canon table.
    const texts = segmentTexts(everyShape);
    for (const grammar of ["unit", "integration", "wip"]) expect(texts).not.toContain(grammar);
  });

  it("[SCN-VOC-013] the `@lint=<handle>` tag yields NO segment — via isTierTag's `lint=` FORM", () => {
    // WHICH RULE HOLDS IT GREEN, measured rather than assumed. Mutating `isTierTag` out reds
    // this case; mutating the value-drop out does NOT. So the whole `lint=<handle>` token is
    // recognised as a tier declaration by scnTags.ts's own predicate — a rule it already
    // owned so that a bare-`lint`-only match would not false-flag every static-check
    // scenario. Asserted here because that is the rule a future edit would break.
    const texts = segmentTexts(everyShape);
    expect(texts.some((t) => t.includes("guard"))).toBe(false);
    expect(texts).not.toContain("lint");
    expect(
      auditFiles([{ path, content: everyShape }]).manifest.some((r) => r.current === "guard")
    ).toBe(false);
  });

  it("[SCN-VOC-013] a NON-tier `@key=value` tag drops its VALUE and judges only the KEY", () => {
    // THE VALUE-DROP'S OWN TEETH, which the `@lint=` case above cannot supply — isTierTag
    // exempts that whole token either way, so a green there is silent on this rule. This tree
    // carries ZERO valued tags outside `@lint=`, so no run over it can tell the rule from its
    // absence and only a constructed case can. `owner` is not a tier, so the key becomes a
    // segment; `supply` sits in the VALUE and must never be read as vocabulary — 3F-1929's
    // ruling that a name-of-a-thing is a value, generalised past `@lint=`.
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
