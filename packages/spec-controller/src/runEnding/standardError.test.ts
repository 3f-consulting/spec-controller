import { describe, expect, it } from "vitest";

import { AppError } from "../messages/messages.js";
import { errorText } from "./standardError.js";
import { refusal } from "./refusal.js";

describe("an error will be shown with its error code", () => {
  it("[CLM-ERC-001] an error will be shown with its error code", () => {
    const unknownFlag = refusal(
      AppError.UnknownFlag,
      { flag: "--colour", scope: "spec-controller balance", toolVersion: "0.2.0", command: "balance" },
      ["first pointer", "second pointer"],
    );
    const [opening = "", ...after] = errorText(unknownFlag, "balance").split("\n");
    expect({ opening: opening.split("[unknown-flag]").length - 1, after: after.filter((line) => line.includes("unknown-flag")) }).toEqual({ opening: 1, after: [] });
  });
});
