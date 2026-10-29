import type {
  EvidenceObservation,
  BehaviouralEvidenceObservation,
  FitnessEvidenceObservation,
} from "./journal.js";

export type Posting =
  | { readonly kind: "scenario"; readonly scnId: string }
  | { readonly kind: "phantom-claim"; readonly scnId: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "broken" | "cites-nothing" | "cites-shared-code" };

export type BehaviouralPosting =
  | { readonly kind: "scenario"; readonly scnId: string }
  | { readonly kind: "phantom-claim"; readonly scnId: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "broken" | "cites-nothing" | "cites-shared-code" };

export type FitnessFunctionPosting =
  | { readonly kind: "scenario"; readonly scnId: string }
  | { readonly kind: "phantom-claim"; readonly scnId: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "broken" | "cites-nothing" | "cites-shared-code" };

export function postingOf(
  observation: BehaviouralEvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  sharedScnCodes?: ReadonlySet<string>
): BehaviouralPosting;
export function postingOf(
  observation: FitnessEvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  sharedScnCodes?: ReadonlySet<string>
): FitnessFunctionPosting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  sharedScnCodes?: ReadonlySet<string>
): Posting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  sharedScnCodes: ReadonlySet<string> = new Set()
): Posting {
  const scnId = observation.scnId ?? null;
  if (scnId === null || sharedScnCodes.has(scnId)) {
    if (observation.broken === true) return { kind: "unnamed-claim", posted: "broken" };
    return { kind: "unnamed-claim", posted: scnId === null ? "cites-nothing" : "cites-shared-code" };
  }
  return scenarioIds.has(scnId) ? { kind: "scenario", scnId } : { kind: "phantom-claim", scnId };
}
