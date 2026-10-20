import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { block } from "./configurationBlock.test-utils.js";
import { unitTestsAndTypesCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

function reconcile(specController: unknown): EvidenceReconciliation {
  const packageJson = (specController === undefined ? { scripts } : { scripts, specController }) as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    untaggedScenarios: [],
    packageJson,
    ciWorkflows: parsedWorkflows([ci]),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

function withoutWrongKinds(reconciliation: EvidenceReconciliation): EvidenceReconciliation {
  const { configurationOfWrongKind: _named, ...summary } = reconciliation.summary;
  return { ...reconciliation, summary };
}

const examples: ReadonlyArray<readonly [string, unknown, unknown, { entry: string; is: string; reads: string }]> = [
  ["specController", "x", undefined, { entry: "specController", is: "string", reads: "object" }],
  [
    "specController.runners",
    { ...block, runners: ["vitest"] },
    { notChecks: block.notChecks, deferralTags: block.deferralTags },
    { entry: "specController.runners", is: "list", reads: "object" },
  ],
  [
    "specController.runners.unit",
    { ...block, runners: { unit: 5, performance: null } },
    { ...block, runners: { performance: null } },
    { entry: "specController.runners.unit", is: "number", reads: "string-or-null" },
  ],
  [
    "specController.notChecks",
    { ...block, notChecks: "ci.yml:quality:Checkout" },
    { runners: block.runners, deferralTags: block.deferralTags },
    { entry: "specController.notChecks", is: "string", reads: "list" },
  ],
  [
    "specController.notChecks[1]",
    { ...block, notChecks: ["ci.yml:quality:Checkout", { a: 1 }] },
    { ...block, notChecks: ["ci.yml:quality:Checkout"] },
    { entry: "specController.notChecks[1]", is: "object", reads: "string" },
  ],
  [
    "specController.deferralTags",
    { ...block, deferralTags: { a: 1 } },
    { runners: block.runners, notChecks: block.notChecks },
    { entry: "specController.deferralTags", is: "object", reads: "list" },
  ],
  [
    "specController.deferralTags[0]",
    { ...block, deferralTags: [null] },
    { ...block, deferralTags: [] },
    { entry: "specController.deferralTags[0]", is: "null", reads: "string" },
  ],
];

describe("[SCN-CFG-004] a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it", () => {
  it.each(examples)("names %s on the report with the kind it is and the kind read", (_, written, _without, named) => {
    expect(reconcile(written).summary.configurationOfWrongKind).toEqual([named]);
  });

  it.each(examples)("carries no wrong-kind account for the same target without %s", (_, _written, without) => {
    expect(reconcile(without).summary).not.toHaveProperty("configurationOfWrongKind");
  });

  it.each(examples)("gives otherwise the report the same target gives without %s", (_, written, without) => {
    expect(withoutWrongKinds(reconcile(written))).toEqual(reconcile(without));
  });
});
