import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { claimCodeFrom, featureCodeOfFile, isFeatureCode, retiredScenarioCodeFrom } from "./claimCodes.js";

const is = (found: boolean, what: string): string => `${found ? "be" : "not be"} a ${what}`;

describe("a feature code is two to five uppercase letters or digits", () => {
  it.each([
    ["CLM-STG-037", "AB", "be a feature code"],
    ["CLM-STG-038", "ABCDE", "be a feature code"],
    ["CLM-STG-039", "A1", "be a feature code"],
    ["CLM-STG-040", "A", "not be a feature code"],
    ["CLM-STG-041", "ABCDEF", "not be a feature code"],
    ["CLM-STG-042", "abc", "not be a feature code"],
  ])("[%s] the id %s will %s", (_clm, code, result) => {
    expect(is(isFeatureCode(code), "feature code")).toBe(result);
  });
});

describe("a claim code is CLM, a feature code and a number", () => {
  it.each([
    ["CLM-STG-044", "CLM-ONE-001", "be a claim code"],
    ["CLM-STG-045", "CLM-ONE-7", "be a claim code"],
    ["CLM-STG-046", "CLM-ONE-1000", "be a claim code"],
    ["CLM-STG-047", "CLM-A-001", "not be a claim code"],
    ["CLM-STG-048", "CLM-ONE-", "not be a claim code"],
  ])("[%s] the id %s will %s", (_clm, id, result) => {
    expect(is(claimCodeFrom(id) !== undefined, "claim code")).toBe(result);
  });
});

describe("a retired scenario code is SCN, a feature code and a number", () => {
  it.each([
    ["CLM-STG-049", "SCN-ONE-001", "be a retired scenario code"],
    ["CLM-STG-050", "SCN-ONE-7", "be a retired scenario code"],
    ["CLM-STG-051", "SCN-ONE-1000", "be a retired scenario code"],
    ["CLM-STG-052", "SCN-A-001", "not be a retired scenario code"],
    ["CLM-STG-053", "SCN-ONE-", "not be a retired scenario code"],
  ])("[%s] the id %s will %s", (_clm, id, result) => {
    expect(is(retiredScenarioCodeFrom(id) !== undefined, "retired scenario code")).toBe(result);
  });
});

describe("a tag above Feature: will be the feature code of that file", () => {
  it("[CLM-STG-043] the tag @ONE above Feature: makes ONE that file's feature code", () => {
    expect(featureCodeOfFile(featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n"))).toBe("ONE");
  });
});
