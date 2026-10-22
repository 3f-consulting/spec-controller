import type { EvidenceObligations, EvidenceReconciliation, ParsedFeatureFile, ParsedWorkflow } from "@3f-consulting/spec-controller-core";
import {
  evidenceObligationsOf,
  type EvidenceReport,
  readCorpus,
  readWorkflows,
  runReconcile as reconcileReadInputs,
} from "./ingestQualityChecks.js";
import { existsSync } from "node:fs";
import { EVIDENCE_INPUTS, type InputPaths } from "../cli-balance/evidenceInputs.js";
import { jsonInputsOf, readReports } from "../cli-balance/unreadableInputs.js";

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

function readReportsAt(paths: InputPaths): readonly EvidenceReport[] {
  const args = Object.fromEntries(
    EVIDENCE_INPUTS.flatMap(({ flag, key }) => {
      const path = paths[key as keyof InputPaths];
      return path === undefined ? [] : [[flag, path]];
    }),
  );
  // A report path given for a file the target lacks hands the reconciliation no report, as a run without it would.
  const reading = readReports(jsonInputsOf(args, existsSync).filter(({ path }) => existsSync(path)));
  if (reading.kind !== "read") throw new Error(`the reports were not read: ${JSON.stringify(reading.first)}`);
  return reading.reports;
}

export function runReconcile(opts: InputPaths & { features: string }, root: string): EvidenceReconciliation {
  return reconcileReadInputs(readReportsAt(opts), root, readFeatureCorpus(opts.features), readWorkflowsAt(opts.ci));
}
