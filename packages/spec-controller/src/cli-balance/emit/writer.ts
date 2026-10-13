import { unlinkSync, writeFileSync } from "node:fs";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import { renderJson } from "@3f-consulting/spec-controller-core";
import type { FeatureNames } from "@3f-consulting/spec-controller-core";
import { inputOverwriteRefusal, sharedFileRefusal, type FileIdentity, type IdentifiedInput, type IdentifiedOutput, type OutputFormat, type OutputPlan, type PlannedOutput } from "./format.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { probeDestination, refuse, unwritableRefusal, writeOrRefuse } from "../../outputLocation.js";
import { APP_MESSAGES, AppMessage } from "../../messages.js";

export interface OutputPayloads {
  readonly balance: EvidenceReconciliation;
  readonly ctx: RunContext;
  readonly evidenceObligations?: EvidenceObligations;
  readonly featureNames?: FeatureNames;
}

function render(fmt: OutputFormat, p: OutputPayloads): string {
  return fmt === "json"
    ? renderJson(p.balance, p.ctx, p.evidenceObligations, p.featureNames)
    : renderMarkdown(p.balance, p.ctx, p.evidenceObligations, p.featureNames);
}

export function writeOutputs(
  plan: OutputPlan,
  payloads: OutputPayloads,
  stdoutFile: () => FileIdentity | undefined,
  inputs: readonly IdentifiedInput[],
  earlierStoredRunDirOf: (path: string) => string | undefined,
): void {
  const emissions = plan.outputs.map((output) => ({ output, text: render(output.fmt, payloads) + "\n" }));
  const refusal = vetDestinations(plan.outputs, stdoutFile, inputs) ?? earlierStoredRunRefusal(plan.outputs, earlierStoredRunDirOf);
  if (refusal !== undefined) refuse(refusal);
  for (const { output, text } of emissions) emit(output, text);
}

function vetDestinations(
  outputs: readonly PlannedOutput[],
  stdoutFile: () => FileIdentity | undefined,
  inputs: readonly IdentifiedInput[],
): string | undefined {
  const created: string[] = [];
  try {
    const identified: IdentifiedOutput[] = [];
    for (const output of outputs) {
      const probe = identify(output, stdoutFile, created);
      if (typeof probe === "string") return probe;
      identified.push({ output, identity: probe });
    }
    return sharedFileRefusal(identified) ?? inputOverwriteRefusal(identified, inputs);
  } finally {
    for (const path of created) unlinkSync(path);
  }
}

function earlierStoredRunRefusal(
  outputs: readonly PlannedOutput[],
  earlierStoredRunDirOf: (path: string) => string | undefined,
): string | undefined {
  for (const { dest } of outputs) {
    if (dest.kind === "stdout") continue;
    const runDir = earlierStoredRunDirOf(dest.path);
    if (runDir !== undefined) return APP_MESSAGES[AppMessage.OutputOverwritesStoredRun](dest.path, runDir);
  }
  return undefined;
}

function identify(output: PlannedOutput, stdoutFile: () => FileIdentity | undefined, created: string[]): FileIdentity | undefined | string {
  const dest = output.dest;
  if (dest.kind === "stdout") return stdoutFile();
  try {
    const probed = probeDestination(dest.path);
    if (probed.created !== undefined) created.push(probed.created);
    return probed.identity;
  } catch (err) {
    return unwritableRefusal(refusalSubject(output), dest.path, err);
  }
}

function refusalSubject(output: PlannedOutput): string {
  return APP_MESSAGES[AppMessage.ReportNotWritten](output.fmt);
}

function emit(output: PlannedOutput, text: string): void {
  const dest = output.dest;
  if (dest.kind === "stdout") {
    process.stdout.write(text);
    return;
  }
  writeOrRefuse(refusalSubject(output), dest.path, () => writeFileSync(dest.path, text));
}
