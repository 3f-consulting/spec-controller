import { describe, expect, it } from "vitest";
import { messagesFrom, type MessageValues } from "./message.js";

// A thrown error is one more wrong text: the catalogue never stops a run.
function textFor(texts: Readonly<Record<string, string>>, code: string, values?: MessageValues): string {
  const message = messagesFrom<string, Record<string, MessageValues>>(texts) as (code: string, values?: MessageValues) => string;
  try {
    return message(code, values);
  } catch (error) {
    return `threw ${String(error)}`;
  }
}

describe("the text for a code will be its text, unchanged", () => {
  it("[CLM-MSG-008] the text for a code will be its text, unchanged", () => {
    expect(textFor({ "no-features": "No feature files were found." }, "no-features")).toBe("No feature files were found.");
  });
});

describe("each value will fill its gap in the text", () => {
  it.each([
    ["CLM-MSG-016", "The format {format} is not written.", { format: "html" }, "The format html is not written."],
    ["CLM-MSG-017", "{entry} is {is} where {reads} is read.", { entry: "unit", is: "3", reads: "a runner" }, "unit is 3 where a runner is read."],
    ["CLM-MSG-018", "{format} is not {format}.", { format: "html" }, "html is not html."],
    ["CLM-MSG-015", "{count} steps ran.", { count: 1000 }, "1000 steps ran."],
    ["CLM-MSG-019", "The format {format} is not written.", { format: "{other}" }, "The format {other} is not written."],
    ["CLM-MSG-020", "The format {format} is not written.", { format: "it's" }, "The format it's is not written."],
    ["CLM-MSG-021", "The format {format} is not written.", { format: "" }, "The format  is not written."],
    ["CLM-MSG-022", "No format was written.", { format: "html" }, "No format was written."],
  ])("[%s] %s, filled with %j, reads as written", (_clm, text, values, retrieved) => {
    expect(textFor({ "a-code": text }, "a-code", values)).toBe(retrieved);
  });
});

describe("a code with no usable text will give back the code", () => {
  it.each([
    ["CLM-MSG-002", "no text", {}],
    ["CLM-MSG-004", "a blank text", { "no-features": "  " }],
    ["CLM-MSG-007", 'the text "No feature {files were found."', { "no-features": "No feature {files were found." }],
  ])("[%s] a catalogue with %s under the code gives back the code", (_clm, _entry, texts) => {
    expect(textFor(texts, "no-features")).toBe("no-features");
  });
});

describe("a text the values cannot fill will give back the code and its values", () => {
  it.each([
    ["CLM-MSG-023", "no text", {}],
    ["CLM-MSG-005", 'the text "The format {name} is not written."', { "unknown-format": "The format {name} is not written." }],
    ["CLM-MSG-024", 'the text "The format {format is not written."', { "unknown-format": "The format {format is not written." }],
  ])("[%s] a catalogue with %s under the code gives back the code and its values", (_clm, _entry, texts) => {
    expect(textFor(texts, "unknown-format", { format: "html" })).toBe("unknown-format (format: html)");
  });
});

describe("a value of null will give back the code and its values", () => {
  it("[CLM-MSG-025] a value of null will give back the code and its values", () => {
    expect(textFor({ "unknown-format": "The format {format} is not written." }, "unknown-format", { format: null })).toBe("unknown-format (format: null)");
  });
});
