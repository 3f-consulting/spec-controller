/**
 * Unit test for the runtime-observation tally (@SCN-RMD-003, 3F-2102/3F-2104) — the Ledger fold
 * that OWNS the runtime evidence-observation counting (the retired census's home).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-003, matching
 * features/report-model.feature, so a grep of the id returns both halves. TWO leaves ALSO self-cite:
 * the raw-per-quality-check leaf carries @SCN-RPT-017 (3F-2357) — the FULL-UNIFY view fix — and the
 * phantom/suspense leaf carries @SCN-RPT-023 (3F-2359) — a broken credit citing a real scenario
 * counts as suspense. Both unit arms died with the census module and are discharged here;
 * most-specific-citation-wins (@SCN-LDG-016) posts those two credits to RPT-017 and RPT-023, and the
 * remaining three leaves stay on RMD-003, which stays satisfied.
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
 * fold: the no-evidence-obligation credit posts to its real scenario's account (onScenario), the broken credit
 * moves to suspense, the phantom to its invented account, and the lint credit is skipped.
 *
 * Parent: (@SCN-RMD-003) — the runtime-observation tally is the Ledger's own fold.
 */

import { describe, it, expect } from "vitest";

import { runtimeObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

describe("[SCN-RMD-003] runtimeObservationTally folds the posted credits by scenario-kind and quality-check", () => {
  // A SPANNING corpus reconciling to every credit account: SCN-A raises unit (2 matched credits)
  // and is ALSO cited at integration it never named (1 no-evidence-obligation); SCN-PHX-999 matches no scenario (1
  // phantom); a null-scnId credit cites no scenario (1 suspense); an ambiguous cucumber step is
  // broken (1 suspense — it named no test); a named static-check credit rides the lint axis (must
  // be SKIPPED). Built through reconcile(), so every row is a shape the pipeline actually emits.
  const scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-A", status: "passed" }, // NO-EVIDENCE-OBLIGATION (posts to SCN-A)
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" }, // PHANTOM
    { qualityCheck: "integration", scnId: null, status: "passed" }, // SUSPENSE (uncited)
    { qualityCheck: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/x.feature" }, // SUSPENSE (broken)
    { qualityCheck: "lint", staticCheck: "guard-x", exists: true, enforcedOverRealSource: true }, // SKIPPED (lint axis)
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  const tally = runtimeObservationTally(ledger);

  // CO-CITED to @SCN-RPT-017 (3F-2357) — this assertion is ALSO the unit arm of the FULL-UNIFY view
  // fix. RPT-017's rule is that the report's evidence-observation views LEVEL a runtime observation
  // by the cited scenario's tag, never by the caller-supplied quality-check the retired census
  // hardcoded (cucumber ⇒ integration). The corpus above carries an e2e-levelled credit, and this is
  // the assertion that pins it counted under e2e rather than folded into integration. Teeth proven
  // by mutation (3F-2357): levelling every non-unit credit `integration` in `runtimeObservationTally`
  // reds THIS assertion alone of the five — `e2e: 0, integration: 3` — which is verbatim the `e2e: 0`
  // symptom RPT-017 names, and reds RPT-017's own @integration arm at the same step. The leaf
  // citation WINS over the describe's (@SCN-LDG-016, most-specific-citation-wins), so this credit
  // posts to RPT-017; @SCN-RMD-003 keeps the other three `it`s.
  it("[SCN-RPT-017] counts raw per quality-check over ALL runtime credits, SKIPPING the lint credit", () => {
    // unit: 2 (SCN-A) + 1 (phantom) = 3; integration: 1 (no-evidence-obligation) + 1 (suspense) = 2; e2e: 1
    // (broken, on suspense). The lint guard credit is not counted — this is the runtime axis.
    expect(tally.rawByRuntimeQualityCheck).toEqual({ unit: 3, integration: 2, e2e: 1, performance: 0 });
  });

  it("counts credits on a scenario's account as onScenario (matched-attributed AND no-evidence-obligation)", () => {
    // SCN-A's account carries 2 unit (matched) + 1 integration (no-evidence-obligation) = 3. onScenario is the
    // test-volume attributed, INCLUDING no-evidence-obligation — the retired census's four-way split (attributed
    // vs no-evidence-obligation) collapses to this one per-account count; the split lives on the ledger rows.
    expect(tally.onScenario).toBe(3);
  });

  // CO-CITED to @SCN-RPT-023 (3F-2359) — this assertion is ALSO the unit arm of "a broken
  // observation citing a real scenario counts as suspense, not attributed to that scenario". The
  // assertion survived the census retirement (4c5605e) verbatim; only its citation was lost when the
  // block was re-labelled. The corpus above carries a `broken` e2e credit that DOES cite a real
  // scenario (SCN-A), and `onSuspenseScenario === 2` is the assertion that pins it counted on
  // suspense rather than on SCN-A's account — which is RPT-023's rule and nothing else's. Teeth
  // proven by mutation (3F-2359): removing the `broken` fail-safe in `postingOf` so a broken credit
  // routes on its `scnId` reds THIS assertion for its own reason — `expected 1 to be 2` on
  // `onSuspenseScenario`, the credit having moved onto SCN-A. The leaf citation WINS over the
  // describe's (@SCN-LDG-016, most-specific-citation-wins), so this credit posts to RPT-023;
  // @SCN-RMD-003 keeps the other three `it`s and stays satisfied.
  it("[SCN-RPT-023] counts the phantom and suspense (incl. broken) credits on their invented accounts", () => {
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

  /**
   * The RETURNED total (3F-2231) — the same number, now carried rather than left for each consumer
   * to re-derive. Asserted against BOTH sides of the identity, so this is the test that holds the
   * invariant now that the runtime `throw` inside the fold is gone: that throw could not fire (one
   * walk moves both sides together), and an invariant belongs in a test rather than as dead
   * defensive code in a pure domain function. If the fold is ever split into two walks, this reds.
   */
  it("returns the total, equal to both sides of the identity", () => {
    expect(tally.total).toBe(6);
    expect(tally.total).toBe(
      Object.values(tally.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0)
    );
    expect(tally.total).toBe(
      tally.onScenario + tally.onPhantomScenario + tally.onSuspenseScenario
    );
  });
});
