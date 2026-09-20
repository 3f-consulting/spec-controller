/**
 * Unit tests for the reconcile core's posting of every observation and obligation to exactly one
 * account (src/domain/evidenceReconciliation.ts), split out of evidenceReconciliation.test.ts at
 * 3F-3558.
 *
 * Bidirectional evidence: each describe/it carries the @SCN id of its scenario, so a grep of the
 * id returns both halves of the pair (Evidence Manifesto §9).
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import type { RunContext } from "../provenance/provenance.js";
import type {
  Scenario,
  EvidenceObligation,
  EvidenceObservation,
  RuntimeEvidenceObservation,
  Ledger,
  ScenarioReconciliation,
} from "../model.js";
import { summaryOf } from "./evidenceReconciliation.js";
import type { EvidenceReconciliation } from "./evidenceReconciliation.js";

/**
 * Test-local composition of the Evidence Reconciliation from a Ledger fixture (3F-2233).
 * States NO rule of its own — `summaryOf` is the concept's own tally, the one its factory calls.
 */
const __er = (ledger: Ledger, wo = false, wg = false): EvidenceReconciliation => ({
  summary: summaryOf(ledger, wo, wg),
  ledger,
});


/**
 * @SCN-LDG-022 (3F-1846) — every evidence observation posts to EXACTLY ONE ledger account, never to
 * none. Under the one posting rule both axes CITE (3F-2621), so exactly-one is universal rather
 * than the runtime half of a weaker "at least one"; the teeth are against a drop AND a double-post.
 *
 * The @unit arm: `reconcile` populates each account's `evidenceObservations` with the credits that
 * CITE it. The @integration arm (tests/steps/ledger.steps.ts) drives the whole credit corpus at
 * once for the exhaustion/uniqueness property; these prove the per-shape routing in isolation.
 */
describe("[SCN-LDG-022] reconcile — every evidence observation posts to exactly one account, never to none", () => {
  const namedScenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
  ];

  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  it("posts a matched credit to the account it cites", () => {
    const credit: EvidenceObservation = { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([credit]);
  });

  it("posts a no-evidence-obligation credit to the real account it cites, not to suspense", () => {
    // Cites a REAL scenario at a check it never named. It reconciles `no-evidence-obligation` — and posts
    // to the account it CITES, because the account is the citation, never the outcome.
    const credit: EvidenceObservation = { scnId: "SCN-AAA-002", qualityCheck: "integration", status: "passed" };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "SCN-AAA-002")?.evidenceObservations).toEqual([credit]);
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("posts a credit citing a PENDING quality-check", () => {
    // THE LOAD-BEARING CASE. With nowhere for a posted entry to sit this credit CEASED TO EXIST.
    // It posts to the account it cites WHATEVER it reconciles to — the posting rule is the
    // citation, never the outcome, so this case asserts nothing about the outcome.
    const credit: EvidenceObservation = { scnId: "SCN-AAA-003", qualityCheck: "unit", status: "passed" };
    const account = accountFor(reconcile(namedScenarios, [credit]), "SCN-AAA-003");
    expect(account?.evidenceObservations).toEqual([credit]);
  });

  it("posts a credit citing an unknown @SCN to that phantom account", () => {
    const credit: EvidenceObservation = { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "SCN-ZZZ-999")?.evidenceObservations).toEqual([credit]);
  });

  it("posts an uncited credit to suspense", () => {
    const credit: EvidenceObservation = { scnId: null, qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
  });

  it("posts a broken credit to suspense, whatever scnId it structurally carries", () => {
    // The fail-safe: `broken` is taken FIRST, on the flag — a proof that never ran cites no
    // scenario even when it carries one. SUSPENSE is its only account.
    const credit: RuntimeEvidenceObservation = {
      scnId: "SCN-AAA-001", qualityCheck: "unit", status: "failed", broken: true,
    };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([]);
  });

  it("posts a CITED fitness credit to the one account it cites — the same rule as a runtime credit", () => {
    // The fitness axis cites now: the seam resolved the runnable handle to the bare check its
    // stepless fitness scenario carries and stamped that scenario's @SCN on the run, so this takes
    // the SAME arm a runtime credit takes. The obligation names `x` and the run names `lint:x` —
    // nothing but the citation could have joined them.
    const fitness: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ];
    const credit: EvidenceObservation = {
      scnId: "SCN-AAA-001", qualityCheck: "fitness", staticCheck: "lint:x", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(fitness, [credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([credit]);
    // A cited fitness credit is NOT suspense — suspense is for credits citing no scenario at all.
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("posts an UNCITED fitness credit to suspense — it cites no scenario", () => {
    // The other destination, reached by the same rule: the seam found no fitness scenario carrying
    // this check, so the run cites nothing and belongs to no row — suspense, where it reconciles
    // `cites-no-scenario` exactly as an uncited runtime credit does.
    const credit: EvidenceObservation = {
      qualityCheck: "fitness", staticCheck: "lint:nobody-cites-this", exists: true, enforcedOverRealSource: false,
    };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
  });

  it("sets evidenceObservations explicitly on every account, even when nothing posts", () => {
    const ledger = reconcile(namedScenarios, []);
    for (const account of ledger.scenarioReconciliations) {
      expect(account.evidenceObservations).toEqual([]);
    }
  });
});

/**
 * @SCN-LDG-025 (3F-1851) — a balanced fitness-only corpus keeps summary.outOfBalance AGREEING with
 * the balanced verdict.
 *
 * The coverage hole: every other fitness fixture mixes its satisfied credit with another shape
 * (broken / uncited / no-evidence-obligation) that independently mints the suspense row, so the run
 * is out-of-balance for a reason unrelated to the posting rule — and the disagreement this pins was
 * unfalsifiable. A corpus whose ONLY fitness credit is one satisfied, citation-routed check removes
 * every other cause: balanced, no suspense row, summary.outOfBalance 0 AGREEING with the balanced
 * verdict. The rejected post-to-suspense treatment would mint a spurious empty out-of-balance
 * suspense row — summary.outOfBalance disagreeing with isBalanced, the 3F-1703 fault — which THIS
 * corpus finally makes red.
 *
 * RE-POINTED TO THE CITATION PATH (3F-2620). The obligation names the BARE check its stepless
 * fitness scenario carries; the run names the RUNNABLE handle and CITES that scenario's @SCN. The
 * two words differ on purpose — a reader falling back to matching by name joins nothing here, which
 * is what makes the citation load-bearing rather than decorative.
 */
describe("[SCN-LDG-025] reconcile — a balanced fitness-only corpus keeps outOfBalance agreeing with the verdict", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  const ctx: RunContext = { target: "obligations-only", inputs: {}, runStart: new Date("2026-07-20T00:00:00.000Z"), sourceSha: null };

  it("a satisfied citation-routed check as the only credit → balanced, no suspense, summary.outOfBalance 0", () => {
    const fitness: Scenario[] = [
      { scnId: "SCN-DEM-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ];
    const credit: EvidenceObservation = {
      scnId: "SCN-DEM-001", qualityCheck: "fitness", staticCheck: "lint:obligations-only", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(fitness, [credit]);

    // The fitness scenario's account reconciles satisfied and balanced.
    expect(accountFor(ledger, "SCN-DEM-001")?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "fitness", outcome: "satisfied", evidenceObligation: { qualityCheck: "fitness" }, evidenceObservation: { scnId: "SCN-DEM-001", qualityCheck: "fitness", staticCheck: "lint:obligations-only", exists: true, enforcedOverRealSource: true } },
    ]);
    expect(accountFor(ledger, "SCN-DEM-001")?.verdict).toBe("balanced");
    // NO suspense row — the only fitness credit cites its own fitness scenario.
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
    // The run is balanced, and the summary AGREES: outOfBalance 0 (the 3F-1703 identity — under
    // the rejected post-to-suspense this becomes 1 while isBalanced stays true, and it reds).
    expect(isBalanced(ledger)).toBe(true);
    expect(assembleRenderInput(__er(ledger), ctx).summary.scenarioReconciliations.outOfBalance).toBe(0);
  });
});

/**
 * @SCN-LDG-023 (3F-1847) — the evidence obligations a scenario raises post to its ledger account.
 *
 * The DEBIT half of @SCN-LDG-022's posting. The @unit arm: `reconcile` populates each account's
 * `evidenceObligations` with the debits that scenario RAISES, keyed by quality-check. The
 * @integration arm (tests/steps/ledger.steps.ts) drives the whole parsed corpus at once.
 *
 * Named `evidenceObligations` for canon's vocabulary — NEVER `debits`, the bookkeeping ROOT of the
 * metaphor rather than the vocabulary. The name is free because 3F-1846 renamed the misnomer that
 * held it (typed `QualityCheckReconciliation[]` — sub-rows, not debits) to
 * `qualityCheckReconciliations`.
 */
describe("[SCN-LDG-023] reconcile — the evidence obligations a scenario names post to its ledger account", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  it("posts a named runtime obligation to its own scenario's account, keyed by quality-check", () => {
    const obligation: EvidenceObligation = { qualityCheck: "unit" };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [obligation] }];
    const ledger = reconcile(namedScenarios, [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([obligation]);
  });

  it("posts a fitness obligation carrying its bare check", () => {
    // The other obligation shape: a fitness debit carries the BARE CHECK its stepless scenario
    // named, and posts with that identity intact — the account records WHAT WAS NAMED, not merely
    // that something was. The identity is the bare check, not the npm-script handle the retired
    // `@lint=<handle>` form named.
    const obligation: EvidenceObligation = { qualityCheck: "fitness" };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [obligation] }];
    const ledger = reconcile(namedScenarios, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([obligation]);
  });

  it("posts a PENDING obligation, though it earns no reconciled row", () => {
    // The debit-side mirror of LDG-022's load-bearing credit. A pending obligation partitions off
    // to a one-sided Pending Item BEFORE the observation match and earns no
    // `QualityCheckReconciliation` at all. It posts ANYWAY: posting is not classifying.
    const obligation: EvidenceObligation = { qualityCheck: "unit", pending: true };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-003", evidenceObligations: [obligation] }];
    const account = accountFor(reconcile(namedScenarios, []), "SCN-AAA-003");
    expect(account?.evidenceObligations).toEqual([obligation]);
    // ...and it STILL earns no reconciled row. What pending DOES is unchanged by this slice.
    expect(account?.qualityCheckReconciliations).toEqual([]);
  });

  it("posts every named obligation of a multi-obligation scenario, in document order", () => {
    const unit: EvidenceObligation = { qualityCheck: "unit" };
    const fitness: EvidenceObligation = { qualityCheck: "fitness" };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [unit, fitness] }];
    const ledger = reconcile(namedScenarios, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([unit, fitness]);
  });

  it("posts each scenario's debits to ITS OWN account — never another's", () => {
    const aaa: EvidenceObligation = { qualityCheck: "unit" };
    const bbb: EvidenceObligation = { qualityCheck: "integration" };
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [aaa] },
      { scnId: "SCN-AAA-002", evidenceObligations: [bbb] },
    ];
    const ledger = reconcile(namedScenarios, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([aaa]);
    expect(accountFor(ledger, "SCN-AAA-002")?.evidenceObligations).toEqual([bbb]);
  });

  it("posts no debits to the accounts no scenario names — suspense and phantom", () => {
    // A phantom/suspense account is MINTED BY A CREDIT: no scenario raises it, so nothing can
    // have been named of it. Its debit side is empty by construction — the asymmetry is real,
    // not an omission.
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }];
    const ledger = reconcile(namedScenarios, [
      { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed" },
      { scnId: null, qualityCheck: "unit", status: "passed" },
    ]);
    expect(accountFor(ledger, "SCN-ZZZ-999")?.evidenceObligations).toEqual([]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObligations).toEqual([]);
  });

  it("sets evidenceObligations explicitly on every account, even when nothing is named", () => {
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [] }];
    const ledger = reconcile(namedScenarios, []);
    for (const account of ledger.scenarioReconciliations) {
      expect(account.evidenceObligations).toEqual([]);
    }
  });
});
