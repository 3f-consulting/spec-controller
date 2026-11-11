import { describe, expect, it } from "vitest";
import { targetConfigurationFrom } from "../inputs/manifest.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import type { TargetConfiguration } from "./configuration.js";
import { runVerdictOf } from "./evidenceReconciliation.js";
import type { PipelineStep } from "./postEvidenceObservation.js";

const NOTHING: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

const stepIn = (workflow: string, job: string, name: string): PipelineStep => ({ workflow, job, name, writesStepRecord: false, plumbing: false, command: "true" });

describe("balance turns each configuration setting into its internal setting", () => {
  it.each([
    ["CLM-CFG-008", { runners: { unit: "vitest" } }, { ...NOTHING, runners: { unit: "vitest" } }],
    ["CLM-CFG-008", { runners: { e2e: "playwright" } }, { ...NOTHING, runners: { e2e: "playwright" } }],
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
    expect(targetConfigurationFrom({ specController }, []).configuration).toEqual(configuration);
  });

  it.each([
    [
      "CLM-CFG-010",
      ["ci.yml:ci:Install dependencies"],
      [
        ["ci.yml", "build", "Lint"],
        ["ci.yml", "ci", "Lint"],
        ["ci.yml", "ci", "Install dependencies"],
      ],
      [{ workflow: "ci.yml", job: "ci", step: "Install dependencies" }],
    ],
    ["CLM-CFG-011", ["nightly:build.yml:ci:Install"], [["ci.yml", "ci", "Lint"]], [{ workflow: "nightly:build.yml", job: "ci", step: "Install" }]],
  ] as const)("[%s] the notChecks entry %j becomes its internal setting, with the workflows read", (_clm, notChecks, read, nonChecks) => {
    const stepsRead = read.map(([workflow, job, identity]) => stepIn(workflow, job, identity));
    expect(targetConfigurationFrom({ specController: { notChecks } }, stepsRead)).toEqual({ configuration: { ...NOTHING, nonChecks }, errors: [] });
  });
});

describe("the run will still reach its run verdict, using the configuration settings it could use", () => {
  it("[CLM-CFG-017] the run will still reach its run verdict, using the configuration settings it could use", () => {
    const { configuration } = targetConfigurationFrom({ specController: { runners: { unit: 3, integration: "cucumber-js" } } }, []);
    const runVerdict = runVerdictOf(claimReconciliationsOf([], []), []);
    expect({ reached: runVerdict.verdict !== undefined, runners: configuration.runners }).toEqual({ reached: true, runners: { integration: "cucumber-js" } });
  });
});

describe("a configuration setting balance cannot use will be left out", () => {
  const ci = (identity: string): PipelineStep => stepIn("ci.yml", "ci", identity);

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
      "CLM-CFG-015",
      { notChecks: ["ci.yml:other:Install dependencies"] },
      ["Install dependencies"],
      { ...NOTHING },
      [{ kind: "not-checks-entry-matches-no-step", entry: "ci.yml:other:Install dependencies" }],
    ],
    [
      "CLM-CFG-016",
      { notChecks: ["Install dependencies"] },
      [],
      { ...NOTHING },
      [{ kind: "not-checks-entry-not-a-step-name", entry: "Install dependencies" }],
    ],
    [
      "CLM-CFG-016",
      { notChecks: [":ci:Install dependencies"] },
      ["Install dependencies"],
      { ...NOTHING },
      [{ kind: "not-checks-entry-not-a-step-name", entry: ":ci:Install dependencies" }],
    ],
    ["CLM-CFG-018", { runners: null }, [], { ...NOTHING }, [{ kind: "configuration-wrong-kind", entry: "runners" }]],
    ["CLM-CFG-018", { runners: "vitest" }, [], { ...NOTHING }, [{ kind: "configuration-wrong-kind", entry: "runners" }]],
    ["CLM-CFG-019", { notChecks: "Install" }, [], { ...NOTHING }, [{ kind: "configuration-wrong-kind", entry: "notChecks" }]],
    ["CLM-CFG-020", { deferralTags: [3] }, [], { ...NOTHING }, [{ kind: "configuration-wrong-kind", entry: "deferralTags[0]" }]],
  ])("[%s] the setting %j is left out with its error", (_clm, specController, stepsInCi, configuration, errors) => {
    expect(targetConfigurationFrom({ specController }, stepsInCi.map(ci))).toEqual({ configuration, errors });
  });
});
