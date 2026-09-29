/**
 * The output writer: renders each planned output through the pure renderers and performs the only
 * IO in the pipeline, to stdout or to a file.
 */

import { unlinkSync, writeFileSync } from "node:fs";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import { renderJson } from "@3f-consulting/spec-controller-core";
import type { FeatureNames } from "@3f-consulting/spec-controller-core";
import { inputOverwriteRefusal, sharedFileRefusal, type FileIdentity, type IdentifiedInput, type IdentifiedOutput, type OutputFormat, type OutputPlan, type PlannedOutput } from "./format.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { probeDestination, refuse, stdoutIdentity, unwritableRefusal, writeOrRefuse } from "../../outputLocation.js";

/**
 * The reconciliation payloads the writer renders — the balance plus its sibling reads
 * (ctx / evidenceObligations / featureNames), exactly the arguments the pure renderers take.
 * `withRuntimeObservations` and `withStaticChecks` gate the two observation axes; the renderers
 * fold both off the Ledger themselves, so the writer threads only whether each axis is in play.
 */
export interface OutputPayloads {
  readonly balance: EvidenceReconciliation;
  readonly ctx: RunContext;
  readonly evidenceObligations?: EvidenceObligations;
  readonly withRuntimeObservations?: boolean;
  readonly withStaticChecks?: boolean;
  readonly featureNames?: FeatureNames;
}

function render(fmt: OutputFormat, p: OutputPayloads): string {
  return fmt === "json"
    ? renderJson(p.balance, p.ctx, p.evidenceObligations, p.featureNames)
    : renderMarkdown(p.balance, p.ctx, p.evidenceObligations, p.featureNames);
}

/**
 * Every destination is vetted before any output is emitted, so a refused run never leaves a report
 * behind, on stdout or in a file, whose headline names an exit the process does not take. Writing
 * files first and stdout last would not do: an earlier file would still be written. The vetting
 * refuses a destination that cannot be written, two outputs that land on one regular file, and an
 * output that lands on one of the files the run read.
 */
export function writeOutputs(
  plan: OutputPlan,
  payloads: OutputPayloads,
  stdoutFile: () => FileIdentity | undefined = stdoutIdentity,
  inputs: readonly IdentifiedInput[] = [],
): void {
  const emissions = plan.outputs.map((output) => ({ output, text: render(output.fmt, payloads) + "\n" }));
  const refusal = vetDestinations(plan.outputs, stdoutFile, inputs);
  if (refusal !== undefined) refuse(refusal);
  for (const { output, text } of emissions) emit(output, text);
}

/** The refusal the destinations earn, if any. Every file the vetting had to create is removed again first. */
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

/** The regular file an output lands on, or the refusal naming why its destination cannot be written. */
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
  return `The ${output.fmt} report could not be written`;
}

function emit(output: PlannedOutput, text: string): void {
  const dest = output.dest;
  if (dest.kind === "stdout") {
    process.stdout.write(text);
    return;
  }
  writeOrRefuse(refusalSubject(output), dest.path, () => writeFileSync(dest.path, text, "utf8"));
}
