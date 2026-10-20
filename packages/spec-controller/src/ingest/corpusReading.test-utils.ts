import type { EvidenceObligations, EvidenceReconciliation, ParsedFeatureFile, ParsedWorkflow } from "@3f-consulting/spec-controller-core";
import {
  evidenceObligationsOf,
  readCorpus,
  readWorkflows,
  runReconcile as reconcileReadInputs,
  type ReconcileOptions,
} from "./ingestQualityChecks.js";

export function readFeatureCorpus(featuresDir: string): ParsedFeatureFile[] {
  const reading = readCorpus(featuresDir);
  if (reading.kind !== "read") throw new Error(`the corpus at ${featuresDir} was not read: ${JSON.stringify(reading)}`);
  return [...reading.corpus];
}

export function readEvidenceObligations(featuresDir: string): EvidenceObligations {
  return evidenceObligationsOf(readFeatureCorpus(featuresDir));
}

function readWorkflowsAt(ciPath: string | undefined): readonly ParsedWorkflow[] {
  const reading = readWorkflows(ciPath);
  if (reading.kind !== "read") throw new Error(`the workflows at ${ciPath} were not read: ${JSON.stringify(reading)}`);
  return reading.workflows;
}

export function runReconcile(opts: ReconcileOptions & { features: string }, root: string): EvidenceReconciliation {
  return reconcileReadInputs(opts, root, readFeatureCorpus(opts.features), readWorkflowsAt(opts.ci));
}
