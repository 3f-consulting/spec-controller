import { noteText } from "../output/allocateNotes.js";
import type { StandardStreams } from "../output/streams.js";
import { UNEXPECTED_ERROR } from "../runEnding/exitCode.js";
import { complainerTo, type Complain } from "../runEnding/crashGuards.js";
import { refusedWith } from "../runEnding/refusal.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { helpText } from "../runRequest/help.js";
import { runRequestOf } from "../runRequest/runRequest.js";
import { allocate } from "./allocate.js";
import { balance } from "./balance.js";


// What main runs, and how it complains of an unexpected error: given by the bin, and by a test that needs one to fail.
export interface MainRuns {
  readonly balance: typeof balance;
  readonly complain: Complain;
}

// Help and an answer go to standard output; a note, a refusal with the help that follows it, and an unexpected error go
// to standard error.
function run(args: readonly string[], folder: string, streams: StandardStreams, runs: MainRuns): ExitCode {
  const request = runRequestOf(args);
  if ("refusals" in request) {
    const exitCode = refusedWith(request.refusals, streams.error.write);
    streams.error.write(helpText(request.about));
    return exitCode;
  }
  if (request.command === "help") {
    streams.output.write(helpText(request.about));
    return 0;
  }
  if (request.command === "balance") return runs.balance(request, folder, streams, runs.complain);
  const outcome = allocate(request, folder);
  if (!("answer" in outcome)) return refusedWith([outcome.refusal], streams.error.write);
  streams.output.write(`${outcome.answer}\n`);
  outcome.notes.forEach((note) => streams.error.write(`${noteText(note)}\n`));
  return 0;
}

export function main(args: readonly string[], folder: string, streams: StandardStreams, runs: Partial<MainRuns> = {}): ExitCode {
  const runsWith: MainRuns = { balance, complain: complainerTo((text) => streams.error.write(text)), ...runs };
  try {
    return run(args, folder, streams, runsWith);
  } catch (error) {
    runsWith.complain(error);
    return UNEXPECTED_ERROR;
  }
}
