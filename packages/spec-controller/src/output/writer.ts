import {
  jsonReportOf,
  markdownReportOf,
  outputPlanOf,
  textFor,
  type EvidenceReconciliation,
  type FileIdentity,
  type OutputRefusal,
  type OutputRequest,
} from "@3f-consulting/spec-controller-core";
import { writeFileSync } from "node:fs";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { pathIdentity, streamIdentity, type NamedStream } from "./identity.js";
import type { StandardStreams } from "./streams.js";
import { refusalText } from "../runEnding/refusal.js";
import { whyUnwritable } from "./writable.js";
import { exitCodeOf, USAGE_ERROR } from "../runEnding/exitCode.js";
import type { ExitCode, Refusal } from "../runEnding/runEnding.js";

const reportIn = (format: string, reconciliation: EvidenceReconciliation): string =>
  format === "json" ? jsonReportOf(reconciliation) : markdownReportOf(reconciliation);

// Where a report goes, probed once: the standard stream it names, by request or by its path, as that stream stands,
// redirected into a file or not; otherwise the file its path names, which is checked before anything is written.
interface Placed {
  readonly output: OutputRequest<string>;
  readonly identity: FileIdentity;
  readonly file?: string;
  readonly write: (report: string) => void;
}

function onStream(output: OutputRequest<string>, named: NamedStream, streams: StandardStreams): Placed {
  const stream = named.is === "standard-output" ? streams.output : streams.error;
  return { output, identity: streamIdentity(stream.fd, named), write: stream.write };
}

function placed(output: OutputRequest<string>, streams: StandardStreams): Placed {
  const { destination } = output;
  if (destination.to !== "file") return onStream(output, { is: destination.to }, streams);
  const named = pathIdentity(destination.path);
  if (named.is === "standard-output" || named.is === "standard-error") return onStream(output, named, streams);
  return { output, identity: named, file: destination.path, write: (report) => writeFileSync(destination.path, report) };
}

// The first file a report cannot be written to, with why.
function unwritableRefusal(outputs: readonly Placed[]): Refusal | undefined {
  for (const { file } of outputs) {
    if (file === undefined) continue;
    const why = whyUnwritable(file);
    if (why !== undefined) return { key: "report-not-written", values: { place: file, why: textFor(appCatalogue, why) } };
  }
  return undefined;
}

// A report as its --format asked for it.
const asGiven = ({ format, destination }: OutputRequest<string>): string => (destination.to === "file" ? `${format}:${destination.path}` : format);

// Each refusal names what it is about: the reports as asked for, which name any file they share, or the file the run reads.
function planRefusal(refusal: OutputRefusal<string>): Refusal {
  if (refusal.kind === "more-than-one-to-standard-output") return { key: "more-than-one-to-stdout", values: { reports: refusal.outputs.map(asGiven).join(", ") } };
  if (refusal.kind === "outputs-share-a-file")
    return { key: "outputs-share-file", values: { reports: [refusal.first, refusal.second].map(asGiven).join(", ") } };
  return { key: "output-overwrites-input", values: { file: refusal.input.path } };
}

export function writeReports(
  outputs: readonly OutputRequest<string>[],
  inputsRead: readonly string[],
  reconciliation: EvidenceReconciliation,
  streams: StandardStreams,
  under: { readonly exitZero: boolean },
): ExitCode {
  const outputsPlaced = outputs.map((output) => placed(output, streams));
  const plan = outputPlanOf(
    outputsPlaced,
    inputsRead.map((path) => ({ name: path, path, identity: pathIdentity(path) })),
  );
  const refusal = plan.ok ? unwritableRefusal(outputsPlaced) : planRefusal(plan.refusal);
  if (refusal !== undefined) {
    streams.error.write(`${refusalText(refusal)}\n`);
    return USAGE_ERROR;
  }
  outputsPlaced.forEach(({ output, write }) => write(reportIn(output.format, reconciliation)));
  return exitCodeOf(reconciliation.runVerdict, under);
}
