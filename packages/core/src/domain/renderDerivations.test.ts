/**
 * Unit test for the model derivations the RENDERER reads (@SCN-LDG-001 / @SCN-RPT-011, 3F-2203) —
 * the facts `render/markdown.ts` used to compute for itself.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry @SCN-LDG-001, matching
 * features/ledger.feature, so a grep of the id returns both halves.
 *
 * The criterion these serve: the renderer PROJECTS — any model fact it shows is read, not computed.
 * Each rule here had a second home in the renderer, agreeing by copy: `brokenItemsOf` (the
 * Run-integrity list), `presentStaticGuardCountOf` (the grid cell's right side),
 * `lintReconciliationsOf` (the lint table AND `lintTally`, character-identical).
 *
 * The Ledger is BUILT BY `reconcile()` over a spanning corpus, never hand-written
 * (evidence-manifesto §11A): the fixture can only state shapes the pipeline actually emits.
 *
 * Parent: (@SCN-LDG-001).
 */

import { describe, it, expect } from "vitest";

import { reconcile } from "../reconcile/reconcile.js";
import { brokenItemsOf, lintReconciliationsOf, lintTally, hasBrokenEvidence } from "./ledger.js";
import {
  staticGuardReconciliationsOf,
  presentStaticGuardCountOf,
} from "./scenarioReconciliation.js";
import type { Scenario, EvidenceObservation, Ledger } from "../model.js";

/**
 * A SPANNING corpus:
 *   SCN-AAA-001 — demands a WIRED guard (satisfied) and an UNWIRED one (watermelon): both PRESENT.
 *   SCN-AAA-002 — demands an ABSENT guard (missing): not present.
 *   SCN-AAA-003 — a runtime obligation only: no static sub-rows at all.
 * Plus an undemanded running guard (folds to the SUSPENSE row as a lint CREDIT — the shape that
 * must never inflate the DECLARED lint list) and a broken suite (the suspense `broken` item).
 */
const scenarios: Scenario[] = [
  {
    scnId: "SCN-AAA-001",
    evidenceObligations: [
      { qualityCheck: "lint", staticGuard: "lint:wired" },
      { qualityCheck: "lint", staticGuard: "lint:unwired" },
    ],
  },
  { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:absent" }] },
  { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
];

const evidenceObservations: EvidenceObservation[] = [
  { qualityCheck: "lint", staticGuard: "lint:wired", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "lint", staticGuard: "lint:unwired", exists: true, enforcedOverRealSource: false },
  { qualityCheck: "lint", staticGuard: "lint:undemanded", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "unit", scnId: "SCN-AAA-003", status: "passed" },
  {
    qualityCheck: "unit",
    scnId: null,
    status: "failed",
    broken: true,
    locator: "tests/broken.test.ts",
    message: "Failed to collect",
  },
];

const ledger: Ledger = reconcile(scenarios, evidenceObservations);
const rowOf = (scnId: string) =>
  ledger.scenarioReconciliations.find((r) => r.scnId === scnId)!;

describe("[SCN-LDG-001] brokenItemsOf lists the proofs that never ran", () => {
  it("returns each broken item with its where-to-fix and what-broke", () => {
    const items = brokenItemsOf(ledger);
    expect(items).toHaveLength(1);
    expect(items[0]!.outcome).toBe("broken");
    expect(items[0]!.locator).toBe("tests/broken.test.ts");
    expect(items[0]!.message).toBe("Failed to collect");
  });

  /** The predicate is DERIVED from this list, so the unsound stamp and the list cannot disagree. */
  it("agrees with hasBrokenEvidence in both directions", () => {
    expect(hasBrokenEvidence(ledger)).toBe(brokenItemsOf(ledger).length > 0);
    const sound = reconcile([scenarios[2]!], [evidenceObservations[3]!]);
    expect(brokenItemsOf(sound)).toEqual([]);
    expect(hasBrokenEvidence(sound)).toBe(false);
  });
});

describe("[SCN-LDG-001] presentStaticGuardCountOf counts PRESENCE, not quality", () => {
  /**
   * THE RULE — a watermelon guard EXISTS (the script is there; it simply guards nothing), so it
   * counts as present. Its inadequacy is quality, reported in the reconciling items 🍉, never by
   * shrinking this count. Counting only `satisfied` would make a watermelon read as an ABSENT
   * guard, which is a different fault with a different cure.
   */
  it("counts a watermelon as present alongside a satisfied guard", () => {
    const row = rowOf("SCN-AAA-001");
    expect(staticGuardReconciliationsOf(row).map((r) => r.outcome)).toEqual([
      "satisfied",
      "watermelon",
    ]);
    expect(presentStaticGuardCountOf(row)).toBe(2);
  });

  it("does NOT count a missing guard — no script at all is a real absence", () => {
    const row = rowOf("SCN-AAA-002");
    expect(staticGuardReconciliationsOf(row).map((r) => r.outcome)).toEqual(["missing"]);
    expect(presentStaticGuardCountOf(row)).toBe(0);
  });

  it("reads zero on a row demanding no static guard", () => {
    expect(staticGuardReconciliationsOf(rowOf("SCN-AAA-003"))).toEqual([]);
    expect(presentStaticGuardCountOf(rowOf("SCN-AAA-003"))).toBe(0);
  });
});

describe("[SCN-LDG-001] lintReconciliationsOf is the ONE declared static-guard list", () => {
  /**
   * SCENARIO ROWS ONLY. The suspense row carries a lint CREDIT (the undemanded running guard,
   * `cites-no-scenario`) — an observation, not an obligation. Including it would inflate the
   * declared lint total, and would do so in the table and the tally alike.
   */
  it("excludes the suspense row's lint credit from the declared list", () => {
    const declared = lintReconciliationsOf(ledger);
    expect(declared.map((d) => `${d.scnId}:${d.reconciliation.staticGuard}`)).toEqual([
      "SCN-AAA-001:lint:wired",
      "SCN-AAA-001:lint:unwired",
      "SCN-AAA-002:lint:absent",
    ]);
    // The undemanded guard IS on the ledger — it just is not a declared obligation.
    expect(
      ledger.scenarioReconciliations.some((r) => r.kind === "suspense-scenario")
    ).toBe(true);
  });

  /** The tally is a READING of the same list, so the table and its total line cannot disagree. */
  it("is the source the lint tally folds", () => {
    const declared = lintReconciliationsOf(ledger);
    expect(lintTally(ledger)).toEqual({
      satisfied: declared.filter((d) => d.reconciliation.outcome === "satisfied").length,
      total: declared.length,
    });
    expect(lintTally(ledger)).toEqual({ satisfied: 1, total: 3 });
  });
});
