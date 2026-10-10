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
});
