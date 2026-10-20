import type { EvidenceObligations, EvidenceReconciliation, ParsedFeatureFile, ParsedWorkflow } from "@3f-consulting/spec-controller-core";
import {
  evidenceObligationsOf,
  readCorpus,
  readWorkflows,
  runReconcile as reconcileReadInputs,
} from "./ingestQualityChecks.js";
import { reportsOf, type InputPaths } from "../cli-balance/evidenceInputs.js";

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

export function runReconcile(opts: InputPaths & { features: string }, root: string): EvidenceReconciliation {
  return reconcileReadInputs(reportsOf(opts), root, readFeatureCorpus(opts.features), readWorkflowsAt(opts.ci));
}
