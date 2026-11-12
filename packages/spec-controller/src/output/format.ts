import type { OutputRefusal, PlannedOutput } from "@3f-consulting/spec-controller-core";
import { AppError, AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { refusal, type Refusal } from "../runEnding/refusal.js";

export type OutputFormat = "md" | "json";

// The formats the tool renders a report in.
export const WRITTEN_FORMATS: readonly OutputFormat[] = ["md", "json"];

// The refusal of a plan, worded in the app's catalogue under its error code.
export function outputRefusal(refused: OutputRefusal<OutputFormat>): Refusal {
  switch (refused.kind) {
    case "unknown-format":
      return refusal(AppError.UnknownFormat, { formats: refused.formats.join(", "), supported: refused.written.join(", ") });
    case "more-than-one-to-standard-output":
      return refusal(AppError.MoreThanOneToStdout, { formats: refused.formats.join(", ") });
    case "outputs-share-a-file":
      return refusal(AppError.OutputsShareFile, { first: asGiven(refused.first), second: asGiven(refused.second) });
    case "output-overwrites-an-input":
      return refusal(AppError.OutputOverwritesInput, { output: asGiven(refused.output), subject: refused.input.subject, path: refused.input.path });
  }
}

function asGiven(output: PlannedOutput<OutputFormat>): string {
  return output.dest.kind === "stdout" ? message(AppMessage.FormatOnStandardOutput, { fmt: output.fmt }) : `${output.fmt}:${output.dest.path}`;
}
