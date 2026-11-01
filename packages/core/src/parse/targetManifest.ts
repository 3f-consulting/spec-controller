import { bareTerms } from "../lib/bareTerm.js";
import { deferralTagsExtendedBy } from "../domain/pendingItems.js";
import {
  targetConfigurationOf,
  type ConfigurationTranslation,
  type RunnerLayers,
  type TargetConfiguration,
} from "../domain/targetConfiguration.js";
import type { WrongKindEntry } from "../domain/evidenceReconciliation.js";

const SPEC_CONTROLLER_BLOCK: ConfigurationTranslation = {
  place: "specController",
  entries: {
    runners: "runners",
    notChecks: "nonChecks",
    deferralTags: "deferralTags",
  },
};

const configured = (packageJson: { specController?: unknown }): TargetConfiguration =>
  targetConfigurationOf(packageJson.specController, SPEC_CONTROLLER_BLOCK);

export function resolveNotChecks(packageJson: {
  specController?: { notChecks?: unknown };
}): readonly string[] {
  return configured(packageJson).nonChecks;
}

export function resolveDeferralTags(
  packageJson: {
    specController?: { deferralTags?: unknown };
  },
  starterTags: readonly string[]
): readonly string[] {
  return deferralTagsExtendedBy(starterTags, bareTerms(configured(packageJson).deferralTerms));
}

export type ResolvedRunners = RunnerLayers;

export function resolveRunners(packageJson: {
  specController?: { runners?: unknown };
}): ResolvedRunners {
  return configured(packageJson).runners;
}

export interface ConfigurationNotRead {
  readonly wrongKinds: readonly WrongKindEntry[];
  readonly unknownKeys: readonly string[];
}

export function configurationNotRead(packageJson: { specController?: unknown }): ConfigurationNotRead {
  const { wrongKinds, unknownKeys } = configured(packageJson);
  return { wrongKinds, unknownKeys };
}
