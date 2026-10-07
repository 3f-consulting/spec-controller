import { describe, it, expect } from "vitest";
import { parseHostInvocation, modifiersNotTakenRefusal } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const notTaken = (command: string, given: readonly string[]): string =>
  `spec-controller: usage error — ${APP_MESSAGES[AppMessage.ModifiersNotTaken](command, given.join(", "))}\n` +
  APP_MESSAGES[AppMessage.RunWithoutModifiers](command);

describe("[SCN-ALC-014] a host modifier before allocate is refused, and nothing is stored", () => {
  it.each([
    [["--store", "x", "allocate", "ONE"], ["--store"]],
    [["--run-id", "r", "allocate", "ONE"], ["--run-id"]],
    [["--store", "x", "--run-id", "r", "allocate", "ONE"], ["--store", "--run-id"]],
    [["--run-id", "r", "--store", "x", "allocate", "ONE"], ["--store", "--run-id"]],
  ])("refuses %j with the catalogue's modifiers-not-taken refusal, naming %j and allocate", (argv, given) => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(argv))).toBe(notTaken("allocate", given));
  });

  it("refuses nothing when allocate is given no modifier", () => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(["allocate", "ONE"]))).toBeUndefined();
  });

  it("refuses nothing when allocate is asked for its help after a modifier", () => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(["--store", "x", "allocate", "--help"]))).toBeUndefined();
  });

  it("refuses nothing for a command that keeps runs", () => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(["--store", "x", "balance"]))).toBeUndefined();
  });

  it("refuses nothing for a command the registry does not hold, which is left to the unknown-command answer", () => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(["--store", "x", "nosuch"]))).toBeUndefined();
  });
});
