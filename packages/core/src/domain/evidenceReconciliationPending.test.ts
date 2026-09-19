/**
 * Unit tests for the reconcile core's Pending Items (src/domain/evidenceReconciliation.ts),
 * split out of evidenceReconciliation.test.ts under the max-lines ceiling (3F-3558).
 *
 * Bidirectional evidence: each describe/it carries the @SCN id of its scenario, so a grep of the
 * id returns both halves of the pair (Evidence Manifesto §9).
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";
import { parseScenarios } from "../parse/scenarios.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";

describe("[SCN-LDG-013] a @unit @e2e scenario proven by BOTH a vitest and a cucumber observation reconciles both tiers satisfied", () => {
  it("balances both obligations — vitest discharges @unit, cucumber (derived) discharges @e2e — from a real scenario and both real readers", () => {
    // The split ACROSS RUNNERS, composed through the REAL readers (evidence-manifesto §11A:
    // assert real output, not a hand-seeded fixture). The obligation side: a real @unit @e2e
    // scenario through the real reader → TWO evidence obligations (unit + e2e).
    const scenarios = parseScenarios(
      [
        "@LDG",
        "Feature: fixture",
        "  Rule: a fixture rule",
        "    @unit @e2e @SCN-LDG-013",
        "    Scenario: a unit-and-e2e fixture scenario",
        "      Given a fixture step",
      ].join("\n")
    );

    // The VITEST side: a real vitest JSON report citing the scenario, parsed at the JS-ecosystem
    // unit default → a unit observation. Vitest is the unit substrate; its level is NOT derived
    // (a unit test can only prove @unit). This discharges the @unit obligation.
    const vitestReport: VitestJsonReport = {
      testResults: [
        {
          name: "src/unitAndE2e.test.ts",
          assertionResults: [
            { fullName: "[SCN-LDG-013] the unit substrate proves the unit tier", status: "passed" },
          ],
        },
      ],
    };
    const vitestObs = parseVitestEvidenceObservations(vitestReport, "unit");

    // The CUCUMBER side: a real cucumber JSON report citing the SAME scenario, parsed with the
    // JS-ecosystem "integration" fallback. deriveLevel reads the scenario's @e2e tag
    // (the @unit tag is NOT a non-unit tier → inert for cucumber; unit is vitest's job) → exactly
    // ONE observation, at e2e — NOT unit (cucumber does not double-count unit), NOT integration
    // (the fallback is overridden by the @e2e tag). This discharges the @e2e obligation.
    const cucumberReport: CucumberJsonReport = [
      {
        uri: "features/fixture.feature",
        elements: [
          {
            tags: [{ name: "@unit" }, { name: "@e2e" }, { name: "@SCN-LDG-013" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    const cucumberObs = parseCucumberEvidenceObservations(cucumberReport, "integration");
    expect(cucumberObs).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature" },
    ]);

    // The ledger's (scnId, level) matching balances each obligation against its own-tier
    // observation — no reconciler change, no new item type. Both tiers satisfied → balanced.
    const balance = reconcile(scenarios, [...vitestObs, ...cucumberObs]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-013");

    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    // BOTH obligations satisfied — order-independent (no ranking between tiers), and EXACTLY the
    // two tiers the scenario named (no phantom third obligation).
    expect(scenario?.qualityCheckReconciliations).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-013", status: "passed", locator: "src/unitAndE2e.test.ts" } },
        { qualityCheck: "e2e", outcome: "satisfied", evidenceObligation: { qualityCheck: "e2e" }, evidenceObservation: { qualityCheck: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature" } },
      ])
    );
    expect(scenario?.qualityCheckReconciliations).toHaveLength(2);
  });
});

describe("[SCN-PND-004] a named-pending obligation reconciles as a one-sided Pending Item, never a reconciling item", () => {
  // The pending result of an obligation (the third result, alongside @SCN-LDG-001
  // satisfied→balanced and @SCN-LDG-003 absent→missing): a `<quality-check>pending`
  // obligation (the `pending: true` flag from PND-001) is PARTITIONED off before the
  // observation match — it becomes a one-sided Pending Item (owed IOU), never a
  // QualityCheckReconciliation, never a reconciling item. Asserts REAL reconcile output
  // (evidence-manifesto §11A). The @integration arm (tests/steps/pendingItems.steps.ts,
  // @SCN-PND-004) proves the same through the parse→reconcile pipeline over the planted
  // fixture. Verdict-balanced (PND-007) and the render/tally (PND-010/011) are later
  // sub-issues; this pins ONLY the model partition + the both-missing guard fix.
  const CHECKS = ["fitness", "unit", "integration", "e2e", "performance"] as const;

  for (const qualityCheck of CHECKS) {
    it(`raises exactly one Pending Item for a ${qualityCheck}pending obligation and posts no both-missing row`, () => {
      const scenarios: Scenario[] = [
        { scnId: "SCN-PND-004", evidenceObligations: [{ qualityCheck, pending: true }] },
      ];
      // No observation is sought — a Pending Item is one-sided.
      const balance = reconcile(scenarios, []);
      const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-004");

      expect(scenario?.pendingItems).toEqual([{ qualityCheck }]);
      // The pending obligation is PARTITIONED OFF: it never becomes a reconciling item, and
      // an only-pending scenario is NOT the degenerate both-missing row (the guard fix).
      expect(scenario?.qualityCheckReconciliations).toEqual([]);
      expect(scenario?.reconcilingItems).toEqual([]);
    });
  }

  it("keeps the bare (non-pending) obligation reconciling while partitioning the pending one off (mixed scenario)", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-004",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PND-004", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-004");

    // Only the unit obligation reconciles; the pending integration one is one-sided.
    expect(scenario?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-004", status: "passed" } },
    ]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-005] the pending deferral governs even when a matching observation exists — the Pending Item is raised, the observation IS no-evidence-obligation", () => {
  // A PENDING OBLIGATION NAMES NOTHING (3F-1858). Canon, Pending Item: a `pending` tag raises
  // NO Evidence Obligation, so the citing credit is `no-evidence-obligation` — exactly as when
  // nothing was raised at all. This test used to assert the opposite ("the pair stays NAMED"),
  // under which the credit posted to NO account: the pair-check excluded it from
  // `no-evidence-obligation`, the partition excluded it from the debit side. Zero rows, balanced,
  // exit 0 — the false-green.
  //
  // The Pending Item ITSELF stays verdict-neutral (@SCN-PND-006..008); the row below is out of
  // balance via the CREDIT, never via the Pending Item. Two different things on one row. Asserts
  // REAL reconcile output (evidence-manifesto §11A). The @integration arm
  // (tests/steps/pendingItems.steps.ts, @SCN-PND-005) proves the same through the
  // parse→reconcile pipeline over a planted fixture carrying a matching observation.
  it("raises the Pending Item and posts the matching observation as no-evidence-obligation (obligation never satisfied; the row reds via the credit)", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-005",
        evidenceObligations: [{ qualityCheck: "integration", pending: true }],
      },
    ];
    // A non-pending obligation would reconcile this MATCHING passing observation to `satisfied`;
    // the pending one must ignore it entirely.
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-005");

    // One Pending Item at the pending check, regardless of the matching observation's presence.
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    // The obligation never reconciled against the match — it did NOT become `satisfied`.
    // (Partition-before-match: a pending obligation never reaches reconcileEvidenceObligation.)
    expect(scenario?.qualityCheckReconciliations.some((r) => r.outcome === "satisfied")).toBe(false);
    // The matching observation IS flagged `no-evidence-obligation`: the pending obligation raises no Evidence
    // Obligation, so its pair is NOT named and the citing credit posts as an ordinary
    // no-evidence-obligation credit on this real scenario's own row.
    const noEvidenceObligation = balance.scenarioReconciliations.flatMap((s) =>
      s.reconcilingItems.filter((r) => r.outcome === "no-evidence-obligation")
    );
    expect(noEvidenceObligation).toEqual([{ qualityCheck: "integration", outcome: "no-evidence-obligation", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" } }]);
    // The row reds VIA THE CREDIT, never via the Pending Item — which is not a reconciling item
    // and stays verdict-neutral. Two different things on one row.
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "no-evidence-obligation", evidenceObservation: { qualityCheck: "integration", scnId: "SCN-PND-005", status: "passed" } },
    ]);
    // The run fails: canon says a credit against a pending pair must not pass silently.
    expect(isBalanced(balance)).toBe(false);
    // And the observation is not shunted to a suspense/phantom row either — it posts to the real
    // scenario it cites, which is the only account it ever names.
    expect(balance.scenarioReconciliations.every((s) => s.kind === "scenario")).toBe(true);
  });
});

describe("[SCN-PND-006] a Pending Item is not a Reconciling Item — a structurally distinct category, never an error", () => {
  // A Pending Item is NEVER a Reconciling Item and NEVER a `QualityCheckReconciliation` outcome:
  // it is a structurally distinct category (`pendingItems`), so it is never counted among, or
  // rendered as, an error/discrepancy. The sharp pin beyond @SCN-PND-004 (whose only-pending
  // scenario has an EMPTY reconciling list): here the reconciling list is NON-empty, yet the
  // Pending Item is still not folded in. Green-first regression pin over the partition PND-004
  // established (Option A gives category-distinctness by construction); teeth proven by a local
  // mutation that leaks the pending item into the reconciling list. The @integration arm
  // (tests/steps/pendingItems.steps.ts, @SCN-PND-006) proves the same over the planted mixed fixture.
  it("keeps the deferred obligation out of the reconciling/error list even when a genuine error is present", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-006",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    // No observation is sought — the unit obligation goes `missing` (a genuine error), the
    // pending integration one partitions to a one-sided Pending Item.
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-006");

    // The error list carries ONLY the missing unit — the deferred integration is not among it.
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
    ]);
    // The Pending Item is a structurally distinct category: it names NO reconciling item and
    // NO evidence-obligation outcome at the pending check.
    expect(
      scenario?.reconcilingItems.some((r) => r.qualityCheck === "integration")
    ).toBe(false);
    expect(
      scenario?.qualityCheckReconciliations.some((r) => r.qualityCheck === "integration")
    ).toBe(false);
    // Positive confirmation the deferred obligation IS in the pending category (not dropped).
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
  });
});

describe("[SCN-PND-007] a scenario whose only exception is a Pending Item has verdict balanced", () => {
  // A Pending Item is VERDICT-NEUTRAL: it never contributes an out-of-balance reconciling
  // item, so a scenario whose only non-satisfied element is a Pending Item is `balanced`. Two
  // shapes: a scenario whose SOLE obligation is deferred (partitions to zero reconciled rows,
  // yet balanced — the fix: `verdictFor` over an empty list must read balanced, not the vacuous
  // out-of-balance), and a scenario carrying a PASSING obligation alongside a deferred one (the
  // passing one satisfied, the pending one one-sided → balanced). The verdict is derived from
  // reconciling-item emptiness, so the both-missing row (which DOES carry a reconciling item)
  // stays out-of-balance — the non-regression guard below. Asserts REAL reconcile output
  // (evidence-manifesto §11A). The @integration arm (tests/steps/pendingItems.steps.ts,
  // @SCN-PND-007) proves the same verdict-neutrality through the parse→reconcile pipeline over
  // the planted only-pending-balanced fixture.
  it("balances a scenario whose sole obligation is deferred pending (no reconciling item, one Pending Item)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PND-007", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    // No observation is sought — a Pending Item is one-sided.
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

    // The verdict is BALANCED though the reconciled evidence-obligation list is empty — the
    // Pending Item contributes no reconciling item. Reds before the fix: `verdictFor([])`
    // returned out-of-balance (the vacuous verdict over an empty list).
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual([]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
  });

  it("balances a scenario carrying a passing unit obligation alongside a deferred integration one", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-007",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    // The unit obligation is discharged by a passing observation; the pending integration one
    // is one-sided. The scenario's only non-satisfied element is the Pending Item → balanced.
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PND-007", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-007", status: "passed" } }]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
  });

  it("does NOT regress both-missing: a scenario with zero obligations and no citation stays out-of-balance", () => {
    // The non-regression guard on the verdict fix. A bare-empty scenario (no obligation, no
    // pending, cited by nothing) reconciles to the degenerate both-missing row — which CARRIES a
    // reconciling item — so it stays out-of-balance. The fix derives the verdict from
    // reconciling-item emptiness, so both-missing (a non-empty reconciling list) is untouched;
    // only the truly-empty list (an only-pending scenario) flips to balanced.
    const scenarios: Scenario[] = [{ scnId: "SCN-PND-007", evidenceObligations: [] }];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-007");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
  });
});

describe("[SCN-PND-009] a @unit @integrationpending scenario with a passing unit observation is balanced with one Pending Item", () => {
  // The COMPOSITION case: a pending and a non-pending obligation coexist on ONE scenario WITHOUT
  // interference. A `@unit @integrationpending` scenario with a PASSING unit observation
  // reconciles to a SATISFIED unit obligation (a genuine reconciling-side balance) AND a one-sided
  // integration Pending Item (partitioned off). Verdict balanced; reconcilingItems empty; exactly
  // one Pending Item. The pending partition does not swallow the unit obligation, and the unit
  // reconcile does not swallow the pending one. Green-first over the foundation (the same
  // partition PND-004..007 landed); teeth proven by a pending-partition-swallows-unit mutation
  // (reverted). Asserts REAL reconcile output (evidence-manifesto §11A). The @integration arm
  // (tests/steps/pendingItems.steps.ts, @SCN-PND-009) proves the same composition through the
  // parse→reconcile pipeline over the planted composition fixture.
  it("reconciles the unit obligation satisfied and partitions the integration one to a Pending Item", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-PND-009",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration", pending: true },
        ],
      },
    ];
    // A passing unit observation citing the scenario discharges the bare `@unit` obligation; the
    // `@integrationpending` one is one-sided (no observation is sought for it).
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-PND-009", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-009");

    // Coexistence without interference, pinned sharply:
    //   - the unit obligation reconciles satisfied — the scenario's SOLE reconciled evidence
    //     obligation (the pending partition did NOT swallow it).
    expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-PND-009", status: "passed" } }]);
    //   - the deferred integration obligation is EXACTLY one one-sided Pending Item (the unit
    //     reconcile did NOT swallow it).
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    //   - verdict balanced, no reconciling item — the composition is honestly balanced.
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-014] an undefined step with no pending deferral is reported out-of-balance (missing), not excused as pending", () => {
  // The anti-leniency corollary of PND-013, sharpened at the VERDICT level over the REAL reader
  // feeding the REAL reconciler (§11A). The scenario raises an @integration obligation and carries
  // NO <qc>pending; its cucumber run has an `undefined` step. The reader drops the inconclusive
  // scenario (emits nothing), so the obligation reconciles MISSING by absence and the verdict is
  // out-of-balance. With no <qc>pending tag, NO Pending Item is raised — an undefined step is NOT
  // excused as pending (Cucumber's own leniency, the hole this tool must not have). Pending is a
  // TAG, never inferred from an inconclusive run's status.
  it("drops the undefined observation → the named obligation reconciles missing, verdict out-of-balance, no Pending Item", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PND-014", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    // The observed side, straight from the REAL cucumber reader: an `undefined` step is
    // inconclusive → dropped → an EMPTY observation set (no back-door hand-built observation).
    const report: CucumberJsonReport = [
      {
        uri: "features/pnd014.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-PND-014" }],
            steps: [{ result: { status: "undefined" } }],
          },
        ],
      },
    ];
    const observations = parseCucumberEvidenceObservations(report, "integration");
    expect(observations).toEqual([]); // the reader dropped the inconclusive scenario.

    const balance = reconcile(scenarios, observations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-014");

    // Missing by absence — the anti-leniency outcome.
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
    // The teeth: NOT excused as pending. A Pending Item requires a <qc>pending TAG, which this
    // scenario does not carry — so it raises none.
    expect(scenario?.pendingItems).toEqual([]);
  });
});

describe("[SCN-PND-019] a recognised deferral tag raises the Pending Item whether the scenario is filtered out or reports a pending status — the deferral overrides the observation-derived outcome", () => {
  // The TAG-OVERRIDES-OBSERVATION close-out of the slice-4 Rule (slice 3 — the tag overrides the
  // observation-derived outcome). A deferred obligation (the `pending: true` flag a recognised
  // community tag sets at PARSE, @SCN-PND-016) partitions to a one-sided Pending Item BEFORE any
  // observation match — so it raises the Pending Item REGARDLESS of the observation side. Pinned
  // over the two sides that would ELSE reconcile `missing`, with the contrast that makes the
  // override bite (a NON-deferred obligation on the same side → `missing`):
  //   - FILTERED OUT: no observation at all (the @skip scenario excluded from the run).
  //   - REPORTS A PENDING STATUS: a cucumber `pending`-status step the REAL reader (§11A) drops.
  // Green-first over @SCN-PND-016 (the parse-level deferral) + @SCN-PND-013 (the reader's drop),
  // both already delivered; teeth proven by a local mutation removing the scenario-scope deferral
  // (reverted). The @integration arm (tests/steps/pendingItems.steps.ts, @SCN-PND-019) proves the
  // same override from both observation sides over the planted fixture.

  it("filtered out (no observation): a deferred obligation is a Pending Item where a non-deferred one is missing", () => {
    // A deferred @integration obligation reconciled against NO observation (the filtered-out side)
    // → a one-sided Pending Item, verdict balanced, no reconciling item.
    const deferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    const balance = reconcile(deferred, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-019");
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);

    // The contrast that makes the override bite: WITHOUT the deferral, the same obligation on the
    // same (no-observation) side reconciles `missing` — an out-of-balance error, not a Pending Item.
    const nonDeferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    const nonDeferredBalance = reconcile(nonDeferred, []);
    const nonDeferredScenario = nonDeferredBalance.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PND-019"
    );
    expect(nonDeferredScenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
    expect(nonDeferredScenario?.pendingItems).toEqual([]);
  });

  it("reports a pending status (the reader dropped it): a deferred obligation is a Pending Item where a non-deferred one is missing", () => {
    // The observed side, straight from the REAL cucumber reader: a `pending` step is inconclusive
    // → dropped → an EMPTY observation set (no back-door hand-built observation).
    const report: CucumberJsonReport = [
      {
        uri: "features/pnd019.feature",
        elements: [
          {
            tags: [{ name: "@wip" }, { name: "@integration" }, { name: "@SCN-PND-019" }],
            steps: [{ result: { status: "pending" } }],
          },
        ],
      },
    ];
    const observations = parseCucumberEvidenceObservations(report, "integration");
    expect(observations).toEqual([]); // the reader dropped the pending-status scenario.

    // A deferred @integration obligation reconciled against the reader's OWN dropped output →
    // a one-sided Pending Item, verdict balanced, no reconciling item.
    const deferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ];
    const balance = reconcile(deferred, observations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PND-019");
    expect(scenario?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);

    // The contrast: WITHOUT the deferral, the dropped pending-status observation leaves the same
    // obligation `missing` by absence — an error, not a Pending Item.
    const nonDeferred: Scenario[] = [
      { scnId: "SCN-PND-019", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    const nonDeferredBalance = reconcile(nonDeferred, observations);
    const nonDeferredScenario = nonDeferredBalance.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-PND-019"
    );
    expect(nonDeferredScenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
    expect(nonDeferredScenario?.pendingItems).toEqual([]);
  });
});

describe("[SCN-PND-022] a deferred scenario naming no obligations is a Pending Item, not both-missing", () => {
  // INTERPRETATION 2 — the reconcile PARTITION arm. A synthesised scenario-scope pending
  // obligation (`{ pending: true }` with NO `qualityCheck` — what parseScenarios emits for a bare
  // `@wip` raising zero obligations, @SCN-PND-022) partitions to ONE `qualityCheck`-less Pending
  // Item. The both-missing guard fires only on ZERO pending items, so the synthesised pending →
  // NOT both-missing: the scenario reconciles to zero rows on both sides yet is balanced-with-
  // pending (the forward-compatibility slice 2 built into the guard). This proves the partition +
  // both-missing-guard behaviour over the reconcile function in isolation; the parse synthesis that
  // FEEDS it is the scenarios.test.ts arm, and the full parse→reconcile→render pipeline is the
  // @integration arm (tests/steps/pendingItems.steps.ts, @SCN-PND-022). Asserts REAL reconcile
  // output (evidence-manifesto §11A).
  it("routes a synthesised scenario-scope pending obligation to one qualityCheck-less Pending Item, balanced, not both-missing", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PDX-001", evidenceObligations: [{ pending: true }] },
    ];
    // No observation is sought — a scenario-scope Pending Item is one-sided.
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-PDX-001");

    // Exactly one Pending Item, scenario-scope (no owed quality-check).
    expect(scenario?.pendingItems).toHaveLength(1);
    expect(scenario?.pendingItems[0]!.qualityCheck).toBeUndefined();
    // Balanced-with-pending: the both-missing guard does NOT fire (a pending item is present), so
    // no both-missing reconciling item, and the empty reconciled list reads balanced.
    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual([]);
    expect(scenario?.qualityCheckReconciliations.some((o) => o.outcome === "both-missing")).toBe(false);
  });

  it("the both-missing guard is unchanged: a truly zero-obligation scenario (no pending) still reconciles both-missing", () => {
    // The non-regression contrast. A bare-empty scenario — no obligation AND no synthesised pending
    // (never carried a deferral tag) — still posts the degenerate both-missing row (out-of-balance).
    // Only the synthesised-pending case above flips to balanced; the guard is not special-cased
    // further than the pending-items clause it already had.
    const scenarios: Scenario[] = [{ scnId: "SCN-XXX-999", evidenceObligations: [] }];
    const balance = reconcile(scenarios, []);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-XXX-999");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([{ outcome: "both-missing" }]);
    expect(scenario?.pendingItems).toEqual([]);
  });
});
