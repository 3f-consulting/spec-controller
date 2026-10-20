import { describe, it, expect } from "vitest";
import { parseSources } from "./sourceParse.js";

function throwing(value: unknown): (source: string) => object {
  return () => {
    throw value;
  };
}

describe("[SCN-GPG-001] the shared parse reports every feature file the parser rejects, with the parser's own words, and returns no corpus in its place", () => {
  it("keeps the parser's own words as the reason when the parser throws something other than an error", () => {
    expect(parseSources([{ file: "a.feature", source: "" }], throwing("unexpected end of input"))).toStrictEqual({
      kind: "unparseable",
      faults: [{ file: "a.feature", message: "unexpected end of input" }],
    });
    expect(parseSources([{ file: "b.feature", source: "" }], throwing({ toString: () => "no Feature line" }))).toStrictEqual({
      kind: "unparseable",
      faults: [{ file: "b.feature", message: "no Feature line" }],
    });
  });
});
