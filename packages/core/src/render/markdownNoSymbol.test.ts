import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarios.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { symbolCharactersIn } from "./symbolCharacter.test-utils.js";

const DEFERRAL_TAG = "deferred";

const DEFERRED = `Feature: deferred evidence

  @SCN-NSY-006 @${DEFERRAL_TAG}
  Scenario: deferred whole, with no quality check named

  @unit @SCN-NSY-007 @integrationpending
  Scenario: one quality check deferred, the other proved
`;

const scenarios = (): Scenario[] => [
  { scnId: "SCN-NSY-001", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }] },
  { scnId: "SCN-NSY-002", evidenceObligations: [{ qualityCheck: "unit" }] },
  { scnId: "SCN-NSY-003", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }] },
  { scnId: "SCN-NSY-004", evidenceObligations: [] },
  { scnId: "SCN-NSY-005", evidenceObligations: [{ qualityCheck: "unit" }] },
  { scnId: "SCN-NSY-005", evidenceObligations: [{ qualityCheck: "unit" }] },
  ...parseScenarios(DEFERRED, [DEFERRAL_TAG]),
];

const OBSERVATIONS: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-NSY-001", status: "passed", locator: "src/a.test.ts" },
  { qualityCheck: "fitness", fitnessFunction: "lint:sound", scnId: "SCN-NSY-001", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "unit", scnId: "SCN-NSY-002", status: "failed", locator: "src/b.test.ts" },
  { qualityCheck: "integration", scnId: "SCN-NSY-002", status: "passed", locator: "tests/steps/b.steps.ts" },
  { qualityCheck: "fitness", fitnessFunction: "lint:fake", scnId: "SCN-NSY-003", exists: true, enforcedOverRealSource: false },
  { qualityCheck: "unit", scnId: "SCN-NSY-007", status: "passed", locator: "src/g.test.ts" },
  { qualityCheck: "unit", scnId: "SCN-NSY-999", status: "passed", locator: "src/ghost.test.ts" },
  { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" },
  { qualityCheck: "fitness", fitnessFunction: "lint:uncited", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "unit", scnId: null, status: "passed", broken: true, locator: "src/broken.test.ts" },
];

function render(scenarios: Scenario[], observations: EvidenceObservation[], untagged: string[] = []): string {
  const ledger = reconcile(scenarios, observations, untagged);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
  return renderMarkdown(reconciliation, ctx);
}

const unsoundWithEveryOutcome = (): string =>
  render(scenarios(), OBSERVATIONS, ["features/checkout.feature : a scenario with no code"]);
const balancedWithPendingItems = (): string =>
  render(parseScenarios(DEFERRED, [DEFERRAL_TAG]), [
    { qualityCheck: "unit", scnId: "SCN-NSY-007", status: "passed", locator: "src/g.test.ts" },
  ]);

describe("[SCN-RPT-067] no line of the markdown report holds a symbol character, whatever its outcomes, Pending Items or run integrity", () => {
  it("counts a symbol by what it is: a known one and one no list ever named are found, and punctuation is not", () => {
    expect(symbolCharactersIn("pending ⏳")).toEqual(["⏳"]);
    expect(symbolCharactersIn("★ row")).toEqual(["★"]);
    expect(symbolCharactersIn("— deferred, “quoted” … | a + b = c `code`")).toEqual([]);
  });

  it("renders an unsound report holding every outcome and Pending Items, and a balanced one whose Pending Items are outstanding", () => {
    const unsound = unsoundWithEveryOutcome();
    expect(unsound).toContain("This run is unsound.");
    expect(unsound).toMatch(/\| SCN-NSY-006 \|[^\n]*pending/);
    expect(unsound).toMatch(/\| SCN-NSY-007 \|[^\n]*pending: integration/);
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
