import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { resultsByFileFrom } from "../inputs/jestJson.js";
import type { ClaimCode } from "./claimCodes.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { observationsByFile, observationsFiledUnder, type EvidenceObservation } from "./postEvidenceObservation.js";

const ONE_001: ClaimCode = { featureCode: "ONE", number: "001" };
const ONE_002: ClaimCode = { featureCode: "ONE", number: "002" };

// A test as Jest's JSON evidence report, which Vitest also writes, records it.
interface TestByFile {
  readonly ancestorTitles?: readonly string[];
  readonly title: string;
  readonly status: string;
}

const reportByFile = (file: string, tests: readonly TestByFile[], fileStatus = "passed", message = ""): unknown => ({
  testResults: [
    {
      name: file,
      status: fileStatus,
      message,
      assertionResults: tests.map(({ ancestorTitles = [], title, status }) => ({
        ancestorTitles,
        title,
        status,
        failureMessages: status === "failed" ? ["expected 2, received 1"] : [],
      })),
    },
  ],
});

const postedByFile = (from: "vitest" | "jest", report: unknown, targetFolder = "/work"): EvidenceObservation[] =>
  observationsByFile(resultsByFileFrom(report, from), targetFolder);

describe("balance posts a result as passed or failed, citing its claim code", () => {
  it.each<[string, "vitest" | "jest", string, string]>([
    ["CLM-OBS-017", "vitest", "passed", "passed"],
    ["CLM-OBS-018", "vitest", "failed", "failed"],
    ["CLM-OBS-019", "jest", "passed", "passed"],
    ["CLM-OBS-020", "jest", "failed", "failed"],
  ])("[%s] a result in %s's evidence report, [CLM-ONE-001] in its title, that %s, is posted as %s, citing CLM-ONE-001", (_clm, from, status, result) => {
    const posted = postedByFile(from, reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status }], status));

    expect(posted.map(({ result: postedResult, cites }) => ({ result: postedResult, cites }))).toEqual([{ result, cites: [ONE_001] }]);
  });
});

describe("balance posts nothing for a test that was skipped", () => {
  it.each<[string, "vitest" | "jest", readonly string[]]>([
    ["CLM-OBS-036", "vitest", ["skipped", "todo"]],
    ["CLM-OBS-037", "jest", ["pending", "todo"]],
  ])("[%s] a test in %s's evidence report citing CLM-ONE-001, skipped or marked todo, posts nothing", (_clm, from, statuses) => {
    const tests = statuses.map((status) => ({ title: "[CLM-ONE-001] it holds", status }));

    expect(postedByFile(from, reportByFile("/work/one.test.ts", tests))).toEqual([]);
  });
});

describe("balance posts what could not run as never ran", () => {
  it.each<[string, "vitest" | "jest", string]>([
    ["CLM-OBS-044", "vitest", "Error: Cannot find module './adds.js'"],
    ["CLM-OBS-045", "jest", "Test suite failed to run\n\nthe test file could not be loaded"],
  ])("[%s] a test file in %s's evidence report that could not run is posted as never-ran, citing no claim code, naming the file and its error", (_clm, from, error) => {
    const posted = postedByFile(from, reportByFile("/work/a.test.ts", [], "failed", error));

    expect(posted.map(({ result, cites, place, message }) => ({ result, cites, place, message }))).toEqual([
      { result: "never-ran", cites: [], place: "a.test.ts", message: error },
    ]);
  });
});

describe("a test report's result will be unit evidence, and a Cucumber result will take the kind its tags name", () => {
  it("[CLM-OBS-059] a result in Vitest's evidence report is posted as unit evidence", () => {
    const posted = postedByFile("vitest", reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "failed" }], "failed"));

    expect(posted.map(({ kind }) => kind)).toEqual(["unit"]);
  });
});

describe("balance posts a nested test citing its own code, or its parent's code when the report gives one", () => {
  it.each<[string, "vitest" | "jest", string, readonly ClaimCode[]]>([
    ["CLM-OBS-065", "vitest", "[CLM-ONE-001] it holds", [ONE_001]],
    ["CLM-OBS-066", "vitest", "it holds", [ONE_002]],
    ["CLM-OBS-067", "vitest", "CLM-ONE-001 it holds", [ONE_002]],
    ["CLM-OBS-068", "jest", "[CLM-ONE-001] it holds", [ONE_001]],
    ["CLM-OBS-069", "jest", "it holds", [ONE_002]],
  ])("[%s] a passing test in %s's evidence report titled %s, nested in a describe with [CLM-ONE-002] in its title, is posted citing its nearest code", (_clm, from, title, cites) => {
    const posted = postedByFile(from, reportByFile("/work/one.test.ts", [{ ancestorTitles: ["[CLM-ONE-002] a group"], title, status: "passed" }]));

    expect(posted.map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

describe("balance posts an Evidence Observation saying where to look", () => {
  it.each<[string, string, string]>([
    ["CLM-OBS-078", "a.test.ts", "/work/acme"],
    ["CLM-OBS-079", "/work/acme/a.test.ts", "/work/acme"],
  ])("[%s] the test \"adds two numbers\" in %s, for a target at %s, is posted saying where to look: \"adds two numbers\" in a.test.ts", (_clm, file, targetFolder) => {
    const posted = postedByFile("vitest", reportByFile(file, [{ title: "[CLM-ONE-001] adds two numbers", status: "passed" }]), targetFolder);

    expect(posted.map(({ place, name }) => ({ place, name }))).toEqual([{ place: "a.test.ts", name: "[CLM-ONE-001] adds two numbers" }]);
  });
});

describe("a test file outside the target's folder will be placed at the absolute path its evidence report recorded", () => {
  it("[CLM-OBS-098] a Jest test file at /home/runner/work/app/src/a.test.ts, for a target at /work/app, is placed at that path", () => {
    const file = "/home/runner/work/app/src/a.test.ts";
    const posted = postedByFile("jest", reportByFile(file, [{ title: "[CLM-ONE-001] it holds", status: "passed" }]), "/work/app");

    expect(posted.map(({ place }) => place)).toEqual([file]);
  });
});

describe("balance files each Evidence Observation under the claim it cites, or else on a phantom claim or the unnamed claim", () => {
  it("[CLM-OBS-082] balance posts an Evidence Observation to the executable claim whose code it cites", () => {
    const claims = executableClaimsOf([
      featureAsWrittenFrom(
        "one.feature",
        "Feature: one\n\n  @unit @CLM-ONE-001\n  Scenario: first\n    Given a step\n\n  @unit @CLM-ONE-002\n  Scenario: second\n    Given a step\n",
      ),
    ], { deferralTags: [], strict: false });
    const observations = postedByFile("vitest", reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "passed" }]));

    expect(claims.map((claim) => ({ claimCode: claim.claimCode, posted: observationsFiledUnder(claim, observations).length }))).toEqual([
      { claimCode: ONE_001, posted: 1 },
      { claimCode: ONE_002, posted: 0 },
    ]);
  });
});
