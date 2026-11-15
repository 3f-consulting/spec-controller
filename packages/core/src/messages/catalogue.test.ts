import { describe, expect, it } from "vitest";
import { textFor } from "./catalogue.js";

describe("a code that takes no values gives back its text unchanged", () => {
  it('[CLM-MSG-008] no-features gives back "No feature files were found."', () => {
    expect(textFor({ "no-features": "No feature files were found." }, "no-features")).toBe("No feature files were found.");
  });
});

describe("a code that takes values gives back its text with each gap filled in", () => {
  it.each([
    ["CLM-MSG-016", "The format {format} is not written.", { format: "html" }, "The format html is not written."],
    ["CLM-MSG-015", "{count} steps ran.", { count: 1000 }, "1000 steps ran."],
    ["CLM-MSG-017", "{entry} is {is} where {reads} is read.", { entry: "unit", is: 3, reads: "a runner" }, "unit is 3 where a runner is read."],
    ["CLM-MSG-018", "{format} is not {format}.", { format: "html" }, "html is not html."],
    ["CLM-MSG-019", "The format {format} is not written.", { format: "{other}" }, "The format {other} is not written."],
    ["CLM-MSG-020", "The format {format} is not written.", { format: "it's" }, "The format it's is not written."],
    ["CLM-MSG-021", "The format {format} is not written.", { format: "" }, "The format  is not written."],
    ["CLM-MSG-022", "No format was written.", { format: "html" }, "No format was written."],
  ] as const)("[%s] each value will fill its gap in %j", (_clm, text, values, retrieved) => {
    expect(textFor({ "a-code": text }, "a-code", values)).toBe(retrieved);
  });
});

describe("a mistake in a catalogue gives back the code and its values", () => {
  it.each([
    ["CLM-MSG-002", "no text", {}],
    ["CLM-MSG-004", "a blank text", { "no-features": "  " }],
    ["CLM-MSG-007", 'the text "No feature {files were found."', { "no-features": "No feature {files were found." }],
  ] as const)("[%s] a code with %s will give back the code", (_clm, _entry, catalogue) => {
    expect(textFor(catalogue, "no-features")).toBe("no-features");
  });

  it.each([
    ["CLM-MSG-023", "no text", {}],
    ["CLM-MSG-005", 'the text "The format {name} is not written."', { "unknown-format": "The format {name} is not written." }],
    ["CLM-MSG-024", 'the text "The format {format is not written."', { "unknown-format": "The format {format is not written." }],
  ] as const)("[%s] a code with %s will give back the code and its values", (_clm, _entry, catalogue) => {
    expect(textFor(catalogue, "unknown-format", { format: "html" })).toBe("unknown-format (format: html)");
  });

  it("[CLM-MSG-025] the catalogue gives back the code and its values for a null value", () => {
    expect(textFor({ "unknown-format": "The format {format} is not written." }, "unknown-format", { format: null })).toBe("unknown-format (format: null)");
  });
});
