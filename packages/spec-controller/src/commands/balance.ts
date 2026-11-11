import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { runReconcile, readCorpus, readWorkflows, type EvidenceReport } from "../inputs/ingestQualityChecks.js";
import { EVIDENCE_INPUTS, inputPathsOf, runInputsOf, type InputPaths } from "../runRequest/evidenceInputs.js";
import { writeReports } from "../output/writer.js";
import { refuse, settlingRefusal } from "../output/outputLocation.js";
import { identifiedInputs, inputsReadBy, NODE_INPUT_READER } from "../inputs/inputsRead.js";
import { corpusDirOf } from "../inputs/corpusDir.js";
import {
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
import { provenanceFrom, type ParsedFeatureFile, type ParsedWorkflow, type Provenance } from "@3f-consulting/spec-controller-core";
import { resolveSourceSha, resolveTargetOrigin, resolveTargetRoot, resolveToolIdentity } from "../runIdentity/resolveRunInputs.js";
import { balanceCommand, cliRegistry, renderCommandHelp } from "../runRequest/cliRegistry.js";
import {
  asksForHelp,
  parseArgs,
  checkArgvShape,
  checkUnknownFlags,
  checkMissingValues,
} from "../runRequest/cliArgs.js";
import { AppError } from "../messages/messages.js";
import { refusal, type Refusal } from "../runEnding/refusal.js";

function collectFormatSpecs(argv: readonly string[]): string[] {
  // checkMissingValues has already refused a --format given no value.
  return argv.flatMap((token, i) => (token === "--format" ? [argv[i + 1]!] : []));
}

function checkInputsExist(
  args: Record<string, string>,
  exists: (path: string) => boolean,
): Refusal | null {
  for (const { flag } of EVIDENCE_INPUTS) {
    const path = args[flag];
    if (path !== undefined && !exists(path)) {
      return refusal(AppError.InputPathMissing, { flag: `--${flag}`, path });
    }
  }
  return null;
}

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

  const unknownFlagError = checkUnknownFlags(args, cliRegistry, "balance", resolveToolIdentity().toolVersion);
  if (unknownFlagError) refuse(unknownFlagError);

  const missingValueError = checkMissingValues(argv, cliRegistry, "balance");
  if (missingValueError) refuse(missingValueError);

  const { corpus, workflows, reports } = refuseUnreadableInputs(args);

  const inputs = inputPathsOf(args);

  const root = resolveTargetRoot({ features: inputs.features });

  const evidenceReconciliation = runReconcile(reports, root, corpus, workflows, {
    strict: args["strict"] !== undefined,
    provenance: provenanceOf(args, inputs, root),
  });

  writeReports(collectFormatSpecs(argv), evidenceReconciliation, identifiedInputs(inputsReadBy(args, NODE_INPUT_READER)));

  endRunOn({ kind: "verdict", code: exitCodeOf(evidenceReconciliation.runVerdict, args["exit-zero"] !== undefined) });
  return true;
}

interface ReadInputs {
  readonly corpus: readonly ParsedFeatureFile[];
  readonly workflows: readonly ParsedWorkflow[];
  readonly reports: readonly EvidenceReport[];
}

function refuseUnreadableInputs(args: Record<string, string>): ReadInputs {
  const missingInputError = checkInputsExist(args, existsSync);
  if (missingInputError) refuse(missingInputError);

  const reportsReading = readReports(jsonInputsOf(args, existsSync));

  const corpusDir = corpusDirOf(args);
  if (typeof corpusDir !== "string") refuse(corpusDirRefusal(corpusDir));

  const corpusReading = readCorpus(corpusDir);
  const workflowReading = readWorkflows(args["ci"]);
  if (corpusReading.kind === "read-fault") refuse(corpusReadRefusal(args, corpusReading.fault));
  if (workflowReading.kind === "read-fault") refuse(workflowsReadRefusal(args, workflowReading.fault));
  if (workflowReading.kind === "unparseable") refuse(workflowsUnparseableRefusal(args, workflowReading.faults));

  if (reportsReading.faulty !== undefined) refuse(reportRefusal(reportsReading.faulty));

  if (corpusReading.kind === "unparseable") refuse(corpusUnparseableRefusal(corpusReading.faults));
  return { corpus: corpusReading.corpus, workflows: workflowReading.workflows, reports: reportsReading.reports };
}

function provenanceOf(args: Record<string, string>, inputs: InputPaths, root: string): Provenance {
  const targetDir = args["features"] !== undefined ? dirname(args["features"]) : undefined;
  const identity = {
    target: args["target"],
    origin: resolveTargetOrigin(targetDir),
    sourceSha: resolveSourceSha({ sourceSha: args["source-sha"], targetDir }),
    ...resolveToolIdentity(),
  };
  return provenanceFrom(identity, runInputsOf(inputs), root);
}
