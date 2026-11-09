import { describe, it, expect } from "vitest";

import { postingOf } from "./posting.js";
import type { FitnessEvidenceObservation } from "../model.js";

const carriedClaimCodes = new Set(["CLM-AAA-001", "CLM-AAA-002"]);

describe("[CLM-LDG-001] postingOf routes a BEHAVIOURAL evidence observation by its citation", () => {
  it.each([
    ["posts an evidence observation citing a named claim code to that scenario's row", "CLM-AAA-001", { kind: "scenario", claimCode: "CLM-AAA-001" }],
    ["posts an evidence observation citing an UNKNOWN claim code to a phantom claim's row", "CLM-ZZZ-009", { kind: "phantom-claim", claimCode: "CLM-ZZZ-009" }],
  ])("%s", (_title, claimCode, expected) => {
    expect(
      postingOf({ qualityCheckKind: "unit", claimCode, status: "passed" }, carriedClaimCodes)
    ).toEqual(expected);
  });

  it("posts an UNCITED evidence observation (claimCode null) to the unnamed claim, never a phantom claim", () => {
    expect(
      postingOf({ qualityCheckKind: "unit", claimCode: null, status: "passed" }, carriedClaimCodes)
    ).toEqual({ kind: "unnamed-claim", posted: "cites-nothing" });
  });
});

describe("[CLM-LDG-001] postingOf routes a FITNESS evidence observation by its citation, the same rule", () => {
  const check = (fitnessFunction: string, claimCode?: string): FitnessEvidenceObservation => ({
    qualityCheckKind: "fitness",
    fitnessFunction,
    exists: true,
    enforcedOverRealSource: true,
    ...(claimCode !== undefined ? { claimCode } : {}),
  });

  it.each([
    ["posts a CITING run to the one row it cites — exactly as a behavioural evidence observation is posted", "CLM-AAA-001", { kind: "scenario", claimCode: "CLM-AAA-001" }],
    ["posts a run citing an UNKNOWN claim code to that phantom claim's row, never to the unnamed claim", "CLM-ZZZ-009", { kind: "phantom-claim", claimCode: "CLM-ZZZ-009" }],
  ])("%s", (_title, claimCode, expected) => {
    expect(postingOf(check("lint:named", claimCode), carriedClaimCodes)).toEqual(expected);
  });

  it("posts an UNCITED run to the unnamed claim — and there is no by-name fallback left to try", () => {
    expect(postingOf(check("lint:named"), carriedClaimCodes)).toEqual({
      kind: "unnamed-claim",
      posted: "cites-nothing",
    });
    expect(postingOf(check("lint:nobody-asked"), carriedClaimCodes)).toEqual({
      kind: "unnamed-claim",
      posted: "cites-nothing",
    });
  });
});

describe("[CLM-LDG-022] postingOf routes an evidence observation that NEVER RAN by its citation, as every other", () => {
  const brokenTest = (claimCode: string | null) =>
    postingOf({ qualityCheckKind: "unit", claimCode, status: "failed", neverRan: true }, carriedClaimCodes);
  const brokenCheck = (claimCode?: string) =>
    postingOf(
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint:named",
        exists: false,
        enforcedOverRealSource: false,
        neverRan: true,
        ...(claimCode !== undefined ? { claimCode } : {}),
      },
      carriedClaimCodes
    );

  it.each([
    ["behavioural", brokenTest],
    ["fitness", brokenCheck],
  ] as const)("posts a %s evidence observation that never ran to the claim it names", (_kind, post) => {
    expect(post("CLM-AAA-001")).toEqual({ kind: "scenario", claimCode: "CLM-AAA-001" });
    expect(post("CLM-ZZZ-009")).toEqual({ kind: "phantom-claim", claimCode: "CLM-ZZZ-009" });
  });

  it("posts an evidence observation that never ran and names no claim to the unnamed claim, as never-ran", () => {
    expect(brokenTest(null)).toEqual({ kind: "unnamed-claim", posted: "never-ran" });
    expect(brokenCheck()).toEqual({ kind: "unnamed-claim", posted: "never-ran" });
  });
});
