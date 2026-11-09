import { describe, expect, it } from "vitest";
import { cliRegistry, renderTopLevelHelp } from "./cliRegistry.js";
import { main } from "./main.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote } from "./programOutput.test-utils.js";

recordWhatTheProgramWrites();

const REQUESTS: { request: string; argv: string[] }[] = [
  { request: "nothing at all", argv: [] },
  { request: "the help command", argv: ["help"] },
  { request: "help by its long name", argv: ["--help"] },
  { request: "help by its short name", argv: ["-h"] },
];

describe("[CLM-CLI-068] nothing given at all answers the top-level help", () => {
  describe.each(REQUESTS)("$request", ({ argv }) => {
    it("answers the top-level help on stdout", () => {
      main(argv);
      expect(whatTheProgramWrote().stdout).toBe(renderTopLevelHelp(cliRegistry) + "\n");
    });
  });
});
