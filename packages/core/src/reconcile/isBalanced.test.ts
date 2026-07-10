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

import { isBalanced, reconcile } from "./reconcile.js";
import type {
  EvidenceReconciliation,
  ScenarioReconciliation,
  Scenario,
  EvidenceObservation,
} from "../model.js";

/** A DECLARED scenario row that reconciles balanced — zero reconciling items. */
const balancedScenario = (scnId: string): ScenarioReconciliation => ({
  scnId,
  kind: "scenario",
  verdict: "balanced",
  evidenceObligations: [{ qualityCheck: "unit", outcome: "satisfied" }],
  pendingItems: [],
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
          pendingItems: [],
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
          pendingItems: [],
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
          pendingItems: [],
          reconcilingItems: [{ qualityCheck: "unit", outcome: "cites-unknown-scenario" }],
        },
      ],
    };
    expect(isBalanced(reconciliation)).toBe(false);
  });
});

/**
 * @unit for @SCN-CLI-005 — the POSITIVE BOUNDARY that keeps CLI-004 honest: an all-balanced
 * reconciliation is NOT reded by the new fail-on-out-of-balance gate. Where CLI-004's @unit
 * proves the predicate REDS correctly (out-of-balance scenario / watermelon / phantom → false),
 * this proves the gate must not OVER-fire — a genuinely clean run maps to exit code 0.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * SCN-CLI-005 id, matching features/cli-balance.feature's @SCN-CLI-005 scenario and its @e2e
 * Cucumber step-block (tests/steps/cliBalance.steps.ts, `// @SCN-CLI-005`). A grep of
 * SCN-CLI-005 returns the scenario, this @unit, and the @e2e steps.
 */
describe("[SCN-CLI-005] isBalanced — the positive boundary: a clean all-balanced run is not reded", () => {
  it("is balanced for a clean run (every declared row balanced, no suspense or phantom row) → isBalanced true", () => {
    // Mirrors the ALL-BALANCED FIXTURE the @e2e drives: two @unit declared scenarios both
    // satisfied and — crucially — NO suspense/phantom row at all (the guardless design).
    // isBalanced consults every row's reconcilingItems, finds none anywhere, and returns true.
    const reconciliation: EvidenceReconciliation = {
      scenarioReconciliations: [balancedScenario("SCN-TGT-001"), balancedScenario("SCN-TGT-002")],
    };
    expect(isBalanced(reconciliation)).toBe(true);
  });

  it("maps a balanced reconciliation to NO non-zero exit code (the gate does not over-fire)", () => {
    // The exit-code arm: the CLI edge's gate is `if (!isBalanced(balance)) process.exitCode = 1`.
    // For a balanced reconciliation the condition is false, so no non-zero code is ever set —
    // the run leaves process.exitCode at its default 0. Expressing the gate's own condition
    // here makes the positive boundary explicit: isBalanced true → exit code 0. Inverting or
    // always-failing the predicate flips this to 1 (the mutation that proves this pin's teeth).
    const reconciliation: EvidenceReconciliation = {
      scenarioReconciliations: [balancedScenario("SCN-TGT-001"), balancedScenario("SCN-TGT-002")],
    };
    const exitCode = !isBalanced(reconciliation) ? 1 : 0;
    expect(exitCode).toBe(0);
  });
});

/**
 * @unit for @SCN-PND-008 — the RUN-NEUTRAL boundary of the Pending Item: a WHOLE Evidence
 * Reconciliation whose only exceptions are Pending Items does not fail. Where @SCN-PND-007
 * pins the per-SCENARIO verdict (balanced), this pins the WHOLE-RUN predicate: `isBalanced`
 * over the entire reconciliation is true. A Pending Item lives in a row's `pendingItems`,
 * never its `reconcilingItems` — the partition (@SCN-PND-004) does the work — so `isBalanced`,
 * which consults every row's `reconcilingItems`, finds none anywhere and calls the run
 * balanced. This is the seam slice 5 (`--strict`, 3F-1504) later escalates.
 *
 * Asserts REAL reconcile output (evidence-manifesto §11A): the reconciliation is built by the
 * real `reconcile` over only-pending scenarios plus a passing-unit-plus-pending one, NOT a
 * hand-seeded fixture. Bidirectional evidence (Evidence Manifesto §9): the describe/it strings
 * carry the SCN-PND-008 id, matching features/pending-items.feature's @SCN-PND-008 scenario and
 * its @integration Cucumber step-block (tests/steps/pendingItems.steps.ts, `// @SCN-PND-008`).
 *
 * Green-first on the sibling partition (PND-004..007 already split pending off before the
 * match and out of `reconcilingItems`); its teeth are proven by a local, reverted mutation
 * making `isBalanced` also fail on `pendingItems.length > 0` — that reds this pin because the
 * run genuinely carries Pending Items.
 */
describe("[SCN-PND-008] isBalanced — an EvidenceReconciliation whose only exceptions are Pending Items does not fail", () => {
  it("is balanced over a WHOLE run whose only exceptions are Pending Items — one-sided, run-neutral", () => {
    // A real run mixing the shapes: two scenarios whose SOLE obligation is deferred pending
    // (each reconciles to zero rows on both sides, balanced-with-pending) and one carrying a
    // PASSING unit obligation alongside a deferred integration one (the unit satisfied, the
    // pending integration partitioned off). No row names a reconciling item, so the whole run
    // does not fail — yet three Pending Items are genuinely carried.
    const scenarios: Scenario[] = [
      { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
      { scnId: "SCN-PDR-002", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
      {
        scnId: "SCN-PDR-003",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    // The only observation supplied discharges SCN-PDR-003's bare unit obligation.
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PDR-003", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    // The balance is NOT vacuous: the run genuinely carries three Pending Items…
    const pendingCount = balance.scenarioReconciliations.flatMap((s) => s.pendingItems ?? []).length;
    expect(pendingCount).toBe(3);
    // …and yet NO row names a reconciling item anywhere.
    expect(
      balance.scenarioReconciliations.every((s) => s.reconcilingItems.length === 0)
    ).toBe(true);

    // The whole-run predicate: the run does not fail. Reds under the mutation that makes
    // `isBalanced` also fail on `pendingItems.length > 0`.
    expect(isBalanced(balance)).toBe(true);
  });
});
