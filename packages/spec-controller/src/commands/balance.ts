import {
  configurationSettingsFrom,
  EVIDENCE_REPORT_FORMATS,
  reconcile,
  repositoryOfOrigin,
  scriptsFrom,
  shellAnswers,
  targetFolderOf,
  type ProvenanceInput,
  type ReportGiven,
} from "@3f-consulting/spec-controller-core";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { inputsReadFor, type InputsRead } from "../inputs/inputsRead.js";
import type { StandardStreams } from "../output/streams.js";
import type { Complain } from "../runEnding/crashGuards.js";
import { exitCodeOf } from "../runEnding/exitCode.js";
import { refusedWith } from "../runEnding/refusal.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { runIdentityIn } from "../runIdentity/runIdentity.js";
import { writeReports } from "../output/writer.js";
import { INPUT_KINDS, type InputRequest, type RunRequest } from "../runRequest/runRequest.js";

// A run has no step and no step record of an input it did not read.
const NONE: readonly never[] = [];

// Every input the run could read, once for each path it read, its links followed, or once with no path when it read none.
const provenanceInputsOf = ({ pathsRead }: InputsRead, folder: string): ProvenanceInput[] =>
  INPUT_KINDS.flatMap((kind): ProvenanceInput[] => {
    const paths = pathsRead[kind] ?? NONE;
    return paths.length === 0 ? [{ name: kind, path: undefined }] : paths.map((path) => ({ name: kind, path: realpathSync(resolve(folder, path)) }));
  });

// A corpus the command line named is where the target is; with none named, it is where the run started.
const corpusNamed = (inputs: readonly InputRequest[], folder: string): string | undefined => {
  const corpus = inputs.find((input) => input.kind === "features" && !input.byDefault);
  return corpus === undefined ? undefined : resolve(folder, corpus.path);
};

// Every evidence report the run read, as the domain takes it: by format, in the formats' order, then in the order read.
const reportsGivenOf = ({ reports = NONE }: InputsRead): ReportGiven[] =>
  EVIDENCE_REPORT_FORMATS.flatMap(({ kind }) => reports.filter(({ format }) => format.kind === kind)).map(({ report, results, format }) => ({
    report,
    results,
    defaultLayer: format.defaultLayer,
    needsFeatures: format.needsFeatures === true,
  }));

export function balance(
  { inputs, outputs, target, sourceSha, strict, exitZero }: Extract<RunRequest, { command: "balance" }>,
  folder: string,
  streams: StandardStreams,
  complain: Complain,
): ExitCode {
  const corpus = corpusNamed(inputs, folder);
  // Read first, so the run's time is when it started.
  const identity = runIdentityIn(corpus ?? folder, { target, sourceSha });
  const read = inputsReadFor(inputs, folder);
  if ("refusals" in read) return refusedWith(read.refusals, streams.error.write);
  // git gives its top level with every link followed, so the folders and paths it is compared with follow theirs too.
  const targetFolder = realpathSync(targetFolderOf({ workingFolder: folder, corpus: corpus && realpathSync(corpus), gitTopLevel: identity.gitTopLevel }));
  const reconciliation = reconcile({
    features: read.features,
    reports: reportsGivenOf(read),
    steps: read.workflowSteps ?? NONE,
    stepRecord: read.stepRecord ?? NONE,
    settings: configurationSettingsFrom(read.manifest),
    scripts: scriptsFrom(read.manifest),
    shell: shellAnswers,
    repositoryOf: repositoryOfOrigin,
    identity,
    provenanceInputs: provenanceInputsOf(read, folder),
    targetFolder,
    strict,
  });
  try {
    return writeReports(outputs, read.filesRead, reconciliation, streams, { exitZero });
  } catch (error) {
    // The run has its verdict, so an error in writing it out leaves the verdict's exit code alone.
    complain(error);
    return exitCodeOf(reconciliation.runVerdict, { exitZero });
  }
}
