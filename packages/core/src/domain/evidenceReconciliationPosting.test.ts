import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, brokenItemsOf } from "./ledger.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import type { RunContext } from "./runProvenance.js";
import type {
  Scenario,
  EvidenceObservation,
  Ledger,
  ClaimReconciliation,
  QualityCheckReconciliation,
} from "../model.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { HANDED_INPUT_NAMES } from "../runInputs.test-utils.js";

describe("[SCN-LDG-022] reconcile — every evidence observation posts to exactly one account, never to none", () => {
  const namedScenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
  ];

  const accountFor = (ledger: Ledger, scnId: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.scnId === scnId);

  it.each([
    ["posts a matched evidence observation to the account it cites", "SCN-AAA-001"],
    ["posts an evidence observation citing an unknown @SCN to that phantom claim's account", "SCN-ZZZ-999"],
  ] as const)("%s", (_title, scnId) => {
    const observation: EvidenceObservation = { scnId, qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [observation]);
    expect(accountFor(ledger, scnId)?.evidenceObservations).toEqual([observation]);
  });

  it("sets evidenceObservations explicitly on every account, even when nothing posts", () => {
    const ledger = reconcile(namedScenarios, []);
    for (const account of ledger.claimReconciliations) {
      expect(account.evidenceObservations).toEqual([]);
    }
  });
});

describe("[SCN-LDG-022] reconcile — a broken evidence observation posts to the claim it names, as a broken item carrying it", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-FIT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];

  const note = { kind: "ambiguous-step", step: "a step" } as const;
  const brokenOnScenario: EvidenceObservation = {
    qualityCheck: "unit", scnId: "SCN-AAA-001", status: "failed", broken: true,
    locator: "tests/scenario.test.ts", message: "threw at import", notes: [note],
  };
  const brokenOnScenarioWithoutObligation: EvidenceObservation = {
    qualityCheck: "e2e", scnId: "SCN-AAA-001", status: "failed", broken: true,
    locator: "features/scenario.feature", message: "a hook failed", notes: [note],
  };
  const brokenOnPhantom: EvidenceObservation = {
    qualityCheck: "unit", scnId: "SCN-ZZZ-999", status: "failed", broken: true,
    locator: "tests/phantom.test.ts", message: "threw at import", notes: [note],
  };
  const brokenOnNothing: EvidenceObservation = {
    qualityCheck: "unit", scnId: null, status: "failed", broken: true,
    locator: "tests/nothing.test.ts", message: "threw at import", notes: [note],
  };
  const brokenCheckOnScenario: EvidenceObservation = {
    qualityCheck: "fitness", fitnessFunction: "lint:scenario", scnId: "SCN-FIT-001",
    exists: false, enforcedOverRealSource: false, broken: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "SCN-FIT-001" }],
  };
  const brokenCheckOnPhantom: EvidenceObservation = {
    qualityCheck: "fitness", fitnessFunction: "lint:phantom", scnId: "SCN-ZZZ-998",
    exists: false, enforcedOverRealSource: false, broken: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "SCN-ZZZ-998" }],
  };
  const brokenCheckOnNothing: EvidenceObservation = {
    qualityCheck: "fitness", fitnessFunction: "lint:nothing",
    exists: false, enforcedOverRealSource: false, broken: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "lint:nothing" }],
  };

  const everyBroken = [
    brokenOnScenario,
    brokenOnScenarioWithoutObligation,
    brokenOnPhantom,
    brokenOnNothing,
    brokenCheckOnScenario,
    brokenCheckOnPhantom,
    brokenCheckOnNothing,
  ];
  const ledger = (): Ledger => reconcile(scenarios, [...everyBroken]);

  const brokenItemFor = (observation: EvidenceObservation) => ({
    qualityCheck: observation.qualityCheck,
    ...("fitnessFunction" in observation ? { fitnessFunction: observation.fitnessFunction } : {}),
    outcome: "broken",
    evidenceObservation: observation,
    locator: observation.locator,
    message: observation.message,
    notes: observation.notes,
  });

  const carrying = (observation: EvidenceObservation) => (item: QualityCheckReconciliation): boolean =>
    item.evidenceObservation === observation;

  it.each([
    ["a behavioural one naming a scenario, at a check with an obligation", brokenOnScenario, "SCN-AAA-001"],
    ["a behavioural one naming a scenario, at a check with no obligation", brokenOnScenarioWithoutObligation, "SCN-AAA-001"],
    ["a behavioural one naming no scenario carrying its code", brokenOnPhantom, "SCN-ZZZ-999"],
    ["a behavioural one naming no claim", brokenOnNothing, "(unnamed claim)"],
    ["a fitness one naming a scenario", brokenCheckOnScenario, "SCN-FIT-001"],
    ["a fitness one naming no scenario carrying its code", brokenCheckOnPhantom, "SCN-ZZZ-998"],
    ["a fitness one naming no claim", brokenCheckOnNothing, "(unnamed claim)"],
  ] as const)("posts %s on that claim's row alone, as one broken item carrying it", (_title, observation, scnId) => {
    const rows = ledger().claimReconciliations;
    expect(rows.filter((row) => row.evidenceObservations.includes(observation)).map((row) => row.scnId)).toEqual([scnId]);
    const row = rows.find((r) => r.scnId === scnId)!;
    expect(row.qualityCheckReconciliations.filter(carrying(observation))).toEqual([brokenItemFor(observation)]);
    expect(row.reconcilingItems.filter(carrying(observation))).toEqual([brokenItemFor(observation)]);
  });

  it("leaves the obligation a broken evidence observation was meant to answer missing, on behavioural and fitness checks alike", () => {
    const rows = ledger().claimReconciliations;
    const obligationItems = (scnId: string) =>
      rows.find((r) => r.scnId === scnId)!.qualityCheckReconciliations.filter((item) => item.evidenceObligation !== undefined);
    expect(obligationItems("SCN-AAA-001")).toEqual([
      { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
    ]);
    expect(obligationItems("SCN-FIT-001")).toEqual([
      { qualityCheck: "fitness", outcome: "missing", evidenceObligation: { qualityCheck: "fitness" } },
    ]);
  });

  it("makes no no-evidence-obligation or cites-unknown-scenario item for a broken evidence observation", () => {
    const outcomes = ledger().claimReconciliations.flatMap((row) => row.qualityCheckReconciliations.map((item) => item.outcome));
    expect(outcomes).not.toContain("no-evidence-obligation");
    expect(outcomes).not.toContain("cites-unknown-scenario");
  });

  it("posts a broken evidence observation naming a code two scenarios share on that code's row, as one broken item carrying it", () => {
    const shared: Scenario[] = [
      { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const brokenOnShared: EvidenceObservation = {
      qualityCheck: "unit", scnId: "SCN-DUP-001", status: "failed", broken: true,
      locator: "tests/shared.test.ts", message: "threw at import",
    };
    const sharedLedger = reconcile(shared, [brokenOnShared]);
    expect(sharedLedger.claimReconciliations.map((row) => row.scnId)).toEqual(["SCN-DUP-001"]);
    expect(sharedLedger.claimReconciliations[0]!.reconcilingItems.filter(carrying(brokenOnShared))).toEqual([
      { qualityCheck: "unit", outcome: "broken", evidenceObservation: brokenOnShared, locator: "tests/shared.test.ts", message: "threw at import" },
    ]);
    expect(brokenItemsOf(sharedLedger)).toHaveLength(1);
  });

  it("counts one broken item per broken evidence observation, wherever each posts", () => {
    expect(brokenItemsOf(ledger())).toHaveLength(everyBroken.length);
    expect(brokenItemsOf(ledger()).map((item) => item.evidenceObservation)).toEqual(
      expect.arrayContaining(everyBroken)
    );
  });
});

describe("[SCN-LDG-025] reconcile — a balanced fitness-only corpus keeps outOfBalance agreeing with the verdict", () => {
  const accountFor = (ledger: Ledger, scnId: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.scnId === scnId);
  const ctx: RunContext = { target: "obligations-only", inputs: HANDED_INPUT_NAMES, corpus: "features", runStart: new Date("2026-07-20T00:00:00.000Z"), sourceSha: null };

  it("a satisfied citation-routed check as the only evidence observation → balanced, no unnamed claim, summary.outOfBalance 0", () => {
    const fitness: Scenario[] = [
      { scnId: "SCN-DEM-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ];
    const observation: EvidenceObservation = {
      scnId: "SCN-DEM-001", qualityCheck: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(fitness, [observation]);

    expect(accountFor(ledger, "SCN-DEM-001")?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "fitness", outcome: "satisfied", evidenceObligation: { qualityCheck: "fitness" }, evidenceObservation: { scnId: "SCN-DEM-001", qualityCheck: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true } },
    ]);
    expect(accountFor(ledger, "SCN-DEM-001")?.verdict).toBe("balanced");
    expect(accountFor(ledger, "(unnamed claim)")).toBeUndefined();
    expect(isBalanced(ledger)).toBe(true);
    expect(assembleRenderInput(__er(ledger), ctx).summary.claimReconciliations.outOfBalance).toBe(0);
  });
});

describe("[SCN-LDG-023] reconcile — the evidence obligations a scenario names post to its ledger account", () => {
  const accountFor = (ledger: Ledger, scnId: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.scnId === scnId);

  it("posts no debits to the accounts no scenario names — the unnamed claim and a phantom claim", () => {
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }];
    const ledger = reconcile(namedScenarios, [
      { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed" },
      { scnId: null, qualityCheck: "unit", status: "passed" },
    ]);
    expect(accountFor(ledger, "SCN-ZZZ-999")?.evidenceObligations).toEqual([]);
    expect(accountFor(ledger, "(unnamed claim)")?.evidenceObligations).toEqual([]);
  });
});
