import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

// The JSON report's own shape, the contract its readers hold. Each field keeps its domain type, so a domain change that
// alters one changes the schema, and the schema check then needs schemaVersion raised.
export interface JsonReport {
  // Raised whenever the report's structure changes, so a reader can tell which contract a report follows.
  readonly schemaVersion: 7;
  readonly claimReconciliations: EvidenceReconciliation["claimReconciliations"];
  readonly runVerdict: EvidenceReconciliation["runVerdict"];
  readonly totals: EvidenceReconciliation["totals"];
  readonly stepAccount: EvidenceReconciliation["stepAccount"];
  readonly provenance: EvidenceReconciliation["provenance"];
  readonly errorsInTheInputs: EvidenceReconciliation["errorsInTheInputs"];
  readonly runIntegrity: EvidenceReconciliation["runIntegrity"];
}

export const jsonReportFrom = ({ claimReconciliations, runVerdict, totals, stepAccount, provenance, errorsInTheInputs, runIntegrity }: EvidenceReconciliation): JsonReport => ({
  schemaVersion: 7,
  claimReconciliations,
  runVerdict,
  totals,
  stepAccount,
  provenance,
  errorsInTheInputs,
  runIntegrity,
});

export const jsonReportOf = (reconciliation: EvidenceReconciliation): string => `${JSON.stringify(jsonReportFrom(reconciliation), null, 2)}\n`;
