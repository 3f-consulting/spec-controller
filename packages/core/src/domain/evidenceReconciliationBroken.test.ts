/**
 * Unit tests for the reconcile core's broken-evidence fail-safe and uncoded work
 * (src/domain/evidenceReconciliation.ts), split out of evidenceReconciliation.test.ts at 3F-3558.
 *
 * Bidirectional evidence: each describe/it carries the @SCN id of its scenario, so a grep of the
 * id returns both halves of the pair (Evidence Manifesto §9).
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { hasBrokenEvidence, isBalanced } from "./ledger.js";
import type {
  Scenario,
  EvidenceObservation,
  RuntimeEvidenceObservation,
} from "../model.js";

describe("[SCN-LDG-017] a broken observation posts a broken suspense item; the scenario it would have proven still reads missing", () => {
  // The reconcile arm of BROKEN-NOT-ABSENT. A `broken` observation (the reader's collection-
  // failure credit) names no test, so it cites no @SCN and can be attributed to no scenario: it is
  // a SIBLING of `cites-no-scenario` — both land in suspense because they name no scenario —
  // distinguished by errored-vs-completed. The suspense fold, which mapped EVERY uncited runtime
  // credit to `cites-no-scenario`, must split.
  const scenarios: Scenario[] = [
    { scnId: "SCN-HNS-017", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const brokenObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: null,
    status: "failed",
    locator: "packages/core/src/harness.test.ts",
    broken: true,
    message: "Error: Cannot find package '@cucumber/tag-expressions'",
  };

  it("posts ONE broken reconciling item on the suspense row, carrying the file locator and the collection message", () => {
    const balance = reconcile(scenarios, [brokenObservation]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.verdict).toBe("out-of-balance");
    expect(suspense?.reconcilingItems).toEqual([
      {
        qualityCheck: "unit",
        outcome: "broken",
        locator: "packages/core/src/harness.test.ts",
        message: "Error: Cannot find package '@cucumber/tag-expressions'",
      },
    ]);
  });

  it("is NOT cites-no-scenario — the sibling it would otherwise be indistinguishable from", () => {
    // Folding the collection failure into `cites-no-scenario` would hide the remedy (fix the
    // harness) behind the wrong one (add a citation). Reds under the unsplit fold.
    const balance = reconcile(scenarios, [brokenObservation]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.reconcilingItems.some((i) => i.outcome === "cites-no-scenario")).toBe(false);
  });

  it("leaves the scenario whose proof was in that file reading missing — honest at its own resolution", () => {
    // The scenario's OWN row is unchanged: no evidence citing it arrived, so its unit obligation is
    // `missing`. The finding is at the RUN's resolution, not the scenario's.
    const balance = reconcile(scenarios, [brokenObservation]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-017");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
  });

  it("an ordinary uncited credit is STILL cites-no-scenario — the split does not swallow its sibling", () => {
    // The non-regression contrast (@SCN-LDG-007 unchanged): a COMPLETED test that cited no @SCN
    // still folds to `cites-no-scenario`. Only the errored (broken) credit takes the new outcome.
    const balance = reconcile(scenarios, [
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" },
    ]);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");

    expect(suspense?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "cites-no-scenario", locator: "src/uncited.test.ts", evidenceObservation: { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" } },
    ]);
  });

  // THE FAIL-SAFE (operator-mandated, 3F-1642 decisions of record): `broken` is checked BEFORE
  // `status`. A broken observation must NEVER reconcile as `failing` or `satisfied` — it names no
  // test, so it cites no scenario and can post to NO scenario's row. The observation shape is the
  // optional-flag one (`broken?: true` on RuntimeEvidenceObservation), so a `broken` credit
  // structurally CAN carry a scnId and a status; the reconciler must refuse to credit it anyway.
  // Pinned here under BOTH status values, and with a scnId that matches a scenario — the
  // adversarial shape that would otherwise discharge (or fail) an obligation off a suite that
  // never ran. Not asserted in the code alone: this is the test.
  it.each(["passed", "failed"] as const)(
    "FAIL-SAFE: a broken observation citing a scenario with status %s never reconciles as satisfied or failing",
    (status) => {
      const balance = reconcile(scenarios, [
        {
          qualityCheck: "unit",
          scnId: "SCN-HNS-017",
          status,
          locator: "packages/core/src/harness.test.ts",
          broken: true,
          message: "collection failed",
        },
      ]);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-017");

      // The scenario's unit obligation is NOT discharged (nor failed) by a suite that never ran.
      expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
      // And NOWHERE in the whole reconciliation does the broken credit surface as satisfied or
      // failing — across every row, obligation-side and credit-side alike.
      const everyOutcome = balance.scenarioReconciliations.flatMap((s) =>
        s.qualityCheckReconciliations.map((o) => o.outcome)
      );
      expect(everyOutcome).not.toContain("satisfied");
      expect(everyOutcome).not.toContain("failing");
      // It IS on the ledger — as a broken suspense item, the only place it can honestly post.
      const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
      expect(suspense?.reconcilingItems.map((i) => i.outcome)).toEqual(["broken"]);
    }
  );
});

describe("[SCN-LDG-019] THE FAIL-SAFE GETS TEETH: a broken observation that CITES its scenario still leaves that obligation missing", () => {
  // THIS IS THE POINT OF THE SLICE, not a restatement of LDG-017.
  //
  // The cucumber reader's `broken` observation — an AMBIGUOUS step (two step definitions match, so
  // the step cannot run) — is the FIRST case in the codebase that emits a broken observation
  // CARRYING AN scnId. Vitest's collection failure is citation-less BY CONSTRUCTION (a file that
  // fails to collect names no test, so it cites no @SCN), so the reconciler's guard — which
  // excludes a broken observation from the obligation match WHATEVER scnId and status it carries
  // (reconcile.ts, `o.broken !== true` before the (scnId, qualityCheck) match) — has been
  // DEFENSIVE BUT NEVER EXERCISED BY A REAL READER since 3F-1642.
  //
  // A cucumber scenario DOES cite its @SCN; only its step could not run. So the guard now bites on
  // production output: the broken credit must NEVER discharge (status "passed") or fail (status
  // "failed") the obligation it cites. It folds to SUSPENSE, and the cited obligation reconciles
  // `missing` BY ABSENCE — honest at its own resolution (no evidence that RAN cites it), while the
  // RUN carries the ambiguity and is stamped unsound.
  //
  // The adversarial value is `status: "passed"`: without the guard, a harness that never executed
  // a single step would DISCHARGE the obligation it cites — a green tick over a test that never
  // ran, the exact false-benign reading `broken` exists to kill.
  const scenarios: Scenario[] = [
    { scnId: "SCN-HNS-020", evidenceObligations: [{ qualityCheck: "integration" }] },
  ];
  /** The cucumber reader's shape for an ambiguous step: broken, CITING, and structurally statused. */
  const citingBrokenObservation = (status: "passed" | "failed"): RuntimeEvidenceObservation => ({
    qualityCheck: "integration",
    scnId: "SCN-HNS-020",
    status,
    locator: "features/ambiguous.feature",
    broken: true,
    message:
      'The step "Given a step two definitions both match" is ambiguous — two or more step definitions match it, so the step never ran.',
  });

  it.each(["passed", "failed"] as const)(
    "a broken observation citing the fixture scenario with status %s leaves its integration obligation missing",
    (status) => {
      const balance = reconcile(scenarios, [citingBrokenObservation(status)]);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-HNS-020");

      // The cited obligation is NOT discharged, and NOT failed, by a step that never ran.
      expect(scenario?.qualityCheckReconciliations).toEqual([
        { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
      ]);
      expect(scenario?.verdict).toBe("out-of-balance");
    }
  );

  it.each(["passed", "failed"] as const)(
    "the citing broken observation with status %s surfaces NOWHERE as satisfied or failing, and posts exactly once — on the suspense row",
    (status) => {
      const balance = reconcile(scenarios, [citingBrokenObservation(status)]);

      // Across EVERY row — scenario, phantom and suspense alike — the broken credit never reads as
      // discharged or failed.
      const everyOutcome = balance.scenarioReconciliations.flatMap((s) =>
        s.qualityCheckReconciliations.map((o) => o.outcome)
      );
      expect(everyOutcome).not.toContain("satisfied");
      expect(everyOutcome).not.toContain("failing");

      // It posts EXACTLY ONCE, on the SUSPENSE row, carrying its where-to-fix (the feature file)
      // and its what-broke (the synthesised ambiguity message) — never as `no-evidence-obligation` on the
      // scenario it cites (the byScn index skips it), never as a `cites-unknown-scenario` phantom.
      expect(balance.scenarioReconciliations.map((s) => s.kind)).toEqual([
        "scenario",
        "suspense-scenario",
      ]);
      const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
      expect(suspense?.reconcilingItems).toEqual([
        {
          qualityCheck: "integration",
          outcome: "broken",
          locator: "features/ambiguous.feature",
          message:
            'The step "Given a step two definitions both match" is ambiguous — two or more step definitions match it, so the step never ran.',
        },
      ]);

      // And the RUN is unsound — soundness is a property of the run (@SCN-LDG-018), reader-agnostic
      // exactly as `broken` now is.
      expect(hasBrokenEvidence(balance)).toBe(true);
    }
  );

  it("a broken observation citing a PHANTOM scenario mints no phantom row — suspense is a broken credit's only account", () => {
    // The third arm of the fail-safe, over the citing shape: a cucumber @SCN that no REAL
    // scenario matches would ordinarily mint a `cites-unknown-scenario` phantom row. A broken
    // credit never does — it errored, so its citation credits nothing anywhere.
    const balance = reconcile(scenarios, [
      { ...citingBrokenObservation("passed"), scnId: "SCN-NOT-NAMED" },
    ]);

    expect(balance.scenarioReconciliations.some((s) => s.kind === "phantom-scenario")).toBe(false);
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
    expect(suspense?.reconcilingItems.map((i) => i.outcome)).toEqual(["broken"]);
  });
});

/**
 * @unit for @SCN-LDG-021 (3F-1774) — uncoded work is never invisible.
 *
 * Bidirectional evidence: the describe carries the @SCN-LDG-021 id matching
 * features/ledger.feature and the @integration steps in tests/steps/ledger.steps.ts.
 *
 * A scenario carrying no @SCN raises no obligation, so it could reconcile NOTHING — not
 * satisfied, not failing, not even `missing`: an obligation that was never RAISED cannot be
 * ABSENT. It was simply not there, and the run went green over work cucumber runs and nothing
 * proves. The scenario is REAL and ORDINARY (not phantom, not suspense); what is absent is the
 * @SCN CODE its obligation needs to link to an observation. Hence `no-scn-code`, debit-side, on
 * its own out-of-balance row — the debit twin of `cites-no-scenario`.
 */
describe("[SCN-LDG-021] a scenario naming no @SCN reconciles no-scn-code on its own row", () => {
  it("gives the untagged scenario its own out-of-balance row carrying no-scn-code", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    // The untagged scenario, by NAME — the only handle it has, since it carries no code.
    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);

    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();
    // ORDINARY, not phantom and not suspense: the scenario exists and cucumber runs it.
    expect(row!.kind).toBe("scenario");
    expect(row!.verdict).toBe("out-of-balance");
    expect(row!.qualityCheckReconciliations.map((o) => o.outcome)).toEqual(["no-scn-code"]);
  });

  it("makes the whole run out-of-balance — a scenario the ledger cannot link is never clean", () => {
    // THE FALSE-GREEN. Before this, the tagged scenario reconciled satisfied, the untagged one
    // contributed NOTHING, and isBalanced said BALANCED (exit 0) — the report printing
    // "1 scenario(s) carry no @SCN tag" and certifying the run clean in the same breath.
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const clean = reconcile(namedScenarios, observed);
    expect(isBalanced(clean)).toBe(true); // the control: nothing untagged, genuinely balanced

    const withUntagged = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    expect(isBalanced(withUntagged)).toBe(false);
  });

  it("is inert when nothing is untagged — the byte-identical bar (the param is additive)", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    // Omitted, and explicitly empty, must both reconcile exactly as before.
    expect(reconcile(namedScenarios, observed, [])).toEqual(reconcile(namedScenarios, observed));
  });
});

/**
 * @unit for @SCN-LDG-029 (3F-2016 / corrects 3F-1995) — no-scn-code is DEBIT-side.
 *
 * Canon (double-entry-manifesto line 39): no-scn-code = Obligation Exists, Observation None — the
 * debit twin of cites-no-scenario. The untagged scenario's obligation has no @SCN code to link to,
 * so the reconciliation carries a SYNTHESIZED scenario-scope obligation ({}, no qualityCheck /
 * staticCheck — the established scenario-scope degenerate shape, precedent: the scenario-scope
 * pending obligation in journal.ts) and NO observation. The scenario-level `evidenceObligations`
 * array STAYS empty — the synthesized {} lives only on the reconciling item, not the account's
 * debit posting — so census + markdown are untouched.
 */
describe("[SCN-LDG-029] a no-scn-code reconciliation carries a scenario-scope obligation and no observation", () => {
  it("carries the synthesized scenario-scope obligation {} on the reconciling item, and no observation", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();

    const qcr = row!.qualityCheckReconciliations.find((o) => o.outcome === "no-scn-code");
    expect(qcr).toBeDefined();
    // DEBIT side: the synthesized scenario-scope obligation — empty {}, no qualityCheck / staticCheck.
    // Its PRESENCE (Obligation Exists) is what makes no-scn-code debit-side, per canon line 39.
    expect(qcr!.evidenceObligation).toEqual({});
    // CREDIT side stays absent: no @SCN code means no observation can link at any tier.
    expect(qcr!.evidenceObservation).toBeUndefined();
  });

  it("leaves the scenario-level evidenceObligations empty — the synthesized {} is item-scope, census untouched", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();
    // The synthesized obligation lives ONLY on the reconciling item, NOT on the account's debit
    // posting — an untagged scenario raises no parsed obligations, so this stays []. That is what
    // keeps the census (and the markdown built from it) unchanged.
    expect(row!.evidenceObligations).toEqual([]);
  });
});
