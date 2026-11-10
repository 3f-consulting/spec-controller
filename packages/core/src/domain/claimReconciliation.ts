import { sameCode } from "./claimCodes.js";
import type { EvidenceObligation, ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import { claimPostedTo, type EvidenceObservation, type PhantomClaim, type UnnamedClaim } from "./postEvidenceObservation.js";

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

type Claim = ClaimReconciliation["claim"];

type UnaskedOutcome = "not-asked-for" | "cites-unknown-claim" | "cites-no-claim";

const OUTCOME_OF_RESULT = { passed: "satisfied", failed: "failing", "passed-on-error": "cannot-fail" } as const;

function evidenceLine(observation: EvidenceObservation, asked: boolean, unasked: UnaskedOutcome): QualityCheckReconciliation {
  const { kind, result } = observation;
  if (result === "never-ran") return { outcome: "never-ran", kind, observation };
  if (!asked) return { outcome: unasked, kind, observation };
  return { outcome: OUTCOME_OF_RESULT[result], kind, obligation: { kind }, observation };
}

function unanswerable(claim: ExecutableClaim, outcome: "no-claim-code" | "duplicate-claim-code"): QualityCheckReconciliation[] {
  if (claim.obligations.length === 0) return [{ outcome, obligation: {} }];
  return claim.obligations.map((obligation) => ({ outcome, obligation, ...(obligation.kind && { kind: obligation.kind }) }));
}

function executableLines(
  claim: ExecutableClaim,
  evidence: readonly EvidenceObservation[],
  claims: readonly ExecutableClaim[],
): QualityCheckReconciliation[] {
  const { claimCode } = claim;
  if (claimCode === undefined) return unanswerable(claim, "no-claim-code");
  const sharing = claims.filter((other) => other.claimCode !== undefined && sameCode(other.claimCode, claimCode));
  if (sharing.length > 1) return unanswerable(claim, "duplicate-claim-code");
  const asked = claim.obligations.flatMap(({ kind }) => kind ?? []);
  const answered = evidence.map((observation) => evidenceLine(observation, asked.includes(observation.kind), "not-asked-for"));
  const missing = asked
    .filter((kind) => !evidence.some((observation) => observation.kind === kind && observation.result !== "never-ran"))
    .map((kind): QualityCheckReconciliation => ({ outcome: "missing", kind, obligation: { kind } }));
  const lines = [...answered, ...missing];
  return lines.length > 0 ? lines : [{ outcome: "no-quality-check" }];
}

const isExecutable = (claim: Claim): claim is ExecutableClaim => "title" in claim;

function linesOf(claim: Claim, evidence: readonly EvidenceObservation[], claims: readonly ExecutableClaim[]): QualityCheckReconciliation[] {
  if (isExecutable(claim)) return executableLines(claim, evidence, claims);
  const unasked = claim.claimCode === undefined ? "cites-no-claim" : "cites-unknown-claim";
  return evidence.map((observation) => evidenceLine(observation, false, unasked));
}

function filedUnder(claim: Claim, phantoms: PhantomClaim[], unnamed: UnnamedClaim): Claim {
  if (isExecutable(claim)) return claim;
  const { claimCode } = claim;
  if (claimCode === undefined) return unnamed;
  const known = phantoms.find((phantom) => sameCode(phantom.claimCode, claimCode));
  if (known) return known;
  const phantom = { claimCode };
  phantoms.push(phantom);
  return phantom;
}

function reconciliationOf(claim: Claim, lines: readonly QualityCheckReconciliation[]): ClaimReconciliation {
  const verdict = lines.every(({ outcome }) => outcome === "satisfied") ? "balanced" : "out-of-balance";
  return { claim, qualityCheckReconciliations: lines, verdict };
}

export function claimReconciliationsOf(
  claims: readonly ExecutableClaim[],
  observations: readonly EvidenceObservation[],
): ClaimReconciliation[] {
  const posted = new Map<Claim, EvidenceObservation[]>(claims.map((claim) => [claim, []]));
  const phantoms: PhantomClaim[] = [];
  const unnamed: UnnamedClaim = {};
  for (const observation of observations) {
    const claim = filedUnder(claimPostedTo(observation, claims), phantoms, unnamed);
    posted.set(claim, [...(posted.get(claim) ?? []), observation]);
  }
  return [...posted].map(([claim, evidence]) => reconciliationOf(claim, linesOf(claim, evidence, claims)));
}
