import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";

const valueModifiers = cliRegistry.global.filter((flag) => flag.arg !== undefined).map((flag) => flag.name);

const MISSING: Record<string, (modifier: string) => string[]> = {
  alone: (modifier) => [modifier],
  "followed by the other modifier": (modifier) => [modifier, "--run-id", "r1", "balance"],
  "with an empty value": (modifier) => [modifier, "", "balance"],
};

describe("[SCN-CLI-059] the host refuses a modifier given no value as a usage fault, and stores nothing", () => {
  it("reads its value modifiers from the registry, and finds --store and --run-id", () => {
    expect(valueModifiers).toEqual(["--store", "--run-id"]);
  });

  for (const modifier of valueModifiers) {
    for (const [shape, argvOf] of Object.entries(MISSING)) {
      it(`refuses ${modifier} ${shape}, naming it, before any command is taken`, () => {
        const inv = parseHostInvocation(argvOf(modifier));
        expect(inv.refusal).toBeDefined();
        expect(inv.refusal).toContain(modifier);
        expect(inv.refusal).not.toMatch(/unknown command/i);
      });
    }
  }

  it("takes a modifier given a value, as before", () => {
    const inv = parseHostInvocation(["--store", "/s", "--run-id", "r1", "balance", "--features", "f"]);
    expect(inv.refusal).toBeUndefined();
    expect(inv).toMatchObject({ store: "/s", runId: "r1", command: "balance" });
  });
});
