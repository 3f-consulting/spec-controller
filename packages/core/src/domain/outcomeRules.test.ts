/**
 * Unit test for the CREDIT-SIDE, DEGENERATE and ROW-SHAPE outcome rules (@SCN-LDG-001, 3F-2204) —
 * the Class E rules extracted from the `reconcile` fold onto the concepts that own them.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry @SCN-LDG-001, matching
 * features/ledger.feature, so a grep of the id returns both halves.
 *
 * These state WHAT an entry reconciles to, as opposed to WHERE it lands (`posting.test.ts`).
 *
 * ONE OF THESE PINS A PREVIOUSLY-UNGUARDED RULE. The suspense row's item ORDER — `broken` FIRST,
 * because a broken run's other suspense items are downstream noise — was asserted by NO test in
 * the repo: moving the broken arm to the end of `suspenseReconciliationsOf` left all 605 tests
 * green (found by plant during 3F-2204; only the byte-identity corpus caught it). The order is a
 * stated canon rationale, not an accident of assembly, so it is pinned here.
 *
 * Parent: (@SCN-LDG-001).
 */

import { describe, it, expect } from "vitest";

import {
  undemandedReconciliationsOf,
  citesUnknownScenarioReconciliationsOf,
  suspenseReconciliationsOf,
  noScnCodeReconciliations,
} from "./qualityCheckReconciliation.js";
import { qualityCheckReconciliationsOf } from "./scenarioReconciliation.js";
import { evidenceObligationsOf, pendingItemsOf } from "./journal.js";
import type {
  Scenario,
  RuntimeEvidenceObservation,
  GuardEvidenceObservation,
  QualityCheckReconciliation,
} from "../model.js";

const credit = (
  qualityCheck: RuntimeEvidenceObservation["qualityCheck"],
  scnId: string | null,
  extra: Partial<RuntimeEvidenceObservation> = {}
): RuntimeEvidenceObservation => ({ qualityCheck, scnId, status: "passed", ...extra });

describe("[SCN-LDG-001] the pending partition splits a scenario's obligations exactly", () => {
  const scenario: Scenario = {
    scnId: "SCN-AAA-001",
    evidenceObligations: [
      { qualityCheck: "unit" },
      { qualityCheck: "e2e", pending: true },
      { qualityCheck: "integration" },
    ],
  };

  it("names only the non-pending obligations, in document order", () => {
    expect(evidenceObligationsOf(scenario.evidenceObligations)).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("raises one Pending Item per deferred obligation", () => {
    expect(pendingItemsOf(scenario)).toEqual([{ qualityCheck: "e2e" }]);
  });

  /** The two are EXACT complements — nothing dropped, nothing counted twice. */
  it("partitions with no overlap and no loss", () => {
    expect(
      evidenceObligationsOf(scenario.evidenceObligations).length + pendingItemsOf(scenario).length
    ).toBe(scenario.evidenceObligations.length);
  });

  /** @SCN-PND-022 — the scenario-scope deferral owes no specific check. */
  it("raises a quality-check-less Pending Item for a scenario-scope deferral", () => {
    expect(pendingItemsOf({ scnId: "SCN-AAA-002", evidenceObligations: [{ pending: true }] })).toEqual(
      [{ qualityCheck: undefined }]
    );
  });
});

describe("[SCN-LDG-001] undemandedReconciliationsOf lists credits at undeclared quality-checks", () => {
  const pairs = new Set(["SCN-AAA-001 unit"]);

  it("skips a credit at a DECLARED pair — that one reconciles as a matched obligation", () => {
    expect(
      undemandedReconciliationsOf("SCN-AAA-001", [credit("unit", "SCN-AAA-001")], pairs)
    ).toEqual([]);
  });

  it("lists a credit at an UNDECLARED quality-check, credit-only, carrying its locator", () => {
    const items = undemandedReconciliationsOf(
      "SCN-AAA-001",
      [credit("e2e", "SCN-AAA-001", { locator: "tests/a.e2e.ts" })],
      pairs
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.outcome).toBe("undemanded");
    expect(items[0]!.locator).toBe("tests/a.e2e.ts");
    // CREDIT-ONLY — a credit at an undeclared check reconciles against no obligation.
    expect(items[0]!.evidenceObligation).toBeUndefined();
    expect(items[0]!.evidenceObservation).toBeDefined();
  });
});

describe("[SCN-LDG-001] citesUnknownScenarioReconciliationsOf builds a phantom row's items", () => {
  it("posts one credit-only cites-unknown-scenario item per citing credit, in citation order", () => {
    const items = citesUnknownScenarioReconciliationsOf([
      credit("unit", "SCN-ZZZ-009", { locator: "tests/z1.test.ts" }),
      credit("integration", "SCN-ZZZ-009", { locator: "features/z2.feature" }),
    ]);
    expect(items.map((i) => i.outcome)).toEqual([
      "cites-unknown-scenario",
      "cites-unknown-scenario",
    ]);
    expect(items.map((i) => i.locator)).toEqual(["tests/z1.test.ts", "features/z2.feature"]);
    expect(items[0]!.evidenceObligation).toBeUndefined();
  });
});

describe("[SCN-LDG-001] suspenseReconciliationsOf orders the suspense row's items", () => {
  const broken = credit("unit", "SCN-AAA-001", {
    broken: true,
    locator: "tests/broken.test.ts",
    message: "Failed to collect",
  });
  const uncited = credit("unit", null, { locator: "tests/orphan.test.ts" });
  const guard: GuardEvidenceObservation = {
    qualityCheck: "lint",
    staticGuard: "lint:nobody-asked",
    exists: true,
    enforcedOverRealSource: true,
  };

  /**
   * THE ORDER IS THE RULE — `broken` FIRST, whatever order the streams are handed in. This is the
   * assertion that was missing from the repo entirely: reordering the arms left every other test
   * green.
   */
  it("lists broken FIRST, then the uncited runtime credits, then the undemanded static guards", () => {
    const items = suspenseReconciliationsOf([broken], [uncited], [guard]);
    expect(items.map((i) => i.outcome)).toEqual(["broken", "cites-no-scenario", "cites-no-scenario"]);
    expect(items[2]!.staticGuard).toBe("lint:nobody-asked");
  });

  /**
   * A broken item carries its WHERE-to-fix and WHAT-broke, and NO observation — a proof that never
   * ran is not an observed piece of evidence (the side-profile invariant, @SCN-LDG-031).
   */
  it("carries locator + message on a broken item, and no evidence observation", () => {
    const [item] = suspenseReconciliationsOf([broken], [], []);
    expect(item!.locator).toBe("tests/broken.test.ts");
    expect(item!.message).toBe("Failed to collect");
    expect(item!.evidenceObservation).toBeUndefined();
  });

  it("carries no locator on an undemanded static guard — a guard is read from config, not a test file", () => {
    const [item] = suspenseReconciliationsOf([], [], [guard]);
    expect(item!.locator).toBeUndefined();
    expect(item!.evidenceObservation).toBe(guard);
  });
});

describe("[SCN-LDG-001] qualityCheckReconciliationsOf degenerates a row to both-missing", () => {
  const anItem = (): QualityCheckReconciliation =>
    citesUnknownScenarioReconciliationsOf([credit("unit", "SCN-ZZZ-009")])[0]!;

  it("posts one both-missing item when the row reconciled to nothing on either side", () => {
    const items = qualityCheckReconciliationsOf([], [], []);
    expect(items.map((i) => i.outcome)).toEqual(["both-missing"]);
    // Blank on BOTH sides — neither a debit obligation nor a credit observation.
    expect(items[0]!.qualityCheck).toBeUndefined();
  });

  /**
   * THE PENDING CLAUSE (@SCN-PND-004) — an only-pending scenario reconciles to zero rows on both
   * sides and is NOT both-missing: it is balanced-with-pending.
   */
  it("does NOT degenerate when the row carries a Pending Item", () => {
    expect(qualityCheckReconciliationsOf([], [], [{ qualityCheck: "unit" }])).toEqual([]);
  });

  /**
   * @SCN-LDG-010, the twin — a zero-obligation scenario CITED by a stray credit already has an
   * undemanded row, so it must fall through rather than post a degenerate item beside it. This is
   * why detection keys on rows-emitted, never on the declaration count.
   */
  it("does NOT degenerate when an undemanded credit already produced a row", () => {
    const items = qualityCheckReconciliationsOf([], [anItem()], []);
    expect(items.map((i) => i.outcome)).toEqual(["cites-unknown-scenario"]);
  });
});

describe("[SCN-LDG-001] noScnCodeReconciliations builds the untagged row's debit-side item", () => {
  it("posts one scenario-scope no-scn-code item carrying a synthesised empty obligation", () => {
    const items = noScnCodeReconciliations();
    expect(items).toHaveLength(1);
    expect(items[0]!.outcome).toBe("no-scn-code");
    // SCENARIO-scope: with no code, no observation can link at ANY tier.
    expect(items[0]!.qualityCheck).toBeUndefined();
    // DEBIT-side (double-entry-manifesto line 39) — obligation exists, observation none.
    expect(items[0]!.evidenceObligation).toEqual({});
    expect(items[0]!.evidenceObservation).toBeUndefined();
  });
});
