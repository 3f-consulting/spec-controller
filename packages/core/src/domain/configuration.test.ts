import { describe, expect, it } from "vitest";
import { targetConfigurationFrom } from "../parse/targetManifest.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import type { TargetConfiguration } from "./configuration.js";
import { runVerdictOf } from "./evidenceReconciliation.js";

const NOTHING: TargetConfiguration = { runners: {}, notChecks: [], deferralTags: [] };

describe("balance turns each configuration setting into its internal setting", () => {
  it.each([
    ["CLM-CFG-008", { runners: { unit: "vitest" } }, { ...NOTHING, runners: { unit: "vitest" } }],
    ["CLM-CFG-009", { runners: { performance: null } }, { ...NOTHING, runners: { performance: null } }],
    [
      "CLM-CFG-010",
      { notChecks: ["ci.yml:ci:Install dependencies"] },
      { ...NOTHING, notChecks: [{ workflow: "ci.yml", job: "ci", step: "Install dependencies" }] },
    ],
    ["CLM-CFG-011", { notChecks: ["nightly:build.yml:ci:Install"] }, { ...NOTHING, notChecks: [{ workflow: "nightly:build.yml", job: "ci", step: "Install" }] }],
    ["CLM-CFG-012", { deferralTags: ["deferred"] }, { ...NOTHING, deferralTags: ["deferred"] }],
    ["CLM-CFG-013", { deferralTags: ["@blocked"] }, { ...NOTHING, deferralTags: ["blocked"] }],
    ["CLM-CFG-014", { deferralTags: [" deferred "] }, { ...NOTHING, deferralTags: ["deferred"] }],
    ["CLM-CFG-006", undefined, NOTHING],
  ])("[%s] the setting %j becomes its internal setting", (_clm, specController, configuration) => {
    expect(targetConfigurationFrom({ specController }).configuration).toEqual(configuration);
  });
});

describe("the run will still reach its run verdict, using the configuration settings it could use", () => {
  it("[CLM-CFG-017] the run will still reach its run verdict, using the configuration settings it could use", () => {
    const { configuration } = targetConfigurationFrom({ specController: { runners: { unit: 3, integration: "cucumber-js" } } });
    const runVerdict = runVerdictOf(claimReconciliationsOf([], []), []);
    expect({ reached: runVerdict.verdict !== undefined, runners: configuration.runners }).toEqual({ reached: true, runners: { integration: "cucumber-js" } });
  });
});
