import type {
  EvidenceObservation,
  BehaviouralEvidenceObservation,
  FitnessEvidenceObservation,
} from "./journal.js";

export type Posting =
  | { readonly kind: "scenario"; readonly scnId: string }
  | { readonly kind: "phantom-claim"; readonly scnId: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "broken" | "cites-nothing" };

export type BehaviouralPosting =
  | { readonly kind: "scenario"; readonly scnId: string }
  | { readonly kind: "phantom-claim"; readonly scnId: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "broken" | "cites-nothing" };

export type FitnessFunctionPosting =
  | { readonly kind: "scenario"; readonly scnId: string }
  | { readonly kind: "phantom-claim"; readonly scnId: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "broken" | "cites-nothing" };

export function postingOf(
  observation: BehaviouralEvidenceObservation,
  scenarioIds: ReadonlySet<string>
): BehaviouralPosting;
export function postingOf(
  observation: FitnessEvidenceObservation,
  scenarioIds: ReadonlySet<string>
): FitnessFunctionPosting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>
): Posting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>
): Posting {
  const scnId = observation.scnId ?? null;
  if (scnId === null) {
    return { kind: "unnamed-claim", posted: observation.broken === true ? "broken" : "cites-nothing" };
  }
  return scenarioIds.has(scnId) ? { kind: "scenario", scnId } : { kind: "phantom-claim", scnId };
}
