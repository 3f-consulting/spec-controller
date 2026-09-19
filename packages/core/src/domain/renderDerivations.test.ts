/**
 * Unit test for the model derivations the RENDERER reads (@SCN-LDG-001 / @SCN-RPT-011, 3F-2203) —
 * the facts `render/markdown.ts` used to compute for itself.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry @SCN-LDG-001, matching
 * features/ledger.feature, so a grep of the id returns both halves.
 *
 * The criterion these serve: the renderer PROJECTS — any model fact it shows is read, not computed.
 * Each rule here had a second home in the renderer, agreeing by copy: `brokenItemsOf` (the
 * Run-integrity list), `presentStaticCheckCountOf` (the grid cell's right side),
 * `fitnessReconciliationsOf` (the fitness table AND `fitnessTally`, character-identical).
 *
 * The Ledger is BUILT BY `reconcile()` over a spanning corpus, never hand-written
 * (evidence-manifesto §11A): the fixture can only state shapes the pipeline actually emits.
 *
 * Parent: (@SCN-LDG-001).
 */

import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { brokenItemsOf, fitnessReconciliationsOf, fitnessTally, hasBrokenEvidence } from "./ledger.js";
import {
  isScenario,
  staticCheckReconciliationsOf,
  presentStaticCheckCountOf,
} from "./scenarioReconciliation.js";
import type { Scenario, EvidenceObservation, Ledger } from "../model.js";

/**
 * A SPANNING corpus:
 *   SCN-AAA-001 — names a WIRED check (satisfied): PRESENT.
 *   SCN-AAA-004 — names an UNWIRED check (watermelon): PRESENT too.
 *   SCN-AAA-002 — names an ABSENT guard (missing): not present.
 *   SCN-AAA-003 — a runtime obligation only: no static sub-rows at all.
 * Plus a no-evidence-obligation running guard (folds to the SUSPENSE row as a fitness CREDIT — the shape that
 * must never inflate the OBLIGATION-side fitness list) and a broken suite (the suspense `broken` item).
 */
const scenarios: Scenario[] = [
  { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-AAA-004", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
];

const evidenceObservations: EvidenceObservation[] = [
  // BOTH FITNESS CREDITS CITE (3F-2625), each its own row: one @fitness scenario is one check, so a
  // row raises at most one fitness obligation and the @SCN alone says which a credit answers
  // (3F-3563). Each is the shape the discovered route emits — the runnable handle that ran, citing
  // its row's @SCN. The handle-shaped `checkTag` this fixture once carried, a word no producer
  // emitted, left with the field (3F-2656, folded into 3F-3570).
  { qualityCheck: "fitness", staticCheck: "lint:wired", scnId: "SCN-AAA-001", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "fitness", staticCheck: "lint:unwired", scnId: "SCN-AAA-004", exists: true, enforcedOverRealSource: false },
  { qualityCheck: "fitness", staticCheck: "lint:no-evidence-obligation", exists: true, enforcedOverRealSource: true },
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

describe("[SCN-LDG-001] isScenario names only the named thing", () => {
  /**
   * Its own small Ledger, built through `reconcile()` so every row is a shape the pipeline emits —
   * one real scenario, one phantom (a credit citing an `@SCN` nothing carries), one suspense (an
   * uncited credit).
   *
   * THIS PINS A PREVIOUSLY-UNGUARDED RULE. Weakening the predicate to let phantom rows through
   * (`kind !== "suspense-scenario"`) left all 626 tests green during 3F-2230; only the
   * byte-identity corpus caught it. Canon is explicit — *"neither is a scenario"* — so the
   * distinction is pinned here rather than resting on a capture diff.
   */
  const mixed = reconcile(
    [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [
      { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-ZZZ-009", status: "passed" },
      { qualityCheck: "unit", scnId: null, status: "passed" },
    ]
  );
  const kindOf = (k: string) => mixed.scenarioReconciliations.find((r) => r.kind === k)!;

  it("is true for a real scenario row", () => {
    expect(isScenario(kindOf("scenario"))).toBe(true);
  });

  it("is FALSE for a phantom row — a cited-but-phantom id is not a scenario", () => {
    expect(isScenario(kindOf("phantom-scenario"))).toBe(false);
  });

  it("is FALSE for the suspense row — the bucket for uncited credits is not a scenario", () => {
    expect(isScenario(kindOf("suspense-scenario"))).toBe(false);
  });

  /** All three kinds are present, so the two negatives above are real cases, not vacuous. */
  it("spans all three row kinds in this fixture", () => {
    expect(mixed.scenarioReconciliations.map((r) => r.kind).sort()).toEqual([
      "phantom-scenario",
      "scenario",
      "suspense-scenario",
    ]);
  });
});

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

describe("[SCN-LDG-001] presentStaticCheckCountOf counts PRESENCE, not quality", () => {
  /**
   * THE RULE — a watermelon guard EXISTS (the script is there; it simply guards nothing), so it
   * counts as present. Its inadequacy is quality, reported in the reconciling items 🍉, never by
   * shrinking this count. Counting only `satisfied` would make a watermelon read as an ABSENT
   * guard, which is a different fault with a different cure.
   */
  it("counts a watermelon as present, exactly as it counts a satisfied check", () => {
    const wired = rowOf("SCN-AAA-001");
    const unwired = rowOf("SCN-AAA-004");
    expect(staticCheckReconciliationsOf(wired).map((r) => r.outcome)).toEqual(["satisfied"]);
    expect(staticCheckReconciliationsOf(unwired).map((r) => r.outcome)).toEqual(["watermelon"]);
    expect(presentStaticCheckCountOf(wired)).toBe(1);
    expect(presentStaticCheckCountOf(unwired)).toBe(1);
  });

  it("does NOT count a missing guard — no script at all is a real absence", () => {
    const row = rowOf("SCN-AAA-002");
    expect(staticCheckReconciliationsOf(row).map((r) => r.outcome)).toEqual(["missing"]);
    expect(presentStaticCheckCountOf(row)).toBe(0);
  });

  it("reads zero on a row naming no static check", () => {
    expect(staticCheckReconciliationsOf(rowOf("SCN-AAA-003"))).toEqual([]);
    expect(presentStaticCheckCountOf(rowOf("SCN-AAA-003"))).toBe(0);
  });
});

describe("[SCN-LDG-001] fitnessReconciliationsOf is the ONE named fitness list", () => {
  /**
   * SCENARIO ROWS ONLY. The suspense row carries a fitness CREDIT (the no-evidence-obligation running guard,
   * `cites-no-scenario`) — an observation, not an obligation. Including it would inflate the
   * obligation-side fitness total, and would do so in the table and the tally alike.
   */
  it("excludes the suspense row's fitness credit from the named list", () => {
    const named = fitnessReconciliationsOf(ledger);
    // Named by @SCN and outcome: a fitness sub-row names no check word since the re-key (3F-3570).
    expect(named.map((d) => `${d.scnId}:${d.reconciliation.outcome}`)).toEqual([
      "SCN-AAA-001:satisfied",
      "SCN-AAA-004:watermelon",
      "SCN-AAA-002:missing",
    ]);
    // The no-evidence-obligation guard IS on the ledger — it just is not an obligation.
    expect(
      ledger.scenarioReconciliations.some((r) => r.kind === "suspense-scenario")
    ).toBe(true);
  });

  /** The tally is a READING of the same list, so the table and its total line cannot disagree. */
  it("is the source the fitness tally folds", () => {
    const named = fitnessReconciliationsOf(ledger);
    expect(fitnessTally(ledger)).toEqual({
      satisfied: named.filter((d) => d.reconciliation.outcome === "satisfied").length,
      total: named.length,
    });
    expect(fitnessTally(ledger)).toEqual({ satisfied: 1, total: 3 });
  });
});
