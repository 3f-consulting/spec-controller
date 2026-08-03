/**
 * Unit test for THE POSTING RULE (@SCN-LDG-001, 3F-2202) — the destination rule extracted from the
 * `reconcile` fold onto its own concept module, canon's own glossary group
 * (`the maintainers' private notes`, "### Posting").
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry @SCN-LDG-001, matching
 * features/ledger.feature, so a grep of the id returns both halves.
 *
 * The rule under test decides WHERE an entry lands, never what it reconciles TO. Canon sets the
 * cardinality per axis: a RUNTIME credit cites, so it posts to exactly one row (its scenario, a
 * phantom, or suspense); a STATIC CHECK's run cites nothing and is matched BY NAME, so it posts to
 * EVERY row naming it, or to suspense if none does ("one run is evidence for all of them").
 *
 * Parent: (@SCN-LDG-001) — posting is the Ledger's assembly; the rule is its own concept.
 */

import { describe, it, expect } from "vitest";

import { postingOf, staticCheckCreditsPostingTo } from "./posting.js";
import type { Scenario, EvidenceObservation, GuardEvidenceObservation } from "../model.js";

const declared = new Set(["SCN-AAA-001", "SCN-AAA-002"]);
const named = new Set(["lint:named"]);

describe("[SCN-LDG-001] postingOf routes a RUNTIME credit by its citation", () => {
  it("posts a credit citing a declared @SCN to that scenario's row", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" }, declared, named)
    ).toEqual({ kind: "scenario", scnId: "SCN-AAA-001" });
  });

  it("posts a credit citing an UNDECLARED @SCN to a phantom row", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: "SCN-ZZZ-009", status: "passed" }, declared, named)
    ).toEqual({ kind: "phantom-scenario", scnId: "SCN-ZZZ-009" });
  });

  it("posts an UNCITED credit (scnId null) to suspense, never phantom", () => {
    expect(
      postingOf({ qualityCheck: "unit", scnId: null, status: "passed" }, declared, named)
    ).toEqual({ kind: "suspense-scenario", posted: "cites-nothing" });
  });

  /**
   * THE FAIL-SAFE (@SCN-LDG-017) — the arm order is the point, so this states it with an
   * observation that would route somewhere ELSE on every other arm: it carries a DECLARED scnId
   * and a status, either of which would win if `broken` were checked later. A proof that never ran
   * names no test, so it cites nothing whatever it structurally carries.
   */
  it("posts a BROKEN credit to suspense on the FLAG, though it carries a declared scnId", () => {
    expect(
      postingOf(
        { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "failed", broken: true },
        declared,
        named
      )
    ).toEqual({ kind: "suspense-scenario", posted: "broken" });
  });

  it("posts a BROKEN credit carrying an UNDECLARED scnId to suspense too — it mints no phantom row", () => {
    expect(
      postingOf(
        { qualityCheck: "unit", scnId: "SCN-ZZZ-009", status: "failed", broken: true },
        declared,
        named
      )
    ).toEqual({ kind: "suspense-scenario", posted: "broken" });
  });
});

describe("[SCN-LDG-001] postingOf routes a STATIC-CHECK credit by its name", () => {
  const guard = (staticCheck: string): GuardEvidenceObservation => ({
    qualityCheck: "lint",
    staticCheck,
    exists: true,
    enforcedOverRealSource: true,
  });

  it("posts a NAMED static check to every naming scenario — a set, not one row", () => {
    expect(postingOf(guard("lint:named"), declared, named)).toEqual({
      kind: "every-naming-scenario",
      staticCheck: "lint:named",
    });
  });

  it("posts a NO-EVIDENCE-OBLIGATION static check to suspense — the static analogue of an uncited credit", () => {
    expect(postingOf(guard("lint:nobody-asked"), declared, named)).toEqual({
      kind: "suspense-scenario",
      posted: "no-evidence-obligation-static-check",
    });
  });
});

describe("[SCN-LDG-001] staticCheckCreditsPostingTo resolves the by-name half per row", () => {
  const shared: GuardEvidenceObservation = {
    qualityCheck: "lint",
    staticCheck: "lint:shared",
    exists: true,
    enforcedOverRealSource: true,
  };
  const other: GuardEvidenceObservation = {
    qualityCheck: "lint",
    staticCheck: "lint:other",
    exists: true,
    enforcedOverRealSource: true,
  };
  const observations: EvidenceObservation[] = [shared, other];

  /**
   * @SCN-LDG-024 — one run is evidence for ALL naming scenarios, and it is the SAME OBJECT on each row
   * (`toBe`, not `toEqual`): that reference-sharing is exactly what makes the downstream
   * identity-dedupe in `staticObservationTally` both necessary and correct.
   */
  it("posts the SAME guard object to each of two naming rows", () => {
    const a: Scenario = {
      scnId: "SCN-AAA-001",
      evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:shared" }],
    };
    const b: Scenario = {
      scnId: "SCN-AAA-002",
      evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:shared" }],
    };
    expect(staticCheckCreditsPostingTo(a, observations)[0]).toBe(shared);
    expect(staticCheckCreditsPostingTo(b, observations)[0]).toBe(shared);
  });

  it("posts ONCE when one row declares the same handle twice", () => {
    const twice: Scenario = {
      scnId: "SCN-AAA-001",
      evidenceObligations: [
        { qualityCheck: "lint", staticCheck: "lint:shared" },
        { qualityCheck: "lint", staticCheck: "lint:shared" },
      ],
    };
    expect(staticCheckCreditsPostingTo(twice, observations)).toEqual([shared]);
  });

  /**
   * The ORDER is the ROW'S obligation document order, NOT the observation stream's — stated with a
   * row that declares the two handles in the OPPOSITE order to the stream, so an
   * observation-order implementation would fail this and only this.
   */
  it("orders the posted guards by the row's own obligation order, not the observation order", () => {
    const reversed: Scenario = {
      scnId: "SCN-AAA-001",
      evidenceObligations: [
        { qualityCheck: "lint", staticCheck: "lint:other" },
        { qualityCheck: "lint", staticCheck: "lint:shared" },
      ],
    };
    expect(staticCheckCreditsPostingTo(reversed, observations)).toEqual([other, shared]);
  });

  it("posts nothing for a named handle no observation answers", () => {
    const absent: Scenario = {
      scnId: "SCN-AAA-001",
      evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:absent" }],
    };
    expect(staticCheckCreditsPostingTo(absent, observations)).toEqual([]);
  });

  /**
   * The documented pending asymmetry (3F-2202), pinned so it cannot drift silently: a
   * `@lintpending` obligation carries NO `staticCheck`, so it posts nothing here — which is what
   * keeps this pending-INCLUSIVE walk from disagreeing with the pending-EXCLUDING
   * `staticCheckEvidenceObligationsOf` that `postingOf` consults.
   */
  it("posts nothing for a pending lint obligation, which carries no static check handle", () => {
    const pending: Scenario = {
      scnId: "SCN-AAA-001",
      evidenceObligations: [{ qualityCheck: "lint", pending: true }],
    };
    expect(staticCheckCreditsPostingTo(pending, observations)).toEqual([]);
  });
});
