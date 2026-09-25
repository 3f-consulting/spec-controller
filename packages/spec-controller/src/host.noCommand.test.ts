/**
 * The @unit arm of @SCN-CLI-067 — a host modifier with no command after it is refused before any
 * command or stored run starts, naming every modifier given (3F-3686). It used to answer the
 * top-level help at exit 0, reconciling nothing: a false green for a CI step that lost its command
 * word. The @e2e arm in tests/steps/cliBalance.steps.ts proves it through the real binary, and that
 * nothing is written.
 *
 * The modifiers are read from the registry's global scope, never listed, and the wording is never
 * pinned (features/message-catalogue.feature): one line names every modifier given and says no
 * command followed, and the refusal is none of its neighbours'.
 */

import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

const modifiers = cliRegistry.global.map((flag) => flag.name);

/** The neighbouring host refusals: an unknown command, a flag out of place, a command taken as a value, a missing value. */
const NEIGHBOUR_REFUSAL = /unknown command|before the command|as its value|needs a value/i;

/** True when one line of the refusal names every modifier given and says no command followed them. */
function namesEvery(refusal: string | undefined, given: readonly string[]): boolean {
  return (refusal ?? "")
    .split("\n")
    .some((line) => given.every((modifier) => line.includes(modifier)) && /no command/i.test(line));
}

describe("[SCN-CLI-067] the host refuses a modifier with no command after it, naming it, and stores nothing", () => {
  it("reads its modifiers from the registry, and finds --store and --run-id", () => {
    expect(modifiers).toEqual(["--store", "--run-id"]);
  });

  for (const modifier of modifiers) {
    it(`refuses ${modifier} given its value and nothing after it, naming it`, () => {
      const inv = parseHostInvocation([modifier, "v"]);
      expect(namesEvery(inv.refusal, [modifier])).toBe(true);
      expect(inv.refusal).not.toMatch(NEIGHBOUR_REFUSAL);
      expect(inv.command).toBeUndefined();
      expect(inv.store).toBeUndefined();
    });
  }

  for (const order of [modifiers, [...modifiers].reverse()]) {
    it(`names every modifier given, in one line, when ${order.join(" then ")} are given with nothing after them`, () => {
      const inv = parseHostInvocation(order.flatMap((modifier) => [modifier, "v"]));
      expect(namesEvery(inv.refusal, order)).toBe(true);
      expect(inv.refusal).not.toMatch(NEIGHBOUR_REFUSAL);
    });
  }

  it("still takes a modifier with a command after it", () => {
    const inv = parseHostInvocation(["--store", "/s", "--run-id", "r1", "balance"]);
    expect(inv.refusal).toBeUndefined();
    expect(inv).toMatchObject({ store: "/s", runId: "r1", command: "balance" });
  });

  // A4, pinned while still wrong (operator, 2026-09-25). The command-as-value line that decides these
  // (host.ts, 3F-3672) is filed as a fault of its own — `--store balance --help` should answer help —
  // and is not fixed here; neither case may move in passing.
  it("leaves the command taken as a modifier's value refused as before, never as a missing command", () => {
    for (const argv of [["--store", "balance"], ["--store", "balance", "--help"]]) {
      // "as its value" is the command-as-value refusal's meaning; the missing-command refusal never says it.
      expect(parseHostInvocation(argv).refusal).toMatch(/as its value/i);
    }
  });

  it("leaves a command name followed by the bare help word read as the value, then help", () => {
    const inv = parseHostInvocation(["--store", "balance", "help"]);
    expect(inv.refusal).toBeUndefined();
    expect(inv).toMatchObject({ store: "balance", command: "help" });
  });
});
