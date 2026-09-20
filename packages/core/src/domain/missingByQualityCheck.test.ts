/**
 * @unit for @SCN-RMD-008 — the missing split names ALL FIVE quality-checks, in canonical order.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-RMD-008, matching
 * features/report-model.feature, so a grep of the id returns both halves.
 *
 * WHY A SEPARATE FILE. `renderInput.test.ts` — where @SCN-RMD-008's other arms live — is far over
 * the 400-code-line ceiling, so under @SCN-FIT-001 any change touching it reds until it comes back
 * under the standard; appending arms to it is the one move that cannot work. (3F-3466 deleted the
 * per-file allowance that used to freeze it at its measured value instead.)
 * The house pattern is a focused sibling file (`untaggedScenarioRow.test.ts`), and an @SCN
 * carrying arms in more than one file is routine.
 *
 * WHAT THE MUTANTS ARE, read off their COLUMN RANGES rather than off the line (3F-2880's rule).
 * `ledger.ts` 252 holds `QUALITY_CHECK_ORDER`. Two `StringLiteral → ""` survivors sit at cols 80
 * and 87 — the `"e2e"` and `"performance"` positions, and nothing else on that line.
 *
 * WHY THIS IS NOT COSMETIC. The constant is the `filter` SOURCE for `missingByQualityCheck`
 * (`ledger.ts` 344): the split is built by filtering the canonical order down to the quality-checks
 * that actually carry a missing evidence obligation. Blank `"e2e"` and no corpus can ever put e2e
 * into the split — a run whose e2e obligation IS missing reports a split that omits e2e entirely,
 * so the reader is told nothing is missing at a quality-check where something is. Both mutants
 * survived because no fixture in the tree raised a missing obligation at either quality-check;
 * the assertion could always resolve the difference, there was simply nothing to resolve.
 *
 * WHY @SCN-RMD-008 OWNS THIS, checked against the Gherkin rather than a neighbouring comment
 * (3F-2883's rule). Its closing Then line reads *"the summary's missing split is carried under
 * missingByQualityCheck keyed by quality-check"* — this field, by name. A missing e2e obligation
 * dropped from the split is that line being false, so presence is squarely the scenario's claim.
 * The SEQUENCE is the incremental part, and it is already this @SCN's: the pre-existing arm in
 * `renderInput.test.ts` asserts `toEqual([{fitness,1},{unit,1}])` under the comment *"fitness first (the
 * canonical quality-check order)"*. This widens that same claim from two positions to five rather
 * than opening a new one. (`@SCN-RPT-004`'s Rule prose also says "canonical order (fitness first)",
 * but about the MARKDOWN Detail cell — one layer downstream of this constant, and reached through
 * a rendered string. The ledger-level pin belongs at the ledger.)
 *
 * WHY THE SEQUENCE AND NOT SET MEMBERSHIP. The constant's whole job is the order — its own comment
 * calls it *"The canonical quality-check subject order"* — and `toEqual` over an array is
 * order-sensitive, so pinning the value pins each of the five positions. Set membership would
 * green a reordering, which is the one thing the constant exists to fix.
 *
 * WHY THE ARM READS `ledgerTally` DIRECTLY. It is one call closer to the mutated constant than the
 * assembled report the sibling arms read, with no assembler or serialiser in between to lose the
 * ordering. Everything upstream of it is still the REAL parse → reconcile pipeline, so the corpus
 * is a genuine run rather than a hand-seeded balance.
 */

import { describe, it, expect } from "vitest";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "./evidenceReconciliation.js";
import { ledgerTally } from "./ledger.js";

describe("[SCN-RMD-008] the missing split carries every quality-check in canonical order", () => {
  // ONE stepless scenario spanning all four runtime quality-checks. `@fitness` and the configured
  // row naming it raise the fitness obligation (@SCN-LNT-018), and each tier tag raises its own
  // runtime obligation, so the corpus raises five. `reconcile` is handed NO Evidence Observations,
  // so every one of the five reconciles `missing` — the outcome the split is built from.
  const feature = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @integration @e2e @performance @fitness @SCN-RMD-008",
    "    Scenario: a fixture scenario",
  ].join("\n");

  it("names fitness, unit, integration, e2e and performance, in that order", () => {
    const tally = ledgerTally(reconcile(parseScenarios(feature), []));

    // Five raised, five missing — so no quality-check is absent from the split because it had
    // nothing to report. Whatever the split omits, it omits while holding a missing obligation.
    expect(tally.evidenceObligations.total).toBe(5);
    expect(tally.evidenceObligations.byOutcome.missing).toBe(5);

    expect(tally.evidenceObligations.missingByQualityCheck).toEqual([
      { subject: "fitness", count: 1 },
      { subject: "unit", count: 1 },
      { subject: "integration", count: 1 },
      { subject: "e2e", count: 1 },
      { subject: "performance", count: 1 },
    ]);
  });
});
