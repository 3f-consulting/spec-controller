import type { BehaviouralQualityCheck, BehaviouralEvidenceObservation, ObservationNote } from "./journal.js";
import { isFitnessObservation } from "./journal.js";
import type { QualityCheckReconciliation } from "./qualityCheckReconciliation.js";

interface UnnamedClaimRemark {
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
}

export interface UnnamedClaimFileGroup {
  readonly qualityCheck: BehaviouralQualityCheck;
  readonly locator: string | undefined;
  readonly remarks: readonly UnnamedClaimRemark[];
  readonly ran: number;
  readonly passed: number;
  readonly failed: number;
  readonly failedNames: readonly string[];
}

interface FileGroupedItem {
  readonly locator?: string;
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
  readonly evidenceObservation: BehaviouralEvidenceObservation;
}

interface UnnamedClaimStepsGroup {
  readonly names: readonly string[];
}

export type UnnamedClaimGroup = UnnamedClaimFileGroup | UnnamedClaimStepsGroup;

function citesNoScenario(item: QualityCheckReconciliation): boolean {
  return item.outcome === "cites-no-scenario";
}

function isFileGrouped(item: QualityCheckReconciliation): boolean {
  return citesNoScenario(item) && item.evidenceObservation !== undefined && !isFitnessObservation(item.evidenceObservation);
}

function keyOf(item: FileGroupedItem): string {
  return JSON.stringify([item.evidenceObservation.qualityCheck, item.locator ?? null]);
}

function remarksOf(items: readonly FileGroupedItem[]): UnnamedClaimRemark[] {
  return items.flatMap(({ message, notes }) =>
    message === undefined && notes === undefined
      ? []
      : [{ ...(message !== undefined ? { message } : {}), ...(notes !== undefined ? { notes } : {}) }]
  );
}

function groupOf(items: readonly FileGroupedItem[]): UnnamedClaimFileGroup {
  const [first] = items as [FileGroupedItem, ...FileGroupedItem[]];
  const passed = items.filter((item) => item.evidenceObservation.status === "passed").length;
  return {
    qualityCheck: first.evidenceObservation.qualityCheck,
    locator: first.locator,
    remarks: remarksOf(items),
    ran: items.length,
    passed,
    failed: items.length - passed,
    failedNames: items.flatMap(({ evidenceObservation: o }) =>
      o.status === "failed" && o.testName !== undefined ? [o.testName] : []
    ),
  };
}

function stepsGroupOf(items: readonly QualityCheckReconciliation[]): UnnamedClaimStepsGroup[] {
  const names = items.filter(citesNoScenario).flatMap(({ evidenceObservation: o }) =>
    o !== undefined && isFitnessObservation(o) ? [o.fitnessFunction] : []
  );
  return names.length === 0 ? [] : [{ names }];
}

export function unnamedClaimGroupsOf(items: readonly QualityCheckReconciliation[]): UnnamedClaimGroup[] {
  const byFile = new Map<string, FileGroupedItem[]>();
  for (const item of items.filter(isFileGrouped) as FileGroupedItem[]) {
    const key = keyOf(item);
    byFile.set(key, [...(byFile.get(key) ?? []), item]);
  }
  return [...[...byFile.values()].map(groupOf), ...stepsGroupOf(items)];
}
