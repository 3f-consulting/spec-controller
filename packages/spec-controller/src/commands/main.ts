import { inputsReadFor } from "../inputs/inputsRead.js";
import { noteText } from "../output/allocateNotes.js";
import type { StandardStreams } from "../output/streams.js";
import { UNEXPECTED_ERROR, USAGE_ERROR } from "../runEnding/exitCode.js";
import { complainerTo, type Complain } from "../runEnding/crashGuards.js";
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

// What main runs, and how it complains of an unexpected error: given by the bin, and by a test that needs one to fail.
export interface MainRuns {
  readonly balance: typeof balance;
  readonly allocate: typeof allocate;
  readonly complain: Complain;
}

// Help and an answer go to standard output; a note, a refusal and an unexpected error go to standard error.
function run(args: readonly string[], folder: string, streams: StandardStreams, runs: MainRuns): ExitCode {
  const request = runRequestOf(args);
  if ("ending" in request) return refusedWith(request.refusals, streams);
  if (request.command === "help") {
    streams.output.write(helpText(request.about));
    return 0;
  }
  if (request.command === "balance") {
    const read = inputsReadFor(request.inputs, folder);
    return "ending" in read ? refusedWith(read.refusals, streams) : runs.balance(request, read, folder, streams);
  }
  const outcome = runs.allocate(request, folder);
  if (!("answer" in outcome)) return refusedWith([outcome.refusal], streams);
  streams.output.write(`${outcome.answer}\n`);
  outcome.notes.forEach((note) => streams.error.write(`${noteText(note)}\n`));
  return 0;
}

export function main(args: readonly string[], folder: string, streams: StandardStreams, runs: Partial<MainRuns> = {}): ExitCode {
  const runsWith: MainRuns = { balance, allocate, complain: complainerTo((text) => streams.error.write(text)), ...runs };
  try {
    return run(args, folder, streams, runsWith);
  } catch (error) {
    runsWith.complain(error);
    return UNEXPECTED_ERROR;
  }
}
