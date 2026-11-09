import type { Layer, BehaviouralEvidenceObservation, EvidenceObservation, ObservationNote } from "./journal.js";
import { isFitnessObservation } from "./journal.js";
import type { ReconciliationLine } from "./claimReconciliation.js";

interface UnnamedClaimRemark {
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
}

export interface UnnamedClaimFileGroup {
  readonly qualityCheckKind: Layer;
  readonly locator: string | undefined;
  readonly sharedClaimCode?: string;
  readonly remarks: readonly UnnamedClaimRemark[];
  readonly ran: number;
  readonly passed: number;
  readonly failed: number;
  readonly failedNames: readonly string[];
}

interface UnnamedClaimStepsGroup {
  readonly names: readonly string[];
  readonly sharedClaimCode?: string;
}

export type UnnamedClaimGroup = UnnamedClaimFileGroup | UnnamedClaimStepsGroup;

function citingNoClaim(lines: readonly ReconciliationLine[]): EvidenceObservation[] {
  return lines
    .filter((line) => line.outcome === "cites-no-claim")
    .flatMap((line) => line.evidenceObservation ?? []);
}

function sharedClaimCodeOf(observation: EvidenceObservation): string | null {
  const [code = null] = (observation.notes ?? []).flatMap((note) => (note.kind === "shared-claim-code" ? [note.code] : []));
  return code;
}

function remarksOf(observations: readonly BehaviouralEvidenceObservation[]): UnnamedClaimRemark[] {
  return observations.flatMap(({ message, notes = [] }) => {
    const kept = notes.filter((note) => note.kind !== "shared-claim-code");
    return message === undefined && kept.length === 0
      ? []
      : [{ ...(message !== undefined ? { message } : {}), ...(kept.length > 0 ? { notes: kept } : {}) }];
  });
}

function groupOf(sharedClaimCode: string | null, observations: readonly BehaviouralEvidenceObservation[]): UnnamedClaimFileGroup {
  const [first] = observations as [BehaviouralEvidenceObservation, ...BehaviouralEvidenceObservation[]];
  const passed = observations.filter((o) => o.status === "passed").length;
  return {
    qualityCheckKind: first.qualityCheckKind,
    locator: first.locator,
    ...(sharedClaimCode === null ? {} : { sharedClaimCode }),
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
    const code = sharedClaimCodeOf(o);
    byCode.set(code, [...(byCode.get(code) ?? []), o.step ?? o.fitnessFunction]);
  }
  return [...byCode].map(([code, names]) => (code === null ? { names } : { names, sharedClaimCode: code }));
}

export function unnamedClaimGroupsOf(lines: readonly ReconciliationLine[]): UnnamedClaimGroup[] {
  const observations = citingNoClaim(lines);
  const byFile = new Map<string, { code: string | null; members: BehaviouralEvidenceObservation[] }>();
  for (const o of observations) {
    if (isFitnessObservation(o)) continue;
    const code = sharedClaimCodeOf(o);
    const key = JSON.stringify([o.qualityCheckKind, o.locator ?? null, code]);
    byFile.set(key, { code, members: [...(byFile.get(key)?.members ?? []), o] });
  }
  return [...[...byFile.values()].map(({ code, members }) => groupOf(code, members)), ...stepsGroupsOf(observations)];
}
