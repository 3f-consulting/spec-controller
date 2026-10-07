import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const HOST_SCOPE = "spec-controller";

const givenTwice = (flag: string): string =>
  `${APP_MESSAGES[AppMessage.GivenTwice](flag, HOST_SCOPE)}\n${APP_MESSAGES[AppMessage.SeeFlags](HOST_SCOPE)}`;

describe("[SCN-CLI-064] a flag that does not repeat, given twice, is refused naming the flag, never read as its last value", () => {
  for (const modifier of cliRegistry.global.map((flag) => flag.name)) {
    it(`refuses ${modifier} given twice, equal values and all, naming it at the host's scope, and takes no command`, () => {
      expect(parseHostInvocation([modifier, "a", modifier, "a", "balance"])).toEqual({
        commandArgs: [],
        refusal: givenTwice(modifier),
      });
    });
  }

  it("refuses --store given twice with two values at the host's scope, reading neither", () => {
    expect(parseHostInvocation(["--store", "a", "--store", "b", "balance"])).toEqual({
      commandArgs: [],
      refusal: givenTwice("--store"),
    });
  });

  it("refuses --run-id given twice as two ids, after --store, at the host's scope", () => {
    expect(parseHostInvocation(["--store", "s", "--run-id", "r1", "--run-id", "r2", "balance"])).toEqual({
      commandArgs: [],
      refusal: givenTwice("--run-id"),
    });
  });

  it("takes each modifier given once, as before", () => {
    const inv = parseHostInvocation(["--store", "s", "--run-id", "r1", "balance", "--features", "f"]);
    expect(inv).toEqual({ store: "s", runId: "r1", command: "balance", commandArgs: ["--features", "f"] });
  });
});
