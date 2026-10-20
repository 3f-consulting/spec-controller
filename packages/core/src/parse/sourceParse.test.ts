import { describe, it, expect, vi } from "vitest";
import { parseSources } from "./sourceParse.js";

const readNothing = (): object => ({});

function throwing(value: unknown): (source: string) => object {
  return () => {
    throw value;
  };
}

describe("[SCN-GPG-001] the shared parse reports every feature file the parser rejects, with the parser's own words, and returns no corpus in its place", () => {
  it("keeps the parser's own words as the reason when the parser throws something other than an error", () => {
    expect(parseSources([{ file: "a.feature", source: "" }], throwing("unexpected end of input"), readNothing)).toStrictEqual({
      kind: "unparseable",
      faults: [{ file: "a.feature", message: "unexpected end of input" }],
    });
    expect(parseSources([{ file: "b.feature", source: "" }], throwing({ toString: () => "no Feature line" }), readNothing)).toStrictEqual({
      kind: "unparseable",
      faults: [{ file: "b.feature", message: "no Feature line" }],
    });
  });
});

describe("[SCN-CLI-111] an error in reading a feature file or workflow the parser accepted ends the run at 6, and is never refused as that file failing to parse", () => {
  const parsed = (source: string): { readonly text: string } => ({ text: source });

  it("lets a throw from reading a parsed file pass through, never reporting the file as unparseable", () => {
    const reading = new TypeError("the reading of a parsed file threw");
    const read = (): object => {
      throw reading;
    };
    expect(() => parseSources([{ file: "a.feature", source: "Feature: a" }], parsed, read)).toThrow(reading);
  });

  it("reads each parsed file, with its source, and names the result by its file", () => {
    const read = (document: { readonly text: string }, source: string): object => ({ read: document.text, source });
    expect(parseSources([{ file: "a.feature", source: "Feature: a" }], parsed, read)).toStrictEqual({
      kind: "parsed",
      parsed: [{ read: "Feature: a", source: "Feature: a", file: "a.feature" }],
    });
  });

  it("reads nothing when the parser rejects a file, and reports that file", () => {
    const read = vi.fn((): object => ({}));
    const sources = [
      { file: "a.feature", source: "Feature: a" },
      { file: "b.feature", source: "" },
    ];
    expect(parseSources(sources, (source) => (source === "" ? throwing("unexpected end of input")(source) : parsed(source)), read)).toStrictEqual({
      kind: "unparseable",
      faults: [{ file: "b.feature", message: "unexpected end of input" }],
    });
    expect(read).not.toHaveBeenCalled();
  });
});
