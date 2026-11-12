import { AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { corpusPathOf } from "./ingestScenarios.js";

// The files a run read, as its readings found them: feature files relative to the corpus folder it read.
export interface FilesRead {
  readonly reports: readonly string[];
  readonly corpus: string;
  readonly featureFiles: readonly string[];
  readonly workflows: readonly string[];
}

// A file the run reads, named by its kind (a feature file, a CI workflow or a report) and its path as given, and found
// where the run read it.
interface InputRead {
  readonly subject: string;
  readonly path: string;
  readonly readAt: string;
}

// Feature files are named under the corpus folder as given, so a corpus read by default is named relative to the run.
export function inputsReadOf(args: Record<string, string>, read: FilesRead, defaultCorpus: string): InputRead[] {
  const corpus = args["features"] ?? defaultCorpus;
  return [
    ...read.reports.map((path) => ({ subject: message(AppMessage.ReadReport), path, readAt: path })),
    ...read.featureFiles.map((file) => ({
      subject: message(AppMessage.FeatureFile),
      path: corpusPathOf(corpus, file),
      readAt: corpusPathOf(read.corpus, file),
    })),
    ...read.workflows.map((path) => ({ subject: message(AppMessage.CiWorkflow), path, readAt: path })),
  ];
}
