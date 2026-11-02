import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, QualityCheckKind, Scenario } from "../model.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import {
  RECONCILING_ITEMS_COLUMN,
  claimReconciliationsTable,
  type ClaimReconciliationsTable,
} from "./claimReconciliationsTable.test-utils.js";
import { UNNAMED_CLAIM_ID } from "../domain/claimReconciliation.js";

const CI_STEPS_COLUMN = "CI steps";

const scenarios: Scenario[] = [
  { scnId: "SCN-UNE-001", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "e2e" }] },
  { scnId: "SCN-INE-001", evidenceObligations: [{ qualityCheckKind: "integration" }, { qualityCheckKind: "e2e" }] },
  { scnId: "SCN-FFN-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { scnId: "SCN-FAU-001", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }] },
  { scnId: "SCN-OBS-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  { scnId: "SCN-TWO-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { scnId: "SCN-SHR-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  { scnId: "SCN-SHR-001", evidenceObligations: [{ qualityCheckKind: "integration" }] },
  { scnId: "SCN-BRK-001", evidenceObligations: [{ qualityCheckKind: "integration" }] },
  { scnId: "SCN-FBK-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { scnId: "SCN-SEP-001", evidenceObligations: [{ qualityCheckKind: "fitness" }, { qualityCheckKind: "unit" }] },
  { scnId: "SCN-SPB-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
];

const observations: EvidenceObservation[] = [
  { qualityCheckKind: "unit", scnId: "SCN-UNE-001", status: "passed" },
  { qualityCheckKind: "e2e", scnId: "SCN-UNE-001", status: "passed" },
  { qualityCheckKind: "integration", scnId: "SCN-INE-001", status: "passed" },
  { qualityCheckKind: "e2e", scnId: "SCN-INE-001", status: "passed" },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm lint",
    scnId: "SCN-FFN-001",
    step: "ci.yml:ci:Lint | strict",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm guard",
    scnId: "SCN-FAU-001",
    step: "ci.yml:ci:Guard",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  { qualityCheckKind: "unit", scnId: "SCN-FAU-001", status: "passed" },
  { qualityCheckKind: "unit", scnId: "SCN-OBS-001", status: "passed" },
  { qualityCheckKind: "integration", scnId: "SCN-OBS-001", status: "passed" },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm types",
    locator: "checks/types-1",
    scnId: "SCN-TWO-001",
    step: "ci.yml:ci:Types",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm types again",
    locator: "checks/types-2",
    scnId: "SCN-TWO-001",
    step: "nightly.yml:nightly:Types",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm types twice",
    locator: "checks/types-3",
    scnId: "SCN-TWO-001",
    step: "ci.yml:ci:Types",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  { qualityCheckKind: "integration", scnId: "SCN-BRK-001", status: "passed" },
  { qualityCheckKind: "unit", scnId: "SCN-BRK-001", status: "failed", broken: true },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm lint",
    scnId: "SCN-FBK-001",
    step: "ci.yml:checks:Lint",
    exists: false,
    enforcedOverRealSource: false,
    broken: true,
  },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm pack",
    scnId: "SCN-SEP-001",
    step: "ci.yml:ci:Pack both packages, once",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  { qualityCheckKind: "unit", scnId: "SCN-SEP-001", status: "passed" },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm e2e",
    scnId: "SCN-SPB-001",
    step: "ci.yml:ci:E2e, headless \\ cloud | ci",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  { qualityCheckKind: "e2e", scnId: "SCN-GHO-001", status: "passed" },
  { qualityCheckKind: "integration", scnId: null, status: "passed" },
];

const STEPS: Partial<Record<QualityCheckKind, readonly string[]>> = {
  unit: ["Test"],
  integration: ["Cucumber"],
  e2e: ["Cucumber"],
};

function withCiSteps(reconciliation: EvidenceReconciliation): EvidenceReconciliation {
  const observed = reconciliation.summary.evidenceObservations!;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      evidenceObservations: {
        ...observed,
        byQualityCheckKind: observed.byQualityCheckKind.map((entry) =>
          STEPS[entry.qualityCheckKind] === undefined ? entry : { ...entry, ciSteps: STEPS[entry.qualityCheckKind]! }
        ),
      },
    },
  };
}

function tableOf(
  corpus: readonly Scenario[],
  evidence: readonly EvidenceObservation[],
  untagged: readonly string[] = []
): ClaimReconciliationsTable {
  const reconciliation = withCiSteps(__er(reconcile([...corpus], [...evidence], [...untagged]), true));
  return claimReconciliationsTable(renderMarkdown(reconciliation, ctx, publishedExitCodeOf));
}

const table = (): ClaimReconciliationsTable => tableOf(scenarios, observations);

const ciStepsOf = (claim: string): string => table().rowOf(claim).cell(CI_STEPS_COLUMN);

describe("[SCN-RPT-080] each Claim Reconciliation names, after its reconciling items, the CI steps behind each kind of quality check it obligates or observes, each step once, the step of a fitness function it observes only through broken evidence included", () => {
  it("ends the table with the CI steps column, after Reconciling items", () => {
    const header = table().header;
    expect(header.slice(-2)).toStrictEqual([RECONCILING_ITEMS_COLUMN, CI_STEPS_COLUMN]);
  });

  it("names a unit and e2e scenario's steps in column order", () => {
    expect(ciStepsOf("SCN-UNE-001")).toBe("Test, Cucumber");
  });

  it("names a step that runs two of a row's quality checks once", () => {
    expect(ciStepsOf("SCN-INE-001")).toBe("Cucumber");
  });

  it("names a fitness scenario's observation by its workflow, job and step, held whole in its cell", () => {
    expect(ciStepsOf("SCN-FFN-001")).toBe("ci.yml:ci:Lint \\| strict");
  });

  it("names the fitness step before the behavioural steps", () => {
    expect(ciStepsOf("SCN-FAU-001")).toBe("ci.yml:ci:Guard, Test");
  });

  it("names the steps of a quality check the row observes without obligating", () => {
    expect(ciStepsOf("SCN-OBS-001")).toBe("Test, Cucumber");
  });

  it("names the steps of a quality check the row observes only through broken evidence", () => {
    expect(ciStepsOf("SCN-BRK-001")).toBe("Test, Cucumber");
  });

  it("names the step of a fitness function the row observes only through broken evidence", () => {
    expect(ciStepsOf("SCN-FBK-001")).toBe("ci.yml:checks:Lint");
  });

  it("names each fitness observation's step in evidence order, each once", () => {
    expect(ciStepsOf("SCN-TWO-001")).toBe("ci.yml:ci:Types, nightly.yml:nightly:Types");
  });

  it("quotes a step name holding a row separator in its code span, once, beside a step that holds none", () => {
    expect(ciStepsOf("SCN-SEP-001")).toBe("`ci.yml:ci:Pack both packages, once`, Test");
  });

  it("keeps the pipe escaped and a backslash as written inside the code span of a step name holding a row separator", () => {
    expect(ciStepsOf("SCN-SPB-001")).toBe("`ci.yml:ci:E2e, headless \\ cloud \\| ci`");
  });

  it("names each sharer of a shared code's steps from its own obligations", () => {
    const sharers = table().rowsOf("SCN-SHR-001").map((row) => row.cell(CI_STEPS_COLUMN));
    expect(sharers).toStrictEqual(["Test", "Cucumber"]);
  });

  it("names a phantom claim's steps by the same rule", () => {
    expect(ciStepsOf("SCN-GHO-001")).toBe("Cucumber");
  });

  it("names the unnamed claim's steps by the same rule", () => {
    expect(ciStepsOf(UNNAMED_CLAIM_ID)).toBe("Cucumber");
  });
});

const unknownStepScenarios: Scenario[] = [
  { scnId: "SCN-PRF-001", evidenceObligations: [{ qualityCheckKind: "performance" }] },
  { scnId: "SCN-MIS-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { scnId: "SCN-NST-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { scnId: "SCN-KUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "performance" }] },
  { scnId: "SCN-KUF-001", evidenceObligations: [{ qualityCheckKind: "fitness" }, { qualityCheckKind: "unit" }] },
  { scnId: "SCN-NON-001", evidenceObligations: [{ qualityCheckKind: "performance" }, { qualityCheckKind: "fitness" }] },
];

const unknownStepObservations: EvidenceObservation[] = [
  { qualityCheckKind: "performance", scnId: "SCN-PRF-001", status: "passed" },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm audit",
    scnId: "SCN-NST-001",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  { qualityCheckKind: "unit", scnId: "SCN-KUP-001", status: "passed" },
  { qualityCheckKind: "performance", scnId: "SCN-KUP-001", status: "passed" },
  {
    qualityCheckKind: "fitness",
    fitnessFunction: "pnpm depcheck",
    scnId: "SCN-KUF-001",
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  },
  { qualityCheckKind: "unit", scnId: "SCN-KUF-001", status: "passed" },
  { qualityCheckKind: "performance", scnId: "SCN-NON-001", status: "passed" },
];

const UNTAGGED_SCENARIO = "untagged.feature : a scenario with no code";

const unknownStepsOf = (claim: string): string =>
  tableOf(unknownStepScenarios, unknownStepObservations, [UNTAGGED_SCENARIO]).rowOf(claim).cell(CI_STEPS_COLUMN);

describe("[SCN-RPT-081] a quality check with no known step adds none to its Claim Reconciliation's CI steps, and a Claim Reconciliation with none has a blank cell", () => {
  it("adds nothing for a behavioural quality check whose summary names no CI step", () => {
    expect(unknownStepsOf("SCN-PRF-001")).toBe("");
  });

  it("adds nothing for a fitness obligation with no evidence observation", () => {
    expect(unknownStepsOf("SCN-MIS-001")).toBe("");
  });

  it("adds nothing for a fitness observation that names no step", () => {
    expect(unknownStepsOf("SCN-NST-001")).toBe("");
  });

  it("names only the known behavioural check's steps beside an unknown behavioural check", () => {
    expect(unknownStepsOf("SCN-KUP-001")).toBe("Test");
  });

  it("names only the known behavioural check's steps beside a fitness observation that names no step", () => {
    expect(unknownStepsOf("SCN-KUF-001")).toBe("Test");
  });

  it("leaves the cell blank on a row with no known step", () => {
    expect(unknownStepsOf("SCN-NON-001")).toBe("");
  });

  it("leaves the cell blank on a scenario with no @SCN", () => {
    expect(unknownStepsOf(UNTAGGED_SCENARIO)).toBe("");
  });
});
