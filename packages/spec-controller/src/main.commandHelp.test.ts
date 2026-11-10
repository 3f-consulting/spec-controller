import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { balanceCommand, renderCommandHelp } from "./cliRegistry.js";
import { main } from "./main.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote } from "./programOutput.test-utils.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";

recordWhatTheProgramWrites();

const REQUESTS: { request: string; help: string }[] = [
  { request: "help by its long name", help: "--help" },
  { request: "help by its short name", help: "-h" },
];

describe("[CLM-CLI-006] balance --help lists balance's flags and exits 0", () => {
  describe.each(REQUESTS)("$request", ({ help }) => {
    it("answers balance's own help on stdout, reconciles nothing and sets no exit code", () => {
      const target = temporaryDirectory("spec-controller-command-help-");
      const features = join(target, "features");
      mkdirSync(features);

      main(["balance", "--features", features, "--target", target, help]);

      expect(whatTheProgramWrote()).toEqual({
        stdout: renderCommandHelp(balanceCommand) + "\n",
        stderr: "",
        exitCode: undefined,
      });
    });
  });
});
