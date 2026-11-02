import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cliRegistry.js";
import { valueFlagsOf } from "./cliArgs.js";
import { parseHostInvocation, modifiersNotTakenRefusal } from "./host.js";

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

const NO_HELP = [["ONE"], ["ONE", "--new"], ["--bogus"], []];

const refused = prefixes.flatMap((prefix) =>
  commandsTakingNone.flatMap((command) => NO_HELP.map((args) => [...prefix, command, ...args])),
);

describe("[SCN-ALC-016] a host modifier before allocate does not stop a request for allocate's help, which answers as it does alone, at exit 0, and stores nothing", () => {

  it.each(refused.map((argv) => [argv]))("still refuses %j, which asks for no help", (argv) => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(argv))).toBeDefined();
  });
});
