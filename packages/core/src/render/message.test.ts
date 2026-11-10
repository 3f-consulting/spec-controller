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
