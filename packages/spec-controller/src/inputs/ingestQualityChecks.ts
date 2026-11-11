import { basename } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { readingOf, readUtf8, type ReadFault } from "./inputReading.js";
import { corpusPathOf, MissingFeatureCorpusError, readFeatureSources, type FeatureFileSource } from "./ingestScenarios.js";
import {
  claimCodesAtOf,
  commandRuns,
  evidenceReconciliationOf,
  parseFeatureCorpus,
  parseWorkflows,
  pipelineStepsOf,
  recordedCheckStepsOf,
  shellReading,
  targetConfigurationFrom,
  type ParsedFeatureFile,
  type ClaimCodesAt,
  type ParsedWorkflow,
  type Provenance,
  type Source,
  type SourceFault,
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
  return { file: basename(path), source: read(path) };
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

type TargetManifest = PackageJsonScripts & { readonly specController?: unknown };

export function runReconcile(
  reports: readonly EvidenceReport[],
  root: string,
  corpus: readonly ParsedFeatureFile[],
  workflows: readonly ParsedWorkflow[],
  run: { readonly strict: boolean; readonly provenance: Provenance },
): EvidenceReconciliation {
  const packageJson = (documentReadBy(reports, "package-manifest") as TargetManifest | undefined) ?? {};
  const scripts = packageJson.scripts ?? {};
  const steps = pipelineStepsOf(workflows);
  const recordedSteps = recordedCheckStepsOf(documentReadBy(reports, "ci-step-record") as StepRecord | undefined);
  return evidenceReconciliationOf({
    features: corpus,
    testObservations: observationsOf(reports, root, claimCodesAtOf(corpus)),
    steps,
    readings: { runsTheReconciler: (command) => commandRuns(command, RECONCILER_INVOCATION, scripts), scripts, shell: shellReading },
    ...(recordedSteps === undefined ? {} : { recordedSteps }),
    configuration: targetConfigurationFrom(packageJson, steps),
    ...run,
  });
}
