import type {
  EvidenceObservation,
  BehaviouralEvidenceObservation,
  FitnessEvidenceObservation,
} from "./journal.js";

export type Posting =
  | { readonly kind: "scenario"; readonly claimCode: string }
  | { readonly kind: "phantom-claim"; readonly claimCode: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "never-ran" | "cites-nothing" | "cites-shared-code" };

export type BehaviouralPosting =
  | { readonly kind: "scenario"; readonly claimCode: string }
  | { readonly kind: "phantom-claim"; readonly claimCode: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "never-ran" | "cites-nothing" | "cites-shared-code" };

export type FitnessFunctionPosting =
  | { readonly kind: "scenario"; readonly claimCode: string }
  | { readonly kind: "phantom-claim"; readonly claimCode: string }
  | { readonly kind: "unnamed-claim"; readonly posted: "never-ran" | "cites-nothing" | "cites-shared-code" };

export function postingOf(
  observation: BehaviouralEvidenceObservation,
  carriedClaimCodes: ReadonlySet<string>,
  sharedClaimCodes?: ReadonlySet<string>
): BehaviouralPosting;
export function postingOf(
  observation: FitnessEvidenceObservation,
  carriedClaimCodes: ReadonlySet<string>,
  sharedClaimCodes?: ReadonlySet<string>
): FitnessFunctionPosting;
export function postingOf(
  observation: EvidenceObservation,
  carriedClaimCodes: ReadonlySet<string>,
  sharedClaimCodes?: ReadonlySet<string>
): Posting;
export function postingOf(
  observation: EvidenceObservation,
  carriedClaimCodes: ReadonlySet<string>,
  sharedClaimCodes: ReadonlySet<string> = new Set()
): Posting {
  const claimCode = observation.claimCode ?? null;
  if (claimCode === null || sharedClaimCodes.has(claimCode)) {
    if (observation.neverRan === true) return { kind: "unnamed-claim", posted: "never-ran" };
    return { kind: "unnamed-claim", posted: claimCode === null ? "cites-nothing" : "cites-shared-code" };
  }
  return carriedClaimCodes.has(claimCode) ? { kind: "scenario", claimCode } : { kind: "phantom-claim", claimCode };
}
