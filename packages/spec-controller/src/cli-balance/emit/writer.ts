/**
 * The output writer: renders each planned output through the pure renderers and performs the only
 * IO in the pipeline, to stdout or to a file.
 */

import { writeFileSync } from "node:fs";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import { renderJson } from "@3f-consulting/spec-controller-core";
import type { FeatureNames } from "@3f-consulting/spec-controller-core";
import type { OutputFormat, OutputPlan, PlannedOutput } from "./format.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { probeWritable, writeOrRefuse } from "../../outputLocation.js";

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
 * Every file destination is proved writable before any output is emitted, so a refused run never
 * leaves a report behind, on stdout or in a file, whose headline names an exit the process does not
 * take. Writing files first and stdout last would not do: an earlier file would still be written.
 */
export function writeOutputs(plan: OutputPlan, payloads: OutputPayloads): void {
  const emissions = plan.outputs.map((output) => ({ output, text: render(output.fmt, payloads) + "\n" }));
  for (const { output } of emissions) {
    const dest = output.dest;
    if (dest.kind === "file") writeOrRefuse(refusalSubject(output), dest.path, () => probeWritable(dest.path));
  }
  for (const { output, text } of emissions) emit(output, text);
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
