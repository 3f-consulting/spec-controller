import type { ScenarioCodeError, ScenarioCodePopulation } from "./scnTags.js";
import type { Ledger } from "./ledger.js";
import type { StepAccounting, Summary, WrongKindEntry } from "./evidenceReconciliation.js";
import type { ProvenanceObject } from "./runProvenance.js";
import type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "./corpusCounts.js";
import type { RunVerdict } from "./runVerdict.js";

export interface ScenarioCodesSection {
  readonly featureFiles?: number;
  readonly featureCodes?: number;
  readonly excludedOccurrences?: number;
  readonly untaggedScenarios?: readonly UntaggedScenario[];
  readonly sharedScnCodes?: readonly SharedScnCode[];
}

export function scenarioCodesOf(
  population: ScenarioCodePopulation | undefined,
  obligations: EvidenceObligations | undefined
): ScenarioCodesSection | undefined {
  if (!population && !obligations) return undefined;
  return {
    ...(population ? { featureFiles: population.featureFiles, featureCodes: population.featureCodes } : {}),
    ...(obligations
      ? {
          excludedOccurrences: obligations.excludedOccurrences,
          untaggedScenarios: obligations.untaggedScenarios,
          ...nonEmpty("sharedScnCodes", obligations.sharedScnCodes),
        }
      : {}),
  };
}

interface ConfigurationFaults {
  readonly keysNotRead?: readonly string[];
  readonly ofWrongKind?: readonly WrongKindEntry[];
  readonly runnerKeysNotATier?: readonly string[];
  readonly nonChecksMatchingNoStep?: readonly string[];
}

export interface ErrorsSection {
  readonly scenarioCodes?: readonly ScenarioCodeError[];
  readonly configuration?: ConfigurationFaults;
}

export function errorsOf(
  scenarioCodeErrors: readonly ScenarioCodeError[] | undefined,
  summary: Summary
): ErrorsSection | undefined {
  const configuration: ConfigurationFaults = {
    ...nonEmpty("keysNotRead", summary.configurationKeysNotRead),
    ...nonEmpty("ofWrongKind", summary.configurationOfWrongKind),
    ...nonEmpty("runnerKeysNotATier", summary.runnerKeysNotATier),
    ...nonEmpty("nonChecksMatchingNoStep", summary.nonChecksMatchingNoStep),
  };
  const errors: ErrorsSection = {
    ...nonEmpty("scenarioCodes", scenarioCodeErrors),
    ...(Object.keys(configuration).length > 0 ? { configuration } : {}),
  };
  return Object.keys(errors).length > 0 ? errors : undefined;
}

type ConfigurationFaultKey =
  | "configurationKeysNotRead"
  | "configurationOfWrongKind"
  | "runnerKeysNotATier"
  | "nonChecksMatchingNoStep";

type SummaryStatingNoFault = Omit<Summary, ConfigurationFaultKey>;

export function summaryStatingNoFault({
  configurationKeysNotRead: _keysNotRead,
  configurationOfWrongKind: _ofWrongKind,
  runnerKeysNotATier: _runnerKeysNotATier,
  nonChecksMatchingNoStep: _nonChecksMatchingNoStep,
  ...summary
}: Summary): SummaryStatingNoFault {
  return summary;
}

function nonEmpty<K extends string, T>(key: K, entries: readonly T[] | undefined): Partial<Record<K, readonly T[]>> {
  return entries && entries.length > 0 ? ({ [key]: entries } as Record<K, readonly T[]>) : {};
}

export interface ReportMetadata {
  readonly featureNames?: Record<string, string>;
}

export interface RenderInput {
  readonly runProvenance: ProvenanceObject;
  readonly errors?: ErrorsSection;
  readonly scenarioCodes?: ScenarioCodesSection;
  readonly summary: Omit<SummaryStatingNoFault, "stepAccounting"> & {
    readonly runVerdict: RunVerdict;
    readonly stepAccounting?: StepAccounting & { readonly everyStepAccountedFor: boolean };
  };
  readonly ledger: Ledger;
  readonly metadata?: ReportMetadata;
}

export type FeatureNames = ReadonlyMap<string, string>;

export type ExitCodeOf = (verdict: RunVerdict) => number;
