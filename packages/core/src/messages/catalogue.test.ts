import { describe, expect, it } from "vitest";
import { textFor, type Catalogue } from "./catalogue.js";
import catalogueVariants from "./catalogue.variants.json" with { type: "json" };

describe("a code that takes no values gives back its text unchanged", () => {
  it('[CLM-MSG-008] the catalogue had the text "No feature files were found." under the code no-features: when the text for no-features is retrieved, the text will be "No feature files were found."', () => {
    expect(textFor({ "no-features": "No feature files were found." }, "no-features")).toBe("No feature files were found.");
  });
});

describe("a code that takes values gives back its text with each gap filled, or else the code and its values", () => {
  it.each([
    ["CLM-MSG-016", "The format {format} is not written.", "format html", { format: "html" }, "The format html is not written."],
    ["CLM-MSG-015", "{count} steps ran.", "count 1000", { count: 1000 }, "1000 steps ran."],
    ["CLM-MSG-017", "{entry} is {is} where {reads} is read.", "entry unit, is 3 and reads a runner", { entry: "unit", is: 3, reads: "a runner" }, "unit is 3 where a runner is read."],
    ["CLM-MSG-018", "{format} is not {format}.", "format html", { format: "html" }, "html is not html."],
    ["CLM-MSG-019", "The format {format} is not written.", "format {other}", { format: "{other}" }, "The format {other} is not written."],
    ["CLM-MSG-020", "The format {format} is not written.", "format it's", { format: "it's" }, "The format it's is not written."],
  ] as const)('[%s] the catalogue had the text "%s" under a code: when the text for that code is retrieved with %s, the text will be "%s"', (_clm, text, _values, values, retrieved) => {
    expect(textFor({ "a-code": text }, "a-code", values)).toBe(retrieved);
  });

  // The catalogues each variant stands for; a text of nothing but spaces is no text.
  const UNFILLABLE: Readonly<Record<string, readonly Catalogue[]>> = {
    "no text": [{}, { "unknown-format": "  " }],
    "a gap no value names": [{ "unknown-format": "The format {colour} is not written." }],
    "a broken brace": [{ "unknown-format": "The format {format is not written." }],
  };

  it.each(catalogueVariants["CLM-MSG-023"].variants)(
    '[CLM-MSG-023] the catalogue had, under the code unknown-format, a text the values cannot fill, %s: when the text for unknown-format is retrieved with format html, the text will be "unknown-format (format: html)"',
    (variant) => {
      const catalogues = UNFILLABLE[variant];
      if (catalogues === undefined) throw new Error(`no catalogue for the variant ${variant}`);

      expect(catalogues.map((catalogue) => textFor(catalogue, "unknown-format", { format: "html" }))).toEqual(catalogues.map(() => "unknown-format (format: html)"));
    },
  );

  it('[CLM-MSG-025] the catalogue had the text "The format {format} is not written." under the code unknown-format: when the text for unknown-format is retrieved with format null, the text will be "unknown-format (format: null)"', () => {
    expect(textFor({ "unknown-format": "The format {format} is not written." }, "unknown-format", { format: null })).toBe("unknown-format (format: null)");
  });
});
