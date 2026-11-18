import { QUALITY_CHECK_KINDS, type EvidenceObligation, type ExecutableClaim, type QualityCheckKind } from "./postEvidenceObligation.js";
import type { ClaimCode } from "./claimCodes.js";
import type { EvidenceObservation, PhantomClaim, UnnamedClaim } from "./postEvidenceObservation.js";

// The credit journal: the Evidence Observations read from a run's reports, before posting carries each to its claim.
export type CreditJournal = readonly EvidenceObservation[];

// Each shape names the sides it does not have as never, so an outcome on the wrong shape does not compile.
interface BothSides {
  readonly outcome: "satisfied" | "failing" | "cannot-fail";
  readonly kind: QualityCheckKind;
  readonly obligation: EvidenceObligation;
  readonly observation: EvidenceObservation;
}

interface ObligationOnly {
  readonly outcome: "missing";
  readonly kind: QualityCheckKind;
  readonly obligation: EvidenceObligation;
  readonly observation?: never;
}

// An obligation no evidence can answer, because its claim's code is shared or missing.
interface UnanswerableObligation {
  readonly outcome: "no-claim-code" | "duplicate-claim-code";
  readonly kind: QualityCheckKind;
  readonly obligation: EvidenceObligation;
  readonly observation?: never;
}

interface NoSides {
  readonly kind?: never;
  readonly obligation?: never;
  readonly observation?: never;
}

// A claim with no code that asks for no check: debit-side still, as its code is missing, with no obligation to carry.
interface NoCodeNothingAsked extends NoSides {
  readonly outcome: "no-claim-code";
}

interface ObservationOnly {
  readonly outcome: "not-asked-for" | "cites-unknown-claim" | "cites-no-claim" | "never-ran";
  readonly kind: QualityCheckKind;
  readonly obligation?: never;
  readonly observation: EvidenceObservation;
}

// A claim with a code that asks for no check, shared or not.
interface NeitherSide extends NoSides {
  readonly outcome: "no-quality-check";
}

export type QualityCheckReconciliation = BothSides | ObligationOnly | UnanswerableObligation | NoCodeNothingAsked | ObservationOnly | NeitherSide;

// Every Quality Check Reconciliation of a claim that asks for something, or that evidence was filed on, has a kind.
type OfAKind = Extract<QualityCheckReconciliation, { readonly kind: QualityCheckKind }>;

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
  readonly notRecorded: number;
  readonly failures: readonly string[];
}

export const isExecutable = (claim: ExecutableClaim | PhantomClaim | UnnamedClaim): claim is ExecutableClaim => "obligations" in claim;

type RanObservation = EvidenceObservation & { readonly result: Exclude<EvidenceObservation["result"], "never-ran" | "not-recorded"> };

// A step the record does not name did not run, as far as balance knows, and is no sign that anything failed to.
const ran = (observation: EvidenceObservation): observation is RanObservation => observation.result !== "never-ran" && observation.result !== "not-recorded";

const isNeverRan = ({ result }: EvidenceObservation): boolean => result === "never-ran";

const BOTH_SIDES_OUTCOME: Readonly<Record<RanObservation["result"], BothSides["outcome"]>> = {
  passed: "satisfied",
  failed: "failing",
  "passed-on-error": "cannot-fail",
};

const neverRan = (observation: EvidenceObservation): ObservationOnly => ({ outcome: "never-ran", kind: observation.kind, observation });

// An obligation no observation can answer: the claim has no code, or a code another claim shares.
function unanswerable(obligations: readonly EvidenceObligation[], outcome: UnanswerableObligation["outcome"]): UnanswerableObligation[] {
  return obligations.map((obligation) => ({ outcome, kind: obligation.kind, obligation }));
}

function answered(obligation: EvidenceObligation, observations: readonly EvidenceObservation[]): (BothSides | ObligationOnly)[] {
  const ofItsKind = observations.filter(ran).filter((observation) => observation.kind === obligation.kind);
  if (ofItsKind.length === 0) return [{ outcome: "missing", kind: obligation.kind, obligation }];
  return ofItsKind.map((observation) => ({ outcome: BOTH_SIDES_OUTCOME[observation.result], kind: obligation.kind, obligation, observation }));
}

function executableReconciliations({ claimCode, obligations }: ExecutableClaim, observations: readonly EvidenceObservation[], codeShared: boolean): OfAKind[] {
  if (codeShared) return unanswerable(obligations, "duplicate-claim-code");
  if (claimCode === undefined) return unanswerable(obligations, "no-claim-code");
  const unasked = observations
    .filter((observation) => ran(observation) && !obligations.some(({ kind }) => kind === observation.kind))
    .map((observation): ObservationOnly => ({ outcome: "not-asked-for", kind: observation.kind, observation }));
  return [...obligations.flatMap((obligation) => answered(obligation, observations)), ...unasked, ...observations.filter(isNeverRan).map(neverRan)];
}

// A claim code as one key, for sorting, grouping and filing alike.
const written = ({ featureCode, number }: ClaimCode): string => `${featureCode}-${number}`;

// What a Quality Check Reconciliation is sorted by: its kind; then a missing check before any evidence; then where its
// test is, the codes it cites, and its message, which a test with none leaves last.
const sortKey = ({ kind, observation }: OfAKind): readonly (number | string | undefined)[] =>
  observation === undefined
    ? [QUALITY_CHECK_KINDS.indexOf(kind), 0]
    : [QUALITY_CHECK_KINDS.indexOf(kind), 1, observation.place, observation.cites.map(written).join(), observation.message];

// At the first part that differs, the lower of the two as text comes first; a kind's rank is one digit.
function inOrder(one: OfAKind, other: OfAKind): number {
  const others = sortKey(other);
  for (const [at, part] of sortKey(one).entries()) if (part !== others[at]) return [part, others[at]].sort()[0] === part ? -1 : 1;
  return 0;
}

const verdictOf = (qualityCheckReconciliations: readonly QualityCheckReconciliation[]): ClaimReconciliation["verdict"] =>
  qualityCheckReconciliations.every(({ outcome }) => outcome === "satisfied") ? "balanced" : "out-of-balance";

// A claim that asks for nothing reads no-claim-code with no code, else no-quality-check, whether or not its code is shared.
export function claimReconciliationOf(claim: ExecutableClaim, observations: readonly EvidenceObservation[], codeShared: boolean): ClaimReconciliation {
  const reconciled = executableReconciliations(claim, observations, codeShared);
  const qualityCheckReconciliations: QualityCheckReconciliation[] =
    reconciled.length > 0
      ? [...reconciled].sort(inOrder)
      : [claim.claimCode === undefined ? { outcome: "no-claim-code" } : { outcome: "no-quality-check" }];
  return { claim, qualityCheckReconciliations, verdict: verdictOf(qualityCheckReconciliations) };
}

// Evidence on the phantom claim or the unnamed claim cites a claim no executable claim can take.
export function citedClaimReconciliationOf(claim: PhantomClaim | UnnamedClaim, observations: readonly EvidenceObservation[]): ClaimReconciliation {
  const outcome = claim.claimCode === undefined ? "cites-no-claim" : "cites-unknown-claim";
  const qualityCheckReconciliations = observations.map((observation): ObservationOnly => (isNeverRan(observation) ? neverRan(observation) : { outcome, kind: observation.kind, observation })).sort(inOrder);
  return { claim, qualityCheckReconciliations, verdict: verdictOf(qualityCheckReconciliations) };
}

// Each Evidence Observation in the credit journal goes to the one executable claim with the code it cites; to that code's phantom claim when no
// executable claim has it; and to the unnamed claim when it cites none, several, or a code several claims share.
export function claimReconciliationsOf(claims: readonly ExecutableClaim[], creditJournal: CreditJournal): ClaimReconciliation[] {
  const claimsWith = new Map<string, number>();
  for (const { claimCode } of claims) if (claimCode) claimsWith.set(written(claimCode), (claimsWith.get(written(claimCode)) ?? 0) + 1);
  const citing = new Map<string, { readonly claimCode: ClaimCode; readonly observations: EvidenceObservation[] }>();
  const unnamed: EvidenceObservation[] = [];
  for (const observation of creditJournal) {
    const only = observation.cites.length === 1 ? observation.cites[0] : undefined;
    const entry = only && citing.get(written(only));
    if (only === undefined || (claimsWith.get(written(only)) ?? 0) > 1) unnamed.push(observation);
    else if (entry) entry.observations.push(observation);
    else citing.set(written(only), { claimCode: only, observations: [observation] });
  }
  // A shared code is never cited, so a claim with one is filed nothing.
  const executable = claims.map((claim) => {
    const filed = claim.claimCode && citing.get(written(claim.claimCode))?.observations;
    return claimReconciliationOf(claim, filed ?? [], claim.claimCode !== undefined && claimsWith.get(written(claim.claimCode))! > 1);
  });
  const phantom = [...citing.values()]
    .filter(({ claimCode }) => !claimsWith.has(written(claimCode)))
    .map(({ claimCode, observations: filed }) => citedClaimReconciliationOf({ claimCode }, filed));
  return [...executable, ...phantom, ...(unnamed.length > 0 ? [citedClaimReconciliationOf({}, unnamed)] : [])];
}

// A group's file is where its tests are; a fitness function's place is a CI step, so fitness groups have none.
const fileOf = ({ kind, place }: EvidenceObservation): { readonly file?: string } => (kind === "fitness" ? {} : { file: place });

// A shared claim code is the one code an observation cites; one citing several is grouped with those citing none.
const sharedCodeOf = ({ cites }: EvidenceObservation): ClaimCode | undefined => (cites.length === 1 ? cites[0] : undefined);

function groupOf(kind: QualityCheckKind, file: { readonly file?: string }, claimCode: ClaimCode | undefined, members: readonly QualityCheckReconciliation[]): EvidenceGroup {
  const observations = members.map(({ observation }) => observation!);
  const failed = observations.filter(({ result }) => result === "failed");
  return {
    kind,
    ...file,
    ...(claimCode && { claimCode }),
    qualityCheckReconciliations: members,
    ran: observations.filter(ran).length,
    passed: observations.filter(({ result }) => result === "passed" || result === "passed-on-error").length,
    failed: failed.length,
    notRecorded: observations.filter(({ result }) => result === "not-recorded").length,
    failures: failed.map(({ name, place }) => name ?? place),
  };
}

// The unnamed claim's: every Quality Check Reconciliation on it has its evidence.
export function evidenceGroupsOf({ qualityCheckReconciliations }: ClaimReconciliation): EvidenceGroup[] {
  const groups = new Map<string, QualityCheckReconciliation[]>();
  for (const reconciliation of qualityCheckReconciliations) {
    const observation = reconciliation.observation!;
    const code = sharedCodeOf(observation);
    const key = JSON.stringify([observation.kind, fileOf(observation).file, code && written(code)]);
    const members = groups.get(key);
    if (members) members.push(reconciliation);
    else groups.set(key, [reconciliation]);
  }
  return [...groups.values()].map((members) => {
    const observation = members[0]!.observation!;
    return groupOf(observation.kind, fileOf(observation), sharedCodeOf(observation), members);
  });
}
