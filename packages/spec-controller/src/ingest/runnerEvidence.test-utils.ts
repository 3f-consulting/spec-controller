import { expect } from "vitest";
import { assembleRenderInput, renderMarkdown, type ClaimReconciliation, type EvidenceReconciliation, type RunContext } from "@3f-consulting/spec-controller-core";
import { reconcilingItemsOf } from "@3f-consulting/spec-controller-core/internal";
import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { runInputsOf, type InputPaths } from "../cli-balance/evidenceInputs.js";
import { reportedExitCodeOf } from "../cli-balance/exitStatus.js";

export function reconcileFixture(target: string, report: InputPaths): EvidenceReconciliation {
  return runReconcile({
    features: `${target}/features`,
    packageJson: `${target}/package.json`,
    ci: target,
    ...report,
  }, resolveTargetRoot({ features: `${target}/features` }));
}

export function unitReconciliationOf(balance: EvidenceReconciliation, claimCode: string) {
  return balance.ledger.claimReconciliations
    .find((s) => s.claim === claimCode)
    ?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "unit");
}

type UnitReconciliation = ReturnType<typeof unitReconciliationOf>;

export function expectSoleObservation(unit: UnitReconciliation, outcome: string, observed: Record<string, unknown>): void {
  expect(unit?.evidenceObservations?.map((o) => o.outcome)).toEqual([outcome]);
  expect(unit?.evidenceObservations).toMatchObject([observed]);
}

export function expectMissingWithNoObservation(unit: UnitReconciliation): void {
  expect(unit?.outcome).toBe("missing");
  expect(unit?.evidenceObservations).toBeUndefined();
}

type ReconcilingItem = ReturnType<typeof reconcilingItemsOf>[number];

export function neverRanItemsOf(balance: EvidenceReconciliation): { kind: ClaimReconciliation["kind"]; item: ReconcilingItem }[] {
  return balance.ledger.claimReconciliations.flatMap((row) =>
    reconcilingItemsOf(row).filter((item) => item.outcome === "never-ran").map((item) => ({ kind: row.kind, item }))
  );
}

export function soleNeverRanObservationOnUnnamedClaim(balance: EvidenceReconciliation): ReconcilingItem["evidenceObservation"] {
  const neverRan = neverRanItemsOf(balance);
  expect(neverRan).toHaveLength(1);
  expect(neverRan[0]?.kind).toBe("unnamed-claim");
  return neverRan[0]?.item.evidenceObservation;
}

const contextOf = (target: string): RunContext =>
  ({ target, inputs: runInputsOf({}), corpus: "features", runStart: new Date("2026-10-15T09:00:00.000Z"), sourceSha: null });

export function reportLinesOf(balance: EvidenceReconciliation, target: string): string[] {
  return renderMarkdown(balance, contextOf(target), reportedExitCodeOf).split("\n");
}

export function unnamedClaimRowOf(balance: EvidenceReconciliation, target: string, mentioning = ""): string {
  return reportLinesOf(balance, target).find((line) => line.startsWith("| (unnamed claim) | ") && line.includes(mentioning)) ?? "";
}

export function runVerdictOf(balance: EvidenceReconciliation, target: string) {
  return assembleRenderInput(balance, contextOf(target)).summary.runVerdict;
}

export const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;
