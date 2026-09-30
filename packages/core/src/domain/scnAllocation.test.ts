import { describe, it, expect } from "vitest";
import { nextScnCode, type Allocation, type AllocationRequest, type ScnSighting } from "./scnAllocation.js";

function next(request: AllocationRequest, sightings: readonly ScnSighting[]): Allocation {
  const answer = nextScnCode(request, sightings);
  if (answer.kind !== "allocated") throw new Error(`refused ${request.part} as an unknown part`);
  return answer;
}

function seen(text: string, path = "features/one.feature", line = 1): ScnSighting {
  return { text, path, line };
}

describe("[SCN-ALC-008] the code is printed alone, zero-padded to three digits", () => {
  const request = { part: "ONE", headerCodes: ["ONE"] };

  it("offers one past the highest, padded to three digits", () => {
    expect(next(request, [seen("    @SCN-ONE-7 @unit")]).code).toBe("SCN-ONE-008");
  });

  it("reads the number, never the text, so 012 and 12 are one number", () => {
    expect(next(request, [seen("@SCN-ONE-012"), seen("SCN-ONE-9")]).code).toBe("SCN-ONE-013");
  });

  it("counts only the part asked for", () => {
    const sightings = [seen("@SCN-ONE-002"), seen("@SCN-TWO-040"), seen("SCN-ONEX-050")];
    expect(next(request, sightings).code).toBe("SCN-ONE-003");
  });

  it("offers the first code when the part carries none", () => {
    expect(next(request, []).code).toBe("SCN-ONE-001");
  });

  it("reads every code on a line", () => {
    expect(next(request, [seen("[SCN-ONE-004] and [SCN-ONE-006] and SCN-ONE-005")]).code).toBe(
      "SCN-ONE-007",
    );
  });
});

describe("[SCN-ALC-009] a part whose highest code is 999 is offered 1000", () => {
  const request = { part: "ONE", headerCodes: ["ONE"] };

  it("grows past three digits rather than wrapping or refusing", () => {
    expect(next(request, [seen("@SCN-ONE-999")]).code).toBe("SCN-ONE-1000");
  });

  it("keeps growing at every width", () => {
    expect(next(request, [seen("@SCN-ONE-9999")]).code).toBe("SCN-ONE-10000");
  });
});

describe("[SCN-ALC-002] a code carried only on a CI step id is never offered again", () => {
  it("reads a step id as a code in use", () => {
    const sightings = [seen("@SCN-ONE-001"), seen("        id: SCN-ONE-007", ".github/workflows/ci.yml", 8)];
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, sightings).code).toBe("SCN-ONE-008");
  });
});

describe("[SCN-ALC-003] a code carried only in a test title is never offered again", () => {
  it("reads a bracketed test-title citation as a code in use", () => {
    const sightings = [seen("@SCN-ONE-001"), seen('it("[SCN-ONE-007] does the thing", () => {});', "src/thing.test.ts", 3)];
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, sightings).code).toBe("SCN-ONE-008");
  });
});

describe("[SCN-ALC-001] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("counts a code history carried as well as the codes the tree carries", () => {
    const tree = [seen("  @SCN-ONE-001 @unit")];
    const history = [seen("-  @SCN-ONE-005 @unit", "features/one.feature", 6)];
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [...tree, ...history]).code).toBe("SCN-ONE-006");
  });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen", () => {
  it("hands back the sighting that carried the highest code", () => {
    const where = seen("  @SCN-ONE-005 @unit", "features/one.feature", 8);
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [seen("@SCN-ONE-001"), where]).highest).toEqual({ code: "SCN-ONE-005", sighting: where });
  });

  it("names the tree before history when both carry the highest code", () => {
    const inHistory = { ...seen("-  @SCN-ONE-005", "features/old.feature", 3), commit: "abc1234" };
    const inTree = seen("  @SCN-ONE-005 @unit", "features/one.feature", 8);
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [inHistory, inTree]).highest?.sighting).toEqual(inTree);
  });

  it("names the tree before history whichever it read first", () => {
    const inTree = seen("  @SCN-ONE-005 @unit", "features/one.feature", 8);
    const inHistory = { ...seen("-  @SCN-ONE-005", "features/old.feature", 3), commit: "abc1234" };
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [inTree, inHistory]).highest?.sighting).toEqual(inTree);
  });

  it("keeps the first of two tree sightings of the same code", () => {
    const first = seen("  @SCN-ONE-005 @unit", "features/one.feature", 8);
    const second = seen("[SCN-ONE-005] a test", "src/one.test.ts", 2);
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [first, second]).highest?.sighting).toEqual(first);
  });

  it("keeps the first of two history sightings of the same code", () => {
    const first = { ...seen("-  @SCN-ONE-005", "features/one.feature", 8), commit: "abc1234" };
    const second = { ...seen("+  @SCN-ONE-005", "features/one.feature", 8), commit: "def5678" };
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [first, second]).highest?.sighting).toEqual(first);
  });

  it("names a higher code in history over a lower one in the tree", () => {
    const inTree = seen("  @SCN-ONE-005 @unit", "features/one.feature", 8);
    const inHistory = { ...seen("-  @SCN-ONE-007", "features/one.feature", 9), commit: "abc1234" };
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [inTree, inHistory]).highest?.sighting).toEqual(inHistory);
  });

  it("never lets a lower code in the tree displace a higher one history carried, read before it", () => {
    const inHistory = { ...seen("-  @SCN-ONE-007", "features/one.feature", 9), commit: "abc1234" };
    const inTree = seen("  @SCN-ONE-005 @unit", "features/one.feature", 8);
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, [inHistory, inTree])).toMatchObject({
      code: "SCN-ONE-008",
      highest: { sighting: inHistory },
    });
  });

  it("has nothing to name when the part carries no code", () => {
    expect(next({ part: "ONE", headerCodes: ["ONE"] }, []).highest).toBeNull();
  });
});

describe("[SCN-ALC-010] a part no feature file's header carries is refused as an unknown part", () => {
  const headerCodes = ["TWO", "ONE"];

  it("refuses a part no header carries, naming the header codes in order", () => {
    expect(nextScnCode({ part: "ZZZ", headerCodes }, [])).toEqual({ kind: "unknown-part", part: "ZZZ", headerCodes: ["ONE", "TWO"] });
  });

  it("refuses it even when the tree or history carries its numbers", () => {
    const sightings = [seen("@SCN-ZZZ-004", "tests/fixtures/sample/features/zzz.feature"), { ...seen("-@SCN-ZZZ-009"), commit: "abc1234" }];
    expect(nextScnCode({ part: "ZZZ", headerCodes }, sightings).kind).toBe("unknown-part");
  });

  it("answers a part a header carries", () => {
    expect(nextScnCode({ part: "ONE", headerCodes }, [seen("@SCN-ONE-003")])).toMatchObject({ kind: "allocated", code: "SCN-ONE-004" });
  });
});

describe("[SCN-ALC-011] --new admits a part no feature file's header carries, and notes a part a header carries", () => {
  it("admits a part no header carries, from its first code", () => {
    expect(nextScnCode({ part: "ZZ", headerCodes: ["ONE"], isNew: true }, [])).toMatchObject({ kind: "allocated", code: "SCN-ZZ-001" });
  });

  it("never reissues a number the tree or history carries for the new part", () => {
    const sightings = [seen("id: SCN-ZZ-006", ".github/workflows/ci.yml")];
    expect(nextScnCode({ part: "ZZ", headerCodes: ["ONE"], isNew: true }, sightings)).toMatchObject({ code: "SCN-ZZ-007" });
  });

  it("answers a headed part as usual, and says the header already carries it", () => {
    expect(nextScnCode({ part: "ONE", headerCodes: ["ONE"], isNew: true }, [seen("@SCN-ONE-003")])).toMatchObject({
      kind: "allocated",
      code: "SCN-ONE-004",
      alreadyHeaded: true,
    });
  });

  it("says nothing of a header when the part was not asked for as new", () => {
    expect(nextScnCode({ part: "ONE", headerCodes: ["ONE"] }, [seen("@SCN-ONE-003")])).not.toMatchObject({ alreadyHeaded: true });
  });
});
