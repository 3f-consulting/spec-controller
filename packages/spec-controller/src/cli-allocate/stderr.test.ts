import { beforeEach, describe, it, expect } from "vitest";
import { nextClaimCode as answerFor, type Allocation, type AllocationRequest, type ClaimCodeOccurrence } from "@3f-consulting/spec-controller-core";
import { alreadyHeadedNote, highestSeenLine, historyBoundaryLine, unknownPartRefusal } from "./stderr.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { shownText } from "../shownText.test-utils.js";

function nextClaimCode(request: AllocationRequest, occurrences: readonly ClaimCodeOccurrence[]): Allocation {
  const answer = answerFor(request, occurrences);
  if (answer.kind !== "allocated") throw new Error(`refused ${request.part} as an unknown part`);
  return answer;
}

describe("[CLM-ALC-005] stderr names where the highest code was seen", () => {
  it("names a file and line in the tree", () => {
    const allocation = nextClaimCode({ part: "ONE", headerCodes: ["ONE"] }, [{ text: "  @CLM-ONE-005", path: "features/one.feature", line: 8 }]);
    expect(highestSeenLine(allocation)).toBe(message(AppMessage.HighestSeenInTree, { code: "CLM-ONE-005", path: "features/one.feature", line: 8 }));
  });

  it("names the file, line and commit when only history carries it", () => {
    const occurrence = { text: "-  @CLM-ONE-005", path: "features/one.feature", line: 8, commit: "abc1234" };
    expect(highestSeenLine(nextClaimCode({ part: "ONE", headerCodes: ["ONE"] }, [occurrence]))).toBe(
      message(AppMessage.HighestSeenInCommit, { code: "CLM-ONE-005", path: "features/one.feature", line: 8, commit: "abc1234" }),
    );
  });

  it("says none when the part carries no code", () => {
    expect(highestSeenLine(nextClaimCode({ part: "ONE", headerCodes: ["ONE"] }, []))).toBe(message(AppMessage.HighestSeenNone));
  });
});

describe("[CLM-ALC-004] with no history to read, a code is still offered and the boundary is stated", () => {
  let allocation: Allocation;

  beforeEach(() => {
    allocation = nextClaimCode({ part: "ONE", headerCodes: ["ONE"] }, [{ text: "@CLM-ONE-001", path: "features/one.feature", line: 4 }]);
  });

  it("states that no history was read outside a git repository, and what that risks", () => {
    expect(historyBoundaryLine({ kind: "not-a-repository" }, allocation)).toBe(
      message(AppMessage.NoRepositoryRisksCodeAbove, { code: "CLM-ONE-001" }),
    );
  });

  it("states where a shallow clone's history stops", () => {
    expect(historyBoundaryLine({ kind: "shallow", before: "abc1234" }, allocation)).toBe(
      message(AppMessage.ShallowHistoryRisksCodeAbove, { before: "abc1234", code: "CLM-ONE-001" }),
    );
  });

  it("says nothing when history was read whole", () => {
    expect(historyBoundaryLine({ kind: "complete" }, allocation)).toBeNull();
  });

  it.each([
    {
      boundary: { kind: "not-a-repository" } as const,
      line: (): string => message(AppMessage.NoRepositoryRisksPartCode, { part: "ONE" }),
    },
    {
      boundary: { kind: "shallow", before: "abc1234" } as const,
      line: (): string => "history: shallow clone — history before abc1234 unread; a code of ONE may have been used before",
    },
  ])("names the risk from nothing when the part carries no code", ({ boundary, line }) => {
    expect(historyBoundaryLine(boundary, nextClaimCode({ part: "ONE", headerCodes: ["ONE"] }, []))).toBe(line());
  });
});

describe("[CLM-ALC-010] a part no feature file's header carries is refused as an unknown part", () => {
  it("says it is an unknown part, and lists the header codes and nothing else", () => {
    expect(shownText(unknownPartRefusal({ kind: "unknown-part", part: "ZZZ", headerCodes: ["ONE", "TWO"] }))).toBe(
      message(AppError.UnknownPartRefused, { part: "ZZZ", parts: "ONE, TWO" }),
    );
  });

  it("says so when the corpus has no feature file headed at all", () => {
    expect(shownText(unknownPartRefusal({ kind: "unknown-part", part: "ZZZ", headerCodes: [] }))).toBe(
      message(AppError.UnknownPartRefused, { part: "ZZZ", parts: message(AppMessage.NoPartsCarried) }),
    );
  });
});

describe("[CLM-ALC-011] --new admits a part no feature file's header carries, and notes a part a header carries", () => {
  it("notes that a header already carries a part asked for as new", () => {
    const allocation = nextClaimCode({ part: "ONE", headerCodes: ["ONE"], isNew: true }, []);
    expect(alreadyHeadedNote(allocation)).toBe(message(AppMessage.PartAlreadyHeaded, { part: "ONE" }));
  });

  it("notes nothing for a new part no header carries", () => {
    expect(alreadyHeadedNote(nextClaimCode({ part: "ZZ", headerCodes: ["ONE"], isNew: true }, []))).toBeNull();
  });
});
