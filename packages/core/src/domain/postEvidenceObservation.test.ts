import { describe, expect, it } from "vitest";
import { resultsByFileFrom } from "../inputs/vitest.js";
import { evidenceObservationsOf } from "./postEvidenceObservation.js";

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
