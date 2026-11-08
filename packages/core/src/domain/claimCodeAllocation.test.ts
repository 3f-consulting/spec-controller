import { describe, it, expect } from "vitest";
import { nextClaimCode, unknownPartCarried, type Allocation, type AllocationRequest, type ClaimCodeOccurrence } from "./claimCodeAllocation.js";

function next(request: AllocationRequest, occurrences: readonly ClaimCodeOccurrence[]): Allocation {
  const answer = nextClaimCode(request, occurrences);
  if (answer.kind !== "allocated") throw new Error(`refused ${request.part} as an unknown part`);
  return answer;
}

function seen(text: string, path = "features/one.feature", line = 1): ClaimCodeOccurrence {
  return { text, path, line };
}

function endingOf(code: string): string {
  const ending = /^CLM-(.+)$/.exec(code)?.[1];
  if (ending === undefined) throw new Error(`${code} is not under CLM`);
  return ending;
}

describe("[CLM-ALC-008] the code is printed alone, zero-padded to three digits", () => {
  const request = { part: "ONE", headerCodes: ["ONE"] };

  it.each([
    ["offers one past the highest, padded to three digits", "    @CLM-ONE-7 @unit", "ONE-008"],
    ["reads every code on a line", "[CLM-ONE-004] and [CLM-ONE-006] and CLM-ONE-005", "ONE-007"],
  ])("%s", (_title, text, ending) => {
    expect(endingOf(next(request, [seen(text)]).code)).toBe(ending);
  });

  it("counts only the part asked for", () => {
    const occurrences = [seen("@CLM-ONE-002"), seen("@CLM-TWO-040"), seen("CLM-ONEX-050")];
    expect(endingOf(next(request, occurrences).code)).toBe("ONE-003");
  });

  it("offers the first code when the part carries none", () => {
    expect(endingOf(next(request, []).code)).toBe("ONE-001");
  });
});

describe("[CLM-ALC-009] a part whose highest code is 999 is offered 1000", () => {
  const request = { part: "ONE", headerCodes: ["ONE"] };

  it.each([
    ["grows past three digits rather than wrapping or refusing", "@CLM-ONE-999", "ONE-1000"],
    ["keeps growing at every width", "@CLM-ONE-9999", "ONE-10000"],
  ])("%s", (_title, text, ending) => {
    expect(endingOf(next(request, [seen(text)]).code)).toBe(ending);
  });
});

describe("[CLM-ALC-026] allocate writes the next code under CLM", () => {
  it("writes CLM after a part that carries a CLM code", () => {
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [seen("@CLM-ONE-004")]).code).toMatch(/^CLM-/);
  });
});

describe("[CLM-ALC-002] a code carried only on a CI step id is never offered again", () => {
  it("reads a step id as a code in use", () => {
    const occurrences = [seen("@CLM-ONE-001"), seen("        id: CLM-ONE-007", ".github/workflows/ci.yml", 8)];
    expect(endingOf(next({ part: "ONE", headerCodes: ["ONE"] }, occurrences).code)).toBe("ONE-008");
  });
});

describe("[CLM-ALC-003] a code carried only in a test title is never offered again", () => {
  it("reads a bracketed test-title citation as a code in use", () => {
    const occurrences = [seen("@CLM-ONE-001"), seen('it("[CLM-ONE-007] does the thing", () => {});', "src/thing.test.ts", 3)];
    expect(endingOf(next({ part: "ONE", headerCodes: ["ONE"] }, occurrences).code)).toBe("ONE-008");
  });
});

describe("[CLM-ALC-005] stderr names where the highest code was seen", () => {

  it("names the tree before history when both carry the highest code", () => {
    const inHistory = { ...seen("-  @CLM-ONE-005", "features/old.feature", 3), commit: "abc1234" };
    const inTree = seen("  @CLM-ONE-005 @unit", "features/one.feature", 8);
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [inHistory, inTree]).highest?.occurrence).toEqual(inTree);
  });

  it("keeps the first of two tree occurrences of the same code", () => {
    const first = seen("  @CLM-ONE-005 @unit", "features/one.feature", 8);
    const second = seen("[CLM-ONE-005] a test", "src/one.test.ts", 2);
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [first, second]).highest?.occurrence).toEqual(first);
  });

  it("keeps the first of two history occurrences of the same code", () => {
    const first = { ...seen("-  @CLM-ONE-005", "features/one.feature", 8), commit: "abc1234" };
    const second = { ...seen("+  @CLM-ONE-005", "features/one.feature", 8), commit: "def5678" };
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [first, second]).highest?.occurrence).toEqual(first);
  });

  it("never lets a lower code in the tree displace a higher one history carried, read before it", () => {
    const inHistory = { ...seen("-  @CLM-ONE-007", "features/one.feature", 9), commit: "abc1234" };
    const inTree = seen("  @CLM-ONE-005 @unit", "features/one.feature", 8);
    const answer = next({ part: "ONE", headerCodes: ["ONE"] }, [inHistory, inTree]);
    expect(endingOf(answer.code)).toBe("ONE-008");
    expect(answer).toMatchObject({ highest: { occurrence: inHistory } });
  });
});

describe("[CLM-ALC-010] a part no feature file's header carries is refused as an unknown part", () => {
  const headerCodes = ["TWO", "ONE"];

  it("refuses a part no header carries, naming the header codes in order", () => {
    expect(nextClaimCode({ part: "ZZZ", headerCodes }, [])).toEqual({ kind: "unknown-part", part: "ZZZ", headerCodes: ["ONE", "TWO"] });
  });

  it.each([
    { headerCodes: [], carried: { kind: "none" } },
    { headerCodes: ["ONE", "TWO"], carried: { kind: "some", headerCodes: ["ONE", "TWO"] } },
  ])("says whether any part is carried, from $headerCodes", ({ headerCodes, carried }) => {
    expect(unknownPartCarried({ kind: "unknown-part", part: "ZZZ", headerCodes })).toEqual(carried);
  });
});

describe("[CLM-ALC-011] --new admits a part no feature file's header carries, and notes a part a header carries", () => {
  it("admits a part no header carries, from its first code", () => {
    expect(endingOf(next({ part: "ZZ", headerCodes: ["ONE"], isNew: true }, []).code)).toBe("ZZ-001");
  });

  it("answers a headed part as usual, and says the header already carries it", () => {
    const answer = next({ part: "ONE", headerCodes: ["ONE"], isNew: true }, [seen("@CLM-ONE-003")]);
    expect(endingOf(answer.code)).toBe("ONE-004");
    expect(answer).toMatchObject({ alreadyHeaded: true });
  });

  it("says nothing of a header when the part was not asked for as new", () => {
    expect(nextClaimCode({ part: "ONE", headerCodes: ["ONE"] }, [seen("@CLM-ONE-003")])).not.toMatchObject({ alreadyHeaded: true });
  });
});
