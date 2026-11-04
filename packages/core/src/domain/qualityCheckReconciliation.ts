import type {
  QualityCheckKind,
  EvidenceObligation,
  EvidenceObservation,
} from "./journal.js";
import type { ClaimKind } from "./claimKind.js";
import {
  isFitnessObservation,
  evidenceObligationPairKey,
} from "./journal.js";
import { QualityCheckFaultCode } from "./qualityCheckFault.js";
import { QualityCheckReconciliationFault } from "./qualityCheckReconciliationFault.js";
import type { Outcome, SidePresence } from "./outcome.js";

export type { Outcome, SidePresence } from "./outcome.js";

declare const qualityCheckReconciliationBrand: unique symbol;

export type ReconciledEvidenceObservation = EvidenceObservation & { readonly outcome: Outcome };

/** The evidence obligation a Quality Check Reconciliation holds: an obligation that states no kind of quality check holds null. */
export interface ReconciledEvidenceObligation {
  readonly qualityCheckKind: QualityCheckKind | null;
  readonly pending?: boolean;
}

interface QualityCheckReconciliationFields {
  readonly qualityCheckKind?: QualityCheckKind;
  readonly outcome?: Outcome;
  readonly evidenceObligation?: ReconciledEvidenceObligation;
  readonly evidenceObservations?: readonly ReconciledEvidenceObservation[];
  readonly scenario?: ScenarioName;
}

/** The scenario a duplicate-scn-code reconciliation reconciles, by its feature file and title. */
export interface ScenarioName {
  readonly feature: string;
  readonly title: string;
}

export type QualityCheckReconciliation = QualityCheckReconciliationFields & {
  /** @hidden */
  readonly [qualityCheckReconciliationBrand]: typeof qualityCheckReconciliationBrand;
};

export const OUTCOME_SIDE_PROFILE: Record<
  Outcome,
  { obligation: SidePresence; observation: SidePresence }
> = {
  satisfied: { obligation: "Exists", observation: "Exists" },
  missing: { obligation: "Exists", observation: "None" },
  failing: { obligation: "Exists", observation: "Exists" },
  watermelon: { obligation: "Exists", observation: "Exists" },
  "no-scn-code": { obligation: "Exists", observation: "None" },
  "duplicate-scn-code": { obligation: "Exists", observation: "None" },
  "cites-unknown-scenario": { obligation: "None", observation: "Exists" },
  "cites-no-scenario": { obligation: "None", observation: "Exists" },
  "no-evidence-obligation": { obligation: "None", observation: "Exists" },
  broken: { obligation: "None", observation: "Exists" },
  "both-missing": { obligation: "None", observation: "None" },
};

export const OUT_OF_BALANCE_OUTCOMES: readonly Outcome[] = (
  Object.keys(OUTCOME_SIDE_PROFILE) as Outcome[]
).filter((outcome) => outcome !== "satisfied");

/** The outcomes an evidence obligation's own line reads: the only ones a Quality Check Reconciliation carries as its own. */
const OBLIGATION_LINE_OUTCOMES: ReadonlySet<Outcome> = new Set(
  (Object.keys(OUTCOME_SIDE_PROFILE) as Outcome[]).filter((outcome) => OUTCOME_SIDE_PROFILE[outcome].observation === "None")
);

export function isObligationLineOutcome(outcome: Outcome | undefined): outcome is Outcome {
  return (OBLIGATION_LINE_OUTCOMES as ReadonlySet<Outcome | undefined>).has(outcome);
}

export function isObservationOnly(outcome: Outcome): boolean {
  const profile = OUTCOME_SIDE_PROFILE[outcome];
  return profile.obligation === "None" && profile.observation === "Exists";
}

function presenceOf(present: boolean): SidePresence {
  return present ? "Exists" : "None";
}

/** An evidence observation's line carries its reconciliation's evidence obligation exactly when it ran against one. */
export function carriesEvidenceObligation(
  fields: QualityCheckReconciliationFields,
  observation: EvidenceObservation
): boolean {
  return fields.evidenceObligation !== undefined && observation.broken !== true;
}

function divergence(
  outcome: Outcome,
  evidence: "evidence-obligation" | "evidence-observation",
  presenceFound: SidePresence
): QualityCheckReconciliationFault {
  const profile = OUTCOME_SIDE_PROFILE[outcome];
  return new QualityCheckReconciliationFault({
    code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
    evidence,
    outcome,
    presenceForOutcome: evidence === "evidence-obligation" ? profile.obligation : profile.observation,
    presenceFound,
  });
}

function refuseDivergentLine(outcome: Outcome, obligation: SidePresence, observation: SidePresence): void {
  const profile = OUTCOME_SIDE_PROFILE[outcome];
  if (obligation !== profile.obligation) throw divergence(outcome, "evidence-obligation", obligation);
  if (observation !== profile.observation) throw divergence(outcome, "evidence-observation", observation);
}

/**
 * Each line is checked against its outcome's sides. The reconciliation's own outcome is its obligation's line, which
 * carries no observation, so only an obligation-line outcome stands there; it has an observation side when an
 * observation that ran answers it, since its outcome then could not stand. Each observation's line carries that
 * observation, and the obligation only when it ran against one.
 */
export function makeQualityCheckReconciliation(
  fields: QualityCheckReconciliationFields
): QualityCheckReconciliation {
  const observations = fields.evidenceObservations ?? [];
  if (fields.outcome !== undefined) {
    if (!isObligationLineOutcome(fields.outcome)) throw divergence(fields.outcome, "evidence-observation", "None");
    refuseDivergentLine(
      fields.outcome,
      presenceOf(fields.evidenceObligation !== undefined),
      presenceOf(observations.some((o) => o.broken !== true))
    );
  }
  for (const observation of observations) {
    refuseDivergentLine(observation.outcome, presenceOf(carriesEvidenceObligation(fields, observation)), "Exists");
  }
  return fields as QualityCheckReconciliation;
}

/** What an evidence observation is reconciled against: its claim's evidence obligation, or, with none, the claim's kind. */
type LineAnswering = "evidence-obligation" | ClaimKind;

const UNOBLIGED_OUTCOME: Record<ClaimKind, Outcome> = {
  scenario: "no-evidence-obligation",
  "phantom-claim": "cites-unknown-scenario",
  "unnamed-claim": "cites-no-scenario",
};

/** The outcome of the Reconciliation line one evidence observation is. */
function lineOutcomeOf(observation: EvidenceObservation, answering: LineAnswering): Outcome {
  if (observation.broken === true) return "broken";
  if (answering !== "evidence-obligation") return UNOBLIGED_OUTCOME[answering];
  if (!isFitnessObservation(observation)) return observation.status === "passed" ? "satisfied" : "failing";
  if (observation.status === "failed") return "failing";
  return observation.enforcedOverRealSource ? "satisfied" : "watermelon";
}

function linesFor(
  observations: readonly EvidenceObservation[],
  answering: LineAnswering
): ReconciledEvidenceObservation[] {
  return observations.map((o) => ({ ...o, outcome: lineOutcomeOf(o, answering) }));
}

function observationsField(
  observations: readonly ReconciledEvidenceObservation[]
): Pick<QualityCheckReconciliationFields, "evidenceObservations"> {
  return observations.length > 0 ? { evidenceObservations: observations } : {};
}

export function reconcileEvidenceObligation(
  scnId: string,
  obligation: EvidenceObligation,
  evidenceObservations: readonly EvidenceObservation[]
): QualityCheckReconciliation {
  const citing = evidenceObservations.filter(
    (o) => o.qualityCheckKind === obligation.qualityCheckKind && o.scnId === scnId
  );
  const answered = citing.some((o) => o.broken !== true);
  return makeQualityCheckReconciliation({
    qualityCheckKind: obligation.qualityCheckKind,
    ...(answered ? {} : { outcome: "missing" as const }),
    evidenceObligation: { ...obligation, qualityCheckKind: obligation.qualityCheckKind ?? null },
    ...observationsField(linesFor(citing, "evidence-obligation")),
  });
}

function reconciliationsByQualityCheckKind(
  observations: readonly EvidenceObservation[],
  answering: LineAnswering
): QualityCheckReconciliation[] {
  const groups = new Map<QualityCheckKind, EvidenceObservation[]>();
  for (const o of observations) {
    groups.set(o.qualityCheckKind, [...(groups.get(o.qualityCheckKind) ?? []), o]);
  }
  return [...groups].map(([qualityCheckKind, group]) =>
    makeQualityCheckReconciliation({ qualityCheckKind, evidenceObservations: linesFor(group, answering) })
  );
}

export function brokenReconciliationsOf(
  postedObservations: readonly EvidenceObservation[]
): QualityCheckReconciliation[] {
  return reconciliationsByQualityCheckKind(postedObservations.filter((o) => o.broken === true), "scenario");
}

export function noEvidenceObligationReconciliationsOf(
  scnId: string,
  postedObservations: readonly EvidenceObservation[],
  evidenceObligationPairs: ReadonlySet<string>
): QualityCheckReconciliation[] {
  return reconciliationsByQualityCheckKind(
    postedObservations.filter(
      (o) => !evidenceObligationPairs.has(evidenceObligationPairKey(scnId, o.qualityCheckKind))
    ),
    "scenario"
  );
}

export function citesUnknownScenarioReconciliationsOf(
  observations: readonly EvidenceObservation[]
): QualityCheckReconciliation[] {
  return reconciliationsByQualityCheckKind(observations, "phantom-claim");
}

export function unnamedClaimReconciliationsOf(
  observations: readonly EvidenceObservation[]
): QualityCheckReconciliation[] {
  return reconciliationsByQualityCheckKind(observations, "unnamed-claim");
}

export function noScnCodeReconciliations(): QualityCheckReconciliation[] {
  return [makeQualityCheckReconciliation({ outcome: "no-scn-code", evidenceObligation: { qualityCheckKind: null } })];
}

export function duplicateScnCodeReconciliationsOf(
  obligations: readonly EvidenceObligation[],
  scenario?: ScenarioName
): QualityCheckReconciliation[] {
  const naming = scenario === undefined ? {} : { scenario };
  const firstNaming = new Map<QualityCheckKind, EvidenceObligation>();
  for (const obligation of obligations) {
    if (obligation.qualityCheckKind !== undefined && !firstNaming.has(obligation.qualityCheckKind)) {
      firstNaming.set(obligation.qualityCheckKind, obligation);
    }
  }
  if (firstNaming.size === 0) {
    return [makeQualityCheckReconciliation({ outcome: "duplicate-scn-code", evidenceObligation: { qualityCheckKind: null }, ...naming })];
  }
  return [...firstNaming].map(([qualityCheckKind, evidenceObligation]) =>
    makeQualityCheckReconciliation({
      qualityCheckKind,
      outcome: "duplicate-scn-code",
      evidenceObligation: { ...evidenceObligation, qualityCheckKind },
      ...naming,
    })
  );
}

export function bothMissingReconciliation(): QualityCheckReconciliation {
  return makeQualityCheckReconciliation({ outcome: "both-missing" });
}

