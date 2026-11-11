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
import {
  namesStderr,
  namesStdout,
  probeDestination,
  refuse,
  stderrIdentity,
  stdoutIdentity,
  unwritableRefusal,
  writeOrRefuse,
} from "../../outputLocation.js";
import { standardError } from "../../standardError.js";
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
    let stderrIdentified = false;
    for (const output of outputs) {
      const probe = identify(output, created);
      if ("refusal" in probe) return probe.refusal;
      const toStderr = output.dest.kind === "file" && namesStderr(output.dest.path);
      // Two reports on standard error follow one another in its stream, so only the first is checked against the files.
      identified.push({ output, identity: toStderr && stderrIdentified ? undefined : probe.identity });
      stderrIdentified ||= toStderr;
    }
    return sharedFileRefusal(identified) ?? inputOverwriteRefusal(identified, inputs);
  } finally {
    for (const path of created) unlinkSync(path);
  }
}

type Probe = { readonly identity: FileIdentity | undefined } | { readonly refusal: Refusal };

function identify(output: PlannedOutput, created: string[]): Probe {
  const dest = output.dest;
  if (dest.kind === "stdout") return { identity: stdoutIdentity() };
  if (namesStderr(dest.path)) return { identity: stderrIdentity() };
  try {
    const probed = probeDestination(dest.path);
    if (probed.created !== undefined) created.push(probed.created);
    return { identity: probed.identity };
  } catch (err) {
    return { refusal: unwritableRefusal(output.fmt, dest.path, err) };
  }
}

function emit(output: PlannedOutput, text: string): void {
  const dest = output.dest;
  if (dest.kind === "stdout") {
    process.stdout.write(text);
    return;
  }
  if (namesStderr(dest.path)) {
    standardError(process.stderr).report(text);
    return;
  }
  writeOrRefuse(output.fmt, dest.path, () => writeFileSync(dest.path, text));
}
