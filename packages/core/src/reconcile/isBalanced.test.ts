/**
 * @unit for @SCN-CLI-004 — the whole-run balance predicate `isBalanced`, the domain
 * derivation the CLI edge maps to the process exit code (balanced → 0, out-of-balance
 * → exactly 1).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * SCN-CLI-004 id, matching features/cli-balance.feature's @SCN-CLI-004 scenario and its
 * @e2e Cucumber step-block (tests/steps/cliBalance.steps.ts). A grep of SCN-CLI-004
 * returns the scenario, this @unit, and the @e2e steps.
 *
 * The predicate is over the WHOLE EvidenceReconciliation — out-of-balance iff ANY
 * reconciling item exists on ANY row (declared, suspense, or phantom). The load-bearing
 * case is the WATERMELON-ONLY run: every DECLARED scenario is balanced, yet an undemanded
 * static-guard sits unreconciled in the suspense row — a scan of declared-scenario
 * verdicts alone would call it balanced (the false pass the CI gate must never give);
 * `isBalanced` must call it out-of-balance because it consults every row's reconcilingItems.
 */

import { describe, it, expect } from "vitest";

import { isBalanced } from "./reconcile.js";
import type { EvidenceReconciliation, ScenarioReconciliation } from "../model.js";

/** A DECLARED scenario row that reconciles balanced — zero reconciling items. */
const balancedScenario = (scnId: string): ScenarioReconciliation => ({
  scnId,
  kind: "scenario",
  verdict: "balanced",
  evidenceObligations: [{ qualityCheck: "unit", outcome: "satisfied" }],
  reconcilingItems: [],
});

describe("[SCN-CLI-004] isBalanced — the whole-run balance predicate over the EvidenceReconciliation", () => {
  it("is balanced when every row reconciles with zero reconciling items", () => {
    const reconciliation: EvidenceReconciliation = {
      scenarioReconciliations: [balancedScenario("SCN-TGT-001"), balancedScenario("SCN-TGT-002")],
    };
    expect(isBalanced(reconciliation)).toBe(true);
  });

  it("is NOT balanced when a declared scenario carries an out-of-balance reconciling item", () => {
    // Teeth: a single missing obligation on one declared row makes the whole run
    // out-of-balance — the ordinary out-of-balance-scenario case the gate must red.
    const reconciliation: EvidenceReconciliation = {
      scenarioReconciliations: [
        balancedScenario("SCN-TGT-001"),
        {
          scnId: "SCN-TGT-002",
          kind: "scenario",
          verdict: "out-of-balance",
          evidenceObligations: [{ qualityCheck: "integration", outcome: "missing" }],
          reconcilingItems: [{ qualityCheck: "integration", outcome: "missing" }],
        },
      ],
    };
    expect(isBalanced(reconciliation)).toBe(false);
  });

  it("is NOT balanced for a WATERMELON-ONLY run — every declared scenario balanced, yet an undemanded static-guard sits in the suspense row", () => {
    // The load-bearing case (@SCN-CLI-004): NO declared scenario is out-of-balance, so a
    // scan of declared-scenario verdicts alone would exit 0 — the false pass. But an
    // undemanded static-guard (a `lint` credit no @lint obligation declares) posts a
    // `cites-no-scenario` reconciling item to the suspense row, so the WHOLE run is
    // out-of-balance. `isBalanced` consults every row's reconcilingItems and calls it false.
    const reconciliation: EvidenceReconciliation = {
      scenarioReconciliations: [
        balancedScenario("SCN-TGT-001"),
        balancedScenario("SCN-TGT-002"),
        {
          scnId: "(no scenario)",
          kind: "suspense-scenario",
          verdict: "out-of-balance",
          evidenceObligations: [{ qualityCheck: "lint", guard: "guard:static", outcome: "cites-no-scenario" }],
          reconcilingItems: [{ qualityCheck: "lint", guard: "guard:static", outcome: "cites-no-scenario" }],
        },
      ],
    };
    expect(isBalanced(reconciliation)).toBe(false);
  });

  it("is NOT balanced when only a phantom-scenario row (a credit citing an undeclared @SCN) is out-of-balance", () => {
    // A second suspense-family case: every declared scenario balanced, but a credit cites
    // an @SCN no feature declares → a phantom row, verdict always out-of-balance. The whole
    // run is out-of-balance even though no DECLARED scenario is.
    const reconciliation: EvidenceReconciliation = {
      scenarioReconciliations: [
        balancedScenario("SCN-TGT-001"),
        {
          scnId: "SCN-PHANTOM-999",
          kind: "phantom-scenario",
          verdict: "out-of-balance",
          evidenceObligations: [{ qualityCheck: "unit", outcome: "cites-unknown-scenario" }],
          reconcilingItems: [{ qualityCheck: "unit", outcome: "cites-unknown-scenario" }],
        },
      ],
    };
    expect(isBalanced(reconciliation)).toBe(false);
  });
});
