import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

type PackageJson = Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

export const corpus = `@CVT
Feature: a target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
`;

export const manifest = {
  scripts: { build: "tsc" },
  specController: {
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [{ scn: "SCN-CVT-001", command: "eslint" }],
  },
};

export function checkStepReconciler(
  corpus: string,
  manifest: PackageJson,
  ci: string,
  record: CiStepRecord,
): () => EvidenceReconciliation {
  return () =>
    evidenceReconciliationFromSources({
      featureSources: [corpus],
      untaggedScenarios: [],
      packageJson: manifest,
      ciSources: [ci],
      ciSourceNames: ["ci.yml"],
      runtimeObservations: [],
      deferralTags: [],
      ciStepRecord: record,
    });
}

export function rowsOf(reconciliation: EvidenceReconciliation) {
  return reconciliation.ledger.scenarioReconciliations.map((row) => [
    row.scnId,
    row.kind,
    row.verdict,
    row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
  ]);
}
