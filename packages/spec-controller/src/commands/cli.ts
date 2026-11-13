#!/usr/bin/env node
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UNEXPECTED_ERROR } from "../runEnding/codes.js";
import { complainerTo, loadGuarded } from "../runEnding/crashGuards.js";
import { endRunOn, endRunUnlessEnded } from "../runEnding/exitCode.js";
import { writeToStandardError } from "../runEnding/standardError.js";

// The guards are in place before the program loads, so an error while it loads, or one nothing catches, ends the run at 4.
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
  endRunOn,
);
// A working directory that does not exist cannot be read. The shell's record names it only while that folder does not
// exist either; otherwise the run is given a folder that does not exist, so no other folder is read in its place.
function workingFolder(): string {
  try {
    return process.cwd();
  } catch {
    const recorded = process.env["PWD"];
    return recorded !== undefined && recorded !== "" && !existsSync(recorded) ? recorded : join(tmpdir(), `spec-controller-no-working-directory-${process.pid}`);
  }
}

if (program !== undefined) endRunOn(program.main(process.argv.slice(2), workingFolder(), program.processStreams, { complain }));
