#!/usr/bin/env node
import { UNEXPECTED_ERROR } from "../runEnding/codes.js";
import { complainerTo, loadGuarded } from "../runEnding/crashGuards.js";
import { endRunOn } from "../runEnding/exitCode.js";
import { writeToStandardError } from "../runEnding/standardError.js";

// The guards are in place before the program loads, so an error while it loads, or one nothing catches, ends the run at 4.
const complain = complainerTo(writeToStandardError);
const guard = (error: unknown): void => {
  complain(error);
  endRunOn(UNEXPECTED_ERROR);
};
process.on("uncaughtException", guard);
process.on("unhandledRejection", guard);

const program = await loadGuarded(
  async () => ({ ...(await import("./main.js")), ...(await import("../output/streams.js")) }),
  complain,
  endRunOn,
);
// A working directory that does not exist cannot be read; the shell's record of it names where the run started.
function workingFolder(): string {
  try {
    return process.cwd();
  } catch {
    return process.env["PWD"] ?? "";
  }
}

if (program !== undefined) endRunOn(program.main(process.argv.slice(2), workingFolder(), program.processStreams, { complain }));
