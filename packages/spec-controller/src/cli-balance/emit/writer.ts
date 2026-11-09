import { unlinkSync, writeFileSync } from "node:fs";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import { renderJson } from "@3f-consulting/spec-controller-core";
import type { FeatureNames } from "@3f-consulting/spec-controller-core";
import { inputOverwriteRefusal, sharedFileRefusal, type FileIdentity, type IdentifiedInput, type IdentifiedOutput, type OutputFormat, type OutputPlan, type PlannedOutput } from "./format.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { probeDestination, refuse, unwritableRefusal, writeOrRefuse, type Unwritable } from "../../outputLocation.js";
import type { Refusal } from "../../refusal.js";
import { reportedExitCodeOf } from "../exitStatus.js";

export interface OutputPayloads {
  readonly balance: EvidenceReconciliation;
  readonly ctx: RunContext;
  readonly evidenceObligations?: EvidenceObligations;
  readonly featureNames?: FeatureNames;
}

function render(fmt: OutputFormat, p: OutputPayloads): string {
  return fmt === "json"
    ? renderJson(p.balance, p.ctx, p.evidenceObligations, p.featureNames)
    : renderMarkdown(p.balance, p.ctx, reportedExitCodeOf, p.evidenceObligations, p.featureNames);
}

export function writeOutputs(
  plan: OutputPlan,
  payloads: OutputPayloads,
  stdoutFile: () => FileIdentity | undefined,
  inputs: readonly IdentifiedInput[],
): void {
  const emissions = plan.outputs.map((output) => ({ output, text: render(output.fmt, payloads) + "\n" }));
  const refused = vetDestinations(plan.outputs, stdoutFile, inputs);
  if (refused !== undefined) refuse(refused);
  for (const { output, text } of emissions) emit(output, text);
}

function vetDestinations(
  outputs: readonly PlannedOutput[],
  stdoutFile: () => FileIdentity | undefined,
  inputs: readonly IdentifiedInput[],
): Refusal | undefined {
  const created: string[] = [];
  try {
    const identified: IdentifiedOutput[] = [];
    for (const output of outputs) {
      const probe = identify(output, stdoutFile, created);
      if (probe.kind === "refused") return probe.refusal;
      identified.push({ output, identity: probe.identity });
    }
    return sharedFileRefusal(identified) ?? inputOverwriteRefusal(identified, inputs);
  } finally {
    for (const path of created) unlinkSync(path);
  }
}

type Probe = { readonly kind: "identified"; readonly identity: FileIdentity | undefined } | { readonly kind: "refused"; readonly refusal: Refusal };

function identify(output: PlannedOutput, stdoutFile: () => FileIdentity | undefined, created: string[]): Probe {
  const dest = output.dest;
  if (dest.kind === "stdout") return { kind: "identified", identity: stdoutFile() };
  try {
    const probed = probeDestination(dest.path);
    if (probed.created !== undefined) created.push(probed.created);
    return { kind: "identified", identity: probed.identity };
  } catch (err) {
    return { kind: "refused", refusal: unwritableRefusal(reportOf(output), dest.path, err) };
  }
}

function reportOf(output: PlannedOutput): Unwritable {
  return { kind: "report", format: output.fmt };
}

function emit(output: PlannedOutput, text: string): void {
  const dest = output.dest;
  if (dest.kind === "stdout") {
    process.stdout.write(text);
    return;
  }
  writeOrRefuse(reportOf(output), dest.path, () => writeFileSync(dest.path, text));
}
