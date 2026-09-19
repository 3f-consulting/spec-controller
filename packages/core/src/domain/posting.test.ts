/**
 * Unit test for THE POSTING RULE (@SCN-LDG-001, 3F-2202) — the destination rule extracted from the
 * `reconcile` fold onto its own concept module, canon's own glossary group
 * (`the maintainers' private notes`, "### Posting").
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry @SCN-LDG-001, matching
 * features/ledger.feature, so a grep of the id returns both halves.
 *
 * The rule under test decides WHERE an entry lands, never what it reconciles TO. ONE CARDINALITY,
 * over both axes (3F-2590): the CREDIT cites, so it posts to exactly one row — its scenario, a
 * phantom, or suspense. A fitness check's run reaches that row by carrying the `@SCN` of the
 * stepless scenario raising its obligation; when the seam reaches no `@SCN` it cites nothing, and
 * suspense is where an unattributed check is meant to surface.
 *
 * Parent: (@SCN-LDG-001) — posting is the Ledger's assembly; the rule is its own concept.
 */

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

  /**
   * THE FAIL-SAFE (@SCN-LDG-017) — the arm order is the point, so this states it with an
   * observation that would route somewhere ELSE on every other arm: it carries a REAL scnId
   * and a status, either of which would win if `broken` were checked later. A proof that never ran
   * names no test, so it cites nothing whatever it structurally carries.
   */
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
    // The handle and the check are DIFFERENT WORDS (`lint:named` ran; the obligation names a bare
    // check), so nothing here could be matching by name: the citation is the whole route.
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
    // THE TEETH OF THE DELETION (3F-2590). This handle used to be matched against the corpus's
    // named-handle set and posted to every row naming it. There is no such set and no such route:
    // a check the seam reached no @SCN for surfaces in suspense, which is the point of finding it.
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
