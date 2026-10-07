import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const valueModifiers = cliRegistry.global.filter((flag) => flag.arg !== undefined);

const otherThan = (name: string): string =>
  valueModifiers.find((flag) => flag.name !== name)?.name ?? "";

const MISSING: Record<string, (modifier: string) => string[]> = {
  alone: (modifier) => [modifier],
  "followed by the other modifier": (modifier) => [modifier, otherThan(modifier), "r1", "balance"],
  "at the end, after the other modifier": (modifier) => [otherThan(modifier), "v", modifier],
  "with an empty value": (modifier) => [modifier, "", "balance"],
};

describe("[SCN-CLI-059] the host refuses a modifier given no value as a usage fault, and stores nothing", () => {
  it("reads its value modifiers from the registry, and finds --store and --run-id", () => {
    expect(valueModifiers.map((flag) => flag.name)).toEqual(["--store", "--run-id"]);
  });

  for (const flag of valueModifiers) {
    for (const [shape, argvOf] of Object.entries(MISSING)) {
      it(`refuses ${flag.name} ${shape} as a value missing at the host, before any command is taken`, () => {
        const inv = parseHostInvocation(argvOf(flag.name));
        expect(inv).toEqual({
          commandArgs: [],
          refusal:
            `${APP_MESSAGES[AppMessage.MissingValue](flag.name, "spec-controller", flag.arg ?? "")}\n` +
            APP_MESSAGES[AppMessage.SeeFlagsAndValues]("spec-controller"),
        });
      });
    }
  }

  it("takes a lone - as a modifier's value, never as a value missing", () => {
    const inv = parseHostInvocation(["--store", "-", "balance"]);
    expect(inv).toEqual({ store: "-", runId: undefined, command: "balance", commandArgs: [] });
  });

  it("takes a modifier given a value, as before", () => {
    const inv = parseHostInvocation(["--store", "/s", "--run-id", "r1", "balance", "--features", "f"]);
    expect(inv.refusal).toBeUndefined();
    expect(inv).toMatchObject({ store: "/s", runId: "r1", command: "balance" });
  });
});
