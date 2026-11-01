import { LAYERS } from "./ledger.js";
import type { ConfigurationKind, WrongKindEntry } from "./evidenceReconciliation.js";

export interface RunnerLayers {
  readonly layers: Readonly<Record<string, string | null>>;
  readonly unrecognisedKeys: readonly string[];
}

function isBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isLayer = (key: string): boolean => (LAYERS as readonly string[]).includes(key);

const isRunner = (value: unknown): value is string | null => typeof value === "string" || value === null;

function runnerLayersOf(value: unknown): RunnerLayers {
  if (!isBlock(value)) return { layers: {}, unrecognisedKeys: [] };
  const layers: Readonly<Record<string, string | null>> = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | null] => isLayer(entry[0]) && isRunner(entry[1]))
  );
  return {
    layers,
    unrecognisedKeys: Object.keys(value).filter((key) => !isLayer(key)),
  };
}

type ConfigurationEntry = "runners" | "nonChecks" | "deferralTags";

export interface ConfigurationTranslation {
  readonly place: string;
  readonly entries: Readonly<Record<string, ConfigurationEntry>>;
}

export interface TargetConfiguration {
  readonly runners: RunnerLayers;
  readonly nonChecks: readonly string[];
  readonly deferralTerms: readonly string[];
  readonly wrongKinds: readonly WrongKindEntry[];
  readonly unknownKeys: readonly string[];
}

const isListEntry = (value: unknown): value is string => typeof value === "string";

function kindOf(value: unknown): ConfigurationKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "list";
  return typeof value;
}

const wrongKind = (entry: string, value: unknown, reads: ConfigurationKind): WrongKindEntry => ({
  entry,
  is: kindOf(value),
  reads,
});

const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isListEntry) : []);

function wrongKindsInList(value: unknown, at: string): WrongKindEntry[] {
  if (!Array.isArray(value)) return [wrongKind(at, value, "list")];
  return value.flatMap((entry, i) => (isListEntry(entry) ? [] : [wrongKind(`${at}[${i}]`, entry, "string")]));
}

function wrongKindsInRunners(value: unknown, at: string): WrongKindEntry[] {
  if (!isBlock(value)) return [wrongKind(at, value, "object")];
  return Object.entries(value)
    .filter(([key, runner]) => isLayer(key) && !isRunner(runner))
    .map(([key, runner]) => wrongKind(`${at}.${key}`, runner, "string-or-null"));
}

const ENTRY_READS: Readonly<Record<ConfigurationEntry, (value: unknown, at: string) => WrongKindEntry[]>> = {
  runners: wrongKindsInRunners,
  nonChecks: wrongKindsInList,
  deferralTags: wrongKindsInList,
};

function configurationRead(
  values: Partial<Record<ConfigurationEntry, unknown>>,
  wrongKinds: readonly WrongKindEntry[],
  unknownKeys: readonly string[]
): TargetConfiguration {
  return {
    runners: runnerLayersOf(values.runners),
    nonChecks: [...new Set(listOf(values.nonChecks))],
    deferralTerms: listOf(values.deferralTags),
    wrongKinds,
    unknownKeys,
  };
}

export function targetConfigurationOf(block: unknown, { place, entries }: ConfigurationTranslation): TargetConfiguration {
  if (block === undefined) return configurationRead({}, [], []);
  if (!isBlock(block)) return configurationRead({}, [wrongKind(place, block, "object")], []);
  const read = Object.entries(block).flatMap(([key, value]): [string, ConfigurationEntry, unknown][] =>
    Object.hasOwn(entries, key) ? [[key, entries[key] as ConfigurationEntry, value]] : []
  );
  return configurationRead(
    Object.fromEntries(read.map(([, entry, value]) => [entry, value])),
    read.flatMap(([key, entry, value]) => ENTRY_READS[entry](value, `${place}.${key}`)),
    Object.keys(block).filter((key) => !Object.hasOwn(entries, key))
  );
}
