import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  runReconcile,
  readCorpus,
  readWorkflows,
  featureNamesOf,
  evidenceObligationsOf,
} from "../ingest/ingestQualityChecks.js";
import { EVIDENCE_INPUTS, inputPathsOf, reportsOf, runInputsOf, type InputPaths } from "./evidenceInputs.js";
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
  reasonOf,
  reRenderOrRefusal,
} from "./unreadableInputs.js";
import { statusFor } from "./exitStatus.js";
import {
  verdictCode,
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

function readText(path: string): string {
  return readFileSync(path, "utf8");
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

export function checkInputsParse(
  args: Record<string, string>,
  read: (path: string) => string,
): string | null {
  for (const { flag, report } of EVIDENCE_INPUTS) {
    const path = args[flag];
    if (path === undefined || report?.format !== "json") continue;

    let text: string;
    try {
      text = read(path);
    } catch (err) {
      return APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedFile](`--${flag}`), path, reasonOf(err));
    }
    try {
      JSON.parse(text);
    } catch (err) {
      return APP_MESSAGES[AppMessage.NotValidJson](APP_MESSAGES[AppMessage.FlaggedReport](`--${flag}`), path, reasonOf(err));
    }
  }
  return null;
}

function checkRenderFromJson(
  args: Record<string, string>,
  read: (path: string) => string,
): string | null {
  const path = args["render-from-json"];
  if (path === undefined) return null;

  try {
    JSON.parse(read(path));
  } catch (err) {
    return APP_MESSAGES[AppMessage.CouldNotBeReadAt](
      APP_MESSAGES[AppMessage.FlaggedSavedReport]("--render-from-json"),
      path,
      reasonOf(err),
    );
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
    process.exitCode = 2;
    return false;
  }

  const missingValueError = checkMissingValues(argv, cliRegistry, "balance");
  if (missingValueError) refuse(missingValueError);

  if (renderSavedReport(args)) return true;
  const { corpus, workflows } = refuseUnreadableInputs(args);

  const inputs = inputPathsOf(args);

  const root = resolveTargetRoot({ features: inputs.features });

  const balance = runReconcile(reportsOf(inputs), root, corpus, workflows);

  const ctx = runContextOf(args, inputs, runStart, root);

  const planResult = planOutput(collectFormatSpecs(argv), namesStdout);
  if (!planResult.ok) refuse(planResult.error);
  const payloads = { balance, ctx, evidenceObligations: evidenceObligationsOf(corpus), featureNames: featureNamesOf(corpus) };
  writeOutputs(
    planResult.plan,
    payloads,
    stdoutIdentity,
    identifiedInputs(inputsReadBy(args, NODE_INPUT_READER)),
    (path) => earlierStoredRunDirOf(path, ownRunDir),
  );

  const verdict = verdictCode({ ...balance, strict: ctx.strict === true });
  const code = statusFor(verdict, args["exit-zero"] !== undefined);
  process.exitCode = code;
  return true;
}

function renderSavedReport(args: Record<string, string>): boolean {
  const ignoredFlagError = checkReRenderFlags(args);
  if (ignoredFlagError) refuse(ignoredFlagError);
  const unreadableSavedReportError = checkRenderFromJson(args, readText);
  if (unreadableSavedReportError) refuse(unreadableSavedReportError);

  const rehydratePath = args["render-from-json"];
  if (rehydratePath === undefined) return false;
  const savedJson = readText(rehydratePath);
  const notSavedError = checkSavedReconciliation(rehydratePath, savedJson);
  if (notSavedError) refuse(notSavedError);
  const saved = reRenderOrRefusal(rehydratePath, savedJson, args["strict"] !== undefined);
  if (typeof saved === "string") refuse(saved);
  process.stdout.write(saved.markdown + "\n");
  const code = statusFor(saved.code, args["exit-zero"] !== undefined);
  process.exitCode = code;
  return true;
}

interface ReadInputs {
  readonly corpus: readonly ParsedFeatureFile[];
  readonly workflows: readonly ParsedWorkflow[];
}

function refuseUnreadableInputs(args: Record<string, string>): ReadInputs {
  const missingInputError = checkInputsExist(args, existsSync);
  if (missingInputError) refuse(missingInputError);

  const unparseableInputError = checkInputsParse(args, readText);
  if (unparseableInputError) refuse(unparseableInputError);

  const corpusDir = corpusDirOf(args);
  if (typeof corpusDir !== "string") refuse(corpusDirRefusal(corpusDir));

  const corpusReading = readCorpus(corpusDir);
  const workflowReading = readWorkflows(args["ci"]);
  const unreadablePathError = checkInputPaths(args, corpusReading, workflowReading);
  if (unreadablePathError) refuse(unreadablePathError);

  const unparseableWorkflowError = checkWorkflowsParse(args, workflowReading);
  if (unparseableWorkflowError) refuse(unparseableWorkflowError);

  const misshapenInputError = checkInputShapes(jsonInputsOf(args, existsSync), readText);
  if (misshapenInputError) refuse(misshapenInputError);

  if (corpusReading.kind === "unparseable") {
    refuse(
      corpusReading.faults
        .map(({ file, message }) =>
          APP_MESSAGES[AppMessage.CorpusFileUnparseable](APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"), file, message),
        )
        .join("\n"),
    );
  }
  // A read fault was refused by checkInputPaths above, and a parse fault by the checks after it, so both were read.
  return {
    corpus: corpusReading.kind === "read" ? corpusReading.corpus : [],
    workflows: workflowReading.kind === "read" ? workflowReading.workflows : [],
  };
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
