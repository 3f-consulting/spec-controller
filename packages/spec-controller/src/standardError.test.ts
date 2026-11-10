import { describe, expect, it } from "vitest";

import { AppError } from "./messages.js";
import { errorText, standardError, type CodedLine } from "./standardError.js";
import { refusal } from "./refusal.js";
import { errorCodesShown } from "./shownText.test-utils.js";

function printedBy(command: string | undefined, print: (shown: ReturnType<typeof standardError>) => void): string[] {
  const chunks: string[] = [];
  print(standardError({ write: (chunk: string) => chunks.push(chunk) }, command));
  return chunks;
}

function notAPart(): ReturnType<typeof refusal> {
  return refusal(AppError.NotAFeaturePart, { part: "one" });
}

describe("[CLM-ALC-012] a command's usage error opens with the command's usage-error prefix", () => {
  it("opens the first line with the command, and leaves the pointer lines as they are", () => {
    const given = refusal(AppError.NotAFeaturePart, { part: "one" }, ["a pointer"]);
    expect(errorText(given, "allocate")).toBe(
      "spec-controller allocate: usage error [not-a-feature-part] — 'one' is not a feature part: two to five characters, each A-Z or 0-9.\na pointer",
    );
  });
});

describe("[CLM-CLI-056] an unknown command is named after the tool", () => {
  it("opens with the tool's name, then the entry", () => {
    expect(errorText(refusal(AppError.UnknownCommand, { command: "frobnicate" }, ["", "help"]))).toBe(
      'spec-controller: usage error [unknown-command] — unknown command "frobnicate".\n\nhelp',
    );
  });

  it("opens with the tool and the command when a command is given", () => {
    expect(errorText(refusal(AppError.UnknownCommand, { command: "frobnicate" }), "balance")).toBe(
      'spec-controller balance: usage error [unknown-command] — unknown command "frobnicate".',
    );
  });
});

describe("[CLM-CLI-101] an error given as its words is printed as they are, on its own line", () => {
  it("prints the words, then a newline, whatever the command", () => {
    const words = "spec-controller stopped on an unexpected error, and gives no verdict: Error: boom" as CodedLine;
    expect(printedBy("allocate", (shown) => shown.error(words))).toEqual([`${words}\n`]);
    expect(errorText(words, "allocate")).toBe(words);
  });
});

describe("[CLM-ALC-005] a note is printed on its own line", () => {
  it("prints the note, then a newline", () => {
    expect(printedBy("allocate", (shown) => shown.note("highest seen: none"))).toEqual(["highest seen: none\n"]);
  });
});

describe("an error will be shown with its error code", () => {
  it("[CLM-ERC-001] an error will be shown with its error code", () => {
    const unknownFlag = refusal(AppError.UnknownFlag, { flag: "--colour", scope: "spec-controller balance", toolVersion: "0.2.0", command: "balance" });
    const [opening = "", ...after] = errorText(unknownFlag, "balance").split("\n");
    expect({ opening: opening.split("[unknown-flag]").length - 1, after: after.filter((line) => line.includes("unknown-flag")) }).toEqual({ opening: 1, after: [] });
  });
});
