import { describe, it, expect } from "vitest";
import { cliRegistry, type CliRegistry, type PositionalSpec } from "../cli-registry.js";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { readRequest } from "./request.js";

function usageErrorOf(argv: readonly string[], registry: CliRegistry = cliRegistry): string {
  const read = readRequest(argv, registry, "0.0.0-test");
  if (!("usageError" in read)) throw new Error(`read as a request for ${read.part}`);
  return read.usageError;
}

describe("[SCN-ALC-012] a request not in canon's form is refused as a usage error, never as an unknown part", () => {
  it.each([
    ["no part", [], /no feature part was given/],
    ["a lower-case part", ["fit"], /'fit' is not a feature part in canon's form/],
    ["a part one character long", ["F"], /'F' is not a feature part in canon's form/],
    ["a part longer than five", ["TOOLONG"], /'TOOLONG' is not a feature part in canon's form/],
    ["two parts", ["ONE", "TWO"], /'TWO'/],
    ["a flag the command does not take", ["ONE", "--bogus"], /--bogus/],
  ])("refuses %s as a usage error", (_name, argv, why) => {
    const error = usageErrorOf(argv);
    expect(error).toMatch(/^spec-controller allocate: usage error — /);
    expect(error).toMatch(why);
    expect(error).not.toMatch(/unknown part/);
  });

  const ALLOCATE_SCOPE = "spec-controller allocate";

  function extraArgument(token: string, takes: string): string {
    return (
      `spec-controller allocate: usage error — ${APP_MESSAGES[AppMessage.ExtraArgument](token, ALLOCATE_SCOPE, takes)}\n` +
      APP_MESSAGES[AppMessage.SeeArguments](ALLOCATE_SCOPE)
    );
  }

  function withAllocatePositional(positional: PositionalSpec): CliRegistry {
    return {
      ...cliRegistry,
      commands: cliRegistry.commands.map((command) =>
        command.name === "allocate" ? { ...command, positionals: [...(command.positionals ?? []), positional] } : command,
      ),
    };
  }

  it("refuses a second part by naming it and the part allocate takes, as the registry names it", () => {
    const allocatePositionals: readonly PositionalSpec[] = cliRegistry.commands.find((c) => c.name === "allocate")?.positionals ?? [];
    expect(allocatePositionals.map((positional) => positional.name)).toEqual(["<FFF>"]);
    expect(usageErrorOf(["ONE", "TWO"])).toBe(extraArgument("TWO", "<FFF>"));
  });

  it("lists every part allocate takes, in order and space-separated, once it takes more than one", () => {
    const grown = withAllocatePositional({ name: "<NNN>", description: "added later" });
    expect(usageErrorOf(["ONE", "007", "EXTRA"], grown)).toBe(extraArgument("EXTRA", "<FFF> <NNN>"));
  });

  it("reads --new before or after the part, never as the part's value", () => {
    expect(readRequest(["--new", "ZZ"], cliRegistry, "0.0.0-test")).toEqual({ part: "ZZ", isNew: true });
    expect(readRequest(["ZZ", "--new"], cliRegistry, "0.0.0-test")).toEqual({ part: "ZZ", isNew: true });
  });
});
