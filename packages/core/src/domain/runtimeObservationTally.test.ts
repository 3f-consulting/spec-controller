/**
 * Unit test for the runtime-observation tally (@SCN-RMD-003, 3F-2102/3F-2104) — the Ledger fold
 * that OWNS the runtime evidence-observation counting (the retired census's home).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-003, matching
 * features/report-model.feature, so a grep of the id returns both halves.
 *
 * `runtimeObservationTally` walks the POSTED CREDITS on the Ledger rows and reads each credit's
 * ACCOUNT off the row it posted to (@SCN-LDG-022) — the reconciler's own ruling, never
 * re-classified. It counts the runtime axis two ways over the same credits: raw per quality-check,
 * and per scenario-kind (onScenario / onPhantomScenario / onSuspenseScenario). They jointly exhaust
 * the raw total BY CONSTRUCTION: Σ raw = onScenario + onPhantomScenario + onSuspenseScenario. The
 * Ledger is BUILT BY `reconcile()` over a spanning corpus, never hand-written (evidence-manifesto
 * §11A): the fixture can only state posted-entry shapes the pipeline emits.
 *
 * This re-homes the retired census's identity coverage (@SCN-LDG-008 / @SCN-RPT-017/023) onto the
 * fold: the undemanded credit posts to its real scenario's account (onScenario), the broken credit
 * moves to suspense, the phantom to its invented account, and the lint credit is skipped.
 *
 * Parent: (@SCN-RMD-003) — the runtime-observation tally is the Ledger's own fold.
 */

import { describe, it, expect } from "vitest";

import { runtimeObservationTally } from "./ledger.js";
import { reconcile } from "../reconcile/reconcile.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

describe("[SCN-RMD-003] runtimeObservationTally folds the posted credits by scenario-kind and quality-check", () => {
  // A SPANNING corpus reconciling to every credit account: SCN-A declares unit (2 matched credits)
  // and is ALSO cited at integration it never declared (1 undemanded); SCN-PHX-999 is undeclared (1
  // phantom); a null-scnId credit cites no scenario (1 suspense); an ambiguous cucumber step is
  // broken (1 suspense — it named no test); a demanded static-guard credit rides the lint axis (must
  // be SKIPPED). Built through reconcile(), so every row is a shape the pipeline actually emits.
  const scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-A", status: "passed" }, // UNDEMANDED (posts to SCN-A)
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" }, // PHANTOM
    { qualityCheck: "integration", scnId: null, status: "passed" }, // SUSPENSE (uncited)
    { qualityCheck: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/x.feature" }, // SUSPENSE (broken)
    { qualityCheck: "lint", staticGuard: "guard-x", exists: true, enforcedOverRealSource: true }, // SKIPPED (lint axis)
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  const tally = runtimeObservationTally(ledger);

  it("counts raw per quality-check over ALL runtime credits, SKIPPING the lint credit", () => {
    // unit: 2 (SCN-A) + 1 (phantom) = 3; integration: 1 (undemanded) + 1 (suspense) = 2; e2e: 1
    // (broken, on suspense). The lint guard credit is not counted — this is the runtime axis.
    expect(tally.rawByRuntimeQualityCheck).toEqual({ unit: 3, integration: 2, e2e: 1, performance: 0 });
  });

  it("counts credits on a DECLARED scenario's account as onScenario (matched-attributed AND undemanded)", () => {
    // SCN-A's account carries 2 unit (matched) + 1 integration (undemanded) = 3. onScenario is the
    // test-volume attributed, INCLUDING undemanded — the retired census's four-way split (attributed
    // vs undemanded) collapses to this one per-account count; the split lives on the ledger rows.
    expect(tally.onScenario).toBe(3);
  });

  it("counts the phantom and suspense (incl. broken) credits on their invented accounts", () => {
    expect(tally.onPhantomScenario).toBe(1); // SCN-PHX-999
    // The uncited credit AND the broken credit both post to suspense (@SCN-LDG-007/017) — the broken
    // one MOVED there (it cited a real scenario but never ran), never onto SCN-A's account.
    expect(tally.onSuspenseScenario).toBe(2);
  });

  it("holds the completeness identity BY CONSTRUCTION: Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario", () => {
    const raw = Object.values(tally.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0);
    expect(raw).toBe(6);
    expect(raw).toBe(tally.onScenario + tally.onPhantomScenario + tally.onSuspenseScenario);
  });
});
