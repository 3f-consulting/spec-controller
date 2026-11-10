import type { EvidenceObligation, ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation, PhantomClaim, UnnamedClaim } from "./postEvidenceObservation.js";

type ObligationNamingItsKind = Required<EvidenceObligation>;

interface BothSides {
  readonly outcome: "satisfied" | "failing" | "cannot-fail";
  readonly kind: QualityCheckKind;
  readonly obligation: ObligationNamingItsKind;
  readonly observation: EvidenceObservation;
}

interface MissingEvidence {
  readonly outcome: "missing";
  readonly kind: QualityCheckKind;
  readonly obligation: ObligationNamingItsKind;
  readonly observation?: never;
}

interface ObligationNoEvidenceCanAnswer {
  readonly outcome: "no-claim-code" | "duplicate-claim-code";
  readonly kind?: QualityCheckKind;
  readonly obligation: EvidenceObligation;
  readonly observation?: never;
}

interface ObservationOnly {
  readonly outcome: "not-asked-for" | "cites-unknown-claim" | "cites-no-claim" | "never-ran";
  readonly kind: QualityCheckKind;
  readonly obligation?: never;
  readonly observation: EvidenceObservation;
}

interface NeitherSide {
  readonly outcome: "no-quality-check";
  readonly kind?: never;
  readonly obligation?: never;
  readonly observation?: never;
}

export type QualityCheckReconciliation = BothSides | MissingEvidence | ObligationNoEvidenceCanAnswer | ObservationOnly | NeitherSide;

export type Outcome = QualityCheckReconciliation["outcome"];

export interface ClaimReconciliation {
  readonly claim: ExecutableClaim | PhantomClaim | UnnamedClaim;
  readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[];
  readonly verdict: "balanced" | "out-of-balance";
}

export function claimReconciliationsOf(
  _claims: readonly ExecutableClaim[],
  _observations: readonly EvidenceObservation[],
): ClaimReconciliation[] {
  return [];
}
