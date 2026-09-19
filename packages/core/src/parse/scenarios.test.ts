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
  proseOnlyCodes,
} from "./scenarios.js";


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
