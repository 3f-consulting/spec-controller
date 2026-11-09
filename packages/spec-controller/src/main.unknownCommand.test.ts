import { describe, expect, it } from "vitest";
import { main } from "./main.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "./programOutput.test-utils.js";

recordWhatTheProgramWrites();

function answer(argv: string[]): Written {
  main(argv);
  return whatTheProgramWrote();
}

const askTypo = (): Written => answer(["blance"]);
const askNoCommand = (): Written => answer(["nosuchcommand"]);

const REQUESTS: { request: string; command: string; ask: () => Written }[] = [
  { request: "a typo of a command", command: "blance", ask: askTypo },
  { request: "a name that is no command", command: "nosuchcommand", ask: askNoCommand },
];

describe("[CLM-CLI-056] an unknown command is a usage fault", () => {
  describe.each(REQUESTS)("$request", ({ ask }) => {
    it("writes nothing to stdout", () => {
      expect(ask().stdout).toBe("");
    });
  });
});
