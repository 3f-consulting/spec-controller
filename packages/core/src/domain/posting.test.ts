import { describe, it, expect } from "vitest";

import { postingOf } from "./posting.js";
import type { FitnessEvidenceObservation } from "../model.js";

const namedScenarioIds = new Set(["SCN-AAA-001", "SCN-AAA-002"]);

describe("[SCN-LDG-001] postingOf routes a RUNTIME credit by its citation", () => {
  it("posts a credit citing a named @SCN to that scenario's row", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" }, namedScenarioIds)
    ).toEqual({ kind: "scenario", scnId: "SCN-AAA-001" });
  });

  it("posts a credit citing a PHANTOM @SCN to a phantom row", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: "SCN-ZZZ-009", status: "passed" }, namedScenarioIds)
    ).toEqual({ kind: "phantom-scenario", scnId: "SCN-ZZZ-009" });
  });

  it("posts an UNCITED credit (scnId null) to suspense, never phantom", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: null, status: "passed" }, namedScenarioIds)
    ).toEqual({ kind: "suspense-scenario", posted: "cites-nothing" });
  });

  it("posts a BROKEN credit to suspense on the FLAG, though it carries a named scnId", () => {
    expect(
      postingOf(
        { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "failed", broken: true },
        namedScenarioIds
      )
    ).toEqual({ kind: "suspense-scenario", posted: "broken" });
  });

  it("posts a BROKEN credit carrying a PHANTOM scnId to suspense too — it mints no phantom row", () => {
    expect(
      postingOf(
        { qualityCheck: "unit", scnId: "SCN-ZZZ-009", status: "failed", broken: true },
        namedScenarioIds
      )
    ).toEqual({ kind: "suspense-scenario", posted: "broken" });
  });
});

describe("[SCN-LDG-001] postingOf routes a FITNESS credit by its citation, the same rule", () => {
  const check = (staticCheck: string, scnId?: string): FitnessEvidenceObservation => ({
    qualityCheck: "fitness",
    staticCheck,
    exists: true,
    enforcedOverRealSource: true,
    ...(scnId !== undefined ? { scnId } : {}),
  });

  it("posts a CITING run to the one row it cites — exactly as a runtime credit is posted", () => {
    expect(postingOf(check("lint:named", "SCN-AAA-001"), namedScenarioIds)).toEqual({
      kind: "scenario",
      scnId: "SCN-AAA-001",
    });
  });

  it("posts a run citing an UNKNOWN @SCN to that phantom row, never to suspense", () => {
    expect(postingOf(check("lint:named", "SCN-ZZZ-009"), namedScenarioIds)).toEqual({
      kind: "phantom-scenario",
      scnId: "SCN-ZZZ-009",
    });
  });

  it("posts an UNCITED run to suspense — and there is no by-name fallback left to try", () => {
    expect(postingOf(check("lint:named"), namedScenarioIds)).toEqual({
      kind: "suspense-scenario",
      posted: "no-evidence-obligation-static-check",
    });
    expect(postingOf(check("lint:nobody-asked"), namedScenarioIds)).toEqual({
      kind: "suspense-scenario",
      posted: "no-evidence-obligation-static-check",
    });
  });
});
