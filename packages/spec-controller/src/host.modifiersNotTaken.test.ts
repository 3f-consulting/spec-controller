import { describe, it, expect } from "vitest";
import { parseHostInvocation, modifiersNotTakenRefusal } from "./host.js";

describe("[SCN-ALC-014] a host modifier before allocate is refused, and nothing is stored", () => {
  it.each([
    [["--store", "/s", "allocate", "ONE"], ["--store"]],
    [["--run-id", "r1", "allocate", "ONE"], ["--run-id"]],
    [["--store", "/s", "--run-id", "r1", "allocate", "ONE"], ["--store", "--run-id"]],
  ])("refuses %j, naming %j and allocate", (argv, given) => {
    const refusal = modifiersNotTakenRefusal(parseHostInvocation(argv));
    expect(refusal).toBeDefined();
    for (const modifier of given) expect(refusal).toContain(modifier);
    expect(refusal).toContain("allocate");
  });

  it("refuses nothing when allocate is given no modifier", () => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(["allocate", "ONE"]))).toBeUndefined();
  });

  it("refuses nothing for a command that keeps runs", () => {
    expect(modifiersNotTakenRefusal(parseHostInvocation(["--store", "/s", "balance"]))).toBeUndefined();
  });
});
