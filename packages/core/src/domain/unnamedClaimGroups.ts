import type { BehaviouralQualityCheck, BehaviouralEvidenceObservation, EvidenceObservation, ObservationNote } from "./journal.js";
import { isFitnessObservation } from "./journal.js";
import type { ReconciliationLine } from "./claimReconciliation.js";

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

interface UnnamedClaimStepsGroup {
  readonly names: readonly string[];
  readonly sharedScnCode?: string;
}

export type UnnamedClaimGroup = UnnamedClaimFileGroup | UnnamedClaimStepsGroup;

function citingNoScenario(lines: readonly ReconciliationLine[]): EvidenceObservation[] {
  return lines
    .filter((line) => line.outcome === "cites-no-scenario")
    .flatMap((line) => line.evidenceObservation ?? []);
}

function sharedScnCodeOf(observation: EvidenceObservation): string | null {
  const [code = null] = (observation.notes ?? []).flatMap((note) => (note.kind === "shared-scn-code" ? [note.code] : []));
  return code;
}

function keyOf(observation: BehaviouralEvidenceObservation): string {
  return JSON.stringify([observation.qualityCheck, observation.locator ?? null, sharedScnCodeOf(observation)]);
}

function remarksOf(observations: readonly BehaviouralEvidenceObservation[]): UnnamedClaimRemark[] {
  return observations.flatMap(({ message, notes }) =>
    message === undefined && notes === undefined
      ? []
      : [{ ...(message !== undefined ? { message } : {}), ...(notes !== undefined ? { notes } : {}) }]
  );
}

function groupOf(observations: readonly BehaviouralEvidenceObservation[]): UnnamedClaimFileGroup {
  const [first] = observations as [BehaviouralEvidenceObservation, ...BehaviouralEvidenceObservation[]];
  const passed = observations.filter((o) => o.status === "passed").length;
  return {
    qualityCheck: first.qualityCheck,
    locator: first.locator,
    remarks: remarksOf(observations),
    ran: observations.length,
    passed,
    failed: observations.length - passed,
    failedNames: observations.flatMap((o) =>
      o.status === "failed" && o.testName !== undefined ? [o.testName] : []
    ),
  };
}

function stepsGroupsOf(observations: readonly EvidenceObservation[]): UnnamedClaimStepsGroup[] {
  const byCode = new Map<string | null, string[]>();
  for (const o of observations) {
    if (!isFitnessObservation(o)) continue;
    const code = sharedScnCodeOf(o);
    byCode.set(code, [...(byCode.get(code) ?? []), o.fitnessFunction]);
  }
  return [...byCode].map(([code, names]) => (code === null ? { names } : { names, sharedScnCode: code }));
}

export function unnamedClaimGroupsOf(lines: readonly ReconciliationLine[]): UnnamedClaimGroup[] {
  const observations = citingNoScenario(lines);
  const byFile = new Map<string, BehaviouralEvidenceObservation[]>();
  for (const o of observations) {
    if (isFitnessObservation(o)) continue;
    const key = keyOf(o);
    byFile.set(key, [...(byFile.get(key) ?? []), o]);
  }
  return [...[...byFile.values()].map(groupOf), ...stepsGroupsOf(observations)];
}
