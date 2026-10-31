import { describe, expect, it } from "vitest";
import { main } from "./main.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "./programOutput.test-utils.js";

recordWhatTheProgramWrites();

function answer(argv: string[]): Written {
  main(argv);
  return whatTheProgramWrote();
}

function inTemporaryStore(run: (storeRoot: string) => Written): Written {
  const storeRoot = temporaryDirectory("main-unknown-command-");
  return run(storeRoot);
}

const askTypo = (): Written => answer(["blance"]);
const askNoCommand = (): Written => answer(["nosuchcommand"]);
const askNoCommandStored = (): Written => inTemporaryStore((storeRoot) => answer(["--store", storeRoot, "nosuchcommand"]));

const REQUESTS: { request: string; command: string; ask: () => Written }[] = [
  { request: "a typo of a command", command: "blance", ask: askTypo },
  { request: "a name that is no command", command: "nosuchcommand", ask: askNoCommand },
  {
    request: "a name that is no command, as a stored run",
    command: "nosuchcommand",
    ask: askNoCommandStored,
  },
];

describe("[SCN-CLI-056] an unknown command is a usage fault", () => {
  describe.each(REQUESTS)("$request", ({ ask }) => {
    it("writes nothing to stdout", () => {
      expect(ask().stdout).toBe("");
    });
  });
});
