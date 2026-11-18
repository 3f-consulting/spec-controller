import {
  claimCodeErrorsOf,
  claimReconciliationsOf,
  disposedStepsOf,
  evidenceReconciliationOf,
  executableClaimsOf,
  fitnessObservationsOf,
  layersServing,
  observationsOfTestResults,
  provenanceOf,
  repositoryOfOrigin,
  shellAnswers,
  stepAccountOf,
  targetFolderOf,
  scriptsFrom,
  targetConfigurationFrom,
  type CreditJournal,
  type DebitJournal,
  type ProvenanceInput,
  type DisposedStep,
  type TargetConfiguration,
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

// Every evidence report the run read, of each kind.
const reportsOf = (read: InputsRead) => ({
  vitest: read.vitest ?? NONE,
  jest: read.jest ?? NONE,
  pytest: read.pytest ?? NONE,
  junit: read.junit ?? NONE,
  rspec: read.rspec ?? NONE,
  cucumber: read.cucumber ?? NONE,
});

// The file name of every evidence report the run read, a JUnit folder's files one by one.
const reportsReadIn = (read: InputsRead): string[] => Object.values(reportsOf(read)).flatMap((reports) => reports.map(({ report }) => report));

// The credit journal: each runner's results as Evidence Observations, beside the fitness functions' from the CI steps.
function creditJournalOf(read: InputsRead, disposedSteps: readonly DisposedStep[], configuration: TargetConfiguration, targetFolder: string): CreditJournal {
  const { vitest, jest, pytest, junit, rspec, cucumber } = reportsOf(read);
  // The layers a report serves, by its file name.
  const servedBy = ({ report }: { readonly report: string }): ReturnType<typeof layersServing> => layersServing(report, configuration.runners);
  return [
    ...vitest.flatMap((each) => observationsOfTestResults(each.results, targetFolder, servedBy(each))),
    ...jest.flatMap((each) => observationsOfTestResults(each.results, targetFolder, servedBy(each))),
    ...pytest.flatMap((each) => observationsOfTestResults(each.results, targetFolder, servedBy(each))),
    ...junit.flatMap((each) => observationsOfTestResults(each.results, targetFolder, servedBy(each))),
    ...rspec.flatMap((each) => observationsOfTestResults(each.results, targetFolder, servedBy(each))),
    ...cucumber.flatMap((each) => observationsOfTestResults(each.results, targetFolder, servedBy(each), read.features)),
    ...fitnessObservationsOf(disposedSteps, read.stepRecord ?? NONE),
  ];
}

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
  const steps = read.workflowSteps ?? NONE;
  const { configuration, errors } = targetConfigurationFrom(read.manifest, steps, reportsReadIn(read));
  // Each workflow step the run read, with what it is: posting and the step account both take it.
  const disposedSteps = disposedStepsOf(steps, configuration, scriptsFrom(read.manifest), shellAnswers, read.stepRecord ?? NONE);
  // git gives its top level with every link followed, so the folders and paths it is compared with follow theirs too.
  const targetFolder = realpathSync(targetFolderOf({ workingFolder: folder, corpus: corpus && realpathSync(corpus), gitTopLevel: identity.gitTopLevel }));
  const debitJournal: DebitJournal = executableClaimsOf(read.features, { deferralTags: configuration.deferralTags, strict });
  const claimReconciliations = claimReconciliationsOf(debitJournal, creditJournalOf(read, disposedSteps, configuration, targetFolder));
  const provenance = provenanceOf(identity, provenanceInputsOf(read, folder), targetFolder, repositoryOfOrigin);
  const reconciliation = evidenceReconciliationOf({
    claimReconciliations,
    claimCodeErrors: claimCodeErrorsOf(read.features),
    configurationErrors: errors,
    features: read.features,
    stepAccount: stepAccountOf(disposedSteps),
    provenance,
  });
  try {
    return writeReports(outputs, read.filesRead, reconciliation, streams, { exitZero });
  } catch (error) {
    // The run has its verdict, so an error in writing it out leaves the verdict's exit code alone.
    complain(error);
    return exitCodeOf(reconciliation.runVerdict, { exitZero });
  }
}
