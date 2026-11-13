#!/usr/bin/env node
import { UNEXPECTED_ERROR } from "../runEnding/codes.js";
import { complainerTo, loadGuarded } from "../runEnding/crashGuards.js";
import { endRunOn, endRunUnlessEnded } from "../runEnding/exitCode.js";
import { writeToStandardError } from "../runEnding/standardError.js";
import { workingFolderOf } from "../runRequest/workingFolder.js";

// The guards are in place before the program loads, so an error while it loads, or one nothing catches, ends at 4 a run not yet ended.
const complain = complainerTo(writeToStandardError);
const guard = (error: unknown): void => {
  complain(error);
  endRunUnlessEnded(UNEXPECTED_ERROR);
};
process.on("uncaughtException", guard);
process.on("unhandledRejection", guard);

const program = await loadGuarded(
  async () => ({ ...(await import("./main.js")), ...(await import("../output/streams.js")) }),
  complain,
  endRunUnlessEnded,
);
if (program !== undefined) endRunOn(program.main(process.argv.slice(2), workingFolderOf(() => process.cwd(), process.env["PWD"]), program.processStreams, { complain }));
