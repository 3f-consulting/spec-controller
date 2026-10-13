import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  runReconcile,
  readEvidenceObligations,
  readFeatureNames,
  featureCorpusParseErrors,
  type ReconcileOptions,
} from "../ingest/ingestQualityChecks.js";
import { planOutput } from "./emit/format.js";
import { writeOutputs } from "./emit/writer.js";
import { namesStdout, refuse, settlingRefusal, stdoutIdentity } from "../outputLocation.js";
import { identifiedInputs, inputsReadBy, NODE_INPUT_READER } from "./inputsRead.js";
import { checkReRenderFlags } from "./reRender.js";
import {
  checkInputPaths,
  checkInputShapes,
  checkSavedReconciliation,
  jsonInputsOf,
  reasonOf,
  reRenderOrRefusal,
} from "./unreadableInputs.js";
import { statusFor } from "./exitStatus.js";
import {
  verdictCode,
} from "@3f-consulting/spec-controller-core";
import { resolveSourceSha, resolveTargetRoot, resolveToolIdentity } from "../run-management/resolveRunInputs.js";
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

function reconcileInputsOf(args: Record<string, string>): ReconcileOptions {
  return {
    features: args["features"],
    vitest: args["vitest"],
    pytest: args["pytest"],
    cucumber: args["cucumber"],
    ci: args["ci"],
    packageJson: args["package-json"],
    ciSteps: args["ci-steps"],
  };
}

export function checkInputsExist(
  args: Record<string, string>,
  exists: (path: string) => boolean,
): string | null {
  const flags = [
    "vitest", "pytest", "cucumber", "features", "ci", "package-json", "ci-steps",
  ] as const;
  for (const flag of flags) {
    const path = args[flag];
    if (path !== undefined && !exists(path)) {
      return APP_MESSAGES[AppMessage.InputPathMissing](`--${flag}`, path);
    }
  }
  return null;
}

const JSON_INPUT_FLAGS = [
  "vitest", "cucumber", "package-json", "ci-steps",
] as const;

export function checkInputsParse(
  args: Record<string, string>,
  read: (path: string) => string,
): string | null {
  for (const flag of JSON_INPUT_FLAGS) {
    const path = args[flag];
    if (path === undefined) continue;

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

  if (renderSavedReport(args)) return false;
  refuseUnreadableInputs(args);

  const inputs = reconcileInputsOf(args);

  const balance = runReconcile(inputs);

  const evidenceObligations = readEvidenceObligations(args["features"]);

  const featureNames = readFeatureNames(args["features"]);

  const ctx = runContextOf(args, inputs, runStart);

  const planResult = planOutput(collectFormatSpecs(argv), namesStdout);
  if (!planResult.ok) refuse(planResult.error);
  const payloads = { balance, ctx, evidenceObligations, featureNames };
  writeOutputs(planResult.plan, payloads, stdoutIdentity, identifiedInputs(inputsReadBy(args, NODE_INPUT_READER)), ownRunDir);

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

function refuseUnreadableInputs(args: Record<string, string>): void {
  const missingInputError = checkInputsExist(args, existsSync);
  if (missingInputError) refuse(missingInputError);

  const unparseableInputError = checkInputsParse(args, readText);
  if (unparseableInputError) refuse(unparseableInputError);

  const unreadablePathError = checkInputPaths(args);
  if (unreadablePathError) refuse(unreadablePathError);

  const misshapenInputError = checkInputShapes(jsonInputsOf(args, existsSync), readText);
  if (misshapenInputError) refuse(misshapenInputError);

  const featureParseErrors = featureCorpusParseErrors(args["features"]);
  if (featureParseErrors.length > 0) {
    refuse(
      featureParseErrors
        .map(({ file, message }) =>
          APP_MESSAGES[AppMessage.CorpusFileUnparseable](APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"), file, message),
        )
        .join("\n"),
    );
  }
}

function runContextOf(
  args: Record<string, string>,
  inputs: ReconcileOptions,
  runStart: Date,
): RunContext {
  return {
    target: sourceTarget(args),
    inputs,
    runStart,
    sourceSha: resolveSourceSha({
      sourceSha: args["source-sha"],
      targetDir: args["features"] !== undefined ? dirname(args["features"]) : undefined,
    }),
    root: resolveTargetRoot({ features: inputs.features }),
    ...resolveToolIdentity(),
    strict: args["strict"] !== undefined,
  };
}
