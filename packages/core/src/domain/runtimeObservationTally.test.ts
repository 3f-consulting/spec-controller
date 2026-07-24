/**
 * Unit test for the runtime-observation tally (@SCN-RMD-003, 3F-2102) — the Ledger fold that
 * re-homes the runtime evidence-observation counting off the retired census.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-003, matching
 * features/report-model.feature, so a grep of the id returns both halves.
 *
 * THE FOLD EQUALS THE CENSUS, BY CONSTRUCTION. `runtimeObservationTally` and
 * `countRuntimeEvidenceObservationKinds` fold the SAME posted credits off the SAME Ledger, so the
 * tally's aggregate headlines cannot disagree with the census they replace:
 *   - the raw per-quality-check totals are identical;
 *   - `onScenario` equals the census's matched-attributed PLUS undemanded (every credit posted to a
 *     declared scenario's account — the test-volume attributed);
 *   - `onPhantomScenario` / `onSuspenseScenario` equal the census's phantom / suspense counts.
 * The Ledger is BUILT BY `reconcile()` over a spanning corpus, never hand-written
 * (evidence-manifesto §11A): the fixture can only state posted-entry shapes the pipeline emits.
 *
 * Parent: (@SCN-RMD-003) — the runtime-observation tally re-homes onto the Ledger.
 */

import { describe, it, expect } from "vitest";

import { runtimeObservationTally } from "./ledger.js";
import { countRuntimeEvidenceObservationKinds } from "../census/evidenceObservations.js";
import { reconcile } from "../reconcile/reconcile.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

describe("[SCN-RMD-003] runtimeObservationTally folds the same posted credits as the census, over the same Ledger", () => {
  // A SPANNING corpus reconciling to every credit account: SCN-A declares unit (matched) and is
  // ALSO cited at integration it never declared (undemanded); SCN-PHX-999 is undeclared (phantom);
  // a null-scnId credit cites no scenario (suspense); an ambiguous cucumber step is broken (also
  // suspense — it named no test). Built through reconcile(), so every row is a shape the pipeline
  // actually emits.
  const scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    // Cites SCN-A at a check it never declared → UNDEMANDED (posts to SCN-A's real account).
    { qualityCheck: "integration", scnId: "SCN-A", status: "passed" },
    // Cites an @SCN no scenario declares → PHANTOM.
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    // Cites no scenario → SUSPENSE.
    { qualityCheck: "integration", scnId: null, status: "passed" },
    // A proof that never ran (broken) → SUSPENSE (it named no test).
    { qualityCheck: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/x.feature" },
    // A demanded static-guard credit — the RUNTIME tally must SKIP it (the lint axis).
    { qualityCheck: "lint", staticGuard: "guard-x", exists: true, enforcedOverRealSource: true },
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  const tally = runtimeObservationTally(ledger);
  const census = countRuntimeEvidenceObservationKinds(ledger);

  it("folds the SAME raw per-quality-check totals as the census (lint credits skipped)", () => {
    expect(tally.rawByRuntimeQualityCheck).toEqual(census.rawByRuntimeQualityCheck);
  });

  it("onScenario equals the census matched-attributed PLUS undemanded (every credit on a declared account)", () => {
    const matched = census.attributed.reduce((n, a) => n + a.count, 0);
    expect(tally.onScenario).toBe(matched + census.undemandedCount);
  });

  it("onPhantomScenario / onSuspenseScenario equal the census phantom / suspense counts", () => {
    expect(tally.onPhantomScenario).toBe(census.phantomCount);
    expect(tally.onSuspenseScenario).toBe(census.suspenseCount);
  });

  it("holds the completeness identity: Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario", () => {
    const raw = Object.values(tally.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0);
    expect(raw).toBe(tally.onScenario + tally.onPhantomScenario + tally.onSuspenseScenario);
    // And it equals the census raw total — the two folds see the same credits.
    const censusRaw = Object.values(census.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0);
    expect(raw).toBe(censusRaw);
  });

  it("SKIPS the lint credit — the runtime axis never counts a static guard (e2e broken credit still counts on suspense)", () => {
    // The demanded static-guard credit posts to SCN-A's account too, but the runtime tally skips it:
    // onScenario counts only SCN-A's 2 unit + 1 undemanded integration = 3. The e2e broken credit
    // moved to suspense, so onSuspenseScenario = 1 (null) + 1 (broken) = 2.
    expect(tally.onScenario).toBe(3);
    expect(tally.onSuspenseScenario).toBe(2);
    expect(tally.onPhantomScenario).toBe(1);
  });
});
