import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { block } from "./configurationBlock.test-utils.js";
import { unitTestsAndTypesCi as ci, feature } from "../evidenceReconciliation.test-utils.js";

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

function reconcile(specController: unknown): EvidenceReconciliation {
  const packageJson = (specController === undefined ? { scripts } : { scripts, specController }) as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

function withoutWrongKinds(reconciliation: EvidenceReconciliation): EvidenceReconciliation {
  const { wrongKindConfiguration: _named, ...summary } = reconciliation.summary;
  return { ...reconciliation, summary };
}

const examples: ReadonlyArray<readonly [string, unknown, unknown, { entry: string; is: string; reads: string }]> = [
  ["specController", "x", undefined, { entry: "specController", is: "a string", reads: "an object" }],
  [
    "specController.runners",
    { ...block, runners: ["vitest"] },
    { notChecks: block.notChecks, deferralTags: block.deferralTags },
    { entry: "specController.runners", is: "a list", reads: "an object" },
  ],
  [
    "specController.runners.unit",
    { ...block, runners: { unit: 5, performance: null } },
    { ...block, runners: { performance: null } },
    { entry: "specController.runners.unit", is: "a number", reads: "a string or null" },
  ],
  [
    "specController.notChecks",
    { ...block, notChecks: "ci.yml:quality:Checkout" },
    { runners: block.runners, deferralTags: block.deferralTags },
    { entry: "specController.notChecks", is: "a string", reads: "a list" },
  ],
  [
    "specController.notChecks[1]",
    { ...block, notChecks: ["ci.yml:quality:Checkout", { a: 1 }] },
    { ...block, notChecks: ["ci.yml:quality:Checkout"] },
    { entry: "specController.notChecks[1]", is: "an object", reads: "a string" },
  ],
  [
    "specController.deferralTags",
    { ...block, deferralTags: { a: 1 } },
    { runners: block.runners, notChecks: block.notChecks },
    { entry: "specController.deferralTags", is: "an object", reads: "a list" },
  ],
  [
    "specController.deferralTags[0]",
    { ...block, deferralTags: [null] },
    { ...block, deferralTags: [] },
    { entry: "specController.deferralTags[0]", is: "null", reads: "a string" },
  ],
];

describe("[SCN-USG-025] a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it", () => {
  it.each(examples)("names %s on the report with the kind it is and the kind read", (_, written, _without, named) => {
    expect(reconcile(written).summary.wrongKindConfiguration).toEqual([named]);
  });

  it.each(examples)("carries no wrong-kind account for the same target without %s", (_, _written, without) => {
    expect(reconcile(without).summary).not.toHaveProperty("wrongKindConfiguration");
  });

  it.each(examples)("gives otherwise the report the same target gives without %s", (_, written, without) => {
    expect(withoutWrongKinds(reconcile(written))).toEqual(reconcile(without));
  });
});
