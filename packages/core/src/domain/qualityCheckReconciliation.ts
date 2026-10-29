import type {
  QualityCheck,
  EvidenceObligation,
  EvidenceObservation,
  FitnessEvidenceObservation,
  BehaviouralEvidenceObservation,
  ObservationNote,
} from "./journal.js";
import {
  isFitnessObservation,
  evidenceObligationPairKey,
} from "./journal.js";
import { QualityCheckFaultCode } from "./qualityCheckFault.js";
import { QualityCheckReconciliationFault } from "./qualityCheckReconciliationFault.js";
import type { Outcome, SidePresence } from "./outcome.js";

export type { Outcome, SidePresence } from "./outcome.js";

declare const qualityCheckReconciliationBrand: unique symbol;

interface QualityCheckReconciliationFields {
  readonly qualityCheck?: QualityCheck;
  readonly fitnessFunction?: string;
  readonly outcome: Outcome;
  readonly evidenceObligation?: EvidenceObligation;
  readonly evidenceObservation?: EvidenceObservation;
  readonly locator?: string;
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
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

export function isObservationOnly(outcome: Outcome): boolean {
  const profile = OUTCOME_SIDE_PROFILE[outcome];
  return profile.obligation === "None" && profile.observation === "Exists";
}

export function makeQualityCheckReconciliation(
  fields: QualityCheckReconciliationFields
): QualityCheckReconciliation {
  const profile = OUTCOME_SIDE_PROFILE[fields.outcome];
  if ((fields.evidenceObligation !== undefined) !== (profile.obligation === "Exists")) {
    throw new QualityCheckReconciliationFault({
      code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
      evidence: "evidence-obligation",
      outcome: fields.outcome,
      presenceForOutcome: profile.obligation,
      presenceFound: fields.evidenceObligation !== undefined ? "Exists" : "None",
    });
  }
  if ((fields.evidenceObservation !== undefined) !== (profile.observation === "Exists")) {
    throw new QualityCheckReconciliationFault({
      code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
      evidence: "evidence-observation",
      outcome: fields.outcome,
      presenceForOutcome: profile.observation,
      presenceFound: fields.evidenceObservation !== undefined ? "Exists" : "None",
    });
  }
  return fields as QualityCheckReconciliation;
}

function locatorOf(observation: EvidenceObservation): string | undefined {
  return observation.qualityCheck === "fitness" ? undefined : observation.locator;
}

const OBSERVATION_PRECEDENCE: readonly ObservationOutcome[] = ["failing", "watermelon", "satisfied"];

type ObservationOutcome = "failing" | "watermelon" | "satisfied";

interface Answer<T> {
  readonly outcome: Outcome;
  readonly observation?: T;
}

function answerOf<T>(matches: readonly T[], outcomeOf: (observation: T) => ObservationOutcome | undefined): Answer<T> {
  for (const outcome of OBSERVATION_PRECEDENCE) {
    const observation = matches.find((match) => outcomeOf(match) === outcome);
    if (observation) return { outcome, observation };
  }
  return { outcome: "missing" };
}

function fitnessObservationsCiting(
  scnId: string,
  evidenceObservations: readonly EvidenceObservation[]
): FitnessEvidenceObservation[] {
  return evidenceObservations.filter(
    (o): o is FitnessEvidenceObservation =>
      isFitnessObservation(o) &&
      o.broken !== true &&
      o.scnId === scnId
  );
}

function fitnessOutcomeOf(observation: FitnessEvidenceObservation): ObservationOutcome | undefined {
  if (observation.status === "failed") return "failing";
  if (observation.enforcedOverRealSource) return "satisfied";
  return observation.exists ? "watermelon" : undefined;
}

function reconcileFitnessObligation(
  scnId: string,
  obligation: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  const { outcome, observation } = answerOf(
    fitnessObservationsCiting(scnId, evidenceObservations),
    fitnessOutcomeOf
  );
  return makeQualityCheckReconciliation({
    qualityCheck: "fitness",
    outcome,
    evidenceObligation: obligation,
    ...(observation ? { evidenceObservation: observation } : {}),
  });
}

function behaviouralOutcomeOf(observation: BehaviouralEvidenceObservation): ObservationOutcome {
  return observation.status === "passed" ? "satisfied" : "failing";
}

export function reconcileEvidenceObligation(
  scnId: string,
  obligation: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  if (obligation.qualityCheck === "fitness") {
    return reconcileFitnessObligation(scnId, obligation, evidenceObservations);
  }

  const { outcome, observation } = answerOf(evidenceObservations.filter(
    (o): o is BehaviouralEvidenceObservation =>
      o.broken !== true &&
      o.qualityCheck === obligation.qualityCheck &&
      o.scnId === scnId
  ), behaviouralOutcomeOf);
  return makeQualityCheckReconciliation({
    qualityCheck: obligation.qualityCheck,
    outcome,
    evidenceObligation: obligation,
    ...(observation ? { evidenceObservation: observation } : {}),
  });
}

function fitnessFunctionNameOf(observation: EvidenceObservation): string | undefined {
  return isFitnessObservation(observation)
    ? observation.fitnessFunction
    : undefined;
}

function remarkOf(
  o: EvidenceObservation
): Pick<QualityCheckReconciliationFields, "locator" | "message" | "notes"> {
  return {
    ...(o.locator !== undefined ? { locator: o.locator } : {}),
    ...(o.message !== undefined ? { message: o.message } : {}),
    ...(o.notes !== undefined ? { notes: o.notes } : {}),
  };
}

function brokenReconciliationOf(o: EvidenceObservation): QualityCheckReconciliation {
  return makeQualityCheckReconciliation({
    qualityCheck: o.qualityCheck,
    ...(fitnessFunctionNameOf(o) !== undefined ? { fitnessFunction: fitnessFunctionNameOf(o) } : {}),
    outcome: "broken",
    evidenceObservation: o,
    ...remarkOf(o),
  });
}

export function brokenReconciliationsOf(
  postedObservations: readonly EvidenceObservation[]
): QualityCheckReconciliation[] {
  return postedObservations.filter((o) => o.broken === true).map(brokenReconciliationOf);
}

export function noEvidenceObligationReconciliationsOf(
  scnId: string,
  postedObservations: readonly EvidenceObservation[],
  evidenceObligationPairs: ReadonlySet<string>
): QualityCheckReconciliation[] {
  return postedObservations
    .filter(
      (o) =>
        o.broken === true ||
        !evidenceObligationPairs.has(evidenceObligationPairKey(scnId, o.qualityCheck))
    )
    .map((o) =>
      o.broken === true
        ? brokenReconciliationOf(o)
        : makeQualityCheckReconciliation({
            qualityCheck: o.qualityCheck,
            outcome: "no-evidence-obligation" as const,
            ...(fitnessFunctionNameOf(o) !== undefined ? { fitnessFunction: fitnessFunctionNameOf(o) } : {}),
            evidenceObservation: o,
            ...(locatorOf(o) !== undefined ? { locator: locatorOf(o) } : {}),
          })
    );
}

export function citesUnknownScenarioReconciliationsOf(
  observations: readonly EvidenceObservation[]
): QualityCheckReconciliation[] {
  return observations.map((o) =>
    o.broken === true
      ? brokenReconciliationOf(o)
      : makeQualityCheckReconciliation({
          qualityCheck: o.qualityCheck,
          ...(isFitnessObservation(o) ? { fitnessFunction: o.fitnessFunction } : {}),
          outcome: "cites-unknown-scenario",
          evidenceObservation: o,
          ...(locatorOf(o) !== undefined ? { locator: locatorOf(o) } : {}),
        })
  );
}

export function unnamedClaimReconciliationsOf(
  brokenEvidence: readonly (BehaviouralEvidenceObservation | FitnessEvidenceObservation)[],
  uncited: readonly BehaviouralEvidenceObservation[],
  uncitedFitnessFunctions: readonly FitnessEvidenceObservation[]
): QualityCheckReconciliation[] {
  return [
    ...brokenEvidence.map(brokenReconciliationOf),
    ...uncited.map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: o.qualityCheck,
        outcome: "cites-no-scenario" as const,
        evidenceObservation: o,
        ...remarkOf(o),
      })
    ),
    ...uncitedFitnessFunctions.map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: "fitness" as const,
        fitnessFunction: o.fitnessFunction,
        outcome: "cites-no-scenario" as const,
        evidenceObservation: o,
      })
    ),
  ];
}

export function noScnCodeReconciliations(): QualityCheckReconciliation[] {
  return [makeQualityCheckReconciliation({ outcome: "no-scn-code", evidenceObligation: {} })];
}

export function duplicateScnCodeReconciliationsOf(
  obligations: readonly EvidenceObligation[]
): QualityCheckReconciliation[] {
  const firstNaming = new Map<QualityCheck, EvidenceObligation>();
  for (const obligation of obligations) {
    if (obligation.qualityCheck !== undefined && !firstNaming.has(obligation.qualityCheck)) {
      firstNaming.set(obligation.qualityCheck, obligation);
    }
  }
  if (firstNaming.size === 0) {
    return [makeQualityCheckReconciliation({ outcome: "duplicate-scn-code", evidenceObligation: {} })];
  }
  return [...firstNaming].map(([qualityCheck, evidenceObligation]) =>
    makeQualityCheckReconciliation({ qualityCheck, outcome: "duplicate-scn-code", evidenceObligation })
  );
}

export function bothMissingReconciliation(): QualityCheckReconciliation {
  return makeQualityCheckReconciliation({ outcome: "both-missing" });
}

