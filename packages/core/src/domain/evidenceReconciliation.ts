import type {
  BehaviouralQualityCheck,
  Scenario,
  FitnessEvidenceObservation,
  EvidenceObservation,
  PendingItem,
  BehaviouralEvidenceObservation,
} from "./journal.js";
import type { ScenarioReconciliation } from "./scenarioReconciliation.js";
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
  suspenseReconciliationsOf,
  noScnCodeReconciliations,
  duplicateScnCodeReconciliationsOf,
} from "./qualityCheckReconciliation.js";
import {
  ledgerTally,
  behaviouralObservationTally,
  fitnessFunctionTally,
  BEHAVIOURAL_QUALITY_CHECKS,
} from "./ledger.js";
import type {
  ScenarioReconciliationTotals,
  QualityCheckReconciliationTotals,
  FitnessTally,
} from "./ledger.js";
import {
  verdictFor,
  reconcilingItemsOf,
  qualityCheckReconciliationsOf,
} from "./scenarioReconciliation.js";
import type { ScenarioCodeError, ScenarioCodePopulation } from "./scenarioCodeError.js";
import { postingOf } from "./posting.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { inEvidenceOrder } from "./evidenceOrder.js";
import { isFitnessObservation } from "./journal.js";

type CitedPosting = { readonly kind: "scenario" | "phantom-scenario"; readonly scnId: string };

interface CitationIndex {
  file(posting: CitedPosting, observation: EvidenceObservation): void;
  observationsFor(scnId: string): readonly EvidenceObservation[];
  readonly phantomIds: readonly string[];
}

function citationIndex(): CitationIndex {
  const byScn = new Map<string, EvidenceObservation[]>();
  const phantomIds: string[] = [];
  return {
    file(posting, observation) {
      const list = byScn.get(posting.scnId) ?? [];
      list.push(observation);
      byScn.set(posting.scnId, list);
      if (posting.kind === "phantom-scenario" && !phantomIds.includes(posting.scnId)) {
        phantomIds.push(posting.scnId);
      }
    },
    observationsFor: (scnId) => byScn.get(scnId) ?? [],
    phantomIds,
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
    if (posting.kind !== "suspense-scenario") citations.file(posting, o);
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
): ScenarioReconciliation {
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
): ScenarioReconciliation {
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

function phantomScenarioRows(citations: CitationIndex): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
  for (const scnId of citations.phantomIds) {
    const observations = citations.observationsFor(scnId);
    const items = citesUnknownScenarioReconciliationsOf(observations);
    rows.push({
      scnId,
      kind: "phantom-scenario",
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

function suspenseScenarioRows(
  brokenEvidence: readonly (BehaviouralEvidenceObservation | FitnessEvidenceObservation)[],
  uncited: readonly BehaviouralEvidenceObservation[],
  uncitedFitnessFunctions: readonly FitnessEvidenceObservation[]
): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
  if (brokenEvidence.length > 0 || uncited.length > 0 || uncitedFitnessFunctions.length > 0) {
    const items = suspenseReconciliationsOf(brokenEvidence, uncited, uncitedFitnessFunctions);
    rows.push({
      scnId: CORE_MESSAGES[CoreMessage.SuspenseScenarioId],
      kind: "suspense-scenario",
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

function untaggedScenarioRows(untaggedScenarios: readonly string[]): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
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
    scenarioReconciliations: [
      ...accountsByCode(scenarios).map((sharers) =>
        sharers.length === 1
          ? scenarioRow(sharers[0]!, observations, citations, evidenceObligationPairs)
          : duplicateScnCodeRow(sharers, citations)
      ),
      ...phantomScenarioRows(citations),
      ...suspenseScenarioRows(brokenEvidence, uncited, uncitedFitnessFunctions),
      ...untaggedScenarioRows(untaggedScenarios),
    ],
  };
}

export interface TestVolumeTotals {
  readonly totalEvidenceObservations: number;
  readonly onScenario: number;
  readonly onPhantomScenario: number;
  readonly onSuspenseScenario: number;
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

export interface WrongKindEntry {
  readonly entry: string;
  readonly is: string;
  readonly reads: string;
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
  readonly accountedFor: number;
}

export interface TierWithoutRunner {
  readonly tier: BehaviouralQualityCheck;
  readonly namesNone: boolean;
}

export function tiersWithoutRunnerOf(runnerTiers: Readonly<Record<string, string | null>>): TierWithoutRunner[] {
  return BEHAVIOURAL_QUALITY_CHECKS.filter((tier) => typeof runnerTiers[tier] !== "string").map((tier) => ({
    tier,
    namesNone: Object.hasOwn(runnerTiers, tier),
  }));
}

export interface Summary {
  readonly scenarioReconciliations: ScenarioReconciliationTotals;
  readonly qualityCheckReconciliations: QualityCheckReconciliationTotals;
  readonly pending: number;
  readonly testVolume?: TestVolumeTotals;
  readonly rawByBehaviouralQualityCheck?: Record<BehaviouralQualityCheck, number>;
  readonly fitnessFunctions?: FitnessFunctionTotals;
  readonly fitness: FitnessTally;
  readonly behaviouralRunners?: readonly BehaviouralRunner[];
  readonly runnerTiers?: Readonly<Record<string, string | null>>;
  readonly unrecognisedRunnerKeys?: readonly string[];
  readonly wrongKindConfiguration?: readonly WrongKindEntry[];
  readonly unknownConfigurationKeys?: readonly string[];
  readonly excludedSteps?: readonly string[];
  readonly reconcilerSteps?: readonly ReconcilerStep[];
  readonly unmatchedNotChecks?: readonly string[];
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
    scenarioReconciliations: tally.scenarioReconciliations,
    qualityCheckReconciliations: tally.qualityCheckReconciliations,
    pending: tally.pending,
    ...(withBehaviouralObservations
      ? {
          testVolume: {
            totalEvidenceObservations: observations.total,
            onScenario: observations.onScenario,
            onPhantomScenario: observations.onPhantomScenario,
            onSuspenseScenario: observations.onSuspenseScenario,
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
