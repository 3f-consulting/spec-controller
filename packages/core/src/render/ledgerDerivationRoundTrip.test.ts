/**
 * Unit test for the Ledger-derivation round-trip (@SCN-NPS-002) — the second half of the
 * no-parallel-store lock (DDD retrofit Slice 8, 3F-2101). Where @SCN-NPS-001 proves NO parallel
 * store exists in the source, this proves the materialised `summary` IS a pure fold of the
 * serialised Ledger — it carries no information the Ledger does not, so there is no independent
 * store hiding in the summary either. summary = fold-of-serialised-Ledger, every aggregate.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN-NPS-002 id
 * matching features/no-parallel-store.feature, so a grep of the id returns both halves. `@unit`-only,
 * data-only — Cucumber skips it; this Vitest test IS the observed evidence. CI-gated via `pnpm test`.
 *
 * Distinct from @SCN-RMD-007 (`renderReportFromJson.test.ts`), which proves markdown byte-identity
 * (a different property): this proves the JSON summary re-derives from the Ledger rows alone.
 *
 * The method: `renderJson(__er(assembleRenderInput(__er(...))))` over a spanning reconciler-true corpus → `JSON.parse`
 * → INDEPENDENTLY re-fold `ledgerTally` / `runtimeObservationTally` / `staticObservationTally` (the
 * domain folds, imported from `../domain/ledger.js`) over `parsed.ledger.scenarioReconciliations`,
 * and assert each re-derived value equals the materialised `parsed.summary.*`. Teeth: drift a
 * `summary` value (or drop a posted credit from a Ledger row) → a `deepStrictEqual` throws.
 *
 * Parent: @SCN-NPS-002 — the Ledger-derivation round-trip (3F-2200, DDD retrofit Slice 8 ②).
 */

import { describe, it, expect } from "vitest";
import { deepStrictEqual } from "node:assert";
import { renderJson } from "./json.js";
import {
  ledgerTally,
  runtimeObservationTally,
  staticObservationTally,
  RUNTIME_QUALITY_CHECKS,
} from "../domain/ledger.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger, Scenario, EvidenceObservation } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import { summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

/**
 * Test-local composition of the Evidence Reconciliation from a Ledger fixture (3F-2233).
 *
 * It states NO rule of its own: `summaryOf` is the concept's OWN tally — the very function its
 * factory calls — so this duplicates nothing. Only the entry path differs. `evidenceReconciliationOf`
 * builds from JOURNAL inputs (what production does); these fixtures already hold a Ledger, so they
 * compose the concept around it rather than re-reconciling.
 */
const __er = (ledger: Ledger, wo = false, wg = false): EvidenceReconciliation => ({
  summary: summaryOf(ledger, wo, wg),
  ledger,
});


// RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the Ledger is PRODUCED by reconcile() over a
// SPANNING corpus, so every summary aggregate has a non-trivial value to re-fold (an all-zero corpus
// could not make the round-trip vacuous). No static check is named by more than one scenario, so
// the identity-deduped `staticObservationTally` re-folds cleanly across the JSON boundary (JSON has
// no shared references — a guard named twice would appear as two objects and inflate the re-fold;
// this corpus deliberately avoids that). The corpus:
//   SCN-CHK-001: @unit, one passing unit credit                → balanced scenario row (onScenario)
//   SCN-CHK-002: @integration, no credit                       → a missing evidence obligation
//   SCN-CHK-003: @lint=lint:foo, running & wired               → the named running static check
//   SCN-CHK-004: @integrationpending                           → a Pending Item (pending = 1)
//   1 unit credit citing SCN-PHX-001 (no feature carries it)   → a phantom row (onPhantomScenario)
//   1 uncited unit credit + the no-evidence-obligation running lint:bar    → the suspense row (onSuspenseScenario)
const scenarios: Scenario[] = [
  { scnId: "SCN-CHK-001", evidenceObligations: [{ qualityCheck: "unit" }] },
  { scnId: "SCN-CHK-002", evidenceObligations: [{ qualityCheck: "integration" }] },
  { scnId: "SCN-CHK-003", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:foo" }] },
  { scnId: "SCN-CHK-004", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
];
const observations: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-CHK-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-PHX-001", status: "passed" },
  { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/b.test.ts" },
  { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
];
const balance: Ledger = reconcile(scenarios, observations);

const ctx: RunContext = {
  target: "nps-002-roundtrip",
  inputs: { features: "tests/fixtures/roundtrip/features" },
  runStart: new Date("2026-07-27T09:00:00.000Z"),
  sourceSha: null,
};

/**
 * The re-derived summary — every aggregate INDEPENDENTLY re-folded from the SERIALISED Ledger rows
 * (`parsed.ledger.scenarioReconciliations`, back through `JSON.parse`). Shaped exactly as the
 * assembler shapes `summary` (`buildSummary` in `assemble/report.ts`) so it compares key-for-key.
 */
function refoldFromSerialisedLedger(parsed: {
  ledger: { scenarioReconciliations: Ledger["scenarioReconciliations"] };
}) {
  const serialised: Ledger = { scenarioReconciliations: parsed.ledger.scenarioReconciliations };
  const led = ledgerTally(serialised);
  const runtime = runtimeObservationTally(serialised);
  const staticChecks = staticObservationTally(serialised);
  return {
    scenarioReconciliations: led.scenarioReconciliations,
    evidenceObligations: led.evidenceObligations,
    pending: led.pending,
    lint: led.lint,
    rawByRuntimeQualityCheck: runtime.rawByRuntimeQualityCheck,
    testVolume: {
      totalEvidenceObservations: RUNTIME_QUALITY_CHECKS.reduce(
        (n, qc) => n + runtime.rawByRuntimeQualityCheck[qc],
        0
      ),
      onScenario: runtime.onScenario,
      onPhantomScenario: runtime.onPhantomScenario,
      onSuspenseScenario: runtime.onSuspenseScenario,
    },
    staticChecks,
  };
}

// The full report as the CI emits it — runtime-observation axis + static-check axis in play, so
// `testVolume` / `rawByRuntimeQualityCheck` / `staticChecks` are all materialised on `summary`.
function renderParsed() {
  return JSON.parse(renderJson(__er(balance, true, true), ctx));
}

describe("[SCN-NPS-002] every summary aggregate re-folds from the serialised Ledger", () => {
  it("re-derives every summary.* aggregate as an independent fold of parsed.ledger.scenarioReconciliations", () => {
    const parsed = renderParsed();
    const refold = refoldFromSerialisedLedger(parsed);

    // Sanity: the corpus exercises every axis with a non-trivial value, so the equalities below are
    // not vacuous (an all-zero corpus could not fake the round-trip) — the ledger-derivation twin of
    // @SCN-NPS-001's ">N files scanned" floor.
    expect(parsed.summary.scenarioReconciliations.total).toBeGreaterThan(0);
    expect(parsed.summary.scenarioReconciliations.phantom).toBe(1);
    expect(parsed.summary.scenarioReconciliations.suspense).toBe(1);
    expect(parsed.summary.testVolume.onScenario).toBeGreaterThan(0);
    expect(parsed.summary.testVolume.onPhantomScenario).toBe(1);
    expect(parsed.summary.testVolume.onSuspenseScenario).toBe(1);
    expect(parsed.summary.staticChecks.runningStaticCheckCount).toBeGreaterThan(0);
    expect(parsed.summary.staticChecks.uncitedStaticCheckCount).toBe(1);
    expect(parsed.summary.pending).toBe(1);

    // THE PROPERTY: summary = fold-of-serialised-Ledger, aggregate by aggregate. `deepStrictEqual`
    // throws on ANY drift (structure or value), so each line is the exact round-trip — the materialised
    // summary carries nothing the Ledger rows do not.
    deepStrictEqual(parsed.summary.scenarioReconciliations, refold.scenarioReconciliations);
    deepStrictEqual(parsed.summary.evidenceObligations, refold.evidenceObligations);
    deepStrictEqual(parsed.summary.evidenceObligations.byOutcome, refold.evidenceObligations.byOutcome);
    deepStrictEqual(parsed.summary.pending, refold.pending);
    deepStrictEqual(parsed.summary.lint, refold.lint);
    deepStrictEqual(parsed.summary.testVolume, refold.testVolume);
    deepStrictEqual(parsed.summary.rawByRuntimeQualityCheck, refold.rawByRuntimeQualityCheck);
    deepStrictEqual(parsed.summary.staticChecks, refold.staticChecks);
  });

  it("has teeth: a drifted summary aggregate — or a mutated Ledger row — reds the round-trip", () => {
    // (1) DRIFT A MATERIALISED SUMMARY VALUE off its fold — the round-trip's `deepStrictEqual` must
    // throw. This is the drift a resurrected parallel store would introduce: a summary number that no
    // longer equals the Ledger fold.
    const drifted = renderParsed();
    const refold = refoldFromSerialisedLedger(drifted);
    drifted.summary.pending += 1;
    expect(() => deepStrictEqual(drifted.summary.pending, refold.pending)).toThrow();
    drifted.summary.testVolume.onScenario += 1;
    expect(() => deepStrictEqual(drifted.summary.testVolume, refold.testVolume)).toThrow();

    // (2) MUTATE A LEDGER ROW (drop its posted runtime credits) WITHOUT touching `summary` — the
    // re-fold now diverges from the untouched summary, so the round-trip reds. This is the dual: the
    // source of truth moved but the summary did not, exactly what a parallel store lets drift.
    const mutated = renderParsed();
    const row = mutated.ledger.scenarioReconciliations.find(
      (r: { kind?: string; evidenceObservations: { qualityCheck: string }[] }) =>
        r.evidenceObservations.some((o) => o.qualityCheck !== "lint")
    )!;
    row.evidenceObservations = row.evidenceObservations.filter(
      (o: { qualityCheck: string }) => o.qualityCheck === "lint"
    );
    const refoldMutated = refoldFromSerialisedLedger(mutated);
    expect(() => deepStrictEqual(mutated.summary.testVolume, refoldMutated.testVolume)).toThrow();
    expect(() =>
      deepStrictEqual(mutated.summary.rawByRuntimeQualityCheck, refoldMutated.rawByRuntimeQualityCheck)
    ).toThrow();
  });
});
