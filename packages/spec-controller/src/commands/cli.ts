#!/usr/bin/env node
import { noteText, refusalText } from "../output/allocateNotes.js";
import { writeToStandardOutput } from "../output/standardOutput.js";
import { endRunOnUsageError } from "../runEnding/exitCode.js";
import { writeToStandardError } from "../runEnding/standardError.js";
import { runRequestOf } from "../runRequest/runRequest.js";
import { allocate } from "./allocate.js";
import { balance } from "./balance.js";

const request = runRequestOf(process.argv.slice(2));
if (request.command === "balance") balance(request.inputs);
if (request.command === "allocate") {
  const outcome = allocate(request, process.cwd());
  if ("answer" in outcome) {
    writeToStandardOutput(`${outcome.answer}\n`);
    outcome.notes.forEach((note) => writeToStandardError(`${noteText(note)}\n`));
  } else {
    writeToStandardError(`${refusalText(outcome.refusal)}\n`);
    endRunOnUsageError();
  }
}
