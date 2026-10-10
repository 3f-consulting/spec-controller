import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const modifiers = cliRegistry.global.map((flag) => flag.name);

const noCommand = (given: readonly string[]): string =>
  `${APP_MESSAGES[AppMessage.NoCommandAfterModifiers](given.join(", "))}\n` +
  APP_MESSAGES[AppMessage.SeeCommandsAndModifiers]();

describe("[SCN-CLI-067] the host refuses a modifier with no command after it, naming it, and stores nothing", () => {

  for (const modifier of modifiers) {
    it(`refuses ${modifier} given its value and nothing after it, naming it, and takes no command`, () => {
      expect(parseHostInvocation([modifier, "x"])).toEqual({ commandArgs: [], refusal: noCommand([modifier]) });
    });
  }

  for (const order of [modifiers, [...modifiers].reverse()]) {
    it(`names every modifier given, in the order given, when ${order.join(" then ")} are given with nothing after them`, () => {
      expect(parseHostInvocation(order.flatMap((modifier) => [modifier, "v"]))).toEqual({
        commandArgs: [],
        refusal: noCommand(order),
      });
    });
  }

  it("does not refuse an empty invocation, which names no modifier and goes on to the top-level help", () => {
    expect(parseHostInvocation([])).toEqual({ commandArgs: [] });
  });

  it("still takes a modifier with a command after it", () => {
    const inv = parseHostInvocation(["--store", "/s", "--run-id", "r1", "balance"]);
    expect(inv.refusal).toBeUndefined();
    expect(inv).toMatchObject({ store: "/s", runId: "r1", command: "balance" });
  });

  it("leaves the command taken as a modifier's value refused as before, never as a missing command", () => {
    expect(parseHostInvocation(["--store", "balance"]).refusal).toMatch(/as its value/i);
  });
});
