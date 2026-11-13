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

const hasAKind = (obligation: EvidenceObligation): obligation is ObligationWithAKind => obligation.kind !== undefined;

const isExecutable = (claim: ExecutableClaim | PhantomClaim | UnnamedClaim): claim is ExecutableClaim => "obligations" in claim;

type RanObservation = EvidenceObservation & { readonly result: Exclude<EvidenceObservation["result"], "never-ran"> };

const ran = (observation: EvidenceObservation): observation is RanObservation => observation.result !== "never-ran";

const BOTH_SIDES_OUTCOME: Readonly<Record<RanObservation["result"], BothSides["outcome"]>> = {
  passed: "satisfied",
  failed: "failing",
  "passed-on-error": "cannot-fail",
};

const neverRan = (observation: EvidenceObservation): QualityCheckReconciliation => ({ outcome: "never-ran", kind: observation.kind, observation });

// An obligation no observation can answer: the claim has no code, or a code another claim shares.
function unanswerable(obligations: readonly EvidenceObligation[], outcome: ObligationNoObservationCanAnswer["outcome"]): QualityCheckReconciliation[] {
  return obligations.map((obligation) => ({ outcome, obligation, ...(obligation.kind && { kind: obligation.kind }) }));
}

function answered(obligation: ObligationWithAKind, observations: readonly EvidenceObservation[]): QualityCheckReconciliation[] {
  const ofItsKind = observations.filter(ran).filter((observation) => observation.kind === obligation.kind);
  if (ofItsKind.length === 0) return [{ outcome: "missing", kind: obligation.kind, obligation }];
  return ofItsKind.map((observation) => ({ outcome: BOTH_SIDES_OUTCOME[observation.result], kind: obligation.kind, obligation, observation }));
}

function executableReconciliations(claim: ExecutableClaim, observations: readonly EvidenceObservation[], codeShared: boolean): QualityCheckReconciliation[] {
  if (codeShared) return unanswerable(claim.obligations, "duplicate-claim-code");
  if (claim.claimCode === undefined) return unanswerable(claim.obligations, "no-claim-code");
  const asked = claim.obligations.filter(hasAKind);
  const unasked = observations
    .filter((observation) => ran(observation) && !asked.some(({ kind }) => kind === observation.kind))
    .map((observation): QualityCheckReconciliation => ({ outcome: "not-asked-for", kind: observation.kind, observation }));
  return [...asked.flatMap((obligation) => answered(obligation, observations)), ...unasked, ...observations.filter((observation) => !ran(observation)).map(neverRan)];
}

// Evidence on the phantom claim or the unnamed claim cites a claim no executable claim can take.
function citedOnly(observations: readonly EvidenceObservation[], outcome: "cites-unknown-claim" | "cites-no-claim"): QualityCheckReconciliation[] {
  return observations.map((observation) => (ran(observation) ? { outcome, kind: observation.kind, observation } : neverRan(observation)));
}

// A claim code as one key, for sorting, grouping and filing alike.
const written = ({ featureCode, number }: ClaimCode): string => `${featureCode}-${number}`;

const KIND_ORDER: readonly QualityCheckKind[] = ["unit", "integration", "e2e", "performance", "fitness"];

// What a Quality Check Reconciliation is sorted by: its kind, where its test is, the codes it cites, then the rest it records.
const sortKey = ({ kind, observation }: QualityCheckReconciliation): readonly (number | string)[] => [
  kind === undefined ? KIND_ORDER.length : KIND_ORDER.indexOf(kind),
  observation?.place ?? "",
  (observation?.cites ?? []).map(written).join(" "),
  observation?.message ?? "",
  observation?.name ?? "",
  observation?.result ?? "",
];

function inOrder(one: QualityCheckReconciliation, other: QualityCheckReconciliation): number {
  const [ones, others] = [sortKey(one), sortKey(other)];
  const at = ones.findIndex((part, index) => part !== others[index]);
  return at < 0 ? 0 : ones[at]! < others[at]! ? -1 : 1;
}

export function claimReconciliationOf(
  claim: ExecutableClaim | PhantomClaim | UnnamedClaim,
  observations: readonly EvidenceObservation[],
  codeShared: boolean,
): ClaimReconciliation {
  const reconciled = isExecutable(claim)
    ? executableReconciliations(claim, observations, codeShared)
    : citedOnly(observations, claim.claimCode === undefined ? "cites-no-claim" : "cites-unknown-claim");
  const qualityCheckReconciliations: QualityCheckReconciliation[] = reconciled.length === 0 ? [{ outcome: "no-quality-check" }] : [...reconciled].sort(inOrder);
  const balanced = qualityCheckReconciliations.every(({ outcome }) => outcome === "satisfied");
  return { claim, qualityCheckReconciliations, verdict: balanced ? "balanced" : "out-of-balance" };
}

// Each Evidence Observation goes to the one executable claim with the code it cites; to that code's phantom claim when no
// executable claim has it; and to the unnamed claim when it cites none, several, or a code several claims share.
export function claimReconciliationsOf(claims: readonly ExecutableClaim[], observations: readonly EvidenceObservation[]): ClaimReconciliation[] {
  const claimsWith = new Map<string, number>();
  for (const { claimCode } of claims) if (claimCode) claimsWith.set(written(claimCode), (claimsWith.get(written(claimCode)) ?? 0) + 1);
  const citing = new Map<string, { readonly claimCode: ClaimCode; readonly observations: EvidenceObservation[] }>();
  const unnamed: EvidenceObservation[] = [];
  for (const observation of observations) {
    const only = observation.cites.length === 1 ? observation.cites[0] : undefined;
    const entry = only && citing.get(written(only));
    if (only === undefined || (claimsWith.get(written(only)) ?? 0) > 1) unnamed.push(observation);
    else if (entry) entry.observations.push(observation);
    else citing.set(written(only), { claimCode: only, observations: [observation] });
  }
  const executable = claims.map((claim) => {
    const code = claim.claimCode && written(claim.claimCode);
    const shared = code !== undefined && claimsWith.get(code)! > 1;
    return claimReconciliationOf(claim, code === undefined || shared ? [] : (citing.get(code)?.observations ?? []), shared);
  });
  const phantom = [...citing.values()]
    .filter(({ claimCode }) => !claimsWith.has(written(claimCode)))
    .map(({ claimCode, observations: filed }) => claimReconciliationOf({ claimCode }, filed, false));
  return [...executable, ...phantom, ...(unnamed.length > 0 ? [claimReconciliationOf({}, unnamed, false)] : [])];
}

// A group's file is where its tests are; a fitness function's place is a CI step, so fitness groups have none.
const fileOf = ({ kind, place }: EvidenceObservation): string | undefined => (kind === "fitness" ? undefined : place);

// A shared claim code is the one code an observation cites; one citing several is grouped with those citing none.
const sharedCodeOf = ({ cites }: EvidenceObservation): ClaimCode | undefined => (cites.length === 1 ? cites[0] : undefined);

function groupOf(kind: QualityCheckKind, file: string | undefined, claimCode: ClaimCode | undefined, members: readonly QualityCheckReconciliation[]): EvidenceGroup {
  const observations = members.flatMap(({ observation }) => (observation ? [observation] : []));
  const failed = observations.filter(({ result }) => result === "failed");
  return {
    kind,
    ...(file === undefined ? {} : { file }),
    ...(claimCode && { claimCode }),
    qualityCheckReconciliations: members,
    ran: observations.filter(ran).length,
    passed: observations.filter(({ result }) => result === "passed" || result === "passed-on-error").length,
    failed: failed.length,
    failures: failed.map(({ name, place }) => name ?? place),
  };
}

export function evidenceGroupsOf({ qualityCheckReconciliations }: ClaimReconciliation): EvidenceGroup[] {
  const groups = new Map<string, QualityCheckReconciliation[]>();
  for (const reconciliation of qualityCheckReconciliations) {
    const { observation } = reconciliation;
    if (observation === undefined) continue;
    const code = sharedCodeOf(observation);
    const key = [observation.kind, fileOf(observation) ?? "", code ? written(code) : ""].join("|");
    const members = groups.get(key);
    if (members) members.push(reconciliation);
    else groups.set(key, [reconciliation]);
  }
  return [...groups.values()].map((members) => {
    const observation = members[0]!.observation!;
    return groupOf(observation.kind, fileOf(observation), sharedCodeOf(observation), members);
  });
}
