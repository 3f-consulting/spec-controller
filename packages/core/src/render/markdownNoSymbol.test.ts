import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { symbolCharactersIn } from "./symbolCharacter.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const DEFERRAL_TAG = "deferred";

const DEFERRED = `Feature: deferred evidence

  @CLM-NSY-006 @${DEFERRAL_TAG}
  Scenario: deferred whole, with no quality check named

  @unit @CLM-NSY-007 @integrationpending
  Scenario: one quality check deferred, the other proved
`;

const scenarios = (): Scenario[] => [
  { claimCode: "CLM-NSY-001", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }] },
  { claimCode: "CLM-NSY-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  { claimCode: "CLM-NSY-003", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }] },
  { claimCode: "CLM-NSY-004", evidenceObligations: [] },
  { claimCode: "CLM-NSY-005", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  { claimCode: "CLM-NSY-005", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  ...parseScenarios(DEFERRED, [DEFERRAL_TAG]),
];

const OBSERVATIONS: EvidenceObservation[] = [
  { qualityCheckKind: "unit", claimCode: "CLM-NSY-001", status: "passed", locator: "src/a.test.ts" },
  { qualityCheckKind: "fitness", fitnessFunction: "lint:sound", claimCode: "CLM-NSY-001", exists: true, enforcedOverRealSource: true },
  { qualityCheckKind: "unit", claimCode: "CLM-NSY-002", status: "failed", locator: "src/b.test.ts" },
  { qualityCheckKind: "integration", claimCode: "CLM-NSY-002", status: "passed", locator: "tests/steps/b.steps.ts" },
  { qualityCheckKind: "fitness", fitnessFunction: "lint:fake", claimCode: "CLM-NSY-003", exists: true, enforcedOverRealSource: false },
  { qualityCheckKind: "unit", claimCode: "CLM-NSY-007", status: "passed", locator: "src/g.test.ts" },
  { qualityCheckKind: "unit", claimCode: "CLM-NSY-999", status: "passed", locator: "src/ghost.test.ts" },
  { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "src/uncited.test.ts" },
  { qualityCheckKind: "fitness", fitnessFunction: "lint:uncited", exists: true, enforcedOverRealSource: true },
  { qualityCheckKind: "unit", claimCode: null, status: "passed", neverRan: true, locator: "src/never-ran.test.ts" },
];

function render(scenarios: Scenario[], observations: EvidenceObservation[], untagged: string[] = []): string {
  const ledger = reconcile(scenarios, observations, untagged);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf);
}

const unsoundWithEveryOutcome = (): string =>
  render(scenarios(), OBSERVATIONS, ["features/checkout.feature : a scenario with no code"]);
const balancedWithPendingItems = (): string =>
  render(parseScenarios(DEFERRED, [DEFERRAL_TAG]), [
    { qualityCheckKind: "unit", claimCode: "CLM-NSY-007", status: "passed", locator: "src/g.test.ts" },
  ]);

describe("[CLM-RPT-067] the markdown report's own words hold no symbol character, whatever its outcomes, Pending Items or run integrity", () => {
  it("counts a symbol by what it is: a known one and one no list ever named are found, and punctuation is not", () => {
    expect(symbolCharactersIn("pending ⏳")).toEqual(["⏳"]);
    expect(symbolCharactersIn("★ row")).toEqual(["★"]);
    expect(symbolCharactersIn("— deferred, “quoted” … | a + b = c `code`")).toEqual([]);
  });

  it("renders an unsound report holding every outcome and Pending Items, and a balanced one whose Pending Items are outstanding", () => {
    const unsound = unsoundWithEveryOutcome();
    expect(unsound).toContain("This run is unsound.");
    expect(unsound).toMatch(/\| CLM-NSY-006 \|[^\n]*pending/);
    expect(unsound).toMatch(/\| CLM-NSY-007 \|[^\n]*pending: integration/);
    expect(unsound).toContain("Pending Item(s) — deferred");
    expect(balancedWithPendingItems()).toContain("Pending Items are outstanding");
  });

  it("holds no symbol character on any line of either report", () => {
    const offending = [unsoundWithEveryOutcome(), balancedWithPendingItems()]
      .flatMap((md) => md.split("\n"))
      .filter((line) => symbolCharactersIn(line).length > 0);
    expect(offending).toEqual([]);
  });
});
