import { describe, it, expect } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { corpusCountsOfFeatures } from "../parse/scenarios.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { unitTestsAndLintCi as ci } from "../evidenceReconciliation.test-utils.js";
import { reportCtx as ctx } from "./runContext.test-utils.js";
import type { RenderInput } from "../domain/renderInput.js";

const coded = "@FIX\nFeature: fixture\n\n  @unit @SCN-FIX-001\n  Scenario: a fixture behaviour\n    Given a fixture\n";
const uncoded = "Feature: fixture\n\n  @unit @SCN-FIX-001\n  Scenario: a fixture behaviour\n    Given a fixture\n";

const scripts = { test: "vitest run", lint: "eslint ." };

const sound = {
  runners: { unit: "vitest" },
  notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
};

const everyConfigurationFault = {
  runners: { unit: "vitest", lint: "eslint" },
  notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install", "ci.yml:quality:Deploy"],
  deferralTags: { a: 1 },
  zzz: true,
};

function reportOver(feature: string, specController: Record<string, unknown>): RenderInput {
  const features = parsedFeatures([feature], ["fixture.feature"]);
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  const judged = evidenceReconciliationFromSources({
    features,
    packageJson,
    ciWorkflows: parsedWorkflows([ci], ["ci.yml"]),
    behaviouralObservations: [],
    deferralTags: [],
  });
  return assembleRenderInput(judged, ctx, corpusCountsOfFeatures(features));
}

describe("[SCN-RMD-021] the JSON report carries a top-level errors key only when its inputs hold a fault", () => {
  it("carries no errors key when the inputs hold no fault", () => {
    expect(reportOver(coded, sound)).not.toHaveProperty("errors");
  });

  it("carries only the scenario code errors when the inputs hold no configuration fault", () => {
    expect(reportOver(uncoded, sound).errors).toEqual({
      scenarioCodes: [{ kind: "no-feature-code", files: ["fixture.feature"] }],
    });
  });

  it("carries only the configuration fault when the inputs hold no scenario code error", () => {
    expect(reportOver(coded, { ...sound, zzz: true }).errors).toEqual({
      configuration: { keysNotRead: ["zzz"] },
    });
  });

  it("carries the scenario code errors and each kind of configuration fault together", () => {
    expect(reportOver(uncoded, everyConfigurationFault).errors).toEqual({
      scenarioCodes: [{ kind: "no-feature-code", files: ["fixture.feature"] }],
      configuration: {
        keysNotRead: ["zzz"],
        ofWrongKind: [{ entry: "specController.deferralTags", is: "object", reads: "list" }],
        runnerKeysNotALayer: ["lint"],
        nonChecksMatchingNoStep: ["ci.yml:quality:Deploy"],
      },
    });
  });
});
