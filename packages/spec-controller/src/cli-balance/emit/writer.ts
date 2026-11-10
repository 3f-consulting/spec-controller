import { unlinkSync, writeFileSync } from "node:fs";
import { renderJson, renderMarkdown, type EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import {
  inputOverwriteRefusal,
  planOutput,
  sharedFileRefusal,
  type FileIdentity,
  type IdentifiedInput,
  type IdentifiedOutput,
  type OutputFormat,
  type PlannedOutput,
} from "./format.js";
import { namesStdout, probeDestination, refuse, stdoutIdentity, unwritableRefusal, writeOrRefuse, type Unwritable } from "../../outputLocation.js";
import type { Refusal } from "../../refusal.js";

function render(fmt: OutputFormat, evidenceReconciliation: EvidenceReconciliation): string {
  return fmt === "json" ? renderJson(evidenceReconciliation) : renderMarkdown(evidenceReconciliation);
}

export function writeReports(formatSpecs: readonly string[], evidenceReconciliation: EvidenceReconciliation, inputs: readonly IdentifiedInput[]): void {
  const planned = planOutput(formatSpecs, namesStdout);
  if (!planned.ok) refuse(planned.error);
  const { outputs } = planned.plan;
  const emissions = outputs.map((output) => ({ output, text: render(output.fmt, evidenceReconciliation) }));
  const refused = vetDestinations(outputs, inputs);
  if (refused !== undefined) refuse(refused);
  for (const { output, text } of emissions) emit(output, text);
}

function vetDestinations(outputs: readonly PlannedOutput[], inputs: readonly IdentifiedInput[]): Refusal | undefined {
  const created: string[] = [];
  try {
    const identified: IdentifiedOutput[] = [];
    for (const output of outputs) {
      const probe = identify(output, created);
      if (probe.kind === "refused") return probe.refusal;
      identified.push({ output, identity: probe.identity });
    }
    return sharedFileRefusal(identified) ?? inputOverwriteRefusal(identified, inputs);
  } finally {
    for (const path of created) unlinkSync(path);
  }
}

type Probe = { readonly kind: "identified"; readonly identity: FileIdentity | undefined } | { readonly kind: "refused"; readonly refusal: Refusal };

function identify(output: PlannedOutput, created: string[]): Probe {
  const dest = output.dest;
  if (dest.kind === "stdout") return { kind: "identified", identity: stdoutIdentity() };
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
