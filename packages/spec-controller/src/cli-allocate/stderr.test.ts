import { beforeEach, describe, it, expect } from "vitest";
import { nextScnCode as answerFor, type Allocation, type AllocationRequest, type ScnOccurrence } from "@3f-consulting/spec-controller-core";
import { alreadyHeadedNote, highestSeenLine, historyBoundaryLine, unknownPartRefusal } from "./stderr.js";

function nextScnCode(request: AllocationRequest, occurrences: readonly ScnOccurrence[]): Allocation {
  const answer = answerFor(request, occurrences);
  if (answer.kind !== "allocated") throw new Error(`refused ${request.part} as an unknown part`);
  return answer;
}

describe("[SCN-ALC-005] stderr names where the highest code was seen", () => {
  it("names a file and line in the tree", () => {
    const allocation = nextScnCode({ part: "ONE", headerCodes: ["ONE"] }, [{ text: "  @SCN-ONE-005", path: "features/one.feature", line: 8 }]);
    expect(highestSeenLine(allocation)).toBe("highest seen: SCN-ONE-005, features/one.feature:8");
  });

  it("names the file, line and commit when only history carries it", () => {
    const occurrence = { text: "-  @SCN-ONE-005", path: "features/one.feature", line: 8, commit: "abc1234" };
    expect(highestSeenLine(nextScnCode({ part: "ONE", headerCodes: ["ONE"] }, [occurrence]))).toBe(
      "highest seen: SCN-ONE-005, features/one.feature:8 in abc1234",
    );
  });

  it("says none when the part carries no code", () => {
    expect(highestSeenLine(nextScnCode({ part: "ONE", headerCodes: ["ONE"] }, []))).toBe("highest seen: none");
  });
});

describe("[SCN-ALC-004] with no history to read, a code is still offered and the boundary is stated", () => {
  let allocation: Allocation;

  beforeEach(() => {
    allocation = nextScnCode({ part: "ONE", headerCodes: ["ONE"] }, [{ text: "@SCN-ONE-001", path: "features/one.feature", line: 4 }]);
  });

  it("states that no history was read outside a git repository, and what that risks", () => {
    expect(historyBoundaryLine({ kind: "not-a-repository" }, allocation)).toBe(
      "history: not a git repository — none read; a code above SCN-ONE-001 may have been used before",
    );
  });

  it("states where a shallow clone's history stops", () => {
    expect(historyBoundaryLine({ kind: "shallow", before: "abc1234" }, allocation)).toBe(
      "history: shallow clone — history before abc1234 unread; a code above SCN-ONE-001 may have been used before",
    );
  });

  it("says nothing when history was read whole", () => {
    expect(historyBoundaryLine({ kind: "complete" }, allocation)).toBeNull();
  });

  it("names the risk from nothing when the part carries no code", () => {
    expect(historyBoundaryLine({ kind: "not-a-repository" }, nextScnCode({ part: "ONE", headerCodes: ["ONE"] }, []))).toBe(
      "history: not a git repository — none read; a code of ONE may have been used before",
    );
  });
});

describe("[SCN-ALC-010] a part no feature file's header carries is refused as an unknown part", () => {
  it("says it is an unknown part, and lists the header codes and nothing else", () => {
    expect(unknownPartRefusal({ kind: "unknown-part", part: "ZZZ", headerCodes: ["ONE", "TWO"] })).toBe(
      "spec-controller allocate: unknown part — no feature file's header carries ZZZ.\n" +
        "The parts this corpus's feature files carry: ONE, TWO.",
    );
  });

  it("says so when the corpus has no feature file headed at all", () => {
    expect(unknownPartRefusal({ kind: "unknown-part", part: "ZZZ", headerCodes: [] })).toBe(
      "spec-controller allocate: unknown part — no feature file's header carries ZZZ.\n" +
        "The parts this corpus's feature files carry: none.",
    );
  });
});

describe("[SCN-ALC-011] --new admits a part no feature file's header carries, and notes a part a header carries", () => {
  it("notes that a header already carries a part asked for as new", () => {
    const allocation = nextScnCode({ part: "ONE", headerCodes: ["ONE"], isNew: true }, []);
    expect(alreadyHeadedNote(allocation)).toBe("note: a feature file's header already carries ONE, so --new was not needed");
  });

  it("notes nothing for a new part no header carries", () => {
    expect(alreadyHeadedNote(nextScnCode({ part: "ZZ", headerCodes: ["ONE"], isNew: true }, []))).toBeNull();
  });
});
