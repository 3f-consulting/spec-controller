#!/usr/bin/env node
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { endRunOn, endRunUnlessEnded, UNEXPECTED_ERROR } from "../runEnding/exitCode.js";
import { writeToStandardError } from "../runEnding/standardError.js";

// The crash guards load under a catch of their own, since they cannot report their own failure to load. What that catch
// uses, the catalogue, the exit code and standard error, runs nothing as it loads.
const guards = await import("../runEnding/crashGuards.js")
  .then(({ complainerTo, loadGuarded }) => ({ complainerTo, loadGuarded }))
  .catch((error: unknown) => {
    writeToStandardError(`[unexpected-error] ${appCatalogue["unexpected-error"]}: ${String(error)}\n`);
    endRunOn(UNEXPECTED_ERROR);
    return undefined;
  });

if (guards !== undefined) {
  // The guards are in place before the program loads, so an error while it loads, or one nothing catches, ends at 4 a run not yet ended.
  const complain = guards.complainerTo(writeToStandardError);
  const guard = (error: unknown): void => {
    complain(error);
    endRunUnlessEnded(UNEXPECTED_ERROR);
  };
  process.on("uncaughtException", guard);
  process.on("unhandledRejection", guard);

  const program = await guards.loadGuarded(
    async () => ({ ...(await import("./main.js")), ...(await import("../output/streams.js")) }),
    complain,
    endRunUnlessEnded,
  );
  if (program !== undefined) endRunOn(program.main(process.argv.slice(2), process.cwd(), program.processStreams, { complain }));
}
