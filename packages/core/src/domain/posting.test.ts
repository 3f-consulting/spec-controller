import { describe, it, expect } from "vitest";

import { postingOf } from "./posting.js";
import type { FitnessEvidenceObservation } from "../model.js";

const namedScenarioIds = new Set(["SCN-AAA-001", "SCN-AAA-002"]);

describe("[SCN-LDG-001] postingOf routes a RUNTIME evidence observation by its citation", () => {
  it.each([
    ["posts an evidence observation citing a named @SCN to that scenario's row", "SCN-AAA-001", { kind: "scenario", scnId: "SCN-AAA-001" }],
    ["posts an evidence observation citing a PHANTOM @SCN to a phantom row", "SCN-ZZZ-009", { kind: "phantom-scenario", scnId: "SCN-ZZZ-009" }],
  ])("%s", (_title, scnId, expected) => {
    expect(
      postingOf({ qualityCheck: "unit", scnId, status: "passed" }, namedScenarioIds)
    ).toEqual(expected);
  });

  it("posts an UNCITED evidence observation (scnId null) to suspense, never phantom", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: null, status: "passed" }, namedScenarioIds)
    ).toEqual({ kind: "suspense-scenario", posted: "cites-nothing" });
  });

  it.each([
    ["posts a BROKEN evidence observation to suspense on the FLAG, though it carries a named scnId", "SCN-AAA-001"],
    ["posts a BROKEN evidence observation carrying a PHANTOM scnId to suspense too — it mints no phantom row", "SCN-ZZZ-009"],
  ])("%s", (_title, scnId) => {
    expect(
      postingOf(
        { qualityCheck: "unit", scnId, status: "failed", broken: true },
        namedScenarioIds
      )
    ).toEqual({ kind: "suspense-scenario", posted: "broken" });
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
    ["posts a CITING run to the one row it cites — exactly as a runtime evidence observation is posted", "SCN-AAA-001", { kind: "scenario", scnId: "SCN-AAA-001" }],
    ["posts a run citing an UNKNOWN @SCN to that phantom row, never to suspense", "SCN-ZZZ-009", { kind: "phantom-scenario", scnId: "SCN-ZZZ-009" }],
  ])("%s", (_title, scnId, expected) => {
    expect(postingOf(check("lint:named", scnId), namedScenarioIds)).toEqual(expected);
  });

  it("posts an UNCITED run to suspense — and there is no by-name fallback left to try", () => {
    expect(postingOf(check("lint:named"), namedScenarioIds)).toEqual({
      kind: "suspense-scenario",
      posted: "cites-nothing",
    });
    expect(postingOf(check("lint:nobody-asked"), namedScenarioIds)).toEqual({
      kind: "suspense-scenario",
      posted: "cites-nothing",
    });
  });
});
