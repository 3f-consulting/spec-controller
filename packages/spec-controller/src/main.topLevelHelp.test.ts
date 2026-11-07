import { readdirSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { cliRegistry, renderTopLevelHelp } from "./cliRegistry.js";
import { main } from "./main.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "./programOutput.test-utils.js";

interface Answered extends Written {
  storeEntries: string[];
}

recordWhatTheProgramWrites();

function inTemporaryStore(argvAt: (storeRoot: string) => string[]): Answered {
  const storeRoot = temporaryDirectory("main-top-level-help-");
  main(argvAt(storeRoot));
  return {
    ...whatTheProgramWrote(),
    storeEntries: readdirSync(storeRoot),
  };
}

const REQUESTS: { request: string; argvAt: (storeRoot: string) => string[] }[] = [
  { request: "nothing at all", argvAt: () => [] },
  { request: "the help command", argvAt: () => ["help"] },
  { request: "help by its long name", argvAt: () => ["--help"] },
  { request: "help by its short name", argvAt: () => ["-h"] },
  { request: "help by its long name after the store modifier", argvAt: (store) => ["--store", store, "--help"] },
  { request: "the help command after the store modifier", argvAt: (store) => ["--store", store, "help"] },
  { request: "help by its short name after the store modifier", argvAt: (store) => ["--store", store, "-h"] },
  { request: "help by its long name after the run-name modifier", argvAt: () => ["--run-id", "v", "--help"] },
  {
    request: "help by its long name after the store modifier and the run-name modifier",
    argvAt: (store) => ["--store", store, "--run-id", "v", "--help"],
  },
];

describe("[CLM-CLI-068] help after a modifier, or nothing given at all, still answers the top-level help", () => {
  let expected: string;

  beforeEach(() => {
    expected = renderTopLevelHelp(cliRegistry) + "\n";
  });

  describe.each(REQUESTS)("$request", ({ argvAt }) => {
    it("answers the top-level help on stdout", () => {
      expect(inTemporaryStore(argvAt).stdout).toBe(expected);
    });
  });
});
