import { describe, it, expect } from "vitest";
import { cliRegistry, type CliRegistry, type PositionalSpec } from "../cliRegistry.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { readRequest } from "./request.js";
import { errorText } from "../standardError.js";
import { withAllocatePositional } from "./registry.test-utils.js";

function usageErrorOf(argv: readonly string[], registry: CliRegistry = cliRegistry): string {
  const read = readRequest(argv, registry, "0.0.0-test");
  if (!("usageError" in read)) throw new Error(`read as a request for ${read.part}`);
  return errorText(read.usageError, "allocate");
}

describe("[SCN-ALC-012] a request not in the scenario-code form is refused as a usage error, never as an unknown part", () => {
  it.each([
    ["no part", [], /no feature part was given/],
    ["a lower-case part", ["fit"], /'fit' is not a feature part: two to five characters/],
    ["a part one character long", ["F"], /'F' is not a feature part: two to five characters/],
    ["a part longer than five", ["TOOLONG"], /'TOOLONG' is not a feature part: two to five characters/],
    ["two parts", ["ONE", "TWO"], /'TWO'/],
    ["a flag the command does not take", ["ONE", "--bogus"], /--bogus/],
  ])("refuses %s as a usage error", (_name, argv, why) => {
    const error = usageErrorOf(argv);
    expect(error).toMatch(/^spec-controller allocate: usage error \[[a-z-]+\] — /);
    expect(error).toMatch(why);
    expect(error).not.toMatch(/unknown part/);
  });

  const ALLOCATE_SCOPE = "spec-controller allocate";

  function extraArgument(token: string, takes: string): string {
    return (
      `spec-controller allocate: usage error [extra-argument] — ${message(AppError.ExtraArgument, { token, scope: ALLOCATE_SCOPE, takes })}\n` +
      message(AppMessage.SeeArguments, { scope: ALLOCATE_SCOPE })
    );
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
