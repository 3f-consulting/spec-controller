import { isDeepStrictEqual } from "node:util";
import { describe, it, expect } from "vitest";
import { linesOf, obligationsOf, observationsOf, reconcilingItemsOf } from "./claimReconciliation.js";
import type { ReconciliationLine } from "./claimReconciliation.js";
import { brokenReconciliationsOf } from "./qualityCheckReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, brokenItemsOf } from "./ledger.js";
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

describe("[SCN-LDG-022] reconcile — every evidence observation posts to exactly one account, never to none", () => {
  const namedScenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
  ];

  const accountFor = (ledger: Ledger, scnId: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === scnId);

  it.each([
    ["posts a matched evidence observation to the account it cites", "SCN-AAA-001"],
    ["posts an evidence observation citing an unknown @SCN to that phantom claim's account", "SCN-ZZZ-999"],
  ] as const)("%s", (_title, scnId) => {
    const observation: EvidenceObservation = { scnId, qualityCheckKind: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [observation]);
    expect(observationsOf(accountFor(ledger, scnId)!).map(postedOf)).toEqual([observation]);
  });

  it("finds no evidence observation on any account when nothing posts", () => {
    const ledger = reconcile(namedScenarios, []);
    for (const account of ledger.claimReconciliations) {
      expect(observationsOf(account)).toEqual([]);
    }
  });
});

describe("[SCN-LDG-022] reconcile — every evidence observation is found once, inside the quality-check reconciliation of its kind of quality check", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
    { scnId: "SCN-FIT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];
  const brokenNote = { kind: "check-step-did-not-run", code: "SCN-FIT-001" } as const;
  const everyObservation: EvidenceObservation[] = [
    { qualityCheckKind: "unit", scnId: "SCN-AAA-001", status: "passed", locator: "tests/a.test.ts" },
    { qualityCheckKind: "unit", scnId: "SCN-AAA-001", status: "failed", locator: "tests/b.test.ts" },
    { qualityCheckKind: "unit", scnId: "SCN-AAA-001", status: "failed", broken: true, locator: "tests/c.test.ts" },
    { qualityCheckKind: "e2e", scnId: "SCN-AAA-001", status: "passed", locator: "features/a.feature" },
    { qualityCheckKind: "unit", scnId: "SCN-AAA-003", status: "passed", locator: "tests/pending.test.ts" },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:a", scnId: "SCN-FIT-001", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:b", scnId: "SCN-FIT-001", exists: false, enforcedOverRealSource: false, broken: true, notes: [brokenNote] },
    { qualityCheckKind: "unit", scnId: "SCN-ZZZ-999", status: "passed", locator: "tests/phantom.test.ts" },
    { qualityCheckKind: "unit", scnId: "SCN-ZZZ-999", status: "failed", broken: true, locator: "tests/phantom-broken.test.ts" },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:phantom", scnId: "SCN-ZZZ-998", exists: true, enforcedOverRealSource: false },
    { qualityCheckKind: "unit", scnId: null, status: "passed", locator: "tests/nothing.test.ts" },
    { qualityCheckKind: "unit", scnId: null, status: "failed", broken: true, locator: "tests/nothing-broken.test.ts" },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:nothing", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:nothing-broken", exists: false, enforcedOverRealSource: false, broken: true },
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

describe("[SCN-LDG-022] reconcile — a broken evidence observation posts to the claim it names, as a broken item carrying it", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { scnId: "SCN-FIT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];

  const note = { kind: "ambiguous-step", step: "a step" } as const;
  const brokenOnScenario: EvidenceObservation = {
    qualityCheckKind: "unit", scnId: "SCN-AAA-001", status: "failed", broken: true,
    locator: "tests/scenario.test.ts", message: "threw at import", notes: [note],
  };
  const brokenOnScenarioWithoutObligation: EvidenceObservation = {
    qualityCheckKind: "e2e", scnId: "SCN-AAA-001", status: "failed", broken: true,
    locator: "features/scenario.feature", message: "a hook failed", notes: [note],
  };
  const brokenOnPhantom: EvidenceObservation = {
    qualityCheckKind: "unit", scnId: "SCN-ZZZ-999", status: "failed", broken: true,
    locator: "tests/phantom.test.ts", message: "threw at import", notes: [note],
  };
  const brokenOnNothing: EvidenceObservation = {
    qualityCheckKind: "unit", scnId: null, status: "failed", broken: true,
    locator: "tests/nothing.test.ts", message: "threw at import", notes: [note],
  };
  const brokenCheckOnScenario: EvidenceObservation = {
    qualityCheckKind: "fitness", fitnessFunction: "lint:scenario", scnId: "SCN-FIT-001",
    exists: false, enforcedOverRealSource: false, broken: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "SCN-FIT-001" }],
  };
  const brokenCheckOnPhantom: EvidenceObservation = {
    qualityCheckKind: "fitness", fitnessFunction: "lint:phantom", scnId: "SCN-ZZZ-998",
    exists: false, enforcedOverRealSource: false, broken: true,
    locator: ".github/workflows/ci.yml", message: "the step did not run",
    notes: [{ kind: "check-step-did-not-run", code: "SCN-ZZZ-998" }],
  };
  const brokenCheckOnNothing: EvidenceObservation = {
    qualityCheckKind: "fitness", fitnessFunction: "lint:nothing",
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

  const brokenItemFor = (observation: EvidenceObservation): ReconciliationLine =>
    linesOf(brokenReconciliationsOf([observation])[0]!)[0]!;

  const carrying = (observation: EvidenceObservation) => (line: ReconciliationLine): boolean => {
    if (line.evidenceObservation === undefined) return false;
    const { outcome: _outcome, ...held } = line.evidenceObservation;
    return isDeepStrictEqual(held, observation);
  };

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
    expect(rows.filter((row) => row.qualityCheckReconciliations.flatMap(linesOf).some(carrying(observation))).map((row) => row.claim)).toEqual([scnId]);
    const row = rows.find((r) => r.claim === scnId)!;
    expect(row.qualityCheckReconciliations.flatMap(linesOf).filter(carrying(observation))).toEqual([brokenItemFor(observation)]);
    expect(reconcilingItemsOf(row).filter(carrying(observation))).toEqual([brokenItemFor(observation)]);
  });

  it("leaves the obligation a broken evidence observation was meant to answer missing, on behavioural and fitness checks alike", () => {
    const rows = ledger().claimReconciliations;
    const obligationItems = (scnId: string) =>
      rows.find((r) => r.claim === scnId)!.qualityCheckReconciliations.flatMap(linesOf).filter((line) => line.evidenceObligation !== undefined);
    expect(obligationItems("SCN-AAA-001")).toEqual([
      { qualityCheckKind: "unit", outcome: "missing", evidenceObligation: { qualityCheckKind: "unit" } },
    ]);
    expect(obligationItems("SCN-FIT-001")).toEqual([
      { qualityCheckKind: "fitness", outcome: "missing", evidenceObligation: { qualityCheckKind: "fitness" } },
    ]);
  });

  it("makes no no-evidence-obligation or cites-unknown-scenario item for a broken evidence observation", () => {
    const outcomes = ledger().claimReconciliations.flatMap((row) => row.qualityCheckReconciliations.flatMap(linesOf).map((line) => line.outcome));
    expect(outcomes).not.toContain("no-evidence-obligation");
    expect(outcomes).not.toContain("cites-unknown-scenario");
  });

  it("posts a broken evidence observation naming a code two scenarios share to the unnamed claim, naming the code, as one broken item carrying it", () => {
    const shared: Scenario[] = [
      { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const brokenOnShared: EvidenceObservation = {
      qualityCheckKind: "unit", scnId: "SCN-DUP-001", status: "failed", broken: true,
      locator: "tests/shared.test.ts", message: "threw at import",
    };
    const namingTheCode: EvidenceObservation = { ...brokenOnShared, notes: [{ kind: "shared-scn-code", code: "SCN-DUP-001" }] };
    const sharedLedger = reconcile(shared, [brokenOnShared]);
    expect(sharedLedger.claimReconciliations.map((row) => row.claim)).toEqual(["SCN-DUP-001", "SCN-DUP-001", "(unnamed claim)"]);
    expect(reconcilingItemsOf(sharedLedger.claimReconciliations[2]!).filter(carrying(namingTheCode))).toEqual([
      brokenItemFor(namingTheCode),
    ]);
    expect(brokenItemsOf(sharedLedger)).toHaveLength(1);
  });

  it("counts one broken item per broken evidence observation, wherever each posts", () => {
    expect(brokenItemsOf(ledger())).toHaveLength(everyBroken.length);
    expect(brokenItemsOf(ledger()).flatMap((line) => line.evidenceObservation ?? [])).toEqual(
      expect.arrayContaining(everyBroken.map((observation) => ({ ...observation, outcome: "broken" })))
    );
  });
});

describe("[SCN-LDG-025] reconcile — a balanced fitness-only corpus keeps outOfBalance agreeing with the verdict", () => {
  const accountFor = (ledger: Ledger, scnId: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === scnId);
  const ctx: RunContext = { target: "obligations-only", inputs: HANDED_INPUT_NAMES, corpus: "features", runStart: new Date("2026-07-20T00:00:00.000Z"), sourceSha: null };

  it("a satisfied citation-routed check as the only evidence observation → balanced, no unnamed claim, summary.outOfBalance 0", () => {
    const fitness: Scenario[] = [
      { scnId: "SCN-DEM-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
    ];
    const observation: EvidenceObservation = {
      scnId: "SCN-DEM-001", qualityCheckKind: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(fitness, [observation]);

    expect(accountFor(ledger, "SCN-DEM-001")?.qualityCheckReconciliations).toEqual([
      { qualityCheckKind: "fitness", evidenceObligation: { qualityCheckKind: "fitness" }, evidenceObservations: [{ scnId: "SCN-DEM-001", qualityCheckKind: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true, outcome: "satisfied" }] },
    ]);
    expect(accountFor(ledger, "SCN-DEM-001")?.verdict).toBe("balanced");
    expect(accountFor(ledger, "(unnamed claim)")).toBeUndefined();
    expect(isBalanced(ledger)).toBe(true);
    expect(reconciliationTotalsOf(assembleRenderInput(__er(ledger), ctx)).claimReconciliations.outOfBalance).toBe(0);
  });
});

describe("[SCN-LDG-023] reconcile — the evidence obligations a scenario names post to its ledger account", () => {
  const accountFor = (ledger: Ledger, scnId: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === scnId);

  it("posts no debits to the accounts no scenario names — the unnamed claim and a phantom claim", () => {
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }];
    const ledger = reconcile(namedScenarios, [
      { scnId: "SCN-ZZZ-999", qualityCheckKind: "unit", status: "passed" },
      { scnId: null, qualityCheckKind: "unit", status: "passed" },
    ]);
    expect(obligationsOf(accountFor(ledger, "SCN-ZZZ-999")!)).toEqual([]);
    expect(obligationsOf(accountFor(ledger, "(unnamed claim)")!)).toEqual([]);
  });
});
