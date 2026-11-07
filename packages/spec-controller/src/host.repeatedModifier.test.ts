import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cliRegistry.js";
import { parseHostInvocation } from "./host.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { withShownRefusal } from "./shownText.test-utils.js";

const HOST_SCOPE = "spec-controller";

const givenTwice = (flag: string): string =>
  `${message(AppError.GivenTwice, { flag, scope: HOST_SCOPE })}\n${message(AppMessage.SeeFlags, { scope: HOST_SCOPE })}`;

describe("[CLM-CLI-064] a flag that does not repeat, given twice, is refused naming the flag, never read as its last value", () => {
  for (const { name: modifier } of cliRegistry.global) {
    it(`refuses ${modifier} given twice, equal values and all, naming it at the host's scope, and takes no command`, () => {
      expect(withShownRefusal(parseHostInvocation([modifier, "a", modifier, "a", "balance"]))).toEqual({
        commandArgs: [],
        refusal: givenTwice(modifier),
      });
    });
  }

  it("refuses --run-id given twice as two ids, after --store, at the host's scope", () => {
    expect(withShownRefusal(parseHostInvocation(["--store", "s", "--run-id", "r1", "--run-id", "r2", "balance"]))).toEqual({
      commandArgs: [],
      refusal: givenTwice("--run-id"),
    });
  });

  it("takes each modifier given once, as before", () => {
    const inv = withShownRefusal(parseHostInvocation(["--store", "s", "--run-id", "r1", "balance", "--features", "f"]));
    expect(inv).toEqual({ store: "s", runId: "r1", command: "balance", commandArgs: ["--features", "f"] });
  });
});
