export enum AppMessage {
  History,
  Repository,
  Tree,
  TreeDirectory,
  TreeFile,
  FeatureFile,
  FeatureCorpus,
  WorkingDirectory,
  CouldNotBeRead,
  CouldNotBeReadAt,
  UsageError,
  GitExited,
  StoredRunDirectoryNotCreated,
  StoredRunManifestNotWritten,
  FormatNamesStoredRunManifest,
  StoredRunReadsItsManifest,
}

interface AppMessageParams {
  [AppMessage.CouldNotBeRead]: [subject: string, reason: string];
  [AppMessage.CouldNotBeReadAt]: [subject: string, path: string, reason: string];
  [AppMessage.UsageError]: [command: string, message: string];
  [AppMessage.GitExited]: [args: readonly string[], status: number | null, said: string];
  [AppMessage.FormatNamesStoredRunManifest]: [formatPath: string, manifestPath: string, runDir: string];
  [AppMessage.StoredRunReadsItsManifest]: [manifestPath: string, inputPath: string, inputSubject: string];
}

export type AppMessages = {
  readonly [C in AppMessage]: (...params: C extends keyof AppMessageParams ? AppMessageParams[C] : []) => string;
};

export const APP_MESSAGES: AppMessages = {
  [AppMessage.History]: () => "the repository's history",
  [AppMessage.Repository]: () => "the repository",
  [AppMessage.Tree]: () => "the tree",
  [AppMessage.TreeDirectory]: () => "a directory in the tree",
  [AppMessage.TreeFile]: () => "a file in the tree",
  [AppMessage.FeatureFile]: () => "a feature file",
  [AppMessage.FeatureCorpus]: () => "the feature corpus",
  [AppMessage.WorkingDirectory]: () => "the working directory",
  [AppMessage.CouldNotBeRead]: (subject, reason) => `${subject} could not be read (${reason})`,
  [AppMessage.CouldNotBeReadAt]: (subject, path, reason) => `${subject} could not be read: ${path} (${reason})`,
  [AppMessage.UsageError]: (command, message) => `spec-controller ${command}: usage error — ${message}`,
  [AppMessage.GitExited]: (args, status, said) => `git ${args[0]} exited ${status}: ${said}`,
  [AppMessage.StoredRunDirectoryNotCreated]: () => "The stored run's directory could not be created",
  [AppMessage.StoredRunManifestNotWritten]: () => "The stored run's run.yaml could not be written",
  [AppMessage.FormatNamesStoredRunManifest]: (formatPath, manifestPath, runDir) =>
    `A --format output names ${formatPath}, which is this stored run's own ${manifestPath}. ` +
    `Give the report a path outside ${runDir}.`,
  [AppMessage.StoredRunReadsItsManifest]: (manifestPath, inputPath, inputSubject) =>
    `A file this stored run reads is its own ${manifestPath}: ${inputPath} is ${inputSubject}. ` +
    `Give the store a root outside the files the run reads.`,
};

export const Unreadable = {
  History: AppMessage.History,
  Repository: AppMessage.Repository,
  Tree: AppMessage.Tree,
  TreeDirectory: AppMessage.TreeDirectory,
  TreeFile: AppMessage.TreeFile,
  FeatureFile: AppMessage.FeatureFile,
  FeatureCorpus: AppMessage.FeatureCorpus,
  WorkingDirectory: AppMessage.WorkingDirectory,
} as const;

export type Unreadable = (typeof Unreadable)[keyof typeof Unreadable];

export const UNREADABLE_SUBJECTS: Readonly<Record<Unreadable, string>> = Object.fromEntries(
  Object.values(Unreadable).map((code) => [code, APP_MESSAGES[code]()]),
) as Record<Unreadable, string>;
