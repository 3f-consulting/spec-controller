import type {
  BehaviouralQualityCheck,
  Scenario,
  FitnessEvidenceObservation,
  EvidenceObservation,
  PendingItem,
  BehaviouralEvidenceObservation,
} from "./journal.js";
import type { ClaimReconciliation } from "./claimReconciliation.js";
import type { Ledger } from "./ledger.js";
import {
  evidenceObligationPairsOf,
  evidenceObligationsOf,
  pendingItemsOf,
} from "./journal.js";
import {
  reconcileEvidenceObligation,
  noEvidenceObligationReconciliationsOf,
  citesUnknownScenarioReconciliationsOf,
  unnamedClaimReconciliationsOf,
  noScnCodeReconciliations,
  duplicateScnCodeReconciliationsOf,
} from "./qualityCheckReconciliation.js";
import {
  ledgerTally,
  behaviouralObservationTally,
  fitnessFunctionTally,
} from "./ledger.js";
import type {
  ClaimReconciliationTotals,
  QualityCheckReconciliationTotals,
  FitnessTally,
} from "./ledger.js";
import {
  verdictFor,
  reconcilingItemsOf,
  qualityCheckReconciliationsOf,
  UNNAMED_CLAIM_ID,
} from "./claimReconciliation.js";
import type { ScenarioCodeError, ScenarioCodePopulation } from "./scnTags.js";
import { postingOf } from "./posting.js";
import { inEvidenceOrder } from "./evidenceOrder.js";
import { isFitnessObservation } from "./journal.js";

type CitedPosting = { readonly kind: "scenario" | "phantom-claim"; readonly scnId: string };

interface CitationIndex {
  file(posting: CitedPosting, observation: EvidenceObservation): void;
  observationsFor(scnId: string): readonly EvidenceObservation[];
  readonly phantomClaimIds: readonly string[];
}

function citationIndex(): CitationIndex {
  const byScn = new Map<string, EvidenceObservation[]>();
  const phantomClaimIds: string[] = [];
  return {
    file(posting, observation) {
      const list = byScn.get(posting.scnId) ?? [];
      list.push(observation);
      byScn.set(posting.scnId, list);
      if (posting.kind === "phantom-claim" && !phantomClaimIds.includes(posting.scnId)) {
        phantomClaimIds.push(posting.scnId);
      }
    },
    observationsFor: (scnId) => byScn.get(scnId) ?? [],
    phantomClaimIds,
  };
}

interface RoutedObservations {
  readonly citations: CitationIndex;
  readonly brokenEvidence: readonly (BehaviouralEvidenceObservation | FitnessEvidenceObservation)[];
  readonly uncited: readonly BehaviouralEvidenceObservation[];
  readonly uncitedFitnessFunctions: readonly FitnessEvidenceObservation[];
}

function routeObservations(
  evidenceObservations: readonly EvidenceObservation[],
  scenarioIds: ReadonlySet<string>
): RoutedObservations {
  const citations = citationIndex();
  const brokenEvidence: EvidenceObservation[] = [];
  const uncited: BehaviouralEvidenceObservation[] = [];
  const uncitedFitnessFunctions: FitnessEvidenceObservation[] = [];
  for (const o of evidenceObservations) {
    const posting = postingOf(o, scenarioIds);
    if (posting.kind !== "unnamed-claim") citations.file(posting, o);
    else if (posting.posted === "broken") brokenEvidence.push(o);
    else if (isFitnessObservation(o)) uncitedFitnessFunctions.push(o);
    else uncited.push(o);
  }
  return { citations, brokenEvidence, uncited, uncitedFitnessFunctions };
}

function scenarioRow(
  d: Scenario,
  evidenceObservations: EvidenceObservation[],
  citations: CitationIndex,
  evidenceObligationPairs: ReadonlySet<string>
): ClaimReconciliation {
  const pendingItems: PendingItem[] = pendingItemsOf(d);

  const reconciledEvidenceObligations = evidenceObligationsOf(d.evidenceObligations).map((obligation) =>
    reconcileEvidenceObligation(d.scnId, obligation, evidenceObservations)
  );

  const noEvidenceObligationItems = noEvidenceObligationReconciliationsOf(
    d.scnId,
    citations.observationsFor(d.scnId),
    evidenceObligationPairs
  );

  const qualityCheckReconciliations = qualityCheckReconciliationsOf(
    reconciledEvidenceObligations,
    noEvidenceObligationItems,
    pendingItems
  );
  return {
    scnId: d.scnId,
    kind: "scenario",
    verdict: verdictFor(qualityCheckReconciliations),
    evidenceObservations: citations.observationsFor(d.scnId),
    evidenceObligations: [...d.evidenceObligations],
    qualityCheckReconciliations,
    reconcilingItems: reconcilingItemsOf(qualityCheckReconciliations),
    pendingItems,
  };
}

function accountsByCode(scenarios: readonly Scenario[]): Scenario[][] {
  const byCode = new Map<string, Scenario[]>();
  for (const scenario of scenarios) {
    const sharers = byCode.get(scenario.scnId) ?? [];
    sharers.push(scenario);
    byCode.set(scenario.scnId, sharers);
  }
  return [...byCode.values()];
}

function duplicateScnCodeRow(
  sharers: readonly Scenario[],
  citations: CitationIndex
): ClaimReconciliation {
  const scnId = sharers[0]!.scnId;
  const evidenceObligations = sharers.flatMap((s) => s.evidenceObligations);
  const items = duplicateScnCodeReconciliationsOf(evidenceObligations);
  return {
    scnId,
    kind: "scenario",
    verdict: verdictFor(items),
    evidenceObservations: citations.observationsFor(scnId),
    evidenceObligations,
    qualityCheckReconciliations: items,
    reconcilingItems: reconcilingItemsOf(items),
    pendingItems: [],
  };
}

function phantomClaimRows(citations: CitationIndex): ClaimReconciliation[] {
  const rows: ClaimReconciliation[] = [];
  for (const scnId of citations.phantomClaimIds) {
    const observations = citations.observationsFor(scnId);
    const items = citesUnknownScenarioReconciliationsOf(observations);
    rows.push({
      scnId,
      kind: "phantom-claim",
      verdict: verdictFor(items),
      evidenceObservations: [...observations],
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }
  return rows;
}

function unnamedClaimRows(
  brokenEvidence: readonly (BehaviouralEvidenceObservation | FitnessEvidenceObservation)[],
  uncited: readonly BehaviouralEvidenceObservation[],
  uncitedFitnessFunctions: readonly FitnessEvidenceObservation[]
): ClaimReconciliation[] {
  const rows: ClaimReconciliation[] = [];
  if (brokenEvidence.length > 0 || uncited.length > 0 || uncitedFitnessFunctions.length > 0) {
    const items = unnamedClaimReconciliationsOf(brokenEvidence, uncited, uncitedFitnessFunctions);
    rows.push({
      scnId: UNNAMED_CLAIM_ID,
      kind: "unnamed-claim",
      verdict: verdictFor(items),
      evidenceObservations: [...brokenEvidence, ...uncited, ...uncitedFitnessFunctions],
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }
  return rows;
}

function untaggedScenarioRows(untaggedScenarios: readonly string[]): ClaimReconciliation[] {
  const rows: ClaimReconciliation[] = [];
  for (const name of untaggedScenarios) {
    const items = noScnCodeReconciliations();
    rows.push({
      scnId: name,
      kind: "scenario",
      verdict: verdictFor(items),
      evidenceObservations: [],
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }
  return rows;
}

export function reconcile(
  scenarios: readonly Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = []
): Ledger {
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  const observations = inEvidenceOrder(evidenceObservations);
  const { citations, brokenEvidence, uncited, uncitedFitnessFunctions } = routeObservations(
    observations,
    scenarioIds
  );
  return {
    claimReconciliations: [
      ...accountsByCode(scenarios).map((sharers) =>
        sharers.length === 1
          ? scenarioRow(sharers[0]!, observations, citations, evidenceObligationPairs)
          : duplicateScnCodeRow(sharers, citations)
      ),
      ...phantomClaimRows(citations),
      ...unnamedClaimRows(brokenEvidence, uncited, uncitedFitnessFunctions),
      ...untaggedScenarioRows(untaggedScenarios),
    ],
  };
}

export interface TestVolumeTotals {
  readonly totalEvidenceObservations: number;
  readonly onScenario: number;
  readonly onPhantomClaim: number;
  readonly onUnnamedClaim: number;
}

export interface FitnessFunctionTotals {
  readonly runningFitnessFunctionCount: number;
  readonly uncitedFitnessFunctionCount: number;
}

export interface ReconcilerStep {
  readonly step: string;
  readonly role: "reconciles" | "records";
}

export interface BehaviouralRunner {
  readonly tier: string;
  readonly runner: string;
  readonly step: string;
}

export type ConfigurationKind =
  | "list"
  | "object"
  | "string-or-null"
  | "null"
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "function";

export interface WrongKindEntry {
  readonly entry: string;
  readonly is: ConfigurationKind;
  readonly reads: ConfigurationKind;
}

export interface JobDiscoveryScope {
  readonly source?: string;
  readonly job: string;
  readonly steps: number;
  readonly candidates: number;
}

export interface StepAccounting {
  readonly stepsRead: number;
  readonly candidates: number;
  readonly runners: number;
  readonly reconciler: number;
  readonly excluded: number;
  readonly plumbing?: number;
  readonly accountedFor: number;
}

export interface TierWithoutRunner {
  readonly tier: BehaviouralQualityCheck;
  readonly namesNone: boolean;
}

export interface Summary {
  readonly claimReconciliations: ClaimReconciliationTotals;
  readonly qualityCheckReconciliations: QualityCheckReconciliationTotals;
  readonly pending: number;
  readonly testVolume?: TestVolumeTotals;
  readonly rawByBehaviouralQualityCheck?: Record<BehaviouralQualityCheck, number>;
  readonly fitnessFunctions?: FitnessFunctionTotals;
  readonly fitness: FitnessTally;
  readonly behaviouralRunners?: readonly BehaviouralRunner[];
  readonly tiersWithoutRunner?: readonly TierWithoutRunner[];
  readonly runnerKeysNotATier?: readonly string[];
  readonly configurationOfWrongKind?: readonly WrongKindEntry[];
  readonly configurationKeysNotRead?: readonly string[];
  readonly excludedSteps?: readonly string[];
  readonly reconcilerSteps?: readonly ReconcilerStep[];
  readonly nonChecksMatchingNoStep?: readonly string[];
  readonly discoveryScope?: readonly JobDiscoveryScope[];
  readonly stepAccounting?: StepAccounting;
}

export interface EvidenceReconciliation {
  readonly summary: Summary;
  readonly ledger: Ledger;
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
  readonly scenarioCodePopulation?: ScenarioCodePopulation;
}

export function summaryOf(
  ledger: Ledger,
  withBehaviouralObservations: boolean,
  withFitnessFunctions: boolean
): Summary {
  const tally = ledgerTally(ledger);
  const observations = behaviouralObservationTally(ledger);
  const fitnessFunctions = fitnessFunctionTally(ledger);
  return {
    claimReconciliations: tally.claimReconciliations,
    qualityCheckReconciliations: tally.qualityCheckReconciliations,
    pending: tally.pending,
    ...(withBehaviouralObservations
      ? {
          testVolume: {
            totalEvidenceObservations: observations.total,
            onScenario: observations.onScenario,
            onPhantomClaim: observations.onPhantomClaim,
            onUnnamedClaim: observations.onUnnamedClaim,
          },
          rawByBehaviouralQualityCheck: observations.rawByBehaviouralQualityCheck,
        }
      : {}),
    ...(withFitnessFunctions ? { fitnessFunctions } : {}),
    fitness: tally.fitness,
  };
}

export function evidenceReconciliationOf(
  scenarios: readonly Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[],
  withBehaviouralObservations: boolean,
  withFitnessFunctions: boolean
): EvidenceReconciliation {
  const ledger = reconcile(scenarios, evidenceObservations, untaggedScenarios);
  return { summary: summaryOf(ledger, withBehaviouralObservations, withFitnessFunctions), ledger };
}
