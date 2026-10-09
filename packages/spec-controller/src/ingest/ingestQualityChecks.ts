import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { discoverFeatures, type DiscoveredFeature } from "./ingestScenarios.js";
import {
  parseScenarios,
  countScnOccurrences,
  parseUntaggedScenarios,
  sharedScnCodesOf,
  untaggedScenarioId,
} from "@3f-consulting/spec-controller-core";
import {
  MissingFeatureCorpusError,
  UnreadableFeatureCorpusError,
  type GherkinParseError,
} from "./gherkinValidation.js";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";
import {
  evidenceObligations,
  type EvidenceObligations,
  type UntaggedScenario,
} from "@3f-consulting/spec-controller-core";
import {
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
} from "@3f-consulting/spec-controller-core";
import { evidenceReconciliationFromSources } from "@3f-consulting/spec-controller-core";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import type {
  RuntimeQualityCheck,
  EvidenceObservation,
  EvidenceReconciliation,
} from "@3f-consulting/spec-controller-core";

const VITEST_QUALITY_CHECK: RuntimeQualityCheck = "unit";
const CUCUMBER_QUALITY_CHECK: RuntimeQualityCheck = "integration";

const RECONCILER_INVOCATION = "spec-controller balance";

export interface ReconcileOptions {
  features?: string;
  vitest?: string;
  cucumber?: string;
  ci?: string;
  packageJson?: string;
  ciSteps?: string;
}

export const DEFAULT_CI_PATH = ".github/workflows";

export const DEFAULT_PACKAGE_JSON = "package.json";

function readJsonIfPresent<T>(path: string | undefined): T | undefined {
  if (!path || !existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
function balanceCorpus(featuresDir: string | undefined): DiscoveredFeature[] {
  try {
    return discoverFeatures(featuresDir);
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    throw err;
  }
}

function untaggedScenariosFromFeatures(featuresDir: string | undefined): string[] {
  return balanceCorpus(featuresDir).flatMap((f) =>
    parseUntaggedScenarios(readFileSync(f.path, "utf8")).map(
      (scenario) => untaggedScenarioId({ feature: `${f.slug}.feature`, scenario })
    )
  );
}

export function featureCorpusParseErrors(featuresDir: string | undefined): GherkinParseError[] {
  try {
    balanceCorpus(featuresDir);
    return [];
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) return [...err.errors];
    throw err;
  }
}

export interface InputReadFault {
  readonly path: string;
  readonly reason: string;
}

function readFaultOf(err: unknown, path: string): InputReadFault | null {
  const errno = err as NodeJS.ErrnoException;
  if (!(err instanceof Error) || typeof errno.code !== "string") return null;
  return { path: errno.path ?? path, reason: err.message };
}

export function corpusReadFault(featuresDir: string | undefined): InputReadFault | null {
  try {
    balanceCorpus(featuresDir);
    return null;
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) return null;
    const fault = readFaultOf(err, featuresDir ?? "features");
    if (fault === null) throw err;
    return fault;
  }
}

export function ciReadFault(ciPath: string | undefined): InputReadFault | null {
  const path = ciPath ?? DEFAULT_CI_PATH;
  try {
    for (const source of ciSourcePathsOf(path)) readCiSource(source);
    return null;
  } catch (err) {
    const fault = readFaultOf(err, path);
    if (fault === null) throw err;
    return fault;
  }
}

function readCiSource(source: string): void {
  try {
    readFileSync(source);
  } catch (err) {
    const errno = err as NodeJS.ErrnoException;
    errno.path ??= source;
    throw err;
  }
}

export function readFeatureNames(featuresDir?: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of balanceCorpus(featuresDir)) {
    if (f.featureCode !== null) map.set(f.featureCode, f.slug);
  }
  return map;
}

export function readEvidenceObligations(features?: string): EvidenceObligations {
  const featureFiles = balanceCorpus(features);
  let raw = 0;
  let scenarioCount = 0;
  const untagged: UntaggedScenario[] = [];
  const files: { feature: string; source: string }[] = [];
  for (const f of featureFiles) {
    const source = readFileSync(f.path, "utf8");
    files.push({ feature: `${f.slug}.feature`, source });
    raw += countScnOccurrences(source);
    scenarioCount += parseScenarios(source).length;
    for (const scenario of parseUntaggedScenarios(source)) {
      untagged.push({ feature: `${f.slug}.feature`, scenario });
    }
  }
  untagged.sort(
    (a, b) => a.feature.localeCompare(b.feature) || a.scenario.localeCompare(b.scenario)
  );
  return evidenceObligations(raw, scenarioCount, untagged, sharedScnCodesOf(files));
}

function parseRuntimeObservations(opts: ReconcileOptions, root: string | undefined): EvidenceObservation[] {
  const out: EvidenceObservation[] = [];
  const vitestReport = readJsonIfPresent<VitestJsonReport>(opts.vitest);
  if (vitestReport) out.push(...parseVitestEvidenceObservations(vitestReport, VITEST_QUALITY_CHECK, root));
  const cucumberReport = readJsonIfPresent<CucumberJsonReport>(opts.cucumber);
  if (cucumberReport) out.push(...parseCucumberEvidenceObservations(cucumberReport, CUCUMBER_QUALITY_CHECK, root));
  return out;
}

type TargetManifest = PackageJsonScripts & {
  specController?: {
    deferralTags?: unknown;
    runners?: unknown;
    notChecks?: unknown;
  };
};

export function runReconcile(opts: ReconcileOptions): EvidenceReconciliation {
  const pkgPath = opts.packageJson ?? DEFAULT_PACKAGE_JSON;
  const packageJson = readJsonIfPresent<TargetManifest>(pkgPath) ?? {};
  const root = resolveTargetRoot({ features: opts.features });
  const ciPath = opts.ci ?? DEFAULT_CI_PATH;
  const ciPaths = ciSourcePathsOf(ciPath);

  const corpusFiles = balanceCorpus(opts.features).map((f) => ({
    slug: f.slug,
    featureCode: f.featureCode,
    source: readFileSync(f.path, "utf8"),
  }));

  return evidenceReconciliationFromSources({
    featureSources: corpusFiles.map((f) => f.source),
    featureFiles: corpusFiles.map(({ slug, featureCode }) => ({ slug, featureCode })),
    untaggedScenarios: untaggedScenariosFromFeatures(opts.features),
    packageJson,
    ciSources: ciPaths.map((path) => readFileSync(path, "utf8")),
    ciSourceNames: ciPaths.map((path) => basename(path)),
    ciStepRecord: readJsonIfPresent<Record<string, { outcome?: string; conclusion?: string }>>(
      opts.ciSteps
    ),
    runtimeObservations: parseRuntimeObservations(opts, root),
    deferralTags: DEFAULT_DEFERRAL_TAGS,
    reconcilerInvocation: RECONCILER_INVOCATION,
  });
}

