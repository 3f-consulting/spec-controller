import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { junitReportPathsOf } from "./junitReportPaths.js";
import { parseJunitXml, parseJunitXmlLiftingBareSuite } from "./junitXml.js";
import { MissingFeatureCorpusError, readFeatureSources, type FeatureFileSource } from "./ingestScenarios.js";
import {
  featureCountsOf,
  parseFeatureCorpus,
  parseWorkflows,
  untaggedScenarioId,
  type FeatureSourceFault,
  type ParsedFeatureFile,
  type ParsedWorkflow,
  type WorkflowSource,
  type WorkflowSourceFault,
} from "@3f-consulting/spec-controller-core";
import {
  BUILT_IN_DEFERRAL_TAGS,
  corpusCountsOf,
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

function sourcesOf(featuresDir: string): FeatureFileSource[] {
  try {
    return readFeatureSources(featuresDir);
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    throw err;
  }
}

type ParsedFeature = Parameters<typeof corpusCountsOf>[0][number];

export interface CorpusFile extends ParsedFeature {
  readonly slug: string;
  readonly featureCode: string | null;
  readonly parsed: ParsedFeatureFile;
}

type ParsedCorpus =
  | { readonly kind: "unparseable"; readonly faults: readonly FeatureSourceFault[] }
  | { readonly kind: "read"; readonly corpus: readonly CorpusFile[] };

export type CorpusReading = ParsedCorpus | { readonly kind: "read-fault"; readonly fault: InputReadFault };

function parsedCorpusOf(files: readonly FeatureFileSource[]): ParsedCorpus {
  const parse = parseFeatureCorpus(files.map(({ path, source }) => ({ file: path, source })));
  if (parse.kind === "unparseable") return parse;
  return {
    kind: "read",
    corpus: files.map(({ slug }, i) => {
      const parsed = parse.features[i]!;
      return { slug, featureCode: parsed.featureCode, parsed, feature: `${slug}.feature`, ...featureCountsOf(parsed) };
    }),
  };
}

export function readCorpus(featuresDir: string): CorpusReading {
  let files: FeatureFileSource[];
  try {
    files = sourcesOf(featuresDir);
  } catch (err) {
    const fault = readFaultOf(err, featuresDir);
    if (fault === null) throw err;
    return { kind: "read-fault", fault };
  }
  return parsedCorpusOf(files);
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

export interface ReadWorkflows {
  readonly names: readonly string[];
  readonly workflows: readonly ParsedWorkflow[];
}

export type WorkflowReading =
  | { readonly kind: "read-fault"; readonly fault: InputReadFault }
  | { readonly kind: "unparseable"; readonly faults: readonly WorkflowSourceFault[] }
  | { readonly kind: "read"; readonly workflows: ReadWorkflows };

function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function readWorkflowSource(path: string, read: (path: string) => string): WorkflowSource {
  try {
    return { file: path, source: read(path) };
  } catch (err) {
    const errno = err as NodeJS.ErrnoException;
    errno.path ??= path;
    throw err;
  }
}

export function readWorkflows(ciPath: string | undefined, read: (path: string) => string = readUtf8): WorkflowReading {
  const path = ciPath ?? DEFAULT_CI_PATH;
  let sources: WorkflowSource[];
  try {
    sources = ciSourcePathsOf(path).map((source) => readWorkflowSource(source, read));
  } catch (err) {
    const fault = readFaultOf(err, path);
    if (fault === null) throw err;
    return { kind: "read-fault", fault };
  }
  const parse = parseWorkflows(sources);
  if (parse.kind === "unparseable") return parse;
  return { kind: "read", workflows: { names: sources.map(({ file }) => basename(file)), workflows: parse.workflows } };
}

export function featureNamesOf(corpus: readonly CorpusFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of corpus) {
    if (f.featureCode !== null) map.set(f.featureCode, f.slug);
  }
  return map;
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
  corpus: readonly CorpusFile[],
  workflows: ReadWorkflows,
): EvidenceReconciliation {
  const pkgPath = opts.packageJson ?? DEFAULT_PACKAGE_JSON;
  const packageJson = readJsonIfPresent<TargetManifest>(pkgPath) ?? {};

  return evidenceReconciliationFromSources({
    features: corpus.map((f) => f.parsed),
    featureFiles: corpus.map(({ slug, featureCode }) => ({ slug, featureCode })),
    untaggedScenarios: corpus.flatMap(({ feature, untaggedScenarios }) =>
      untaggedScenarios.map((scenario) => untaggedScenarioId({ feature, scenario }))
    ),
    packageJson,
    ciWorkflows: workflows.workflows,
    ciSourceNames: workflows.names,
    ciStepRecord: readJsonIfPresent<StepRecord>(opts.ciSteps),
    behaviouralObservations: parseBehaviouralObservations(opts, root),
    deferralTags: BUILT_IN_DEFERRAL_TAGS,
    reconcilerInvocation: RECONCILER_INVOCATION,
  });
}

