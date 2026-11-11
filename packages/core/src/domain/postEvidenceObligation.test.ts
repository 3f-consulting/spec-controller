import { describe, expect, it } from "vitest";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { executableClaimsOf, type ExecutableClaim, type ReadingSettings } from "./postEvidenceObligation.js";

const NOT_STRICT: ReadingSettings = { deferralTags: [], strict: false };
const ONE_001 = { featureCode: "ONE", number: "001" };
const ONE_002 = { featureCode: "ONE", number: "002" };

function claimsRead(source: string, settings: ReadingSettings = NOT_STRICT): readonly ExecutableClaim[] {
  return executableClaimsOf(parsedFeatures([source], ["one.feature"]), settings);
}

function outline(tags: string, table: string): string {
  return `@ONE\nFeature: one\n\n  Rule: a rule\n\n  ${tags}\n  Scenario Outline: a claim\n    Given a <x>\n\n    Examples:\n${table}`;
}

function scenarioTagged(tags: string): string {
  return `@ONE\nFeature: one\n\n  ${tags}\n  Scenario: a claim\n    Given a step`;
}

function claimRaising(kinds: readonly string[]): readonly unknown[] {
  return [{ claimCode: ONE_001, file: "one.feature", title: "a claim", obligations: kinds.map((kind) => ({ kind })) }];
}

describe("an Outline will be one executable claim for each row only when it has a clm column", () => {
  it.each([
    [
      "CLM-OBL-001",
      "two rows with the claim codes CLM-ONE-001 and CLM-ONE-002",
      "@unit",
      "      | clm         | x |\n      | CLM-ONE-001 | y |\n      | CLM-ONE-002 | z |",
      [ONE_001, ONE_002],
    ],
    [
      "CLM-OBL-001",
      "two rows with the claim codes CLM-ONE-001 and CLM-ONE-002, in a clm column that is not the first",
      "@unit",
      "      | x | clm         |\n      | y | CLM-ONE-001 |\n      | z | CLM-ONE-002 |",
      [ONE_001, ONE_002],
    ],
    ["CLM-OBL-002", "the tag @CLM-ONE-001 and no clm column", "@unit @CLM-ONE-001", "      | x |\n      | y |\n      | z |", [ONE_001]],
    ["CLM-OBL-002", "the tag @CLM-ONE-001 and an Examples block with no table yet", "@unit @CLM-ONE-001", "", [ONE_001]],
  ])("[%s] an Outline with %s", (_clm, _shape, tags, table, codes) => {
    expect(claimsRead(outline(tags, table)).map(({ claimCode }) => claimCode)).toEqual(codes);
  });
});

describe("each deferral tag, built in or configured, will remove the claim", () => {
  it.each([
    ["CLM-OBL-003", "@wip", []],
    ["CLM-OBL-004", "@ignore", []],
    ["CLM-OBL-005", "@skip", []],
    ["CLM-OBL-006", "@todo", []],
    ["CLM-OBL-007", "@pending", []],
    ["CLM-OBL-008", "@blocked", ["blocked"]],
  ])("[%s] %s removes the claim", (_clm, tag, deferralTags) => {
    expect(claimsRead(scenarioTagged(`@unit ${tag}`), { deferralTags, strict: false })).toEqual([]);
  });
});

describe("an executable claim will raise an Evidence Obligation for each kind-of-check tag that applies to it", () => {
  it.each([
    ["CLM-OBL-009", "@unit", ["unit"]],
    ["CLM-OBL-010", "@unit @e2e", ["unit", "e2e"]],
    ["CLM-OBL-011", "@unit @integration @e2e @performance", ["unit", "integration", "e2e", "performance"]],
    ["CLM-OBL-012", "@fitness", ["fitness"]],
    ["CLM-OBL-013", "", []],
    ["CLM-OBL-014", "@unit @integrationpending", ["unit"]],
    ["CLM-OBL-015", "@integrationpending", []],
  ])("[%s] a claim tagged '%s' raises one for each kind that applies", (_clm, tags, kinds) => {
    expect(claimsRead(scenarioTagged(`@CLM-ONE-001 ${tags}`))).toEqual(claimRaising(kinds));
  });

  it("[CLM-OBL-016] a row raises the Evidence Obligations of its Outline's tags", () => {
    const table = "      | clm         | x |\n      | CLM-ONE-001 | y |";
    expect(claimsRead(outline("@unit @integration", table))).toEqual(claimRaising(["unit", "integration"]));
  });
});

describe("a strict run will raise the Evidence Obligations a deferral put off", () => {
  it.each([
    ["CLM-OBL-017", "@wip @unit", ["unit"]],
    ["CLM-OBL-018", "@integrationpending", ["integration"]],
    ["CLM-OBL-019", "@unit @integrationpending", ["unit", "integration"]],
  ])("[%s] in a strict run, a claim tagged '%s' raises what was put off", (_clm, tags, kinds) => {
    expect(claimsRead(scenarioTagged(`@CLM-ONE-001 ${tags}`), { deferralTags: [], strict: true })).toEqual(claimRaising(kinds));
  });
});

describe("an executable claim with no single claim code will raise its Evidence Obligations under none", () => {
  const row = (cell: string): string => outline("@unit", `      | clm | x |\n      | ${cell} | y |`);

  it.each([
    ["CLM-OBL-020", "two claim code tags", () => scenarioTagged("@unit @CLM-ONE-001 @CLM-ONE-002")],
    ["CLM-OBL-024", "a claim code tag beside a clm column", () => outline("@unit @CLM-ONE-009", "      | clm         | x |\n      | CLM-ONE-001 | y |")],
  ])("[%s] %s raises no Evidence Obligation under any code", (_clm, _shape, source) => {
    expect(claimsRead(source()).flatMap(({ obligations }) => obligations)).toEqual([]);
  });

  it.each([
    ["CLM-OBL-021", "an empty clm cell", () => row("")],
    ["CLM-OBL-022", "a clm cell reading first", () => row("first")],
    ["CLM-OBL-023", "a tag that is not a claim code", () => scenarioTagged("@unit @CLM-A-001")],
  ])("[%s] %s raises its Evidence Obligation with no claim code", (_clm, _shape, source) => {
    expect(claimsRead(source())).toEqual([{ file: "one.feature", title: "a claim", obligations: [{ kind: "unit" }] }]);
  });
});
