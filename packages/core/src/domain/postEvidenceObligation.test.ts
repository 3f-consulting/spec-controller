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
  return `@ONE\nFeature: one\n\n  ${tags}\n  Scenario Outline: a claim\n    Given a <x>\n\n    Examples:\n${table}`;
}

function scenarioTagged(tags: string): string {
  return `@ONE\nFeature: one\n\n  ${tags}\n  Scenario: a claim\n    Given a step`;
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
    ["CLM-OBL-002", "the tag @CLM-ONE-001 and no clm column", "@unit @CLM-ONE-001", "      | x |\n      | y |\n      | z |", [ONE_001]],
  ])("[%s] an Outline with %s", (_clm, _shape, tags, table, codes) => {
    expect(claimsRead(outline(tags, table)).map(({ claimCode }) => claimCode)).toEqual(codes);
  });
});
