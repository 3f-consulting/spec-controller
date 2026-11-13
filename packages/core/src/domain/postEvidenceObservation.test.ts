import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { resultsByFileFrom } from "../inputs/vitest.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { evidenceObservationsOf, observationsFiledUnder } from "./postEvidenceObservation.js";

const passingVitestReport = (title: string): unknown => ({
  testResults: [
    {
      name: "/work/one.test.ts",
      status: "passed",
      message: "",
      assertionResults: [{ ancestorTitles: [], title, status: "passed", failureMessages: [] }],
    },
  ],
});

describe("balance posts a result as passed or failed, citing its claim code", () => {
  it("[CLM-OBS-017] a passing result in Vitest's evidence report, [CLM-ONE-001] in its title, is posted as passed, citing CLM-ONE-001", () => {
    const observations = evidenceObservationsOf(resultsByFileFrom(passingVitestReport("[CLM-ONE-001] it holds")));

    expect(observations.map(({ result, cites }) => ({ result, cites }))).toEqual([
      { result: "passed", cites: [{ featureCode: "ONE", number: "001" }] },
    ]);
  });
});

describe("balance files each Evidence Observation under the claim it cites, or else on a phantom claim or the unnamed claim", () => {
  it("[CLM-OBS-082] balance posts an Evidence Observation to the executable claim whose code it cites", () => {
    const claims = executableClaimsOf([
      featureAsWrittenFrom(
        "one.feature",
        "Feature: one\n\n  @unit @CLM-ONE-001\n  Scenario: first\n    Given a step\n\n  @unit @CLM-ONE-002\n  Scenario: second\n    Given a step\n",
      ),
    ]);
    const observations = evidenceObservationsOf(resultsByFileFrom(passingVitestReport("[CLM-ONE-001] it holds")));

    expect(claims.map((claim) => ({ claimCode: claim.claimCode, posted: observationsFiledUnder(claim, observations).length }))).toEqual([
      { claimCode: { featureCode: "ONE", number: "001" }, posted: 1 },
      { claimCode: { featureCode: "ONE", number: "002" }, posted: 0 },
    ]);
  });
});
