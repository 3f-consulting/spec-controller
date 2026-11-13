import type { EvidenceObligation, ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import type { ClaimCode } from "./claimCodes.js";
import type { EvidenceObservation, PhantomClaim, UnnamedClaim } from "./postEvidenceObservation.js";

type ObligationWithAKind = EvidenceObligation & { readonly kind: QualityCheckKind };

// Each shape names the sides it does not have as never, so an outcome on the wrong shape does not compile.
interface BothSides {
  readonly outcome: "satisfied" | "failing" | "cannot-fail";
  readonly kind: QualityCheckKind;
  readonly obligation: ObligationWithAKind;
  readonly observation: EvidenceObservation;
}

interface ObligationOnly {
  readonly outcome: "missing";
  readonly kind: QualityCheckKind;
  readonly obligation: ObligationWithAKind;
  readonly observation?: never;
}

// The obligation may name no kind here, since the scenario may state none.
interface ObligationNoObservationCanAnswer {
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

export type QualityCheckReconciliation = BothSides | ObligationOnly | ObligationNoObservationCanAnswer | ObservationOnly | NeitherSide;

export type Outcome = QualityCheckReconciliation["outcome"];

export interface ClaimReconciliation {
  readonly claim: ExecutableClaim | PhantomClaim | UnnamedClaim;
  readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[];
  readonly verdict: "balanced" | "out-of-balance";
}

// The unnamed claim's evidence by kind, file and shared claim code: worked out, stored nowhere.
export interface EvidenceGroup {
  readonly kind: QualityCheckKind;
  readonly file?: string;
  readonly claimCode?: ClaimCode;
  readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[];
  readonly ran: number;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly string[];
}

export function claimReconciliationOf(
  claim: ExecutableClaim | PhantomClaim | UnnamedClaim,
  _observations: readonly EvidenceObservation[],
  _codeShared: boolean,
): ClaimReconciliation {
  return { claim, qualityCheckReconciliations: [], verdict: "out-of-balance" };
}
