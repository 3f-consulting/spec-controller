import { corpusCountsOf, type EvidenceObligations, type EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { readCorpus, runReconcile as reconcileReadCorpus, type CorpusFile, type ReconcileOptions } from "./ingestQualityChecks.js";

export function readFeatureCorpus(featuresDir: string): CorpusFile[] {
  const reading = readCorpus(featuresDir);
  if (reading.kind !== "read") throw new Error(`the corpus at ${featuresDir} was not read: ${JSON.stringify(reading)}`);
  return [...reading.corpus];
}

export function readEvidenceObligations(featuresDir: string): EvidenceObligations {
  return corpusCountsOf(readFeatureCorpus(featuresDir));
}

export function runReconcile(opts: ReconcileOptions & { features: string }, root: string): EvidenceReconciliation {
  return reconcileReadCorpus(opts, root, readFeatureCorpus(opts.features));
}
