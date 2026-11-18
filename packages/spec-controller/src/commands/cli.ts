#!/usr/bin/env node

import appCatalogue from "../messages/messages.en.json" with { type: "json" };

// What reports an unexpected error and ends the run on it, loaded before the program and before anything that runs code as it
// loads.
async function guardsLoaded() {
  const [{ UNEXPECTED_ERROR }, { complainerTo, loadGuarded }, { endRunOn, endRunUnlessEnded }, { writeToStandardError }] = await Promise.all([
    import("../runEnding/codes.js"),
    import("../runEnding/crashGuards.js"),
    import("../runEnding/exitCode.js"),
    import("../runEnding/standardError.js"),
  ]);
  return { UNEXPECTED_ERROR, complainerTo, loadGuarded, endRunOn, endRunUnlessEnded, writeToStandardError };
}

// What reports an unexpected error cannot report its own failure to load, so the bin writes the complaint and its exit code
// itself, from the catalogue, which is data and runs nothing as it loads.
const guards = await guardsLoaded().catch((error: unknown) => {
  process.stderr.write(`[unexpected-error] ${appCatalogue["unexpected-error"]}: ${String(error)}\n`);
  process.exitCode = 4;
  return undefined;
});

if (guards !== undefined) {
  const { UNEXPECTED_ERROR, complainerTo, loadGuarded, endRunOn, endRunUnlessEnded, writeToStandardError } = guards;
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
  if (program !== undefined) endRunOn(program.main(process.argv.slice(2), process.cwd(), program.processStreams, { complain }));
}
