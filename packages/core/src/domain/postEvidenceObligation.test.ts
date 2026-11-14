import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import type { ClaimCode } from "./claimCodes.js";
import postEvidenceObligationVariants from "./postEvidenceObligation.variants.json" with { type: "json" };
import { executableClaimsOf, type ClaimReadingSettings, type ExecutableClaim } from "./postEvidenceObligation.js";

const NOT_STRICT: ClaimReadingSettings = { deferralTags: [], strict: false };

const claimsIn = (feature: string, settings: ClaimReadingSettings = NOT_STRICT): ExecutableClaim[] =>
  executableClaimsOf([featureAsWrittenFrom("one.feature", feature)], settings);

const scenario = (tags: string): string => `Feature: one\n\n  ${tags}\n  Scenario: a scenario\n    Given a step\n`;

const outline = (tags: string, examples: string): string =>
  `Feature: one\n\n  Rule: a rule\n\n    ${tags}\n    Scenario Outline: an outline\n      Given <x>\n\n      Examples:\n${examples}`;

// A feature with one scenario, or one Outline with the Examples rows given, under the tags given.
const featureOf = ([shape, tags, examples]: readonly [string, string, string?]): string =>
  shape === "outline" ? outline(tags, examples ?? "") : scenario(tags);

const written = (code: ClaimCode | undefined): string | undefined => code && `CLM-${code.featureCode}-${code.number}`;

const kindsOf = ({ obligations }: ExecutableClaim): string[] => obligations.map(({ kind }) => String(kind)).sort();

describe("an executable claim is a scenario, or a row of an Outline with a clm column", () => {
  it.each([
    ["CLM-OBL-001", "two rows with the claim codes CLM-ONE-001 and CLM-ONE-002", "two executable claims, CLM-ONE-001 and CLM-ONE-002", ["outline", "@unit", "      | clm         | x |\n      | CLM-ONE-001 | a |\n      | CLM-ONE-002 | b |\n"] as const, ["CLM-ONE-001", "CLM-ONE-002"]],
    ["CLM-OBL-002", "the tag @CLM-ONE-001 and no clm column", "one executable claim, CLM-ONE-001", ["outline", "@unit @CLM-ONE-001", "      | x |\n      | a |\n      | b |\n"] as const, ["CLM-ONE-001"]],
    [
      "CLM-OBL-033",
      "an Examples block with CLM-ONE-001 in its clm column, and an Examples block with no table yet",
      "one executable claim, CLM-ONE-001",
      ["outline", "@unit", "      | clm         | x |\n      | CLM-ONE-001 | a |\n\n      Examples:\n"] as const,
      ["CLM-ONE-001"],
    ],
  ])("[%s] a Scenario Outline had %s: when balance reads the corpus, there will be %s", (_clm, _shape, _claims, feature, codes) => {
    expect(claimsIn(featureOf(feature)).map(({ claimCode }) => written(claimCode))).toEqual(codes);
  });

  it("[CLM-OBL-031] a feature file had a Background, and a scenario tagged @unit @CLM-ONE-001: when balance reads the corpus, there will be one executable claim, CLM-ONE-001", () => {
    // A Background on the Feature, and another on the Rule the scenario sits under.
    const withABackground =
      "Feature: one\n\n  Background:\n    Given a thing\n\n  Rule: a rule\n\n    Background:\n      Given another thing\n\n    @unit @CLM-ONE-001\n    Scenario: a scenario\n      Given a step\n";

    expect(claimsIn(withABackground).map(({ claimCode }) => written(claimCode))).toEqual(["CLM-ONE-001"]);
  });

  it.each([
    ["empty", ""],
    ["only a comment", "# a comment\n"],
  ])("[CLM-OBL-032] a feature file was %s: when balance reads the corpus, there will be no executable claim", (_was, source) => {
    expect(claimsIn(source)).toEqual([]);
  });
});

// A scenario tagged @unit, with the deferral tag on it, on its Feature, or on the Rule it sits under.
const deferredBy = (deferral: string, on: "the scenario" | "its Feature" | "its Rule"): string => {
  if (on === "its Feature") return `${deferral}\nFeature: one\n\n  @unit\n  Scenario: a scenario\n    Given a step\n`;
  if (on === "its Rule") return `Feature: one\n\n  ${deferral}\n  Rule: a rule\n\n    @unit\n    Scenario: a scenario\n      Given a step\n`;
  return scenario(`@unit ${deferral}`);
};

describe("a scenario with a deferral tag is not an executable claim", () => {
  it.each(postEvidenceObligationVariants["CLM-OBL-003"].variants)("[CLM-OBL-003] a scenario tagged @unit had %s on the scenario: when balance reads the corpus, there will be no executable claim", (deferral) => {
    expect(claimsIn(deferredBy(deferral, "the scenario"))).toEqual([]);
  });

  it.each([
    ["CLM-OBL-008", "@blocked, configured as a deferral tag", "the scenario", "@blocked", ["blocked"]],
    ["CLM-OBL-025", "@wip", "its Feature", "@wip", []],
    ["CLM-OBL-026", "@wip", "its Rule", "@wip", []],
  ] as const)("[%s] a scenario tagged @unit had %s on %s: when balance reads the corpus, there will be no executable claim", (_clm, _deferral, on, tag, configured) => {
    expect(claimsIn(deferredBy(tag, on), { deferralTags: configured, strict: false })).toEqual([]);
  });
});

describe("an executable claim raises one Evidence Obligation for each kind-of-check tag that applies to it, and none without one", () => {
  it.each([
    ["CLM-OBL-009", "@unit", "a unit Evidence Obligation", ["scenario", "@CLM-ONE-001 @unit"] as const, ["unit"]],
    ["CLM-OBL-010", "@unit @e2e", "a unit and an e2e Evidence Obligation", ["scenario", "@CLM-ONE-001 @unit @e2e"] as const, ["e2e", "unit"]],
    ["CLM-OBL-011", "@unit @integration @e2e @performance", "four Evidence Obligations, one of each kind", ["scenario", "@CLM-ONE-001 @unit @integration @e2e @performance"] as const, ["e2e", "integration", "performance", "unit"]],
    ["CLM-OBL-012", "@fitness", "a fitness Evidence Obligation", ["scenario", "@CLM-ONE-001 @fitness"] as const, ["fitness"]],
    ["CLM-OBL-013", "no other tag", "no Evidence Obligation", ["scenario", "@CLM-ONE-001"] as const, []],
    ["CLM-OBL-014", "@unit @integrationpending", "a unit Evidence Obligation", ["scenario", "@CLM-ONE-001 @unit @integrationpending"] as const, ["unit"]],
    ["CLM-OBL-015", "@integrationpending", "no Evidence Obligation", ["scenario", "@CLM-ONE-001 @integrationpending"] as const, []],
    ["CLM-OBL-016", "@unit and @integration, from its Outline", "a unit and an integration Evidence Obligation", ["outline", "@unit @integration", "      | clm         | x |\n      | CLM-ONE-001 | a |\n"] as const, ["integration", "unit"]],
  ])("[%s] an executable claim with the code CLM-ONE-001 had %s: when balance reads the corpus, its claim will raise %s", (_clm, _tags, _obligations, feature, kinds) => {
    expect(claimsIn(featureOf(feature)).map(kindsOf)).toEqual([kinds]);
  });
});

describe("a strict run reads every claim as if nothing were put off", () => {
  it.each([
    ["CLM-OBL-017", "@wip @unit", "a unit Evidence Obligation", ["unit"]],
    ["CLM-OBL-018", "@integrationpending", "an integration Evidence Obligation", ["integration"]],
    ["CLM-OBL-019", "@unit @integrationpending", "a unit and an integration Evidence Obligation", ["integration", "unit"]],
    ["CLM-OBL-027", "@unitpending", "a unit Evidence Obligation", ["unit"]],
    ["CLM-OBL-028", "@e2epending", "an e2e Evidence Obligation", ["e2e"]],
    ["CLM-OBL-029", "@performancepending", "a performance Evidence Obligation", ["performance"]],
    ["CLM-OBL-030", "@fitnesspending", "a fitness Evidence Obligation", ["fitness"]],
  ])("[%s] a scenario with the code CLM-ONE-001 had %s: when balance reads the corpus in a strict run, its claim will raise %s", (_clm, tags, _obligations, kinds) => {
    expect(claimsIn(scenario(`@CLM-ONE-001 ${tags}`), { deferralTags: [], strict: true }).map(kindsOf)).toEqual([kinds]);
  });
});

const raisedWith = (feature: string): { claimCode: string | undefined; kinds: string[] }[] =>
  claimsIn(feature).map((claim) => ({ claimCode: written(claim.claimCode), kinds: kindsOf(claim) }));

describe("an executable claim raises its Evidence Obligations under its claim code only when it has exactly one", () => {
  it.each([
    ["CLM-OBL-020", "the tags @CLM-ONE-001 and @CLM-ONE-002", ["scenario", "@unit @CLM-ONE-001 @CLM-ONE-002"] as const],
    ["CLM-OBL-024", "a claim code tag on its Outline, which also has a clm column", ["outline", "@unit @CLM-ONE-009", "      | clm         | x |\n      | CLM-ONE-001 | a |\n"] as const],
  ])("[%s] an executable claim tagged @unit had %s: when balance reads the corpus, its unit Evidence Obligation will be raised with no claim code", (_clm, _codes, feature) => {
    expect(raisedWith(featureOf(feature))).toEqual([{ claimCode: undefined, kinds: ["unit"] }]);
  });

  // The executable claim each variant stands for.
  const claimWith: Readonly<Record<string, readonly [string, string, string?]>> = {
    "an empty clm cell": ["outline", "@unit", "      | clm | x |\n      |     | a |\n"],
    'a cell reading "first"': ["outline", "@unit", "      | clm   | x |\n      | first | a |\n"],
    "the tag @CLM-A-001": ["scenario", "@unit @CLM-A-001"],
  };

  it.each(postEvidenceObligationVariants["CLM-OBL-021"].variants)("[CLM-OBL-021] an executable claim tagged @unit had %s: when balance reads the corpus, its unit Evidence Obligation will be raised with no claim code", (variant) => {
    const feature = claimWith[variant];
    if (feature === undefined) throw new Error(`no executable claim for the variant ${variant}`);

    expect(raisedWith(featureOf(feature))).toEqual([{ claimCode: undefined, kinds: ["unit"] }]);
  });
});
