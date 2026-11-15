import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import type { ClaimCode } from "./claimCodes.js";
import { executableClaimsOf, type ClaimReadingSettings, type ExecutableClaim } from "./postEvidenceObligation.js";

const NOT_STRICT: ClaimReadingSettings = { deferralTags: [], strict: false };

const claimsIn = (feature: string, settings: ClaimReadingSettings = NOT_STRICT): ExecutableClaim[] =>
  executableClaimsOf([featureAsWrittenFrom("one.feature", feature)], settings);

const scenario = (tags: string): string => `Feature: one\n\n  ${tags}\n  Scenario: a scenario\n    Given a step\n`;

const outline = (tags: string, examples: string): string =>
  `Feature: one\n\n  Rule: a rule\n\n    ${tags}\n    Scenario Outline: an outline\n      Given <x>\n\n      Examples:\n${examples}`;

const written = (code: ClaimCode | undefined): string | undefined => code && `CLM-${code.featureCode}-${code.number}`;

const kindsOf = ({ obligations }: ExecutableClaim): string[] => obligations.map(({ kind }) => String(kind)).sort();

describe("an Outline will be one executable claim for each row only when it has a clm column", () => {
  it.each([
    ["CLM-OBL-001", "two rows with the claim codes CLM-ONE-001 and CLM-ONE-002", "@unit", "      | clm         | x |\n      | CLM-ONE-001 | a |\n      | CLM-ONE-002 | b |\n", ["CLM-ONE-001", "CLM-ONE-002"]],
    ["CLM-OBL-002", "the tag @CLM-ONE-001 and no clm column", "@unit @CLM-ONE-001", "      | x |\n      | a |\n      | b |\n", ["CLM-ONE-001"]],
    [
      "CLM-OBL-033",
      "an Examples block with CLM-ONE-001 in its clm column, and an Examples block with no table yet",
      "@unit",
      "      | clm         | x |\n      | CLM-ONE-001 | a |\n\n      Examples:\n",
      ["CLM-ONE-001"],
    ],
  ])("[%s] a Scenario Outline with %s has its executable claims", (_clm, _shape, tags, examples, codes) => {
    expect(claimsIn(outline(tags, examples)).map(({ claimCode }) => written(claimCode))).toEqual(codes);
  });
});

describe("balance reads a scenario after a Background as an executable claim", () => {
  it("[CLM-OBL-031] a feature file with a Background, and a scenario tagged @unit @CLM-ONE-001, has one executable claim, CLM-ONE-001", () => {
    // A Background on the Feature, and another on the Rule the scenario sits under.
    const withABackground =
      "Feature: one\n\n  Background:\n    Given a thing\n\n  Rule: a rule\n\n    Background:\n      Given another thing\n\n    @unit @CLM-ONE-001\n    Scenario: a scenario\n      Given a step\n";

    expect(claimsIn(withABackground).map(({ claimCode }) => written(claimCode))).toEqual(["CLM-ONE-001"]);
  });
});

describe("a feature file with no Feature has no executable claims", () => {
  it.each([
    ["empty", ""],
    ["only a comment", "# a comment\n"],
  ])("[CLM-OBL-032] a feature file that was %s has no executable claim", (_was, source) => {
    expect(claimsIn(source)).toEqual([]);
  });
});

describe("a deferral tag on the scenario, its Rule or its Feature will leave no executable claim", () => {
  it.each([
    ["CLM-OBL-003", "@wip", "the scenario", "Feature: one\n\n  @unit @wip\n  Scenario: a scenario\n    Given a step\n", []],
    ["CLM-OBL-004", "@ignore", "the scenario", "Feature: one\n\n  @unit @ignore\n  Scenario: a scenario\n    Given a step\n", []],
    ["CLM-OBL-005", "@skip", "the scenario", "Feature: one\n\n  @unit @skip\n  Scenario: a scenario\n    Given a step\n", []],
    ["CLM-OBL-006", "@todo", "the scenario", "Feature: one\n\n  @unit @todo\n  Scenario: a scenario\n    Given a step\n", []],
    ["CLM-OBL-007", "@pending", "the scenario", "Feature: one\n\n  @unit @pending\n  Scenario: a scenario\n    Given a step\n", []],
    ["CLM-OBL-008", "@blocked", "the scenario", "Feature: one\n\n  @unit @blocked\n  Scenario: a scenario\n    Given a step\n", ["blocked"]],
    ["CLM-OBL-025", "@wip", "its Feature", "@wip\nFeature: one\n\n  @unit\n  Scenario: a scenario\n    Given a step\n", []],
    ["CLM-OBL-026", "@wip", "its Rule", "Feature: one\n\n  @wip\n  Rule: a rule\n\n    @unit\n    Scenario: a scenario\n      Given a step\n", []],
  ] as const)("[%s] a scenario tagged @unit, with %s on %s, is no executable claim", (_clm, _deferral, _on, feature, configured) => {
    expect(claimsIn(feature, { deferralTags: configured, strict: false })).toEqual([]);
  });
});

describe("the Evidence Obligations will follow the claim's kind-of-quality-check tags", () => {
  it.each([
    ["CLM-OBL-009", "@CLM-ONE-001 @unit", undefined, ["unit"]],
    ["CLM-OBL-010", "@CLM-ONE-001 @unit @e2e", undefined, ["e2e", "unit"]],
    ["CLM-OBL-011", "@CLM-ONE-001 @unit @integration @e2e @performance", undefined, ["e2e", "integration", "performance", "unit"]],
    ["CLM-OBL-012", "@CLM-ONE-001 @fitness", undefined, ["fitness"]],
    ["CLM-OBL-013", "@CLM-ONE-001", undefined, []],
    ["CLM-OBL-014", "@CLM-ONE-001 @unit @integrationpending", undefined, ["unit"]],
    ["CLM-OBL-015", "@CLM-ONE-001 @integrationpending", undefined, []],
    ["CLM-OBL-016", "@unit @integration", "      | clm         | x |\n      | CLM-ONE-001 | a |\n", ["integration", "unit"]],
  ])("[%s] the claim of CLM-ONE-001 raises its kinds' Evidence Obligations", (_clm, tags, examples, kinds) => {
    expect(claimsIn(examples === undefined ? scenario(tags) : outline(tags, examples)).map(kindsOf)).toEqual([kinds]);
  });
});

describe("a strict run will raise the Evidence Obligations a deferral put off", () => {
  it.each([
    ["CLM-OBL-017", "@wip @unit", ["unit"]],
    ["CLM-OBL-018", "@integrationpending", ["integration"]],
    ["CLM-OBL-019", "@unit @integrationpending", ["integration", "unit"]],
    ["CLM-OBL-027", "@unitpending", ["unit"]],
    ["CLM-OBL-028", "@e2epending", ["e2e"]],
    ["CLM-OBL-029", "@performancepending", ["performance"]],
    ["CLM-OBL-030", "@fitnesspending", ["fitness"]],
  ])("[%s] in a strict run, a scenario tagged %s raises its Evidence Obligations", (_clm, tags, kinds) => {
    expect(claimsIn(scenario(`@CLM-ONE-001 ${tags}`), { deferralTags: [], strict: true }).map(kindsOf)).toEqual([kinds]);
  });
});

describe("a claim that cannot be mapped to a single claim code will raise its Evidence Obligation with no claim code", () => {
  it.each([
    ["CLM-OBL-020", "@unit @CLM-ONE-001 @CLM-ONE-002", undefined],
    ["CLM-OBL-021", "@unit", "      | clm | x |\n      |     | a |\n"],
    ["CLM-OBL-022", "@unit", "      | clm   | x |\n      | first | a |\n"],
    ["CLM-OBL-023", "@unit @CLM-A-001", undefined],
  ])("[%s] its unit Evidence Obligation is raised with no claim code", (_clm, tags, examples) => {
    expect(claimsIn(examples === undefined ? scenario(tags) : outline(tags, examples)).map((claim) => ({ claimCode: written(claim.claimCode), kinds: kindsOf(claim) }))).toEqual([
      { claimCode: undefined, kinds: ["unit"] },
    ]);
  });

  it("[CLM-OBL-024] an Outline tagged @unit @CLM-ONE-009, with a clm column, raises its unit Evidence Obligation with no claim code", () => {
    const claims = claimsIn(outline("@unit @CLM-ONE-009", "      | clm         | x |\n      | CLM-ONE-001 | a |\n"));

    expect(claims.map((claim) => [written(claim.claimCode), kindsOf(claim)])).toEqual([[undefined, ["unit"]]]);
  });
});
