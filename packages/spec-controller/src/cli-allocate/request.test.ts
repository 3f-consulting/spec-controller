import { describe, it, expect } from "vitest";
import { cliRegistry } from "../cli-registry.js";
import { readRequest } from "./request.js";

function usageErrorOf(argv: readonly string[]): string {
  const read = readRequest(argv, cliRegistry, "0.0.0-test");
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

  it("reads a part in canon's form, of two to five characters", () => {
    expect(readRequest(["ON"], cliRegistry, "0.0.0-test")).toEqual({ part: "ON", isNew: false });
    expect(readRequest(["FIVE5"], cliRegistry, "0.0.0-test")).toEqual({ part: "FIVE5", isNew: false });
  });

  it("reads --new before or after the part, never as the part's value", () => {
    expect(readRequest(["--new", "ZZ"], cliRegistry, "0.0.0-test")).toEqual({ part: "ZZ", isNew: true });
    expect(readRequest(["ZZ", "--new"], cliRegistry, "0.0.0-test")).toEqual({ part: "ZZ", isNew: true });
  });
});
