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
 * The predicate is over the WHOLE Ledger — out-of-balance iff ANY
 * reconciling item exists on ANY row (scenario, suspense, or phantom). The load-bearing
 * case is the WATERMELON-ONLY run: every scenario is balanced, yet an undemanded
 * static-guard sits unreconciled in the suspense row — a scan of scenario
 * verdicts alone would call it balanced (the false pass the CI gate must never give);
 * `isBalanced` must call it out-of-balance because it consults every row's reconcilingItems.
 */

import { describe, it, expect } from "vitest";

import { isBalanced, hasPendingItems, hasBrokenEvidence, reconcile } from "./reconcile.js";
import { makeQualityCheckReconciliation, OUTCOME_SIDE_PROFILE } from "../model.js";
import type {
  Ledger,
  ScenarioReconciliation,
  Scenario,
  EvidenceObservation,
} from "../model.js";

// @SCN-LDG-030: fixtures must mint branded Quality Check Reconciliations via the smart constructor.
// This helper supplies canon-correct PLACEHOLDER sides (content is immaterial to this predicate —
// only side PRESENCE is constrained by the invariant) so each fixture routes through the constructor.
function qcr(
  fields: Parameters<typeof makeQualityCheckReconciliation>[0],
): ReturnType<typeof makeQualityCheckReconciliation> {
  const profile = OUTCOME_SIDE_PROFILE[fields.outcome];
  return makeQualityCheckReconciliation({
    ...fields,
    ...(profile.obligation === "Exists" && fields.evidenceObligation === undefined
      ? { evidenceObligation: { qualityCheck: "unit" } }
      : {}),
    ...(profile.observation === "Exists" && fields.evidenceObservation === undefined
      ? { evidenceObservation: { qualityCheck: "unit", scnId: "SCN-FIXTURE-001", status: "passed" } }
      : {}),
  });
}

/** A scenario row that reconciles balanced — zero reconciling items. */
const balancedScenario = (scnId: string): ScenarioReconciliation => ({
  scnId,
  kind: "scenario",
  evidenceObservations: [],
  evidenceObligations: [],
  verdict: "balanced",
  qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "satisfied" })],
  pendingItems: [],
  reconcilingItems: [],
});

describe("[SCN-CLI-004] isBalanced — the whole-run balance predicate over the Ledger", () => {
  it("is balanced when every row reconciles with zero reconciling items", () => {
    const reconciliation: Ledger = {
      scenarioReconciliations: [balancedScenario("SCN-TGT-001"), balancedScenario("SCN-TGT-002")],
    };
    expect(isBalanced(reconciliation)).toBe(true);
  });

  it("is NOT balanced when a scenario carries an out-of-balance reconciling item", () => {
    // Teeth: a single missing obligation on one scenario row makes the whole run
    // out-of-balance — the ordinary out-of-balance-scenario case the gate must red.
    const reconciliation: Ledger = {
      scenarioReconciliations: [
        balancedScenario("SCN-TGT-001"),
        {
          scnId: "SCN-TGT-002",
          kind: "scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [qcr({ qualityCheck: "integration", outcome: "missing" })],
          pendingItems: [],
          reconcilingItems: [qcr({ qualityCheck: "integration", outcome: "missing" })],
        },
      ],
    };
    expect(isBalanced(reconciliation)).toBe(false);
  });

  it("is NOT balanced for a WATERMELON-ONLY run — every scenario balanced, yet an undemanded static-guard sits in the suspense row", () => {
    // The load-bearing case (@SCN-CLI-004): NO scenario is out-of-balance, so a
    // scan of scenario verdicts alone would exit 0 — the false pass. But an
    // undemanded static-guard (a `lint` credit no @lint obligation declares) posts a
    // `cites-no-scenario` reconciling item to the suspense row, so the WHOLE run is
    // out-of-balance. `isBalanced` consults every row's reconcilingItems and calls it false.
    const reconciliation: Ledger = {
      scenarioReconciliations: [
        balancedScenario("SCN-TGT-001"),
        balancedScenario("SCN-TGT-002"),
        {
          scnId: "(no scenario)",
          kind: "suspense-scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [qcr({ qualityCheck: "lint", staticGuard: "guard:static", outcome: "cites-no-scenario" })],
          pendingItems: [],
          reconcilingItems: [qcr({ qualityCheck: "lint", staticGuard: "guard:static", outcome: "cites-no-scenario" })],
        },
      ],
    };
    expect(isBalanced(reconciliation)).toBe(false);
  });

  it("is NOT balanced when only a phantom-scenario row (a credit citing an undeclared @SCN) is out-of-balance", () => {
    // A second suspense-family case: every scenario balanced, but a credit cites
    // an @SCN no feature declares → a phantom row, verdict always out-of-balance. The whole
    // run is out-of-balance even though no scenario is.
    const reconciliation: Ledger = {
      scenarioReconciliations: [
        balancedScenario("SCN-TGT-001"),
        {
          scnId: "SCN-PHANTOM-999",
          kind: "phantom-scenario",
          evidenceObservations: [],
          evidenceObligations: [],
          verdict: "out-of-balance",
          qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "cites-unknown-scenario" })],
          pendingItems: [],
          reconcilingItems: [qcr({ qualityCheck: "unit", outcome: "cites-unknown-scenario" })],
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
  it("is balanced for a clean run (every scenario row balanced, no suspense or phantom row) → isBalanced true", () => {
    // Mirrors the ALL-BALANCED FIXTURE the @e2e drives: two @unit scenarios both
    // satisfied and — crucially — NO suspense/phantom row at all (the guardless design).
    // isBalanced consults every row's reconcilingItems, finds none anywhere, and returns true.
    const reconciliation: Ledger = {
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
    const reconciliation: Ledger = {
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
describe("[SCN-PND-008] isBalanced — an Ledger whose only exceptions are Pending Items does not fail", () => {
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

/**
 * @unit for @SCN-CLI-011 — the `--strict` escalation, and the pure predicate `hasPendingItems`
 * it consults. Where @SCN-PND-008 pins that a balanced-with-pending run does not fail by
 * DEFAULT, this pins the OPT-IN escalation: under `--strict`, an otherwise-balanced run
 * CARRYING Pending Items exits the DISTINCT code 3 (taxonomy 0 balanced / 1 out-of-balance /
 * 2 usage / 3 pending-under-strict — a Pending Item is not out-of-balance, so it must NOT
 * share code 1). Out-of-balance DOMINATES: an out-of-balance run exits 1 regardless of
 * `--strict`, because the escalation is checked only when `isBalanced` is true. And the
 * escalation must NOT over-fire: a balanced run with NO Pending Items stays 0 even under
 * `--strict`.
 *
 * `hasPendingItems` is the SYMMETRIC counterpart to `isBalanced` (the two are the whole-run
 * verdict surface): true iff ANY row carries a Pending Item. Asserted over REAL `reconcile`
 * output (evidence-manifesto §11A) — the reconciliations are built by the real reconciler
 * over pending / out-of-balance / clean scenarios, NOT hand-seeded rows.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * SCN-CLI-011 id, matching features/cli-balance.feature's @SCN-CLI-011 scenario and its
 * @e2e Cucumber step-block (tests/steps/cliBalance.steps.ts, `// @SCN-CLI-011`). A grep of
 * SCN-CLI-011 returns the scenario, this @unit, and the @e2e steps.
 */
describe("[SCN-CLI-011] hasPendingItems + the --strict exit-3 escalation", () => {
  // The CLI edge's exit-code decision, expressed over the two REAL predicates — mirroring
  // `runBalance`'s gate: out-of-balance DOMINATES (1); else strict-with-pending escalates
  // (3); else 0. Exercising the real `isBalanced` / `hasPendingItems` here is what makes
  // this a genuine @unit on the escalation logic, not a re-statement of a constant.
  const exitCodeFor = (balance: Ledger, strict: boolean): number => {
    if (!isBalanced(balance)) return 1;
    if (strict && hasPendingItems(balance)) return 3;
    return 0;
  };

  it("hasPendingItems is true when any row carries a Pending Item (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] }],
      [],
    );
    expect(hasPendingItems(balance)).toBe(true);
  });

  it("hasPendingItems is false when no row carries a Pending Item (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-PDR-001", status: "passed" }],
    );
    expect(hasPendingItems(balance)).toBe(false);
  });

  it("--strict escalates an otherwise-balanced run carrying Pending Items to exit 3", () => {
    // Two scenarios whose SOLE obligation is deferred pending → each partitions off to a
    // one-sided Pending Item, leaving ZERO reconciling rows: the run is balanced yet carries
    // Pending Items. --strict maps this to the distinct code 3.
    const balance = reconcile(
      [
        { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
        { scnId: "SCN-PDR-002", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
      ],
      [],
    );
    expect(isBalanced(balance)).toBe(true);
    expect(hasPendingItems(balance)).toBe(true);
    expect(exitCodeFor(balance, true)).toBe(3);
  });

  it("out-of-balance DOMINATES: an out-of-balance run carrying Pending Items exits 1 under --strict, never 3", () => {
    // One scenario is out-of-balance (a required integration obligation with no matching
    // observation → missing), another defers a pending one. Out-of-balance is checked FIRST,
    // so --strict never reaches the escalation — the run exits 1, not 3.
    const balance = reconcile(
      [
        { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration" }] },
        { scnId: "SCN-PDR-002", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
      ],
      [],
    );
    expect(isBalanced(balance)).toBe(false);
    expect(hasPendingItems(balance)).toBe(true);
    expect(exitCodeFor(balance, true)).toBe(1);
  });

  it("a balanced run with NO Pending Items stays 0 even under --strict (the escalation does not over-fire)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-PDR-001", status: "passed" }],
    );
    expect(isBalanced(balance)).toBe(true);
    expect(hasPendingItems(balance)).toBe(false);
    expect(exitCodeFor(balance, true)).toBe(0);
  });
});

/**
 * @unit for @SCN-LDG-018 — `hasBrokenEvidence`, the THIRD whole-run predicate, beside `isBalanced`
 * and `hasPendingItems`. @SCN-LDG-017 and @SCN-LDG-019 put broken evidence ON the ledger (a
 * `broken` suspense item); this reads the WHOLE RUN off it: if any PROOF NEVER RAN — a vitest
 * suite that failed to collect, or a cucumber step matched by two or more definitions — the
 * evidence never fully materialised, so every `missing` in that run is SUSPECT: it may be a broken
 * proof rather than an absent one. The run is UNSOUND.
 *
 * Soundness is a property of the RUN, not of a scenario (no third ScenarioVerdict) and is DERIVED,
 * NEVER STORED (no flag on Ledger) — the same no-drift reason `isBalanced` and
 * `hasPendingItems` derive. The name is the existential twin of `hasPendingItems` (the same
 * `some(row => some(item => item.outcome === X))` scan); "unsound" is the RENDER HEADLINE word
 * (@SCN-RPT-021), as "out-of-balance" is for `isBalanced`.
 *
 * Asserted over REAL `reconcile` output (evidence-manifesto §11A) — the `broken` item is minted by
 * the real reconciler from a real collection-failed observation, never hand-seeded onto a row.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the SCN-LDG-018 id,
 * matching features/ledger.feature's @SCN-LDG-018 scenario and its @integration Cucumber
 * step-block (tests/steps/ledger.steps.ts, `// @SCN-LDG-018`).
 *
 * NOTE: imported from `./reconcile.js`, NOT from the core barrel — the barrel export of
 * `hasBrokenEvidence` is @SCN-API-001's frozen-surface touch, owned by the next sub-issue (3F-1651).
 */
describe("[SCN-LDG-018] hasBrokenEvidence — the whole-run soundness predicate", () => {
  /** A collection-failed vitest observation: errored before it named a test, so it cites no @SCN. */
  const brokenObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: null,
    status: "failed",
    broken: true,
    locator: "packages/core/src/collection-failed.test.ts",
    message: "Error: Cannot find package '@cucumber/tag-expressions'",
  };

  it("is true when the run carries a broken reconciling item (real reconcile output)", () => {
    // The scenario's own row reads `missing` (honest at its resolution — no evidence citing it
    // arrived); the `broken` item lands on the SUSPENSE row. The predicate scans EVERY row, so it
    // sees it. Reds while the predicate does not exist / does not scan for the `broken` outcome.
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [brokenObservation],
    );
    expect(hasBrokenEvidence(balance)).toBe(true);
  });

  it("is false when no row carries a broken item, even though the run is out-of-balance (real reconcile output)", () => {
    // TEETH: an ordinary out-of-balance run — a `missing` obligation, no collection failure. A
    // predicate that keyed on "the run has reconciling items" (i.e. on !isBalanced) would call this
    // unsound, masking every honest gap as a broken harness. Soundness keys on `broken`, and only
    // on `broken`.
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [],
    );
    expect(isBalanced(balance)).toBe(false);
    expect(hasBrokenEvidence(balance)).toBe(false);
  });

  it("is false for a balanced run (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-HNS-018", status: "passed" }],
    );
    expect(hasBrokenEvidence(balance)).toBe(false);
  });

  it("the three whole-run predicates are INDEPENDENT: pending-without-broken is sound; broken-without-pending is unsound", () => {
    // A deferred obligation makes a run carry Pending Items — it does NOT make it unsound. And a
    // collection failure makes a run unsound with no Pending Item anywhere in sight. Neither
    // predicate may be derived from the other.
    const pendingOnly = reconcile(
      [{ scnId: "SCN-HNS-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] }],
      [],
    );
    expect(hasPendingItems(pendingOnly)).toBe(true);
    expect(hasBrokenEvidence(pendingOnly)).toBe(false);

    const brokenOnly = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [brokenObservation],
    );
    expect(hasBrokenEvidence(brokenOnly)).toBe(true);
    expect(hasPendingItems(brokenOnly)).toBe(false);
    // A broken run is ALWAYS out-of-balance (the `broken` item sits on the suspense row, whose
    // verdict is always out-of-balance) — which is exactly why the CLI must check soundness BEFORE
    // the balance verdict (@SCN-CLI-012), or exit 4 would be unreachable.
    expect(isBalanced(brokenOnly)).toBe(false);
  });

  it("soundness is DERIVED, never stored: the reconciliation carries no soundness field", () => {
    // The no-drift ruling (parent 3F-1642): no flag on Ledger. Reds the moment a
    // `unsound` / `sound` / `hasBrokenEvidence` field is written onto the reconciliation instead of
    // being derived from its rows.
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [brokenObservation],
    );
    expect(Object.keys(balance)).toEqual(["scenarioReconciliations"]);
  });
});
