import type { BehaviouralQualityCheck, BehaviouralEvidenceObservation, ObservationNote } from "./journal.js";
import { isFitnessObservation } from "./journal.js";
import type { QualityCheckReconciliation } from "./qualityCheckReconciliation.js";

interface SuspenseRemark {
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
}

export interface SuspenseFileGroup {
  readonly qualityCheck: BehaviouralQualityCheck;
  readonly locator: string | undefined;
  readonly remarks: readonly SuspenseRemark[];
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

interface SuspenseStepsGroup {
  readonly names: readonly string[];
}

export type SuspenseGroup = SuspenseFileGroup | SuspenseStepsGroup;

function isFileGrouped(item: QualityCheckReconciliation): boolean {
  return item.evidenceObservation !== undefined && !isFitnessObservation(item.evidenceObservation);
}

function keyOf(item: FileGroupedItem): string {
  return JSON.stringify([item.evidenceObservation.qualityCheck, item.locator ?? null]);
}

function remarksOf(items: readonly FileGroupedItem[]): SuspenseRemark[] {
  return items.flatMap(({ message, notes }) =>
    message === undefined && notes === undefined
      ? []
      : [{ ...(message !== undefined ? { message } : {}), ...(notes !== undefined ? { notes } : {}) }]
  );
}

function groupOf(items: readonly FileGroupedItem[]): SuspenseFileGroup {
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

function stepsGroupOf(items: readonly QualityCheckReconciliation[]): SuspenseStepsGroup[] {
  const names = items.flatMap(({ evidenceObservation: o }) =>
    o !== undefined && isFitnessObservation(o) ? [o.fitnessFunction] : []
  );
  return names.length === 0 ? [] : [{ names }];
}

export function suspenseGroupsOf(items: readonly QualityCheckReconciliation[]): SuspenseGroup[] {
  const byFile = new Map<string, FileGroupedItem[]>();
  for (const item of items.filter(isFileGrouped) as FileGroupedItem[]) {
    const key = keyOf(item);
    byFile.set(key, [...(byFile.get(key) ?? []), item]);
  }
  return [...[...byFile.values()].map(groupOf), ...stepsGroupOf(items)];
}
