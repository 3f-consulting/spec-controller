import type {
  BehaviouralQualityCheck,
  Scenario,
  EvidenceObservation,
  FitnessEvidenceObservation,
  PendingItem,
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
import type { ScenarioName } from "./qualityCheckReconciliation.js";
import {
  ledgerTally,
  evidenceObservationTally,
  runningFitnessObservations,
} from "./ledger.js";
import type {
  ClaimReconciliationTotals,
  QualityCheckReconciliationTotals,
  FitnessTally,
  EvidenceObservationTally,
  QualityCheckObservations,
} from "./ledger.js";
import {
  verdictFor,
  qualityCheckReconciliationsOf,
  UNNAMED_CLAIM_ID,
} from "./claimReconciliation.js";
import type { ScenarioCodeError, ScenarioCodePopulation } from "./scnTags.js";
import { postingOf } from "./posting.js";
import { inEvidenceOrder } from "./evidenceOrder.js";

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
  readonly onUnnamedClaim: readonly EvidenceObservation[];
}

/** An evidence observation citing a code several scenarios share credits none of them, and names the code. */
function namingSharedCode(observation: EvidenceObservation, code: string): EvidenceObservation {
  return { ...observation, notes: [...(observation.notes ?? []), { kind: "shared-scn-code", code }] };
}

function routeObservations(
  evidenceObservations: readonly EvidenceObservation[],
  scenarioIds: ReadonlySet<string>,
  sharedScnCodes: ReadonlySet<string>
): RoutedObservations {
  const citations = citationIndex();
  const onUnnamedClaim: EvidenceObservation[] = [];
  for (const o of evidenceObservations) {
    const posting = postingOf(o, scenarioIds, sharedScnCodes);
    if (posting.kind !== "unnamed-claim") citations.file(posting, o);
    else if (o.scnId !== null && o.scnId !== undefined && sharedScnCodes.has(o.scnId)) onUnnamedClaim.push(namingSharedCode(o, o.scnId));
    else onUnnamedClaim.push(o);
  }
  return { citations, onUnnamedClaim };
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
    claim: d.scnId,
    kind: "scenario",
    verdict: verdictFor(qualityCheckReconciliations),
    qualityCheckReconciliations,
    pendingItems,
  };
}

function scenarioNameOf({ feature, title }: Scenario): ScenarioName | undefined {
  return feature === undefined || title === undefined ? undefined : { feature, title };
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

function duplicateScnCodeRow(sharer: Scenario): ClaimReconciliation {
  const items = duplicateScnCodeReconciliationsOf(sharer.evidenceObligations, scenarioNameOf(sharer));
  return {
    claim: sharer.scnId,
    kind: "scenario",
    verdict: verdictFor(items),
    qualityCheckReconciliations: items,
    pendingItems: [],
  };
}

function phantomClaimRows(citations: CitationIndex): ClaimReconciliation[] {
  const rows: ClaimReconciliation[] = [];
  for (const scnId of citations.phantomClaimIds) {
    const observations = citations.observationsFor(scnId);
    const items = citesUnknownScenarioReconciliationsOf(observations);
    rows.push({
      claim: scnId,
      kind: "phantom-claim",
      verdict: verdictFor(items),
      qualityCheckReconciliations: items,
      pendingItems: [],
    });
  }
  return rows;
}

function unnamedClaimRows({ onUnnamedClaim }: Omit<RoutedObservations, "citations">): ClaimReconciliation[] {
  const rows: ClaimReconciliation[] = [];
  if (onUnnamedClaim.length > 0) {
    const items = unnamedClaimReconciliationsOf(onUnnamedClaim);
    rows.push({
      claim: UNNAMED_CLAIM_ID,
      kind: "unnamed-claim",
      verdict: verdictFor(items),
      qualityCheckReconciliations: items,
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
      claim: name,
      kind: "scenario",
      verdict: verdictFor(items),
      qualityCheckReconciliations: items,
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
  const accounts = accountsByCode(scenarios);
  const sharedScnCodes = new Set(accounts.filter((sharers) => sharers.length > 1).map((sharers) => sharers[0]!.scnId));
  const { citations, ...unnamed } = routeObservations(observations, scenarioIds, sharedScnCodes);
  return {
    claimReconciliations: [
      ...accounts.flatMap((sharers) =>
        sharers.length === 1
          ? [scenarioRow(sharers[0]!, observations, citations, evidenceObligationPairs)]
          : sharers.map(duplicateScnCodeRow)
      ),
      ...phantomClaimRows(citations),
      ...unnamedClaimRows(unnamed),
      ...untaggedScenarioRows(untaggedScenarios),
    ],
  };
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

function stepsNamed(running: readonly FitnessEvidenceObservation[], stepsInOrder: readonly string[]): string[] {
  const named = new Set(running.map((observation) => observation.step));
  return stepsInOrder.filter((step) => named.has(step));
}

function withSteps(entry: QualityCheckObservations, ciSteps: readonly string[], runner?: string): QualityCheckObservations {
  if (ciSteps.length === 0) return entry;
  return { ...entry, ...(runner === undefined ? {} : { runner }), ciSteps };
}

export function ciStepsJoined(
  observations: EvidenceObservationTally,
  ledger: Ledger,
  runners: readonly BehaviouralRunner[],
  stepsInOrder: readonly string[]
): EvidenceObservationTally {
  return {
    ...observations,
    byQualityCheck: observations.byQualityCheck.map((entry) => {
      if (entry.qualityCheck === "fitness") {
        return withSteps(entry, stepsNamed(runningFitnessObservations(ledger), stepsInOrder));
      }
      const running = runners.filter((row) => row.tier === entry.qualityCheck);
      return withSteps(entry, running.map((row) => row.step), running[0]?.runner);
    }),
  };
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

export interface JobStepAccount {
  readonly workflow: string;
  readonly job: string;
  readonly stepsRead: number;
  readonly candidates: number;
  readonly runners: number;
  readonly reconciler: number;
  readonly excluded: number;
  readonly plumbing: number;
}

export interface StepAccountTotal extends Omit<JobStepAccount, "workflow" | "job"> {
  readonly accountedFor: number;
}

export interface StepsBehindCounts {
  readonly runners?: readonly string[];
  readonly reconciler?: readonly ReconcilerStep[];
  readonly excluded?: readonly string[];
  readonly plumbing?: readonly string[];
}

export interface StepAccounting {
  readonly byJob: readonly JobStepAccount[];
  readonly total: StepAccountTotal;
  readonly everyStepAccountedFor: boolean;
  readonly steps: StepsBehindCounts;
}

export interface TierWithoutRunner {
  readonly tier: BehaviouralQualityCheck;
  readonly namesNone: boolean;
}

interface EvidenceReconciliationTotals {
  readonly claimReconciliations: ClaimReconciliationTotals;
  readonly qualityCheckReconciliations: QualityCheckReconciliationTotals;
  readonly pending: number;
}

export interface Summary {
  readonly evidenceReconciliation: EvidenceReconciliationTotals;
  readonly evidenceObservations?: EvidenceObservationTally;
  readonly fitness: FitnessTally;
  readonly tiersWithoutRunner?: readonly TierWithoutRunner[];
  readonly runnerKeysNotATier?: readonly string[];
  readonly configurationOfWrongKind?: readonly WrongKindEntry[];
  readonly configurationKeysNotRead?: readonly string[];
  readonly nonChecksMatchingNoStep?: readonly string[];
  readonly stepAccounting?: StepAccounting;
}

export interface EvidenceReconciliation {
  readonly summary: Summary;
  readonly ledger: Ledger;
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
  readonly scenarioCodePopulation?: ScenarioCodePopulation;
}

export function summaryOf(ledger: Ledger, withEvidenceObservations: boolean): Summary {
  const tally = ledgerTally(ledger);
  return {
    evidenceReconciliation: {
      claimReconciliations: tally.claimReconciliations,
      qualityCheckReconciliations: tally.qualityCheckReconciliations,
      pending: tally.pending,
    },
    ...(withEvidenceObservations
      ? { evidenceObservations: evidenceObservationTally(ledger) }
      : {}),
    fitness: tally.fitness,
  };
}

export function evidenceReconciliationOf(
  scenarios: readonly Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[]
): EvidenceReconciliation {
  const ledger = reconcile(scenarios, evidenceObservations, untaggedScenarios);
  return { summary: summaryOf(ledger, true), ledger };
}
