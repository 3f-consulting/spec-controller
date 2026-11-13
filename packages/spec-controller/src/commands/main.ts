import { textFor } from "@3f-consulting/spec-controller-core";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { noteText, refusalText } from "../output/allocateNotes.js";
import type { StandardStreams } from "../output/streams.js";
import { UNEXPECTED_ERROR, USAGE_ERROR } from "../runEnding/exitCode.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { runRequestOf } from "../runRequest/runRequest.js";
import { allocate } from "./allocate.js";
import { balance } from "./balance.js";

// An answer goes to standard output; a note, a refusal and an unexpected error go to standard error.
function run(args: readonly string[], folder: string, streams: StandardStreams): ExitCode {
  const request = runRequestOf(args);
  if (request.command === "balance") return balance(request, folder, streams);
  if (request.command !== "allocate") return 0;
  const outcome = allocate(request, folder);
  if (!("answer" in outcome)) {
    streams.error.write(`${refusalText(outcome.refusal)}\n`);
    return USAGE_ERROR;
  }
  streams.output.write(`${outcome.answer}\n`);
  outcome.notes.forEach((note) => streams.error.write(`${noteText(note)}\n`));
  return 0;
}

export function main(args: readonly string[], folder: string, streams: StandardStreams): ExitCode {
  try {
    return run(args, folder, streams);
  } catch (error) {
    streams.error.write(`${textFor(appCatalogue, "unexpected-error")}: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}\n`);
    return UNEXPECTED_ERROR;
  }
}
