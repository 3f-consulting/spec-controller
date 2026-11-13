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
import { pathIdentity, streamIdentity } from "./identity.js";
import type { StandardStream, StandardStreams } from "./streams.js";
import { refusalText } from "./allocateNotes.js";
import { whyUnwritable } from "./writable.js";
import { exitCodeOf, USAGE_ERROR } from "../runEnding/exitCode.js";
import type { ExitCode, Refusal } from "../runEnding/runEnding.js";

export type ReportedReconciliation = Pick<EvidenceReconciliation, "runVerdict" | "provenance" | "stepAccount" | "errorsInTheInputs">;

const reportIn = (format: string, reconciliation: ReportedReconciliation): string =>
  format === "json" ? jsonReportOf(reconciliation) : markdownReportOf(reconciliation);

// Where a report goes, probed once: the standard stream it names, by request or by its path, as that stream stands,
// redirected into a file or not; otherwise the place its path names.
interface Placed {
  readonly output: OutputRequest<string>;
  readonly identity: FileIdentity;
  readonly stream?: StandardStream;
}

function placed(output: OutputRequest<string>, streams: StandardStreams): Placed {
  const { destination } = output;
  const named = destination.to === "file" ? pathIdentity(destination.path) : { is: destination.to };
  if (named.is === "standard-output") return { output, identity: streamIdentity(streams.output.fd, "standard-output"), stream: streams.output };
  if (named.is === "standard-error") return { output, identity: streamIdentity(streams.error.fd, "standard-error"), stream: streams.error };
  return { output, identity: named };
}

// The first file a report cannot be written to, with why.
function unwritableRefusal(outputs: readonly Placed[]): Refusal | undefined {
  for (const { output, stream } of outputs) {
    if (stream !== undefined || output.destination.to !== "file") continue;
    const why = whyUnwritable(output.destination.path);
    if (why !== undefined) return { key: "report-not-written", values: { place: output.destination.path, why: textFor(appCatalogue, why) } };
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
  reconciliation: ReportedReconciliation,
  streams: StandardStreams,
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
  outputsPlaced.forEach(({ output: { format, destination }, stream }) => {
    const report = reportIn(format, reconciliation);
    if (stream !== undefined) stream.write(report);
    else if (destination.to === "file") writeFileSync(destination.path, report);
  });
  return exitCodeOf(reconciliation.runVerdict);
}
