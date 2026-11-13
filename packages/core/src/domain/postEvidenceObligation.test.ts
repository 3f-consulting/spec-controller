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

// A feature with one scenario, or one Outline with the Examples rows given, under the tags given.
const featureOf = ([shape, tags, examples]: readonly [string, string, string?]): string =>
  shape === "outline" ? outline(tags, examples ?? "") : scenario(tags);

const written = (code: ClaimCode | undefined): string | undefined => code && `CLM-${code.featureCode}-${code.number}`;

const kindsOf = ({ obligations }: ExecutableClaim): string[] => obligations.map(({ kind }) => String(kind)).sort();

describe("an Outline will be one executable claim for each row only when it has a clm column", () => {
  it.each([
    ["CLM-OBL-001", "two rows with the claim codes CLM-ONE-001 and CLM-ONE-002", ["outline", "@unit", "      | clm         | x |\n      | CLM-ONE-001 | a |\n      | CLM-ONE-002 | b |\n"] as const, ["CLM-ONE-001", "CLM-ONE-002"]],
    ["CLM-OBL-002", "the tag @CLM-ONE-001 and no clm column", ["outline", "@unit @CLM-ONE-001", "      | x |\n      | a |\n      | b |\n"] as const, ["CLM-ONE-001"]],
  ])("[%s] a Scenario Outline with %s has its executable claims", (_clm, _shape, feature, codes) => {
    expect(claimsIn(featureOf(feature)).map(({ claimCode }) => written(claimCode))).toEqual(codes);
  });
});

describe("a feature file with a Background has its scenarios read as executable claims", () => {
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

// A scenario tagged @unit, with the deferral tag on it, on its Feature, or on the Rule it sits under.
const deferredBy = (deferral: string, on: "scenario" | "feature" | "rule"): string => {
  if (on === "feature") return `${deferral}\nFeature: one\n\n  @unit\n  Scenario: a scenario\n    Given a step\n`;
  if (on === "rule") return `Feature: one\n\n  ${deferral}\n  Rule: a rule\n\n    @unit\n    Scenario: a scenario\n      Given a step\n`;
  return scenario(`@unit ${deferral}`);
};

describe("each deferral tag, built in or configured, will remove the claim", () => {
  it.each([
    ["CLM-OBL-003", "@wip", "scenario", []],
    ["CLM-OBL-004", "@ignore", "scenario", []],
    ["CLM-OBL-005", "@skip", "scenario", []],
    ["CLM-OBL-006", "@todo", "scenario", []],
    ["CLM-OBL-007", "@pending", "scenario", []],
    ["CLM-OBL-008", "@blocked", "scenario", ["blocked"]],
    ["CLM-OBL-025", "@wip", "feature", []],
    ["CLM-OBL-026", "@wip", "rule", []],
  ] as const)("[%s] a scenario tagged @unit, with %s on its %s, is no executable claim", (_clm, deferral, on, configured) => {
    expect(claimsIn(deferredBy(deferral, on), { deferralTags: configured, strict: false })).toEqual([]);
  });
});

describe("an executable claim will raise an Evidence Obligation for each kind-of-check tag that applies to it", () => {
  it.each([
    ["CLM-OBL-009", ["scenario", "@CLM-ONE-001 @unit"] as const, ["unit"]],
    ["CLM-OBL-010", ["scenario", "@CLM-ONE-001 @unit @e2e"] as const, ["e2e", "unit"]],
    ["CLM-OBL-011", ["scenario", "@CLM-ONE-001 @unit @integration @e2e @performance"] as const, ["e2e", "integration", "performance", "unit"]],
    ["CLM-OBL-012", ["scenario", "@CLM-ONE-001 @fitness"] as const, ["fitness"]],
    ["CLM-OBL-013", ["scenario", "@CLM-ONE-001"] as const, []],
    ["CLM-OBL-014", ["scenario", "@CLM-ONE-001 @unit @integrationpending"] as const, ["unit"]],
    ["CLM-OBL-015", ["scenario", "@CLM-ONE-001 @integrationpending"] as const, []],
    ["CLM-OBL-016", ["outline", "@unit @integration", "      | clm         | x |\n      | CLM-ONE-001 | a |\n"] as const, ["integration", "unit"]],
  ])("[%s] the claim of CLM-ONE-001 raises its kinds' Evidence Obligations", (_clm, feature, kinds) => {
    expect(claimsIn(featureOf(feature)).map(kindsOf)).toEqual([kinds]);
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

describe("an executable claim with no single claim code will raise its Evidence Obligations under none", () => {
  it.each([
    ["CLM-OBL-020", ["scenario", "@unit @CLM-ONE-001 @CLM-ONE-002"] as const],
    ["CLM-OBL-021", ["outline", "@unit", "      | clm | x |\n      |     | a |\n"] as const],
    ["CLM-OBL-022", ["outline", "@unit", "      | clm   | x |\n      | first | a |\n"] as const],
    ["CLM-OBL-023", ["scenario", "@unit @CLM-A-001"] as const],
  ])("[%s] a unit Evidence Obligation is raised with no claim code", (_clm, feature) => {
    expect(claimsIn(featureOf(feature)).map((claim) => ({ claimCode: written(claim.claimCode), kinds: kindsOf(claim) }))).toEqual([
      { claimCode: undefined, kinds: ["unit"] },
    ]);
  });

  it("[CLM-OBL-024] an Outline tagged @CLM-ONE-009 with a clm column raises nothing under its code or any row's", () => {
    const claims = claimsIn(outline("@unit @CLM-ONE-009", "      | clm         | x |\n      | CLM-ONE-001 | a |\n"));

    expect(claims.map(({ claimCode }) => written(claimCode))).toEqual([undefined]);
  });
});
