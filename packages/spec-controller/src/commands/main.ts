import { textFor } from "@3f-consulting/spec-controller-core";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { inputsReadFor } from "../inputs/inputsRead.js";
import { noteText } from "../output/allocateNotes.js";
import type { StandardStreams } from "../output/streams.js";
import { UNEXPECTED_ERROR, USAGE_ERROR } from "../runEnding/exitCode.js";
import { refusalText } from "../runEnding/refusal.js";
import type { ExitCode, Refusal } from "../runEnding/runEnding.js";
import { helpText } from "../runRequest/help.js";
import { runRequestOf } from "../runRequest/runRequest.js";
import { allocate } from "./allocate.js";
import { balance } from "./balance.js";

function refusedWith(refusals: readonly Refusal[], streams: StandardStreams): ExitCode {
  refusals.forEach((refusal) => streams.error.write(`${refusalText(refusal)}\n`));
  return USAGE_ERROR;
}

// Help and an answer go to standard output; a note, a refusal and an unexpected error go to standard error.
function run(args: readonly string[], folder: string, streams: StandardStreams): ExitCode {
  const request = runRequestOf(args);
  if ("ending" in request) return refusedWith(request.refusals, streams);
  if (request.command === "help") {
    streams.output.write(helpText(request.about));
    return 0;
  }
  if (request.command === "balance") {
    const read = inputsReadFor(request.inputs, folder);
    return "ending" in read ? refusedWith(read.refusals, streams) : balance(request, read, folder, streams);
  }
  const outcome = allocate(request, folder);
  if (!("answer" in outcome)) return refusedWith([outcome.refusal], streams);
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
