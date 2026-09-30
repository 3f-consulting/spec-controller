import { bareTerm } from "../lib/bareTerm.js";
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";
import type { WrongKindEntry } from "../domain/evidenceReconciliation.js";

function isBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isTier = (key: string): boolean => (RUNTIME_QUALITY_CHECKS as readonly string[]).includes(key);

const isRunner = (value: unknown): value is string | null => typeof value === "string" || value === null;

const isListEntry = (value: unknown): value is string => typeof value === "string";

export function resolveNotChecks(packageJson: {
  specController?: { notChecks?: unknown };
}): readonly string[] {
  const configured = packageJson.specController?.notChecks;
  if (!Array.isArray(configured)) return [];
  return [...new Set(configured.filter(isListEntry))];
}

export function resolveDeferralTags(
  packageJson: {
    specController?: { deferralTags?: unknown };
  },
  starterTags: readonly string[]
): readonly string[] {
  const configured = packageJson.specController?.deferralTags;
  const extras = Array.isArray(configured)
    ? configured
        .filter(isListEntry)
        .map(bareTerm)
        .filter((tag) => tag !== "")
    : [];
  return [...new Set([...starterTags, ...extras])];
}

export interface ResolvedRunners {
  readonly tiers: Readonly<Record<string, string | null>>;
  readonly unrecognisedKeys: readonly string[];
}

export function resolveRunners(packageJson: {
  specController?: { runners?: unknown };
}): ResolvedRunners {
  const configured = packageJson.specController?.runners;
  if (!isBlock(configured)) return { tiers: {}, unrecognisedKeys: [] };
  return {
    tiers: Object.fromEntries(
      Object.entries(configured).filter(
        (entry): entry is [string, string | null] => isTier(entry[0]) && isRunner(entry[1])
      )
    ),
    unrecognisedKeys: Object.keys(configured).filter((key) => !isTier(key)),
  };
}

export interface ConfigurationNotRead {
  readonly wrongKinds: readonly WrongKindEntry[];
  readonly unknownKeys: readonly string[];
}

function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "object") return "an object";
  return `a ${typeof value}`;
}

const wrongKind = (entry: string, value: unknown, reads: string): WrongKindEntry => ({
  entry,
  is: kindOf(value),
  reads,
});

function wrongKindsInList(value: unknown, at: string): WrongKindEntry[] {
  if (!Array.isArray(value)) return [wrongKind(at, value, "a list")];
  return value.flatMap((entry, i) => (isListEntry(entry) ? [] : [wrongKind(`${at}[${i}]`, entry, "a string")]));
}

function wrongKindsInRunners(value: unknown, at: string): WrongKindEntry[] {
  if (!isBlock(value)) return [wrongKind(at, value, "an object")];
  return Object.entries(value)
    .filter(([key, runner]) => isTier(key) && !isRunner(runner))
    .map(([key, runner]) => wrongKind(`${at}.${key}`, runner, "a string or null"));
}

const BLOCK_READS: Readonly<Record<string, (value: unknown, at: string) => WrongKindEntry[]>> = {
  runners: wrongKindsInRunners,
  notChecks: wrongKindsInList,
  deferralTags: wrongKindsInList,
};

export function configurationNotRead(packageJson: { specController?: unknown }): ConfigurationNotRead {
  const block = packageJson.specController;
  if (block === undefined) return { wrongKinds: [], unknownKeys: [] };
  if (!isBlock(block)) return { wrongKinds: [wrongKind("specController", block, "an object")], unknownKeys: [] };
  return {
    unknownKeys: Object.keys(block).filter((key) => !Object.hasOwn(BLOCK_READS, key)),
    wrongKinds: Object.entries(block).flatMap(([key, value]) =>
      Object.hasOwn(BLOCK_READS, key) ? (BLOCK_READS[key] as (v: unknown, at: string) => WrongKindEntry[])(value, `specController.${key}`) : []
    ),
  };
}
