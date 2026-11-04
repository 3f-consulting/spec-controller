import { describe, it, expect } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { corpusCountsOfFeatures } from "../parse/scenarios.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { reportCtx as ctx } from "../render/runContext.test-utils.js";
import type { RenderInput } from "../domain/renderInput.js";

interface Given {
  readonly population: boolean;
  readonly census: boolean;
}

function reportOver(
  sources: readonly string[],
  files: readonly string[],
  given: Given = { population: true, census: true }
): RenderInput {
  const features = parsedFeatures(sources, files);
  const { scenarioCodePopulation, ...judged } = evidenceReconciliationFromSources({
    features,
    packageJson: {},
    ciWorkflows: [],
    behaviouralObservations: [],
    deferralTags: [],
  });
  return assembleRenderInput(
    given.population ? { ...judged, scenarioCodePopulation } : judged,
    ctx,
    given.census ? corpusCountsOfFeatures(features) : undefined
  );
}

const sharedCodeCorpus = [
  "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: first\n    Given a thing\n\n  @unit @SCN-ONE-001\n  Scenario: second\n    Given a thing\n\n  @unit\n  Scenario: carries no code\n    Given a thing\n",
];

const sharedCodeCorpusFacts = {
  untaggedScenarios: [{ feature: "one.feature", title: "carries no code" }],
  sharedScnCodes: [
    {
      scnId: "SCN-ONE-001",
      scenarios: [
        { feature: "one.feature", title: "first" },
        { feature: "one.feature", title: "second" },
      ],
    },
  ],
};

describe("[SCN-RMD-022] the JSON report carries the corpus's own facts under summary.scenarioCodes, straight after the run verdict", () => {
  it("states them in the summary after the run verdict, and not at the report's top level", () => {
    const report = reportOver(sharedCodeCorpus, ["one.feature"]);
    expect(report).not.toHaveProperty("scenarioCodes");
    expect(Object.keys(report.summary).slice(0, 2)).toEqual(["runVerdict", "scenarioCodes"]);
  });

  it("states the feature files and codes, the excluded occurrences, the untagged scenarios and the shared codes in one object", () => {
    const report = reportOver(
      [
        [
          "@ONE",
          "Feature: one",
          "",
          "  Prose that mentions @SCN-ONE-009 names no scenario.",
          "",
          "  @unit @SCN-ONE-001",
          "  Scenario: first",
          "    Given a thing",
          "",
          "  @unit @SCN-ONE-001",
          "  Scenario: second",
          "    Given a thing",
          "",
          "  @unit",
          "  Scenario: carries no code",
          "    Given a thing",
          "",
        ].join("\n"),
        "Feature: plain\n",
      ],
      ["one.feature", "plain.feature"]
    );
    expect(report.summary.scenarioCodes).toEqual({
      featureFiles: 2,
      featureCodes: 1,
      excludedOccurrences: 1,
      ...sharedCodeCorpusFacts,
    });
  });

  it("carries no sharedScnCodes when no two scenarios share a code", () => {
    const report = reportOver(
      [
        "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: first\n    Given a thing\n",
        "@TWO\nFeature: two\n\n  @unit @SCN-TWO-001\n  Scenario: first\n    Given a thing\n",
      ],
      ["one.feature", "two.feature"]
    );
    expect(report.summary.scenarioCodes).toEqual({
      featureFiles: 2,
      featureCodes: 2,
      excludedOccurrences: 0,
      untaggedScenarios: [],
    });
    expect(report.summary.scenarioCodes).not.toHaveProperty("sharedScnCodes");
  });

  it("carries the feature files and codes alone when the report is given only the population", () => {
    const report = reportOver(sharedCodeCorpus, ["one.feature"], { population: true, census: false });
    expect(report.summary.scenarioCodes).toStrictEqual({ featureFiles: 1, featureCodes: 1 });
  });

  it("carries the excluded occurrences, the untagged scenarios and the shared codes alone when the report is given only the census", () => {
    const report = reportOver(sharedCodeCorpus, ["one.feature"], { population: false, census: true });
    expect(report.summary.scenarioCodes).toStrictEqual({
      excludedOccurrences: 0,
      ...sharedCodeCorpusFacts,
    });
  });

  it("carries no scenarioCodes when the report is given neither", () => {
    const report = reportOver(sharedCodeCorpus, ["one.feature"], { population: false, census: false });
    expect(report).not.toHaveProperty("scenarioCodes");
    expect(report.summary).not.toHaveProperty("scenarioCodes");
  });
});
