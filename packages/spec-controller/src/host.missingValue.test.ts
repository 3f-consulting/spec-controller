import { beforeEach, describe, it, expect } from "vitest";
import { cliRegistry, type FlagSpec } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

let valueModifiers: FlagSpec[];

beforeEach(() => {
  valueModifiers = cliRegistry.global.filter((flag) => flag.arg !== undefined);
});

const otherThan = (name: string): string =>
  valueModifiers.find((flag) => flag.name !== name)?.name ?? "";

const followedByTheOther = (modifier: string): string[] => [modifier, otherThan(modifier), "r1", "balance"];
const atTheEndAfterTheOther = (modifier: string): string[] => [otherThan(modifier), "v", modifier];

const MISSING: [string, (modifier: string) => string[]][] = [
  ["alone", (modifier) => [modifier]],
  ["followed by the other modifier", followedByTheOther],
  ["at the end, after the other modifier", atTheEndAfterTheOther],
  ["with an empty value", (modifier) => [modifier, "", "balance"]],
];

describe("[SCN-CLI-059] the host refuses a modifier given no value as a usage fault, and stores nothing", () => {
  it("reads its value modifiers from the registry, and finds --store and --run-id", () => {
    expect(valueModifiers.map((flag) => flag.name)).toEqual(["--store", "--run-id"]);
  });

  for (const flag of cliRegistry.global) {
    if (flag.arg === undefined) continue;
    for (const [shape, argvOf] of MISSING) {
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
