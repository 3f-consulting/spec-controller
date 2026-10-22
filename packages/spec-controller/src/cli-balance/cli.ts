import { existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  runReconcile,
  readCorpus,
  readWorkflows,
  featureNamesOf,
  type EvidenceReport,
} from "../ingest/ingestQualityChecks.js";
import { EVIDENCE_INPUTS, inputPathsOf, runInputsOf, type InputPaths } from "./evidenceInputs.js";
import { planOutput } from "./emit/format.js";
import { writeOutputs } from "./emit/writer.js";
import { namesStdout, refuse, settlingRefusal, stdoutIdentity } from "../outputLocation.js";
import { identifiedInputs, inputsReadBy, NODE_INPUT_READER } from "./inputsRead.js";
import { DEFAULT_FEATURES_DIR } from "../defaultCorpus.js";
import { corpusDirOf } from "./corpusDir.js";
import { checkReRenderFlags } from "./reRender.js";
import {
  checkInputPaths,
  checkWorkflowsParse,
  checkInputShapes,
  corpusDirRefusal,
  checkSavedReconciliation,
  jsonInputsOf,
  readReports,
  reportRefusal,
  reRenderOrRefusal,
  savedReportRefusal,
  type ReportsReading,
} from "./unreadableInputs.js";
import { readDocument } from "../ingest/reportReading.js";
import { exitCodeOf } from "./exitStatus.js";
import { endRunOn, USAGE_REFUSAL } from "../exitCode.js";
import {
  corpusCountsOfFeatures,
  runVerdict,
  type ParsedFeatureFile,
  type ParsedWorkflow,
} from "@3f-consulting/spec-controller-core";
import { resolveSourceSha, resolveTargetOrigin, resolveTargetRoot, resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { earlierStoredRunDirOf } from "../run-management/keptRun.js";
import { balanceCommand, cliRegistry, renderCommandHelp } from "../cli-registry.js";
import {
  asksForHelp,
  parseArgs,
  checkArgvShape,
  checkUnknownFlags,
  checkMissingValues,
  checkMisplacedHostModifiers,
} from "../cli-args.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import { APP_MESSAGES, AppMessage } from "../messages.js";

function collectFormatSpecs(argv: string[]): string[] {
  // checkMissingValues has already refused a --format given no value.
  return argv.flatMap((token, i) => (token === "--format" ? [argv[i + 1]!] : []));
}

export function checkLegacyJson(args: Record<string, string>): string | null {
  if (args["json"] !== undefined) {
    return APP_MESSAGES[AppMessage.LegacyJsonRemoved]();
  }
  return null;
}

export function sourceTarget(args: Record<string, string>): string {
  return args["target"] ?? "unknown-target";
}

export function checkInputsExist(
  args: Record<string, string>,
  exists: (path: string) => boolean,
): string | null {
  for (const { flag } of EVIDENCE_INPUTS) {
    const path = args[flag];
    if (path !== undefined && !exists(path)) {
      return APP_MESSAGES[AppMessage.InputPathMissing](`--${flag}`, path);
    }
  }
  return null;
}

export function checkInputsParse(reports: ReportsReading): string | null {
  for (const file of reports.files) {
    const { reading } = file;
    if (!file.flagged || file.report.format !== "json") continue;
    if (reading.kind === "read-fault" || reading.kind === "unparseable") return reportRefusal({ ...file, reading });
  }
  return null;
}

export function runBalance(argv: string[], ownRunDir?: string): boolean {
  return settlingRefusal(() => balance(argv, ownRunDir), false);
}

function balance(argv: string[], ownRunDir: string | undefined): boolean {
  const helped = asksForHelp(argv);
  if (helped) process.stdout.write(renderCommandHelp(balanceCommand) + "\n");
  return !helped && reconcile(argv, ownRunDir);
}

function reconcile(argv: string[], ownRunDir: string | undefined): boolean {
  const runStart = new Date();
  const args = parseArgs(argv);

  const legacyJsonError = checkLegacyJson(args);
  if (legacyJsonError) refuse(legacyJsonError);

  const misplacedModifierError = checkMisplacedHostModifiers(args, cliRegistry, "balance");
  if (misplacedModifierError) refuse(misplacedModifierError);

  const shapeError = checkArgvShape(argv, cliRegistry, "balance");
  if (shapeError) refuse(shapeError);

  const unknownFlagError = checkUnknownFlags(args, cliRegistry, "balance", resolveToolIdentity().toolVersion);
  if (unknownFlagError) {
    process.stderr.write(unknownFlagError + "\n");
    endRunOn(USAGE_REFUSAL);
    return false;
  }

  const missingValueError = checkMissingValues(argv, cliRegistry, "balance");
  if (missingValueError) refuse(missingValueError);

  if (renderSavedReport(args)) return true;
  const { corpus, workflows, reports } = refuseUnreadableInputs(args);

  const inputs = inputPathsOf(args);

  const root = resolveTargetRoot({ features: inputs.features });

  const balance = runReconcile(reports, root, corpus, workflows);

  const ctx = runContextOf(args, inputs, runStart, root);

  const planResult = planOutput(collectFormatSpecs(argv), namesStdout);
  if (!planResult.ok) refuse(planResult.error);
  const payloads = { balance, ctx, evidenceObligations: corpusCountsOfFeatures(corpus), featureNames: featureNamesOf(corpus) };
  writeOutputs(
    planResult.plan,
    payloads,
    stdoutIdentity,
    identifiedInputs(inputsReadBy(args, NODE_INPUT_READER)),
    (path) => earlierStoredRunDirOf(path, ownRunDir),
  );

  const verdict = runVerdict({ ...balance, strict: ctx.strict === true });
  endRunOn({ kind: "verdict", code: exitCodeOf(verdict, args["exit-zero"] !== undefined) });
  return true;
}

function renderSavedReport(args: Record<string, string>): boolean {
  const ignoredFlagError = checkReRenderFlags(args);
  if (ignoredFlagError) refuse(ignoredFlagError);

  const rehydratePath = args["render-from-json"];
  if (rehydratePath === undefined) return false;
  const savedReading = readDocument(rehydratePath, "json");
  if (savedReading.kind !== "parsed") refuse(savedReportRefusal(rehydratePath, savedReading));
  const notSavedError = checkSavedReconciliation(rehydratePath, savedReading.document);
  if (notSavedError) refuse(notSavedError);
  const saved = reRenderOrRefusal(rehydratePath, savedReading.document, args["strict"] !== undefined);
  if (typeof saved === "string") refuse(saved);
  process.stdout.write(saved.markdown + "\n");
  endRunOn({ kind: "verdict", code: exitCodeOf(saved.verdict, args["exit-zero"] !== undefined) });
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
  const unparseableInputError = checkInputsParse(reportsReading);
  if (unparseableInputError) refuse(unparseableInputError);

  const corpusDir = corpusDirOf(args);
  if (typeof corpusDir !== "string") refuse(corpusDirRefusal(corpusDir));

  const corpusReading = readCorpus(corpusDir);
  const workflowReading = readWorkflows(args["ci"]);
  if (corpusReading.kind === "read-fault") refuse(checkInputPaths(args, corpusReading, workflowReading));
  if (workflowReading.kind === "read-fault") refuse(checkInputPaths(args, corpusReading, workflowReading));
  if (workflowReading.kind === "unparseable") refuse(checkWorkflowsParse(args, workflowReading));

  if (reportsReading.kind === "faulty") refuse(checkInputShapes(reportsReading));

  if (corpusReading.kind === "unparseable") {
    refuse(
      corpusReading.faults
        .map(({ file, message }) =>
          APP_MESSAGES[AppMessage.CorpusFileUnparseable](APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"), file, message),
        )
        .join("\n"),
    );
  }
  return { corpus: corpusReading.corpus, workflows: workflowReading.workflows, reports: reportsReading.reports };
}

function runContextOf(
  args: Record<string, string>,
  inputs: InputPaths,
  runStart: Date,
  root: string,
): RunContext {
  const targetDir = args["features"] !== undefined ? dirname(args["features"]) : undefined;
  const targetOrigin = args["target"] === undefined ? resolveTargetOrigin(targetDir) : null;
  return {
    target: sourceTarget(args),
    ...(targetOrigin !== null ? { targetOrigin } : {}),
    inputs: runInputsOf(inputs),
    corpus: args["features"] ?? DEFAULT_FEATURES_DIR,
    runStart,
    sourceSha: resolveSourceSha({ sourceSha: args["source-sha"], targetDir }),
    root,
    ...resolveToolIdentity(),
    strict: args["strict"] !== undefined,
  };
}
