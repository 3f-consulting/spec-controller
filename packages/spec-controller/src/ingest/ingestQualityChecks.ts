import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { junitReportPathsOf } from "./junitReportPaths.js";
import { parseJunitXml, parseJunitXmlLiftingBareSuite } from "./junitXml.js";
import { corpusPathOf, MissingFeatureCorpusError, readFeatureSources, slugOf, type FeatureFileSource } from "./ingestScenarios.js";
import {
  featureCountsOf,
  parseFeatureCorpus,
  untaggedScenariosOf,
  parseWorkflows,
  untaggedScenarioId,
  type ParsedFeatureFile,
  type ParsedWorkflow,
  type Source,
  type SourceFault,
} from "@3f-consulting/spec-controller-core";
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

function sourcesOf(featuresDir: string): FeatureFileSource[] {
  try {
    return readFeatureSources(featuresDir);
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    throw err;
  }
}

type ParsedCorpus =
  | { readonly kind: "unparseable"; readonly faults: readonly SourceFault[] }
  | { readonly kind: "read"; readonly corpus: readonly ParsedFeatureFile[] };

export type CorpusReading = ParsedCorpus | { readonly kind: "read-fault"; readonly fault: InputReadFault };

function parsedCorpusOf(featuresDir: string, files: readonly FeatureFileSource[]): ParsedCorpus {
  const parse = parseFeatureCorpus(files.map(({ relativePath, source }) => ({ file: relativePath, source })));
  if (parse.kind === "parsed") return { kind: "read", corpus: parse.parsed };
  return {
    kind: "unparseable",
    faults: parse.faults.map(({ file, message }) => ({ file: corpusPathOf(featuresDir, file), message })),
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
  return parsedCorpusOf(featuresDir, files);
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

export type WorkflowReading =
  | { readonly kind: "read-fault"; readonly fault: InputReadFault }
  | { readonly kind: "unparseable"; readonly faults: readonly SourceFault[] }
  | { readonly kind: "read"; readonly workflows: readonly ParsedWorkflow[] };

function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function readWorkflowSource(path: string, read: (path: string) => string): Source {
  try {
    return { file: basename(path), source: read(path) };
  } catch (err) {
    const errno = err as NodeJS.ErrnoException;
    errno.path ??= path;
    throw err;
  }
}

export function readWorkflows(ciPath: string | undefined, read: (path: string) => string = readUtf8): WorkflowReading {
  const path = ciPath ?? DEFAULT_CI_PATH;
  let paths: string[];
  let sources: Source[];
  try {
    paths = ciSourcePathsOf(path);
    sources = paths.map((source) => readWorkflowSource(source, read));
  } catch (err) {
    const fault = readFaultOf(err, path);
    if (fault === null) throw err;
    return { kind: "read-fault", fault };
  }
  const parse = parseWorkflows(sources);
  if (parse.kind === "parsed") return { kind: "read", workflows: parse.parsed };
  const pathOf = new Map(paths.map((read) => [basename(read), read]));
  return { kind: "unparseable", faults: parse.faults.map(({ file, message }) => ({ file: pathOf.get(file) ?? file, message })) };
}

export function featureNamesOf(corpus: readonly ParsedFeatureFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const { featureCode, file } of corpus) {
    if (featureCode !== null) map.set(featureCode, slugOf(file));
  }
  return map;
}

export function evidenceObligationsOf(corpus: readonly ParsedFeatureFile[]): EvidenceObligations {
  return corpusCountsOf(corpus.map((parsed) => ({ feature: parsed.file, ...featureCountsOf(parsed) })));
}

function parseBehaviouralObservations(opts: EvidenceReportOptions, root: string | undefined): EvidenceObservation[] {
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

export type EvidenceReportOptions = Omit<ReconcileOptions, "features" | "ci">;

export function runReconcile(
  opts: EvidenceReportOptions,
  root: string,
  corpus: readonly ParsedFeatureFile[],
  workflows: readonly ParsedWorkflow[],
): EvidenceReconciliation {
  const pkgPath = opts.packageJson ?? DEFAULT_PACKAGE_JSON;
  const packageJson = readJsonIfPresent<TargetManifest>(pkgPath) ?? {};

  return evidenceReconciliationFromSources({
    features: corpus,
    untaggedScenarios: corpus.flatMap((parsed) =>
      untaggedScenariosOf(parsed).map((scenario) => untaggedScenarioId({ feature: parsed.file, scenario }))
    ),
    packageJson,
    ciWorkflows: workflows,
    ciStepRecord: readJsonIfPresent<StepRecord>(opts.ciSteps),
    behaviouralObservations: parseBehaviouralObservations(opts, root),
    deferralTags: BUILT_IN_DEFERRAL_TAGS,
    reconcilerInvocation: RECONCILER_INVOCATION,
  });
}

