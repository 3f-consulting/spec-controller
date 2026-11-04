import type { ScenarioCodeError, ScenarioCodePopulation } from "./scnTags.js";
import type { ClaimReconciliation } from "./claimReconciliation.js";
import type { Summary, WrongKindEntry } from "./evidenceReconciliation.js";
import type { ProvenanceObject } from "./runProvenance.js";
import type { EvidenceObligations, SharedScnCode } from "./corpusCounts.js";
import type { ScenarioName } from "./qualityCheckReconciliation.js";
import type { RunVerdict } from "./runVerdict.js";
import type { FeatureOutOfBalance } from "./outOfBalanceByFeature.js";

export interface ScenarioCodesSection {
  readonly featureFiles?: number;
  readonly featureCodes?: number;
  readonly excludedOccurrences?: number;
  readonly untaggedScenarios?: readonly ScenarioName[];
  readonly sharedScnCodes?: readonly SharedScnCode[];
}

/** Exact only while no feature code is shared: `featureCodes` counts distinct codes, so a code two files share counts once. */
export function featureFilesWithNoFeatureCodeOf({
  featureFiles,
  featureCodes,
}: Required<Pick<ScenarioCodesSection, "featureFiles" | "featureCodes">>): number {
  return featureFiles - featureCodes;
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
  readonly runnerKeysNotALayer?: readonly string[];
  readonly nonChecksMatchingNoStep?: readonly string[];
  readonly nonChecksNotAStepName?: readonly string[];
}

export interface ErrorsSection {
  readonly scenarioCodes?: readonly ScenarioCodeError[];
  readonly configurationNotRead?: ConfigurationFaults;
}

export function errorsOf(
  scenarioCodeErrors: readonly ScenarioCodeError[] | undefined,
  summary: Summary
): ErrorsSection | undefined {
  const configurationNotRead: ConfigurationFaults = {
    ...nonEmpty("keysNotRead", summary.configurationKeysNotRead),
    ...nonEmpty("ofWrongKind", summary.configurationOfWrongKind),
    ...nonEmpty("runnerKeysNotALayer", summary.runnerKeysNotALayer),
    ...nonEmpty("nonChecksMatchingNoStep", summary.nonChecksMatchingNoStep),
    ...nonEmpty("nonChecksNotAStepName", summary.nonChecksNotAStepName),
  };
  const errors: ErrorsSection = {
    ...nonEmpty("scenarioCodes", scenarioCodeErrors),
    ...(Object.keys(configurationNotRead).length > 0 ? { configurationNotRead } : {}),
  };
  return Object.keys(errors).length > 0 ? errors : undefined;
}

type ConfigurationFaultKey =
  | "configurationKeysNotRead"
  | "configurationOfWrongKind"
  | "runnerKeysNotALayer"
  | "nonChecksMatchingNoStep"
  | "nonChecksNotAStepName";

type SummaryStatingNoFault = Omit<Summary, ConfigurationFaultKey>;

export function summaryStatingNoFault({
  configurationKeysNotRead: _keysNotRead,
  configurationOfWrongKind: _ofWrongKind,
  runnerKeysNotALayer: _runnerKeysNotALayer,
  nonChecksMatchingNoStep: _nonChecksMatchingNoStep,
  nonChecksNotAStepName: _nonChecksNotAStepName,
  ...summary
}: Summary): SummaryStatingNoFault {
  return summary;
}

function nonEmpty<K extends string, T>(key: K, entries: readonly T[] | undefined): Partial<Record<K, readonly T[]>> {
  return entries && entries.length > 0 ? ({ [key]: entries } as Record<K, readonly T[]>) : {};
}

export interface RenderInput {
  readonly runProvenance: ProvenanceObject;
  readonly errors?: ErrorsSection;
  readonly summary: SummaryStatingNoFault & {
    readonly runVerdict: RunVerdict;
    readonly scenarioCodes?: ScenarioCodesSection;
    readonly outOfBalanceByFeature?: readonly FeatureOutOfBalance[];
  };
  readonly claimReconciliations: readonly ClaimReconciliation[];
}

export type FeatureNames = ReadonlyMap<string, string>;

export type ExitCodeOf = (verdict: RunVerdict) => number;
