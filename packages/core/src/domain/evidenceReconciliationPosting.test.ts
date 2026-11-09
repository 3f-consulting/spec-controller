import { isDeepStrictEqual } from "node:util";
import { describe, it, expect } from "vitest";
import { linesOf, obligationsOf, observationsOf, reconcilingItemsOf } from "./claimReconciliation.js";
import type { ReconciliationLine } from "./claimReconciliation.js";
import { neverRanReconciliationsOf } from "./qualityCheckReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, neverRanItemsOf } from "./ledger.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import { reconciliationTotalsOf } from "../assemble/reportReconciliationTotals.test-utils.js";
import type { RunContext } from "./runProvenance.js";
import type {
  Scenario,
  EvidenceObservation,
  Ledger,
  ClaimReconciliation,
} from "../model.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { HANDED_INPUT_NAMES } from "../runInputs.test-utils.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

describe("[CLM-LDG-022] reconcile — every evidence observation posts to exactly one account, never to none", () => {
  const namedScenarios: Scenario[] = [
    { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-AAA-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-AAA-003", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
  ];

  const accountFor = (ledger: Ledger, claimCode: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === claimCode);

  it.each([
    ["posts a matched evidence observation to the account it cites", "CLM-AAA-001"],
    ["posts an evidence observation citing an unknown claim code to that phantom claim's account", "CLM-ZZZ-999"],
  ] as const)("%s", (_title, claimCode) => {
    const observation: EvidenceObservation = { claimCode, qualityCheckKind: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [observation]);
    expect(observationsOf(accountFor(ledger, claimCode)!).map(postedOf)).toEqual([observation]);
  });

  it("finds no evidence observation on any account when nothing posts", () => {
    const ledger = reconcile(namedScenarios, []);
    for (const account of ledger.claimReconciliations) {
      expect(observationsOf(account)).toEqual([]);
    }
  });
});

describe("[CLM-LDG-022] reconcile — every evidence observation is found once, inside the quality-check reconciliation of its kind of quality check", () => {
  const scenarios: Scenario[] = [
    { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-AAA-003", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
    { claimCode: "CLM-FIT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];
  const neverRanNote = { kind: "check-step-did-not-run", code: "CLM-FIT-001" } as const;
  const everyObservation: EvidenceObservation[] = [
    { qualityCheckKind: "unit", claimCode: "CLM-AAA-001", status: "passed", locator: "tests/a.test.ts" },
    { qualityCheckKind: "unit", claimCode: "CLM-AAA-001", status: "failed", locator: "tests/b.test.ts" },
    { qualityCheckKind: "unit", claimCode: "CLM-AAA-001", status: "failed", neverRan: true, locator: "tests/c.test.ts" },
    { qualityCheckKind: "e2e", claimCode: "CLM-AAA-001", status: "passed", locator: "features/a.feature" },
    { qualityCheckKind: "unit", claimCode: "CLM-AAA-003", status: "passed", locator: "tests/pending.test.ts" },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:a", claimCode: "CLM-FIT-001", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:b", claimCode: "CLM-FIT-001", exists: false, enforcedOverRealSource: false, neverRan: true, notes: [neverRanNote] },
    { qualityCheckKind: "unit", claimCode: "CLM-ZZZ-999", status: "passed", locator: "tests/phantom.test.ts" },
    { qualityCheckKind: "unit", claimCode: "CLM-ZZZ-999", status: "failed", neverRan: true, locator: "tests/phantom-never-ran.test.ts" },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:phantom", claimCode: "CLM-ZZZ-998", exists: true, enforcedOverRealSource: false },
    { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "tests/nothing.test.ts" },
    { qualityCheckKind: "unit", claimCode: null, status: "failed", neverRan: true, locator: "tests/nothing-never-ran.test.ts" },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:nothing", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:nothing-never-ran", exists: false, enforcedOverRealSource: false, neverRan: true },
  ];
  const rows = (): readonly ClaimReconciliation[] => reconcile(scenarios, [...everyObservation]).claimReconciliations;

  const heldBy = (row: ClaimReconciliation) =>
    row.qualityCheckReconciliations.flatMap((reconciliation) =>
      (reconciliation.evidenceObservations ?? []).map((held) => ({ reconciliation, held }))
    );

  it("finds each evidence observation exactly once, inside a reconciliation of its own kind of quality check", () => {
    const held = rows().flatMap(heldBy);
    for (const observation of everyObservation) {
      const found = held.filter(({ held: reconciled }) => {
        const { outcome: _outcome, ...posted } = reconciled;
        return isDeepStrictEqual(posted, observation);
      });
      expect(found.map(({ reconciliation }) => reconciliation.qualityCheckKind)).toEqual([observation.qualityCheckKind]);
    }
  });

  it("finds as many evidence observations inside the quality-check reconciliations as were reconciled", () => {
    expect(rows().flatMap(heldBy)).toHaveLength(everyObservation.length);
  });

  it("reads a row's evidence observations as exactly those its quality-check reconciliations hold, and keeps no second copy on the row", () => {
    for (const row of rows()) {
      expect(observationsOf(row)).toEqual(heldBy(row).map(({ held }) => held));
      expect(row).not.toHaveProperty("evidenceObservations");
    }
  });
});

describe("[CLM-LDG-022] reconcile — an evidence observation that never ran posts to the claim it names, as a never-ran item carrying it", () => {
  const scenarios: Scenario[] = [
    { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-FIT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];

  const note = { kind: "ambiguous-step", step: "a step" } as const;
  const neverRanOnScenario: EvidenceObservation = {
    qualityCheckKind: "unit", claimCode: "CLM-AAA-001", status: "failed", neverRan: true,
    locator: "tests/scenario.test.ts", message: "threw at import", notes: [note],
  };
  const neverRanOnScenarioWithoutObligation: EvidenceObservation = {
    qualityCheckKind: "e2e", claimCode: "CLM-AAA-001", status: "failed", neverRan: true,
    locator: "features/scenario.feature", message: "a hook failed", notes: [note],
  };
  const neverRanOnPhantom: EvidenceObservation = {
    qualityCheckKind: "unit", claimCode: "CLM-ZZZ-999", status: "failed", neverRan: true,
    locator: "tests/phantom.test.ts", message: "threw at import", notes: [note],
  };
  const neverRanOnNothing: EvidenceObservation = {
    qualityCheckKind: "unit", claimCode: null, status: "failed", neverRan: true,
    locator: "tests/nothing.test.ts", message: "threw at import", notes: [note],
  };
  const neverRanCheckOnScenario: EvidenceObservation = {
    qualityCheckKind: "fitness", fitnessFunction: "lint:scenario", claimCode: "CLM-FIT-001",
    exists: false, enforcedOverRealSource: false, neverRan: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "CLM-FIT-001" }],
  };
  const neverRanCheckOnPhantom: EvidenceObservation = {
    qualityCheckKind: "fitness", fitnessFunction: "lint:phantom", claimCode: "CLM-ZZZ-998",
    exists: false, enforcedOverRealSource: false, neverRan: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "CLM-ZZZ-998" }],
  };
  const neverRanCheckOnNothing: EvidenceObservation = {
    qualityCheckKind: "fitness", fitnessFunction: "lint:nothing",
    exists: false, enforcedOverRealSource: false, neverRan: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "lint:nothing" }],
  };

  const everyNeverRan = [
    neverRanOnScenario,
    neverRanOnScenarioWithoutObligation,
    neverRanOnPhantom,
    neverRanOnNothing,
    neverRanCheckOnScenario,
    neverRanCheckOnPhantom,
    neverRanCheckOnNothing,
  ];
  const ledger = (): Ledger => reconcile(scenarios, [...everyNeverRan]);

  const neverRanItemFor = (observation: EvidenceObservation): ReconciliationLine =>
    linesOf(neverRanReconciliationsOf([observation])[0]!)[0]!;

  const carrying = (observation: EvidenceObservation) => (line: ReconciliationLine): boolean => {
    if (line.evidenceObservation === undefined) return false;
    const { outcome: _outcome, ...held } = line.evidenceObservation;
    return isDeepStrictEqual(held, observation);
  };

  it.each([
    ["a behavioural one naming a scenario, at a check with an obligation", neverRanOnScenario, "CLM-AAA-001"],
    ["a behavioural one naming a scenario, at a check with no obligation", neverRanOnScenarioWithoutObligation, "CLM-AAA-001"],
    ["a behavioural one naming no scenario carrying its code", neverRanOnPhantom, "CLM-ZZZ-999"],
    ["a behavioural one naming no claim", neverRanOnNothing, "(unnamed claim)"],
    ["a fitness one naming a scenario", neverRanCheckOnScenario, "CLM-FIT-001"],
    ["a fitness one naming no scenario carrying its code", neverRanCheckOnPhantom, "CLM-ZZZ-998"],
    ["a fitness one naming no claim", neverRanCheckOnNothing, "(unnamed claim)"],
  ] as const)("posts %s on that claim's row alone, as one never-ran item carrying it", (_title, observation, claimCode) => {
    const rows = ledger().claimReconciliations;
    expect(rows.filter((row) => row.qualityCheckReconciliations.flatMap(linesOf).some(carrying(observation))).map((row) => row.claim)).toEqual([claimCode]);
    const row = rows.find((r) => r.claim === claimCode)!;
    expect(row.qualityCheckReconciliations.flatMap(linesOf).filter(carrying(observation))).toEqual([neverRanItemFor(observation)]);
    expect(reconcilingItemsOf(row).filter(carrying(observation))).toEqual([neverRanItemFor(observation)]);
  });

  it("leaves the obligation an evidence observation that never ran was meant to answer missing, on behavioural and fitness checks alike", () => {
    const rows = ledger().claimReconciliations;
    const obligationItems = (claimCode: string) =>
      rows.find((r) => r.claim === claimCode)!.qualityCheckReconciliations.flatMap(linesOf).filter((line) => line.evidenceObligation !== undefined);
    expect(obligationItems("CLM-AAA-001")).toEqual([
      { qualityCheckKind: "unit", outcome: "missing", evidenceObligation: { qualityCheckKind: "unit" } },
    ]);
    expect(obligationItems("CLM-FIT-001")).toEqual([
      { qualityCheckKind: "fitness", outcome: "missing", evidenceObligation: { qualityCheckKind: "fitness" } },
    ]);
  });

  it("makes no not-asked-for or cites-unknown-claim item for an evidence observation that never ran", () => {
    const outcomes = ledger().claimReconciliations.flatMap((row) => row.qualityCheckReconciliations.flatMap(linesOf).map((line) => line.outcome));
    expect(outcomes).not.toContain("not-asked-for");
    expect(outcomes).not.toContain("cites-unknown-claim");
  });

  it("posts an evidence observation that never ran naming a code two scenarios share to the unnamed claim, naming the code, as one never-ran item carrying it", () => {
    const shared: Scenario[] = [
      { claimCode: "CLM-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { claimCode: "CLM-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const neverRanOnShared: EvidenceObservation = {
      qualityCheckKind: "unit", claimCode: "CLM-DUP-001", status: "failed", neverRan: true,
      locator: "tests/shared.test.ts", message: "threw at import",
    };
    const namingTheCode: EvidenceObservation = { ...neverRanOnShared, notes: [{ kind: "shared-claim-code", code: "CLM-DUP-001" }] };
    const sharedLedger = reconcile(shared, [neverRanOnShared]);
    expect(sharedLedger.claimReconciliations.map((row) => row.claim)).toEqual(["CLM-DUP-001", "CLM-DUP-001", "(unnamed claim)"]);
    expect(reconcilingItemsOf(sharedLedger.claimReconciliations[2]!).filter(carrying(namingTheCode))).toEqual([
      neverRanItemFor(namingTheCode),
    ]);
    expect(neverRanItemsOf(sharedLedger)).toHaveLength(1);
  });

  it("counts one never-ran item per evidence observation that never ran, wherever each posts", () => {
    expect(neverRanItemsOf(ledger())).toHaveLength(everyNeverRan.length);
    expect(neverRanItemsOf(ledger()).flatMap((line) => line.evidenceObservation ?? [])).toEqual(
      expect.arrayContaining(everyNeverRan.map((observation) => ({ ...observation, outcome: "never-ran" })))
    );
  });
});

describe("[CLM-LDG-025] reconcile — a balanced fitness-only corpus keeps outOfBalance agreeing with the verdict", () => {
  const accountFor = (ledger: Ledger, claimCode: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === claimCode);
  const ctx: RunContext = { target: "obligations-only", inputs: HANDED_INPUT_NAMES, corpus: "features", runStart: new Date("2026-07-20T00:00:00.000Z"), sourceSha: null };

  it("a satisfied citation-routed check as the only evidence observation → balanced, no unnamed claim, summary.outOfBalance 0", () => {
    const fitness: Scenario[] = [
      { claimCode: "CLM-DEM-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
    ];
    const observation: EvidenceObservation = {
      claimCode: "CLM-DEM-001", qualityCheckKind: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(fitness, [observation]);

    expect(accountFor(ledger, "CLM-DEM-001")?.qualityCheckReconciliations).toEqual([
      { qualityCheckKind: "fitness", evidenceObligation: { qualityCheckKind: "fitness" }, evidenceObservations: [{ claimCode: "CLM-DEM-001", qualityCheckKind: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true, outcome: "satisfied" }] },
    ]);
    expect(accountFor(ledger, "CLM-DEM-001")?.verdict).toBe("balanced");
    expect(accountFor(ledger, "(unnamed claim)")).toBeUndefined();
    expect(isBalanced(ledger)).toBe(true);
    expect(reconciliationTotalsOf(assembleRenderInput(__er(ledger), ctx)).claimReconciliations.outOfBalance).toBe(0);
  });
});

describe("[CLM-LDG-023] reconcile — the evidence obligations a scenario names post to its ledger account", () => {
  const accountFor = (ledger: Ledger, claimCode: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === claimCode);

  it("posts no debits to the accounts no scenario names — the unnamed claim and a phantom claim", () => {
    const namedScenarios: Scenario[] = [{ claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }];
    const ledger = reconcile(namedScenarios, [
      { claimCode: "CLM-ZZZ-999", qualityCheckKind: "unit", status: "passed" },
      { claimCode: null, qualityCheckKind: "unit", status: "passed" },
    ]);
    expect(obligationsOf(accountFor(ledger, "CLM-ZZZ-999")!)).toEqual([]);
    expect(obligationsOf(accountFor(ledger, "(unnamed claim)")!)).toEqual([]);
  });
});
