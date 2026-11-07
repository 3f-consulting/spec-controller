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

describe("[CLM-MSG-002] the printer prints a refusal's entry with the values its code is given, then each pointer line", () => {
  it("prints a refusal given no pointer as its entry's words with the values given, on one line", () => {
    expect(printedBy("balance", (shown) => shown.error(notAPart()))).toEqual([
      "spec-controller balance: usage error [not-a-feature-part] — 'one' is not a feature part: two to five characters, each A-Z or 0-9.\n",
    ]);
  });

  it("holds a refusal's code, values and pointers as given", () => {
    expect(refusal(AppError.NotAFeaturePart, { part: "one" })).toEqual({
      code: "not-a-feature-part",
      values: { part: "one" },
      pointers: [],
    });
  });

  it("prints an entry that takes no value", () => {
    expect(errorText(refusal(AppError.NoFeaturePartGiven, {}))).toBe(
      "spec-controller: usage error [no-feature-part-given] — no feature part was given: 'spec-controller allocate <FFF>' takes one, a feature file's header code.",
    );
  });
});

describe("[CLM-ALC-012] a command's usage error opens with the command's usage-error prefix", () => {
  it("opens the first line with the command, and leaves the pointer lines as they are", () => {
    const given = refusal(AppError.NotAFeaturePart, { part: "one" }, ["a pointer"]);
    expect(errorText(given, "allocate")).toBe(
      "spec-controller allocate: usage error [not-a-feature-part] — 'one' is not a feature part: two to five characters, each A-Z or 0-9.\na pointer",
    );
  });
});

describe("[CLM-ALC-014] a refusal at the host's scope opens with the tool's usage-error prefix", () => {
  it("opens the first line with the tool alone when no command is given", () => {
    const given = refusal(AppError.ModifiersNotTaken, { command: "allocate", modifiers: "--store" });
    expect(errorText(given)).toBe(
      "spec-controller: usage error [modifiers-not-taken] — 'allocate' takes no host modifier, and was given --store: it answers a query and keeps no run.",
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

describe("[CLM-MSG-010] an error shows its reader the error code of what went wrong", () => {
  const withPointers = (): ReturnType<typeof refusal> =>
    refusal(AppError.RunIdWithoutStore, { runId: "r1" }, ["first pointer", "second pointer"]);
  const words = "--run-id names a stored run, and was given 'r1' with no --store, so no run is kept under it.";

  it("opens a command's refusal with the command's usage-error prefix and the refusal's code, then each pointer line as given", () => {
    expect(printedBy("balance", (shown) => shown.error(withPointers()))).toEqual([
      `spec-controller balance: usage error [run-id-without-store] — ${words}\nfirst pointer\nsecond pointer\n`,
    ]);
  });

  it("opens a refusal at the host's scope with the tool's usage-error prefix and the refusal's code", () => {
    expect(printedBy(undefined, (shown) => shown.error(withPointers()))).toEqual([
      `spec-controller: usage error [run-id-without-store] — ${words}\nfirst pointer\nsecond pointer\n`,
    ]);
  });

  it("shows the code once, on the first line only, never on a pointer line after it", () => {
    expect(errorCodesShown(errorText(withPointers(), "balance"))).toEqual({ opening: ["run-id-without-store"], after: [] });
  });
});
