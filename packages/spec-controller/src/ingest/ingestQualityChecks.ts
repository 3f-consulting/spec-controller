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

function observedIn<T>(report: T | undefined, parse: (report: T) => EvidenceObservation[]): EvidenceObservation[] {
  return report === undefined ? [] : parse(report);
}

const OBSERVATION_READERS = {
  vitest: (path, root) =>
    observedIn(readJsonIfPresent<VitestJsonReport>(path), (report) => parseVitestEvidenceObservations(report, VITEST_QUALITY_CHECK, root)),
  pytest: (path) =>
    observedIn(readJunitXmlIfPresent(path, parseJunitXml), (report) => parsePytestEvidenceObservations(report, PYTEST_QUALITY_CHECK)),
  jest: (path, root) =>
    observedIn(readJsonIfPresent<VitestJsonReport>(path), (report) => parseVitestEvidenceObservations(report, JEST_QUALITY_CHECK, root)),
  junit: (path) =>
    observedIn(readJunitReportsIfPresent(path), (report) => parseJunitEvidenceObservations(report, JUNIT_QUALITY_CHECK)),
  rspec: (path, root) =>
    observedIn(readJsonIfPresent<RspecJsonReport>(path), (report) => parseRspecEvidenceObservations(report, RSPEC_QUALITY_CHECK, root)),
  cucumber: (path, root) =>
    observedIn(readJsonIfPresent<CucumberJsonReport>(path), (report) => parseCucumberEvidenceObservations(report, CUCUMBER_QUALITY_CHECK, root)),
} satisfies Readonly<Record<string, (path: string, root: string) => EvidenceObservation[]>>;

type ObservationReader = keyof typeof OBSERVATION_READERS;

export type EvidenceReader = ObservationReader | "package-manifest" | "ci-step-record";

export interface EvidenceReport {
  readonly reader: EvidenceReader;
  readonly path: string;
}

function isObservationReader(reader: EvidenceReader): reader is ObservationReader {
  return Object.hasOwn(OBSERVATION_READERS, reader);
}

function observationsOf(reports: readonly EvidenceReport[], root: string): EvidenceObservation[] {
  return reports.flatMap(({ reader, path }) => (isObservationReader(reader) ? OBSERVATION_READERS[reader](path, root) : []));
}

function pathReadBy(reports: readonly EvidenceReport[], reader: EvidenceReader): string | undefined {
  return reports.find((report) => report.reader === reader)?.path;
}

type TargetManifest = PackageJsonScripts & {
  specController?: {
    deferralTags?: unknown;
    runners?: unknown;
    notChecks?: unknown;
  };
};

export function runReconcile(
  reports: readonly EvidenceReport[],
  root: string,
  corpus: readonly ParsedFeatureFile[],
  workflows: readonly ParsedWorkflow[],
): EvidenceReconciliation {
  const packageJson = readJsonIfPresent<TargetManifest>(pathReadBy(reports, "package-manifest") ?? DEFAULT_PACKAGE_JSON) ?? {};

  return evidenceReconciliationFromSources({
    features: corpus,
    untaggedScenarios: corpus.flatMap((parsed) =>
      untaggedScenariosOf(parsed).map((scenario) => untaggedScenarioId({ feature: parsed.file, scenario }))
    ),
    packageJson,
    ciWorkflows: workflows,
    ciStepRecord: readJsonIfPresent<StepRecord>(pathReadBy(reports, "ci-step-record")),
    behaviouralObservations: observationsOf(reports, root),
    deferralTags: BUILT_IN_DEFERRAL_TAGS,
    reconcilerInvocation: RECONCILER_INVOCATION,
  });
}
