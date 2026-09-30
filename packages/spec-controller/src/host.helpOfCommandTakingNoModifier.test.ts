import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { valueFlagsOf } from "./cli-args.js";
import { parseHostInvocation, modifiersNotTakenRefusal } from "./host.js";
import { dispatchesUnstored } from "./storedRun.js";

const HELP = ["--help", "-h"];
const modifiers = [...new Set([...valueFlagsOf(cliRegistry.global).values()].map((flag) => flag.name))];
const commandsTakingNone = cliRegistry.commands
  .filter((command) => command.acceptsHostModifiers === false)
  .map((command) => command.name);

function modifierPrefixes(names: readonly string[]): string[][] {
  if (names.length === 0) return [];
  return names.flatMap((name) => {
    const rest = names.filter((other) => other !== name);
    return [[name], ...modifierPrefixes(rest).map((tail) => [name, ...tail])];
  });
}

const prefixes = modifierPrefixes(modifiers).map((names) => names.flatMap((name) => [name, "value"]));

function helpRequests(help: string): string[][] {
  return [[help], ["ONE", help], [help, "ONE"], ["fit", help], ["--bogus", help]];
}

const NO_HELP = [["ONE"], ["ONE", "--new"], ["--bogus"], []];

const answered = prefixes.flatMap((prefix) =>
  commandsTakingNone.flatMap((command) =>
    HELP.flatMap((help) => helpRequests(help).map((args) => [...prefix, command, ...args])),
  ),
);
const refused = prefixes.flatMap((prefix) =>
  commandsTakingNone.flatMap((command) => NO_HELP.map((args) => [...prefix, command, ...args])),
);

describe("[SCN-ALC-016] a host modifier before allocate does not stop a request for allocate's help, which answers as it does alone, at exit 0, and stores nothing", () => {
  it("reads the modifiers and the commands that take none from the registry", () => {
    expect(modifiers).toEqual(["--store", "--run-id"]);
    expect(commandsTakingNone).toContain("allocate");
    expect(answered.length).toBeGreaterThanOrEqual(40);
    expect(refused.length).toBeGreaterThanOrEqual(16);
  });

  it.each(answered.map((argv) => [argv]))("hands %j to the command, unrefused and unstored", (argv) => {
    const inv = parseHostInvocation(argv);
    expect(inv.refusal).toBeUndefined();
    expect(commandsTakingNone).toContain(inv.command);
    expect(modifiersNotTakenRefusal(inv)).toBeUndefined();
    expect(dispatchesUnstored(inv)).toBe(true);
  });

  it.each(refused.map((argv) => [argv]))("still refuses %j, which asks for no help", (argv) => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(argv))).toBeDefined();
  });
});
