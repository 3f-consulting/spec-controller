import { sameCode, type ClaimCode } from "./claimCodes.js";
import type { EvidenceObligation, ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import { claimPostedTo, filedUnder, type EvidenceObservation, type PhantomClaim, type UnnamedClaim } from "./postEvidenceObservation.js";

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

const codeText = ({ featureCode, number }: ClaimCode): string => `${featureCode}-${number}`;

function sharedCodesOf(claims: readonly ExecutableClaim[]): Set<string> {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const { claimCode } of claims) {
    if (claimCode === undefined) continue;
    const text = codeText(claimCode);
    (seen.has(text) ? shared : seen).add(text);
  }
  return shared;
}

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
  return claim.obligations.map((obligation) => ({ outcome, obligation, kind: obligation.kind }));
}

function executableLines(
  claim: ExecutableClaim,
  evidence: readonly EvidenceObservation[],
  sharedCodes: ReadonlySet<string>,
): QualityCheckReconciliation[] {
  const { claimCode } = claim;
  if (claimCode === undefined) return unanswerable(claim, "no-claim-code");
  if (sharedCodes.has(codeText(claimCode))) return unanswerable(claim, "duplicate-claim-code");
  // Every obligation a claim raises names its kind; only the line of a claim raising none has an obligation without one.
  const asked = claim.obligations.map(({ kind }) => kind!);
  const answered = evidence.map((observation) => evidenceLine(observation, asked.includes(observation.kind), "not-asked-for"));
  const missing = asked
    .filter((kind) => !evidence.some((observation) => observation.kind === kind && observation.result !== "never-ran"))
    .map((kind): QualityCheckReconciliation => ({ outcome: "missing", kind, obligation: { kind } }));
  const lines = [...answered, ...missing];
  return lines.length > 0 ? lines : [{ outcome: "no-quality-check" }];
}

const isExecutable = (claim: Claim): claim is ExecutableClaim => "title" in claim;

function linesOf(claim: Claim, evidence: readonly EvidenceObservation[], sharedCodes: ReadonlySet<string>): QualityCheckReconciliation[] {
  if (isExecutable(claim)) return executableLines(claim, evidence, sharedCodes);
  const unasked = claim.claimCode === undefined ? "cites-no-claim" : "cites-unknown-claim";
  return evidence.map((observation) => evidenceLine(observation, false, unasked));
}

const KIND_RANK: Readonly<Record<QualityCheckKind, number>> = { unit: 0, integration: 1, e2e: 2, performance: 3, fitness: 4 };

// A line with no kind is the only line of its claim, so it is never ranked against another.
const kindRank = ({ kind }: QualityCheckReconciliation): number => KIND_RANK[kind!];

// Everything an observation records, field by field, its cited codes one field between them, so a line citing nothing sorts before one citing a code.
function recorded({ observation }: QualityCheckReconciliation): string[] {
  if (observation === undefined) return [];
  const { place, cites, name = "", message = "", result, notes } = observation;
  return [place, cites.map(codeText).join(" "), name, message, result, ...notes];
}

const order = (a: string, b: string): number => Number(a > b) - Number(a < b);

// Field by field, and a record that is the start of another sorts before it.
function compareRecords(a: readonly string[], b: readonly string[]): number {
  return a.map((text, at) => order(text, b[at] ?? "")).find((byField) => byField !== 0) ?? a.length - b.length;
}

function inOrder(a: QualityCheckReconciliation, b: QualityCheckReconciliation): number {
  return kindRank(a) - kindRank(b) || compareRecords(recorded(a), recorded(b));
}

function reconciliationOf(claim: Claim, lines: readonly QualityCheckReconciliation[]): ClaimReconciliation {
  const verdict = lines.every(({ outcome }) => outcome === "satisfied") ? "balanced" : "out-of-balance";
  return { claim, qualityCheckReconciliations: [...lines].sort(inOrder), verdict };
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
    const evidence = posted.get(claim);
    if (evidence) evidence.push(observation);
    else posted.set(claim, [observation]);
  }
  const sharedCodes = sharedCodesOf(claims);
  return [...posted].map(([claim, evidence]) => reconciliationOf(claim, linesOf(claim, evidence, sharedCodes)));
}

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

interface GroupKey {
  readonly kind: QualityCheckKind;
  readonly file?: string;
  readonly claimCode?: ClaimCode;
}

function groupKeyOf({ kind, place, cites }: EvidenceObservation): GroupKey {
  const [claimCode, ...others] = cites;
  return {
    kind,
    ...(kind !== "fitness" && { file: place }),
    ...(claimCode !== undefined && others.length >= 0 && { claimCode }),
  };
}

function sameGroup(a: GroupKey, b: GroupKey): boolean {
  const sameClaimCode = a.claimCode === undefined || b.claimCode === undefined ? a.claimCode === b.claimCode : sameCode(a.claimCode, b.claimCode);
  return a.kind === b.kind && a.file === b.file && sameClaimCode;
}

function withCounts(key: GroupKey, members: readonly QualityCheckReconciliation[]): EvidenceGroup {
  const results = members.map(({ observation }) => observation!);
  const passed = results.filter(({ result }) => result === "passed" || result === "passed-on-error").length;
  const failures = results.filter(({ result }) => result === "failed").map(({ name, place }) => name ?? place);
  return { ...key, qualityCheckReconciliations: members, ran: passed + failures.length, passed, failed: failures.length, failures };
}

// Only the unnamed claim is grouped, and each of its lines holds an observation.
export function groupsOf({ qualityCheckReconciliations }: ClaimReconciliation): EvidenceGroup[] {
  const groups: { readonly key: GroupKey; readonly members: QualityCheckReconciliation[] }[] = [];
  for (const line of qualityCheckReconciliations) {
    const key = groupKeyOf(line.observation!);
    const group = groups.find((existing) => sameGroup(existing.key, key));
    if (group) group.members.push(line);
    else groups.push({ key, members: [line] });
  }
  return groups.map(({ key, members }) => withCounts(key, members));
}
