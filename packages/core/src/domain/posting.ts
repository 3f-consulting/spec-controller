import type {
  EvidenceObservation,
  BehaviouralEvidenceObservation,
  FitnessEvidenceObservation,
} from "./journal.js";
import { isFitnessObservation } from "./journal.js";

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
  if (observation.qualityCheck === "fitness") {
    if (isFitnessObservation(observation) && observation.broken === true) {
      return { kind: "unnamed-claim", posted: "broken" };
    }
    if (observation.scnId !== undefined) {
      return scenarioIds.has(observation.scnId)
        ? { kind: "scenario", scnId: observation.scnId }
        : { kind: "phantom-claim", scnId: observation.scnId };
    }
    return { kind: "unnamed-claim", posted: "cites-nothing" };
  }
  if (observation.broken === true) return { kind: "unnamed-claim", posted: "broken" };
  if (observation.scnId === null) return { kind: "unnamed-claim", posted: "cites-nothing" };
  if (!scenarioIds.has(observation.scnId)) {
    return { kind: "phantom-claim", scnId: observation.scnId };
  }
  return { kind: "scenario", scnId: observation.scnId };
}
