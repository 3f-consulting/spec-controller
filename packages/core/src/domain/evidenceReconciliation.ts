import type {
  RuntimeQualityCheck,
  Scenario,
  FitnessEvidenceObservation,
  EvidenceObservation,
  PendingItem,
  RuntimeEvidenceObservation,
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
  runtimeObservationTally,
  fitnessFunctionTally,
} from "./ledger.js";
import type {
  ScenarioReconciliationTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  FitnessTally,
} from "./ledger.js";
import {
  verdictFor,
  reconcilingItemsOf,
  qualityCheckReconciliationsOf,
} from "./scenarioReconciliation.js";
import type { ScenarioCodeError, ScenarioCodePopulation } from "./scenarioCodeError.js";
import { postingOf, type RuntimePosting, type FitnessFunctionPosting } from "./posting.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { inEvidenceOrder } from "./evidenceOrder.js";
import { isFitnessObservation } from "./journal.js";

type CitedPosting = { kind: "scenario" | "phantom-scenario"; scnId: string };

interface CitationIndex {
  file(posting: CitedPosting, observation: EvidenceObservation): void;
  creditsFor(scnId: string): EvidenceObservation[];
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
    creditsFor: (scnId) => byScn.get(scnId) ?? [],
    phantomIds,
  };
}

interface RoutedCredits {
  readonly citations: CitationIndex;
  readonly brokenEvidence: readonly (RuntimeEvidenceObservation | FitnessEvidenceObservation)[];
  readonly uncited: readonly RuntimeEvidenceObservation[];
  readonly noEvidenceObligationFitnessFunctions: readonly FitnessEvidenceObservation[];
}

interface SuspenseStreams {
  readonly brokenEvidence: (RuntimeEvidenceObservation | FitnessEvidenceObservation)[];
  readonly uncited: RuntimeEvidenceObservation[];
  readonly noEvidenceObligationFitnessFunctions: FitnessEvidenceObservation[];
}

function routeFitnessCredit(
  observation: FitnessEvidenceObservation,
  posting: FitnessFunctionPosting,
  citations: CitationIndex,
  streams: SuspenseStreams
): void {
  if (posting.kind !== "suspense-scenario") {
    citations.file(posting, observation);
    return;
  }
  if (posting.posted === "broken" && isFitnessObservation(observation)) {
    streams.brokenEvidence.push(observation);
  } else streams.noEvidenceObligationFitnessFunctions.push(observation);
}

function routeRuntimeCredit(
  observation: RuntimeEvidenceObservation,
  posting: RuntimePosting,
  citations: CitationIndex,
  streams: SuspenseStreams
): void {
  switch (posting.kind) {
    case "scenario":
    case "phantom-scenario": {
      citations.file(posting, observation);
      break;
    }
    case "suspense-scenario":
      if (posting.posted === "broken") streams.brokenEvidence.push(observation);
      else streams.uncited.push(observation);
      break;
  }
}

function routeCredits(
  evidenceObservations: readonly EvidenceObservation[],
  scenarioIds: ReadonlySet<string>
): RoutedCredits {
  const citations = citationIndex();
  const streams: SuspenseStreams = {
    brokenEvidence: [],
    uncited: [],
    noEvidenceObligationFitnessFunctions: [],
  };
  const { brokenEvidence, uncited, noEvidenceObligationFitnessFunctions } = streams;
  for (const o of evidenceObservations) {
    if (o.qualityCheck === "fitness") {
      routeFitnessCredit(o, postingOf(o, scenarioIds), citations, streams);
      continue;
    }
    routeRuntimeCredit(o, postingOf(o, scenarioIds), citations, streams);
  }
  return { citations, brokenEvidence, uncited, noEvidenceObligationFitnessFunctions };
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
    citations.creditsFor(d.scnId),
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
    evidenceObservations: citations.creditsFor(d.scnId),
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
    evidenceObservations: citations.creditsFor(scnId),
    evidenceObligations,
    qualityCheckReconciliations: items,
    reconcilingItems: reconcilingItemsOf(items),
    pendingItems: [],
  };
}

function phantomScenarioRows(citations: CitationIndex): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
  for (const scnId of citations.phantomIds) {
    const credits = citations.creditsFor(scnId);
    const items = citesUnknownScenarioReconciliationsOf(credits);
    rows.push({
      scnId,
      kind: "phantom-scenario",
      verdict: verdictFor(items),
      evidenceObservations: [...credits],
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }
  return rows;
}

function suspenseScenarioRows(
  brokenEvidence: readonly (RuntimeEvidenceObservation | FitnessEvidenceObservation)[],
  uncited: readonly RuntimeEvidenceObservation[],
  noEvidenceObligationFitnessFunctions: readonly FitnessEvidenceObservation[]
): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
  if (brokenEvidence.length > 0 || uncited.length > 0 || noEvidenceObligationFitnessFunctions.length > 0) {
    const items = suspenseReconciliationsOf(brokenEvidence, uncited, noEvidenceObligationFitnessFunctions);
    rows.push({
      scnId: CORE_MESSAGES[CoreMessage.SuspenseScenarioId],
      kind: "suspense-scenario",
      verdict: verdictFor(items),
      evidenceObservations: [...brokenEvidence, ...uncited, ...noEvidenceObligationFitnessFunctions],
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
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = []
): Ledger {
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  const observations = inEvidenceOrder(evidenceObservations);
  const { citations, brokenEvidence, uncited, noEvidenceObligationFitnessFunctions } = routeCredits(
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
      ...suspenseScenarioRows(brokenEvidence, uncited, noEvidenceObligationFitnessFunctions),
      ...untaggedScenarioRows(untaggedScenarios),
    ],
  };
}

export interface TestVolumeTotals {
  totalEvidenceObservations: number;
  onScenario: number;
  onPhantomScenario: number;
  onSuspenseScenario: number;
}

export interface FitnessFunctionTotals {
  runningFitnessFunctionCount: number;
  uncitedFitnessFunctionCount: number;
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

export interface Summary {
  scenarioReconciliations: ScenarioReconciliationTotals;
  evidenceObligations: EvidenceObligationTotals;
  pending: number;
  testVolume?: TestVolumeTotals;
  rawByRuntimeQualityCheck?: Record<RuntimeQualityCheck, number>;
  fitnessFunctions?: FitnessFunctionTotals;
  fitness: FitnessTally;
  behaviouralRunners?: readonly BehaviouralRunner[];
  runnerTiers?: Readonly<Record<string, string | null>>;
  unrecognisedRunnerKeys?: readonly string[];
  wrongKindConfiguration?: readonly WrongKindEntry[];
  unknownConfigurationKeys?: readonly string[];
  excludedSteps?: readonly string[];
  reconcilerSteps?: readonly ReconcilerStep[];
  unmatchedNotChecks?: readonly string[];
  discoveryScope?: readonly JobDiscoveryScope[];
  stepAccounting?: StepAccounting;
}

export interface EvidenceReconciliation {
  summary: Summary;
  ledger: Ledger;
  scenarioCodeErrors?: readonly ScenarioCodeError[];
  scenarioCodePopulation?: ScenarioCodePopulation;
}

export function summaryOf(
  ledger: Ledger,
  withRuntimeObservations: boolean,
  withFitnessFunctions: boolean
): Summary {
  const tally = ledgerTally(ledger);
  const observations = runtimeObservationTally(ledger);
  const fitnessFunctions = fitnessFunctionTally(ledger);
  return {
    scenarioReconciliations: tally.scenarioReconciliations,
    evidenceObligations: tally.evidenceObligations,
    pending: tally.pending,
    ...(withRuntimeObservations
      ? {
          testVolume: {
            totalEvidenceObservations: observations.total,
            onScenario: observations.onScenario,
            onPhantomScenario: observations.onPhantomScenario,
            onSuspenseScenario: observations.onSuspenseScenario,
          },
          rawByRuntimeQualityCheck: observations.rawByRuntimeQualityCheck,
        }
      : {}),
    ...(withFitnessFunctions ? { fitnessFunctions } : {}),
    fitness: tally.fitness,
  };
}

export function evidenceReconciliationOf(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[],
  withRuntimeObservations: boolean,
  withFitnessFunctions: boolean
): EvidenceReconciliation {
  const ledger = reconcile(scenarios, evidenceObservations, untaggedScenarios);
  return { summary: summaryOf(ledger, withRuntimeObservations, withFitnessFunctions), ledger };
}
