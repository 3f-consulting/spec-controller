import { describe, it, expect } from "vitest";

import { postingOf } from "./posting.js";
import type { FitnessEvidenceObservation } from "../model.js";

const namedScenarioIds = new Set(["SCN-AAA-001", "SCN-AAA-002"]);

describe("[SCN-LDG-001] postingOf routes a BEHAVIOURAL evidence observation by its citation", () => {
  it.each([
    ["posts an evidence observation citing a named @SCN to that scenario's row", "SCN-AAA-001", { kind: "scenario", scnId: "SCN-AAA-001" }],
    ["posts an evidence observation citing an UNKNOWN @SCN to a phantom claim's row", "SCN-ZZZ-009", { kind: "phantom-claim", scnId: "SCN-ZZZ-009" }],
  ])("%s", (_title, scnId, expected) => {
    expect(
      postingOf({ qualityCheck: "unit", scnId, status: "passed" }, namedScenarioIds)
    ).toEqual(expected);
  });

  it("posts an UNCITED evidence observation (scnId null) to the unnamed claim, never a phantom claim", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: null, status: "passed" }, namedScenarioIds)
    ).toEqual({ kind: "unnamed-claim", posted: "cites-nothing" });
  });
});

describe("[SCN-LDG-001] postingOf routes a FITNESS evidence observation by its citation, the same rule", () => {
  const check = (fitnessFunction: string, scnId?: string): FitnessEvidenceObservation => ({
    qualityCheck: "fitness",
    fitnessFunction,
    exists: true,
    enforcedOverRealSource: true,
    ...(scnId !== undefined ? { scnId } : {}),
  });

  it.each([
    ["posts a CITING run to the one row it cites — exactly as a behavioural evidence observation is posted", "SCN-AAA-001", { kind: "scenario", scnId: "SCN-AAA-001" }],
    ["posts a run citing an UNKNOWN @SCN to that phantom claim's row, never to the unnamed claim", "SCN-ZZZ-009", { kind: "phantom-claim", scnId: "SCN-ZZZ-009" }],
  ])("%s", (_title, scnId, expected) => {
    expect(postingOf(check("lint:named", scnId), namedScenarioIds)).toEqual(expected);
  });

  it("posts an UNCITED run to the unnamed claim — and there is no by-name fallback left to try", () => {
    expect(postingOf(check("lint:named"), namedScenarioIds)).toEqual({
      kind: "unnamed-claim",
      posted: "cites-nothing",
    });
    expect(postingOf(check("lint:nobody-asked"), namedScenarioIds)).toEqual({
      kind: "unnamed-claim",
      posted: "cites-nothing",
    });
  });
});

describe("[SCN-LDG-022] postingOf routes a BROKEN evidence observation by its citation, as every other", () => {
  const brokenTest = (scnId: string | null) =>
    postingOf({ qualityCheck: "unit", scnId, status: "failed", broken: true }, namedScenarioIds);
  const brokenCheck = (scnId?: string) =>
    postingOf(
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:named",
        exists: false,
        enforcedOverRealSource: false,
        broken: true,
        ...(scnId !== undefined ? { scnId } : {}),
      },
      namedScenarioIds
    );

  it.each([
    ["behavioural", brokenTest],
    ["fitness", brokenCheck],
  ] as const)("posts a broken %s evidence observation to the claim it names", (_kind, post) => {
    expect(post("SCN-AAA-001")).toEqual({ kind: "scenario", scnId: "SCN-AAA-001" });
    expect(post("SCN-ZZZ-009")).toEqual({ kind: "phantom-claim", scnId: "SCN-ZZZ-009" });
  });

  it("posts a broken evidence observation that names no claim to the unnamed claim, as broken", () => {
    expect(brokenTest(null)).toEqual({ kind: "unnamed-claim", posted: "broken" });
    expect(brokenCheck()).toEqual({ kind: "unnamed-claim", posted: "broken" });
  });
});
