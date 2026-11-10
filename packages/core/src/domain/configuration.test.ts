import { describe, expect, it } from "vitest";
import { targetConfigurationFrom } from "../parse/targetManifest.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import type { TargetConfiguration } from "./configuration.js";
import { runVerdictOf } from "./evidenceReconciliation.js";
import type { PipelineStep } from "./postEvidenceObservation.js";

const NOTHING: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

describe("balance turns each configuration setting into its internal setting", () => {
  it.each([
    ["CLM-CFG-008", { runners: { unit: "vitest" } }, { ...NOTHING, runners: { unit: "vitest" } }],
    ["CLM-CFG-009", { runners: { performance: null } }, { ...NOTHING, runners: { performance: null } }],
    [
      "CLM-CFG-010",
      { notChecks: ["ci.yml:ci:Install dependencies"] },
      { ...NOTHING, nonChecks: [{ workflow: "ci.yml", job: "ci", step: "Install dependencies" }] },
    ],
    ["CLM-CFG-011", { notChecks: ["nightly:build.yml:ci:Install"] }, { ...NOTHING, nonChecks: [{ workflow: "nightly:build.yml", job: "ci", step: "Install" }] }],
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

describe("a configuration setting balance cannot use will be left out", () => {
  const ci = (identity: string): PipelineStep => ({
    workflow: "ci.yml",
    job: "ci",
    identity,
    writesStepRecord: false,
    abortsJob: false,
    plumbing: false,
    command: "true",
  });

  it.each([
    ["CLM-CFG-004", { runners: { unit: 3 } }, [], { ...NOTHING }, [{ kind: "configuration-wrong-kind", entry: "runners.unit" }]],
    [
      "CLM-CFG-005",
      { runners: { unit: "vitest" }, runer: {} },
      [],
      { ...NOTHING, runners: { unit: "vitest" } },
      [{ kind: "configuration-unknown-key", entry: "runer" }],
    ],
    ["CLM-CFG-003", { runners: { unittest: "vitest" } }, [], { ...NOTHING }, [{ kind: "runner-key-not-a-layer", entry: "runners.unittest" }]],
    [
      "CLM-CFG-015",
      { notChecks: ["ci.yml:ci:No such step"] },
      ["Install dependencies"],
      { ...NOTHING },
      [{ kind: "not-checks-entry-matches-no-step", entry: "ci.yml:ci:No such step" }],
    ],
    [
      "CLM-CFG-016",
      { notChecks: ["Install dependencies"] },
      [],
      { ...NOTHING },
      [{ kind: "not-checks-entry-not-a-step-name", entry: "Install dependencies" }],
    ],
  ])("[%s] the setting %j is left out with its error", (_clm, specController, stepsInCi, configuration, errors) => {
    expect(targetConfigurationFrom({ specController }, stepsInCi.map(ci))).toEqual({ configuration, errors });
  });
});
