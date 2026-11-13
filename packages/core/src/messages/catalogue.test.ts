import { describe, expect, it } from "vitest";
import { textFor } from "./catalogue.js";

describe("a code that takes no values gives back its text unchanged", () => {
  it("[CLM-MSG-008] the text for a code will be its text, unchanged", () => {
    expect(textFor({ "no-features": "No feature files were found." }, "no-features")).toBe("No feature files were found.");
  });
});
