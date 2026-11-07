import { basename } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { readingOf, readUtf8, type ReadFault } from "./inputReading.js";
import { corpusPathOf, MissingFeatureCorpusError, readFeatureSources, slugOf, type FeatureFileSource } from "./ingestScenarios.js";
import {
  claimCodesAtOf,
  parseFeatureCorpus,
  parseWorkflows,
  type ParsedFeatureFile,
  type ClaimCodesAt,
  type ParsedWorkflow,
  type Source,
  type SourceFault,
} from "@3f-consulting/spec-controller-core";
import { BUILT_IN_DEFERRAL_TAGS } from "@3f-consulting/spec-controller-core";
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
  EvidenceObservation,
  EvidenceReconciliation,
} from "@3f-consulting/spec-controller-core";

const RECONCILER_INVOCATION = "spec-controller balance";

export const DEFAULT_CI_PATH = ".github/workflows";

export const DEFAULT_PACKAGE_JSON = "package.json";

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

export type CorpusReading = ParsedCorpus | ReadFault;

function parsedCorpusOf(featuresDir: string, files: readonly FeatureFileSource[]): ParsedCorpus {
  const parse = parseFeatureCorpus(files.map(({ relativePath, source }) => ({ file: relativePath, source })));
  if (parse.kind === "parsed") return { kind: "read", corpus: parse.parsed };
  return {
    kind: "unparseable",
    faults: parse.faults.map(({ file, message }) => ({ file: corpusPathOf(featuresDir, file), message })),
  };
}

export function readCorpus(featuresDir: string): CorpusReading {
  return readingOf(featuresDir, () => sourcesOf(featuresDir), (files) => parsedCorpusOf(featuresDir, files));
}

type ParsedWorkflows =
  | { readonly kind: "unparseable"; readonly faults: readonly SourceFault[] }
  | { readonly kind: "read"; readonly workflows: readonly ParsedWorkflow[] };

export type WorkflowReading = ParsedWorkflows | ReadFault;

interface WorkflowSources {
  readonly paths: readonly string[];
  readonly sources: readonly Source[];
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

function workflowSourcesOf(path: string, read: (path: string) => string): WorkflowSources {
  const paths = ciSourcePathsOf(path);
  return { paths, sources: paths.map((source) => readWorkflowSource(source, read)) };
}

function parsedWorkflowsOf({ paths, sources }: WorkflowSources): ParsedWorkflows {
  const parse = parseWorkflows(sources);
  if (parse.kind === "parsed") return { kind: "read", workflows: parse.parsed };
  const pathOf = new Map(paths.map((read) => [basename(read), read]));
  return { kind: "unparseable", faults: parse.faults.map(({ file, message }) => ({ file: pathOf.get(file) ?? file, message })) };
}

export function readWorkflows(ciPath: string | undefined, read: (path: string) => string = readUtf8): WorkflowReading {
  const path = ciPath ?? DEFAULT_CI_PATH;
  return readingOf(path, () => workflowSourcesOf(path, read), parsedWorkflowsOf);
}

export function featureNamesOf(corpus: readonly ParsedFeatureFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const { featureCode, file } of corpus) {
    if (featureCode !== null) map.set(featureCode, slugOf(file));
  }
  return map;
}

const OBSERVATION_READERS = {
  vitest: (report, root) => parseVitestEvidenceObservations(report as VitestJsonReport, root),
  pytest: (report) => parsePytestEvidenceObservations(report as JunitXmlReport),
  jest: (report, root) => parseVitestEvidenceObservations(report as VitestJsonReport, root),
  junit: (report) => parseJunitEvidenceObservations(report as JunitXmlReport),
  rspec: (report, root) => parseRspecEvidenceObservations(report as RspecJsonReport, root),
  cucumber: (report, root, claimCodesAt) => parseCucumberEvidenceObservations(report as CucumberJsonReport, root, claimCodesAt),
} satisfies Readonly<Record<string, (report: unknown, root: string, claimCodesAt: ClaimCodesAt) => EvidenceObservation[]>>;

type ObservationReader = keyof typeof OBSERVATION_READERS;

export type EvidenceReader = ObservationReader | "package-manifest" | "ci-step-record";

export interface EvidenceReport {
  readonly reader: EvidenceReader;
  readonly document: unknown;
}

function isObservationReader(reader: EvidenceReader): reader is ObservationReader {
  return Object.hasOwn(OBSERVATION_READERS, reader);
}

function observationsOf(reports: readonly EvidenceReport[], root: string, claimCodesAt: ClaimCodesAt): EvidenceObservation[] {
  return reports.flatMap(({ reader, document }) => (isObservationReader(reader) ? OBSERVATION_READERS[reader](document, root, claimCodesAt) : []));
}

function documentReadBy(reports: readonly EvidenceReport[], reader: EvidenceReader): unknown {
  return reports.find((report) => report.reader === reader)?.document;
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
  const packageJson = (documentReadBy(reports, "package-manifest") as TargetManifest | undefined) ?? {};

  return evidenceReconciliationFromSources({
    features: corpus,
    packageJson,
    ciWorkflows: workflows,
    ciStepRecord: documentReadBy(reports, "ci-step-record") as StepRecord | undefined,
    behaviouralObservations: observationsOf(reports, root, claimCodesAtOf(corpus)),
    deferralTags: BUILT_IN_DEFERRAL_TAGS,
    reconcilerInvocation: RECONCILER_INVOCATION,
  });
}
