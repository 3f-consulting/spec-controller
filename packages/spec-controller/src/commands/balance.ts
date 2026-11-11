import { existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  claimCodesAtOf,
  commandRuns,
  evidenceReconciliationOf,
  outputClashOf,
  outputPlanOf,
  pipelineStepsOf,
  provenanceFrom,
  runIdentityOf,
  recordedCheckStepsOf,
  shellReading,
  targetFolderOf,
  targetConfigurationFrom,
  toolVersionOf,
  type EvidenceReconciliation,
  type IdentifiedInput,
  type ParsedFeatureFile,
  type ParsedWorkflow,
  type Provenance,
  type StepRecord,
} from "@3f-consulting/spec-controller-core";
import {
  documentReadBy,
  observationsOf,
  readCorpus,
  readWorkflows,
  type EvidenceReport,
  type TargetManifest,
} from "../inputs/ingestQualityChecks.js";
import { inputPathsOf, requestedInputsOf, runInputsOf, type InputPaths } from "../runRequest/evidenceInputs.js";
import { INPUT_DEFAULTS } from "../runRequest/defaults.js";
import { collectFormatSpecs, requestedOutputsOf } from "../runRequest/formats.js";
import { locatedOutputs, probedOutputs, renderedReports, writeRenderedReports } from "../output/writer.js";
import { identifiedInputs } from "../output/outputLocation.js";
import { outputRefusal, WRITTEN_FORMATS } from "../output/format.js";
import { refuse, settlingRefusal } from "../runEnding/usageRefusal.js";
import { inputsReadFrom, NODE_INPUT_READER, type InputReader } from "../inputs/inputsRead.js";
import { corpusDirOf } from "../inputs/corpusDir.js";
import {
  checkInputsExist,
  corpusReadRefusal,
  reportRefusal,
  corpusDirRefusal,
  corpusUnparseableRefusal,
  jsonInputsOf,
  readReports,
  workflowsReadRefusal,
  workflowsUnparseableRefusal,
} from "../inputs/unreadableInputs.js";
import { exitCodeOf } from "../runEnding/exitStatus.js";
import { endRunOn } from "../runEnding/exitCode.js";
import { readTargetHead, readToolInstall, readRepositoryTop, readToolVersion, readWorkingFolder, resolveTargetOrigin } from "../runIdentity/resolveRunInputs.js";
import { balanceCommand, cliRegistry, renderCommandHelp } from "../runRequest/cliRegistry.js";
import {
  asksForHelp,
  parseArgs,
  checkArgvShape,
  checkUnknownFlags,
  checkMissingValues,
} from "../runRequest/cliArgs.js";

const RECONCILER_INVOCATION = "spec-controller balance";

export function runBalance(argv: string[]): boolean {
  return settlingRefusal(() => balance(argv), false);
}

function balance(argv: string[]): boolean {
  const helped = asksForHelp(argv);
  if (helped) process.stdout.write(renderCommandHelp(balanceCommand) + "\n");
  return !helped && reconcile(argv);
}

function reconcile(argv: string[]): boolean {
  const args = parseArgs(argv);

  const shapeError = checkArgvShape(argv, cliRegistry, "balance");
  if (shapeError) refuse(shapeError);

  const unknownFlagError = checkUnknownFlags(args, cliRegistry, "balance", toolVersionOf(readToolVersion()));
  if (unknownFlagError) refuse(unknownFlagError);

  const missingValueError = checkMissingValues(argv, cliRegistry, "balance");
  if (missingValueError) refuse(missingValueError);

  const { corpus, workflows, reports } = refuseUnreadableInputs(args);

  const inputs = inputPathsOf(args);

  const root = targetRootOf(inputs.features);

  const evidenceReconciliation = runReconcile(reports, root, corpus, workflows, {
    strict: args["strict"] !== undefined,
    provenance: provenanceOf(args, inputs, root),
  });

  writeReports(collectFormatSpecs(argv), evidenceReconciliation, identifiedInputs(inputsReadBy(args, NODE_INPUT_READER)));

  endRunOn({ kind: "verdict", code: exitCodeOf(evidenceReconciliation.runVerdict, args["exit-zero"] !== undefined) });
  return true;
}

// The files the run reads, named by how the run came to read them: the inputs it was given, or the defaults.
export function inputsReadBy(args: Record<string, string>, reader: InputReader): ReturnType<typeof inputsReadFrom> {
  return inputsReadFrom(args, requestedInputsOf(args), reader, INPUT_DEFAULTS);
}

// The reports the --format specs ask for: planned, probed, checked against one another and the inputs, then written.
export function writeReports(formatSpecs: readonly string[], evidenceReconciliation: EvidenceReconciliation, inputs: readonly IdentifiedInput[]): void {
  const plan = outputPlanOf(locatedOutputs(requestedOutputsOf(formatSpecs)), WRITTEN_FORMATS);
  if (!plan.ok) refuse(outputRefusal(plan.refusal));
  const reports = renderedReports(plan.outputs, evidenceReconciliation);
  const probed = probedOutputs(plan.outputs);
  if ("refusal" in probed) refuse(probed.refusal);
  const clash = outputClashOf(probed.identified, inputs);
  if (clash !== undefined) refuse(outputRefusal(clash));
  writeRenderedReports(reports);
}

interface ReadInputs {
  readonly corpus: readonly ParsedFeatureFile[];
  readonly workflows: readonly ParsedWorkflow[];
  readonly reports: readonly EvidenceReport[];
}

function refuseUnreadableInputs(args: Record<string, string>): ReadInputs {
  const given = requestedInputsOf(args);
  const missingInputError = checkInputsExist(given, existsSync);
  if (missingInputError) refuse(missingInputError);

  const reportsReading = readReports(jsonInputsOf(given, existsSync, INPUT_DEFAULTS.packageJson));

  const corpusDir = corpusDirOf(args, INPUT_DEFAULTS.features);
  if (typeof corpusDir !== "string") refuse(corpusDirRefusal(corpusDir));

  const corpusReading = readCorpus(corpusDir);
  const workflowReading = readWorkflows(args["ci"] ?? INPUT_DEFAULTS.ci);
  if (corpusReading.kind === "read-fault") refuse(corpusReadRefusal(args, corpusReading.fault));
  if (workflowReading.kind === "read-fault") refuse(workflowsReadRefusal(args, workflowReading.fault));
  if (workflowReading.kind === "unparseable") refuse(workflowsUnparseableRefusal(args, workflowReading.faults));

  if (reportsReading.faulty !== undefined) refuse(reportRefusal(reportsReading.faulty));

  if (corpusReading.kind === "unparseable") refuse(corpusUnparseableRefusal(corpusReading.faults));
  return { corpus: corpusReading.corpus, workflows: workflowReading.workflows, reports: reportsReading.reports };
}

// The target's folder, from the folder the corpus is in and the top of any git repository that folder is in.
function targetRootOf(features: string | undefined): string {
  const corpusFolder = features === undefined ? undefined : dirname(features);
  return targetFolderOf(readWorkingFolder, corpusFolder, corpusFolder === undefined ? undefined : readRepositoryTop(corpusFolder));
}

function provenanceOf(args: Record<string, string>, inputs: InputPaths, root: string): Provenance {
  const targetDir = args["features"] !== undefined ? dirname(args["features"]) : undefined;
  const identity = runIdentityOf({
    target: args["target"],
    origin: resolveTargetOrigin(targetDir),
    givenSourceSha: args["source-sha"],
    head: readTargetHead(targetDir),
    ...readToolInstall(),
  });
  return provenanceFrom(identity, runInputsOf(inputs), root);
}

function runReconcile(
  reports: readonly EvidenceReport[],
  root: string,
  corpus: readonly ParsedFeatureFile[],
  workflows: readonly ParsedWorkflow[],
  run: { readonly strict: boolean; readonly provenance: Provenance },
): EvidenceReconciliation {
  const packageJson = (documentReadBy(reports, "package-manifest") as TargetManifest | undefined) ?? {};
  const scripts = packageJson.scripts ?? {};
  const steps = pipelineStepsOf(workflows);
  const recordedSteps = recordedCheckStepsOf(documentReadBy(reports, "ci-step-record") as StepRecord | undefined);
  return evidenceReconciliationOf({
    features: corpus,
    testObservations: observationsOf(reports, root, claimCodesAtOf(corpus)),
    steps,
    readings: { runsTheReconciler: (command) => commandRuns(command, RECONCILER_INVOCATION, scripts), scripts, shell: shellReading },
    ...(recordedSteps === undefined ? {} : { recordedSteps }),
    configuration: targetConfigurationFrom(packageJson, steps),
    ...run,
  });
}
