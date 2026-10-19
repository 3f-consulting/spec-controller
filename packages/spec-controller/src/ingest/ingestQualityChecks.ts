import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { junitReportPathsOf } from "./junitReportPaths.js";
import { parseJunitXml, parseJunitXmlLiftingBareSuite } from "./junitXml.js";
import { discoverFeatures, type DiscoveredFeature } from "./ingestScenarios.js";
import {
  parseFeatureCounts,
  untaggedScenarioId,
} from "@3f-consulting/spec-controller-core";
import {
  MissingFeatureCorpusError,
  UnreadableFeatureCorpusError,
  type GherkinParseError,
} from "./gherkinValidation.js";
import {
  BUILT_IN_DEFERRAL_TAGS,
  corpusCountsOf,
  type EvidenceObligations,
} from "@3f-consulting/spec-controller-core";
import {
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseJunitEvidenceObservations,
  parsePytestEvidenceObservations,
  type JunitXmlReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseRspecEvidenceObservations,
  type RspecJsonReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
} from "@3f-consulting/spec-controller-core";
import { evidenceReconciliationFromSources } from "@3f-consulting/spec-controller-core";
import type { PackageJsonScripts, StepRecord } from "@3f-consulting/spec-controller-core";
import type {
  BehaviouralQualityCheck,
  EvidenceObservation,
  EvidenceReconciliation,
} from "@3f-consulting/spec-controller-core";

const VITEST_QUALITY_CHECK: BehaviouralQualityCheck = "unit";
const PYTEST_QUALITY_CHECK: BehaviouralQualityCheck = "unit";
const JEST_QUALITY_CHECK: BehaviouralQualityCheck = "unit";
const JUNIT_QUALITY_CHECK: BehaviouralQualityCheck = "unit";
const RSPEC_QUALITY_CHECK: BehaviouralQualityCheck = "unit";
const CUCUMBER_QUALITY_CHECK: BehaviouralQualityCheck = "integration";

const RECONCILER_INVOCATION = "spec-controller balance";

export interface ReconcileOptions {
  features?: string;
  vitest?: string;
  pytest?: string;
  jest?: string;
  junit?: string;
  rspec?: string;
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

function readJunitXmlIfPresent(
  path: string | undefined,
  parse: (text: string) => JunitXmlReport,
): JunitXmlReport | undefined {
  if (!path || !existsSync(path)) return undefined;
  return parse(readFileSync(path, "utf8"));
}

function readJunitReportsIfPresent(path: string | undefined): JunitXmlReport | undefined {
  if (!path) return undefined;
  const reports = junitReportPathsOf(path).map((report) => parseJunitXmlLiftingBareSuite(readFileSync(report, "utf8")));
  return { testsuites: { testsuite: reports.flatMap((report) => report.testsuites?.testsuite ?? []) } };
}

function balanceCorpus(featuresDir: string): DiscoveredFeature[] {
  try {
    return discoverFeatures(featuresDir);
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    throw err;
  }
}

type ParsedFeature = Parameters<typeof corpusCountsOf>[0][number];

export interface CorpusFile extends ParsedFeature {
  readonly slug: string;
  readonly featureCode: string | null;
  readonly source: string;
}

export function readFeatureCorpus(featuresDir: string): CorpusFile[] {
  return balanceCorpus(featuresDir).map(({ slug, featureCode, source }) => ({
    slug,
    featureCode,
    source,
    feature: `${slug}.feature`,
    ...parseFeatureCounts(source),
  }));
}

export function featureCorpusParseErrors(featuresDir: string): GherkinParseError[] {
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

export function corpusReadFault(featuresDir: string): InputReadFault | null {
  try {
    balanceCorpus(featuresDir);
    return null;
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) return null;
    const fault = readFaultOf(err, featuresDir);
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

export function readFeatureNames(featuresDir: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of balanceCorpus(featuresDir)) {
    if (f.featureCode !== null) map.set(f.featureCode, f.slug);
  }
  return map;
}

export function readEvidenceObligations(features: string): EvidenceObligations {
  return corpusCountsOf(readFeatureCorpus(features));
}

function parseBehaviouralObservations(opts: ReconcileOptions, root: string | undefined): EvidenceObservation[] {
  const out: EvidenceObservation[] = [];
  const vitestReport = readJsonIfPresent<VitestJsonReport>(opts.vitest);
  if (vitestReport) out.push(...parseVitestEvidenceObservations(vitestReport, VITEST_QUALITY_CHECK, root));
  const pytestReport = readJunitXmlIfPresent(opts.pytest, parseJunitXml);
  if (pytestReport) out.push(...parsePytestEvidenceObservations(pytestReport, PYTEST_QUALITY_CHECK));
  const jestReport = readJsonIfPresent<VitestJsonReport>(opts.jest);
  if (jestReport) out.push(...parseVitestEvidenceObservations(jestReport, JEST_QUALITY_CHECK, root));
  const junitReport = readJunitReportsIfPresent(opts.junit);
  if (junitReport) out.push(...parseJunitEvidenceObservations(junitReport, JUNIT_QUALITY_CHECK));
  const rspecReport = readJsonIfPresent<RspecJsonReport>(opts.rspec);
  if (rspecReport) out.push(...parseRspecEvidenceObservations(rspecReport, RSPEC_QUALITY_CHECK, root));
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

export function runReconcile(
  opts: ReconcileOptions & { features: string },
  root: string,
  corpus?: readonly CorpusFile[],
): EvidenceReconciliation {
  const pkgPath = opts.packageJson ?? DEFAULT_PACKAGE_JSON;
  const packageJson = readJsonIfPresent<TargetManifest>(pkgPath) ?? {};
  const ciPath = opts.ci ?? DEFAULT_CI_PATH;
  const ciPaths = ciSourcePathsOf(ciPath);

  const corpusFiles = corpus ?? readFeatureCorpus(opts.features);

  return evidenceReconciliationFromSources({
    featureSources: corpusFiles.map((f) => f.source),
    featureFiles: corpusFiles.map(({ slug, featureCode }) => ({ slug, featureCode })),
    untaggedScenarios: corpusFiles.flatMap(({ feature, untaggedScenarios }) =>
      untaggedScenarios.map((scenario) => untaggedScenarioId({ feature, scenario }))
    ),
    packageJson,
    ciSources: ciPaths.map((path) => readFileSync(path, "utf8")),
    ciSourceNames: ciPaths.map((path) => basename(path)),
    ciStepRecord: readJsonIfPresent<StepRecord>(opts.ciSteps),
    behaviouralObservations: parseBehaviouralObservations(opts, root),
    deferralTags: BUILT_IN_DEFERRAL_TAGS,
    reconcilerInvocation: RECONCILER_INVOCATION,
  });
}

