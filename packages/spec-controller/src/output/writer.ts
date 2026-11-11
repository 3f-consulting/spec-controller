import { unlinkSync, writeFileSync } from "node:fs";
import {
  renderJson,
  renderMarkdown,
  type EvidenceReconciliation,
  type IdentifiedOutput,
  type LocatedOutput,
  type PlannedOutput,
  type RequestedOutput,
} from "@3f-consulting/spec-controller-core";
import type { OutputFormat } from "./format.js";
import {
  namesStderr,
  namesStdout,
  probeDestination,
  stderrIdentity,
  stdoutIdentity,
  unwritableRefusal,
  type RegularFileIdentity,
} from "./outputLocation.js";
import { standardError } from "../runEnding/standardError.js";
import type { Refusal } from "../runEnding/refusal.js";

type Planned = PlannedOutput<OutputFormat>;

// Each requested report, with whether the file it names is standard output, following any links.
export function locatedOutputs(requested: readonly RequestedOutput[]): LocatedOutput[] {
  return requested.map((output) => ({ ...output, namesStandardOutput: output.dest.kind === "file" && namesStdout(output.dest.path) }));
}

export interface RenderedReport {
  readonly output: Planned;
  readonly text: string;
}

export function renderedReports(outputs: readonly Planned[], evidenceReconciliation: EvidenceReconciliation): RenderedReport[] {
  return outputs.map((output) => ({ output, text: render(output.fmt, evidenceReconciliation) }));
}

function render(fmt: OutputFormat, evidenceReconciliation: EvidenceReconciliation): string {
  return fmt === "json" ? renderJson(evidenceReconciliation) : renderMarkdown(evidenceReconciliation);
}

export type ProbedOutputs = { readonly identified: readonly IdentifiedOutput<OutputFormat>[] } | { readonly refusal: Refusal };

// Each planned report's destination, probed for the file it would write: the first that cannot be written refuses them
// all. A file made only to probe it is removed again.
export function probedOutputs(outputs: readonly Planned[]): ProbedOutputs {
  const created: string[] = [];
  try {
    const identified: IdentifiedOutput<OutputFormat>[] = [];
    for (const output of outputs) {
      const probe = identify(output, created);
      if ("refusal" in probe) return probe;
      identified.push({ output, identity: probe.identity, toStandardError: output.dest.kind === "file" && namesStderr(output.dest.path) });
    }
    return { identified };
  } finally {
    for (const path of created) unlinkSync(path);
  }
}

type Probe = { readonly identity: RegularFileIdentity | undefined } | { readonly refusal: Refusal };

function identify(output: Planned, created: string[]): Probe {
  const dest = output.dest;
  if (dest.kind === "stdout") return { identity: stdoutIdentity() };
  if (namesStderr(dest.path)) return { identity: undefined };
  try {
    const probed = probeDestination(dest.path);
    if (probed.created !== undefined) created.push(probed.created);
    return { identity: probed.identity };
  } catch (err) {
    return { refusal: unwritableRefusal(output.fmt, dest.path, err) };
  }
}

export function writeRenderedReports(reports: readonly RenderedReport[]): void {
  for (const { output, text } of reports) emit(output, text);
}

function emit(output: Planned, text: string): void {
  const dest = output.dest;
  if (dest.kind === "stdout") {
    process.stdout.write(text);
    return;
  }
  if (namesStderr(dest.path)) {
    standardError(process.stderr).report(text);
    return;
  }
  writeFileSync(dest.path, text);
}
