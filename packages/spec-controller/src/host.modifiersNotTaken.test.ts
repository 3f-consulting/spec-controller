import { describe, it, expect } from "vitest";
import { parseHostInvocation, modifiersNotTakenRefusal } from "./host.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { shownText } from "./shownText.test-utils.js";

const notTaken = (command: string, given: readonly string[]): string =>
  `${message(AppError.ModifiersNotTaken, { command, modifiers: given.join(", ") })}\n` +
  message(AppMessage.RunWithoutModifiers, { command });

describe("[SCN-ALC-014] a host modifier before allocate is refused, and nothing is stored", () => {
  it.each([
    [["--store", "x", "allocate", "ONE"], ["--store"]],
    [["--run-id", "r", "allocate", "ONE"], ["--run-id"]],
    [["--store", "x", "--run-id", "r", "allocate", "ONE"], ["--store", "--run-id"]],
    [["--run-id", "r", "--store", "x", "allocate", "ONE"], ["--store", "--run-id"]],
  ])("refuses %j with the catalogue's modifiers-not-taken refusal, naming %j and allocate", (argv, given) => {
    expect(shownText(modifiersNotTakenRefusal(parseHostInvocation(argv)))).toBe(notTaken("allocate", given));
  });

  it("refuses nothing when allocate is given no modifier", () => {
    expect(shownText(modifiersNotTakenRefusal(parseHostInvocation(["allocate", "ONE"])))).toBeUndefined();
  });
});
