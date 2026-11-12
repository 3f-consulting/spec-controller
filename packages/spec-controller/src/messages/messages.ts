export enum AppMessage {
  Help = "help",
  HelpEntry = "help-entry",
  CommandHelp = "command-help",
  CommandHelpArguments = "command-help-arguments",
  HelpFlag = "help-flag",
  BalanceSummary = "balance-summary",
  FeaturesFlag = "features-flag",
  VitestFlag = "vitest-flag",
  PytestFlag = "pytest-flag",
  JestFlag = "jest-flag",
  JunitFlag = "junit-flag",
  RspecFlag = "rspec-flag",
  CucumberFlag = "cucumber-flag",
  CiFlag = "ci-flag",
  PackageJsonFlag = "package-json-flag",
  CiStepsFlag = "ci-steps-flag",
  TargetFlag = "target-flag",
  SourceShaFlag = "source-sha-flag",
  FormatFlag = "format-flag",
  StrictFlag = "strict-flag",
  ExitZeroFlag = "exit-zero-flag",
  AllocateSummary = "allocate-summary",
  FeatureCodeArgument = "feature-code-argument",
  NewFlag = "new-flag",
  ShallowHistoryRisksFeatureCode = "shallow-history-risks-feature-code",
  ShallowHistoryRisksCodeAbove = "shallow-history-risks-code-above",
  NoRepositoryRisksFeatureCode = "no-repository-risks-feature-code",
  NoRepositoryRisksCodeAbove = "no-repository-risks-code-above",
  HighestSeenNone = "highest-seen-none",
  HighestSeenInTree = "highest-seen-in-tree",
  HighestSeenInCommit = "highest-seen-in-commit",
  FeatureCodeAlreadyHeaded = "feature-code-already-headed",
  SeeCommands = "see-commands",
  SeeFlags = "see-flags",
  SeeFlagsAndValues = "see-flags-and-values",
  SeeArguments = "see-arguments",
  NoFeatureCodesCarried = "no-feature-codes-carried",
  CiWorkflow = "ci-workflow",
  ReadReport = "read-report",
  FormatOnStandardOutput = "format-on-standard-output",
  CodedUsageError = "coded-usage-error",
  CodedHostUsageError = "coded-host-usage-error",
  PointedRefusal = "pointed-refusal",
  HelpAfterRefusal = "help-after-refusal",
  History = "history",
  Repository = "repository",
  Tree = "tree",
  TreeDirectory = "tree-directory",
  TreeFile = "tree-file",
  FeatureFile = "feature-file",
  FeatureCorpus = "feature-corpus",
  GitExited = "git-exited",
  FlaggedReport = "flagged-report",
  FlaggedRecord = "flagged-record",
  FlaggedManifest = "flagged-manifest",
  FlaggedCorpus = "flagged-corpus",
  FlaggedWorkflows = "flagged-workflows",
  DefaultPackageJson = "default-package-json",
  DefaultFeatureCorpus = "default-feature-corpus",
  DefaultCiWorkflows = "default-ci-workflows",
  VitestReportShape = "vitest-report-shape",
  JunitReportShape = "junit-report-shape",
  JestReportShape = "jest-report-shape",
  JunitXmlReportShape = "junit-xml-report-shape",
  RspecReportShape = "rspec-report-shape",
  CucumberReportShape = "cucumber-report-shape",
  CiStepRecordShape = "ci-step-record-shape",
  PackageManifestShape = "package-manifest-shape",
  XmlFaultAtLine = "xml-fault-at-line",
  ShapeKindList = "shape-kind-list",
  ShapeKindObject = "shape-kind-object",
  ShapeKindOfType = "shape-kind-of-type",
  ShapeTopLevel = "shape-top-level",
  ShapeWrongKind = "shape-wrong-kind",
  ShapeFieldMissing = "shape-field-missing",
}

// Each error a reader can be shown, by its code: a handle's value is the code it prints.
export enum AppError {
  UnknownFlag = "unknown-flag",
  UnknownCommand = "unknown-command",
  MissingValue = "missing-value",
  GivenTwice = "given-twice",
  EqualsForm = "equals-form",
  TakesNoValue = "takes-no-value",
  ExtraArgument = "extra-argument",
  NotAFlag = "not-a-flag",
  FlagBeforeCommand = "flag-before-command",
  UnknownFormat = "unknown-format",
  MoreThanOneToStdout = "more-than-one-to-stdout",
  OutputsShareFile = "outputs-share-file",
  OutputOverwritesInput = "output-overwrites-input",
  UnknownFeatureCodeRefused = "unknown-feature-code-refused",
  FeatureCodeNotGiven = "feature-code-not-given",
  NotAFeatureCode = "not-a-feature-code",
  CouldNotBeRead = "could-not-be-read",
  InputPathMissing = "input-path-missing",
  NotValidJson = "not-valid-json",
  NotValidXml = "not-valid-xml",
  NotInShape = "not-in-shape",
  CorpusFileUnparseable = "corpus-file-unparseable",
  WorkflowNotYaml = "workflow-not-yaml",
  ReportNotWritten = "report-not-written",
  UnexpectedError = "unexpected-error",
}

// A crash line is filled by the crash guards from the data file's entry, so they word it without loading the formatter.
export type CrashError = AppError.UnexpectedError;

export type RefusalError = Exclude<AppError, CrashError>;

export type PlainAppMessage = Exclude<AppMessage, keyof AppMessageValues>;

export interface AppMessageValues {
  [AppMessage.ShallowHistoryRisksFeatureCode]: { before: string; featureCode: string };
  [AppMessage.ShallowHistoryRisksCodeAbove]: { before: string; code: string };
  [AppMessage.NoRepositoryRisksFeatureCode]: { featureCode: string };
  [AppMessage.NoRepositoryRisksCodeAbove]: { code: string };
  [AppMessage.HighestSeenInTree]: { code: string; path: string; line: number };
  [AppMessage.HighestSeenInCommit]: { code: string; path: string; line: number; commit: string };
  [AppMessage.FeatureCodeAlreadyHeaded]: { featureCode: string };
  [AppMessage.Help]: { commands: string };
  [AppMessage.HelpEntry]: { name: string; description: string };
  [AppMessage.CommandHelp]: { command: string; summary: string; arguments: string; options: string };
  [AppMessage.CommandHelpArguments]: { command: string; arguments: string; entries: string };
  [AppMessage.SeeFlags]: { scope: string };
  [AppMessage.SeeFlagsAndValues]: { scope: string };
  [AppMessage.SeeArguments]: { scope: string };
  [AppMessage.FormatOnStandardOutput]: { fmt: string };
  [AppMessage.CodedUsageError]: { command: string; code: AppError; message: string };
  [AppMessage.CodedHostUsageError]: { code: AppError; message: string };
  [AppMessage.PointedRefusal]: { refusal: string; pointers: string };
  [AppMessage.HelpAfterRefusal]: { help: string };
  [AppMessage.GitExited]: { command: string; status: string; said: string };
  [AppMessage.FlaggedReport]: { flag: string };
  [AppMessage.FlaggedRecord]: { flag: string };
  [AppMessage.FlaggedManifest]: { flag: string };
  [AppMessage.FlaggedCorpus]: { flag: string };
  [AppMessage.FlaggedWorkflows]: { flag: string };
  [AppMessage.XmlFaultAtLine]: { fault: string; line: number };
  [AppMessage.ShapeKindOfType]: { type: string };
  [AppMessage.ShapeWrongKind]: { where: string; found: string; expected: string };
  [AppMessage.ShapeFieldMissing]: { path: string };
}

export interface AppErrorValues {
  [AppError.UnknownFlag]: { flag: string; scope: string };
  [AppError.UnknownCommand]: { command: string };
  [AppError.MissingValue]: { flag: string; scope: string; arg: string };
  [AppError.GivenTwice]: { flag: string; scope: string };
  [AppError.EqualsForm]: { token: string; scope: string; spelling: string };
  [AppError.TakesNoValue]: { flag: string; scope: string; value: string };
  [AppError.ExtraArgument]: { token: string; scope: string; takes: string };
  [AppError.NotAFlag]: { token: string; scope: string };
  [AppError.FlagBeforeCommand]: { flag: string };
  [AppError.UnknownFormat]: { formats: string; supported: string };
  [AppError.MoreThanOneToStdout]: { formats: string };
  [AppError.OutputsShareFile]: { first: string; second: string };
  [AppError.OutputOverwritesInput]: { output: string; subject: string; path: string };
  [AppError.UnknownFeatureCodeRefused]: { featureCode: string; featureCodes: string };
  [AppError.NotAFeatureCode]: { featureCode: string };
  [AppError.CouldNotBeRead]: { subject: string; path: string; reason: string };
  [AppError.InputPathMissing]: { flag: string; path: string };
  [AppError.NotValidJson]: { subject: string; path: string; reason: string };
  [AppError.NotValidXml]: { subject: string; shape: string; path: string; reason: string };
  [AppError.NotInShape]: { subject: string; shape: string; path: string; fault: string };
  [AppError.CorpusFileUnparseable]: { corpus: string; file: string; message: string };
  [AppError.WorkflowNotYaml]: { workflows: string; file: string; message: string };
  [AppError.ReportNotWritten]: { format: string; path: string; reason: string };
  [AppError.UnexpectedError]: { name: string; firstLine: string };
}

export const Unreadable = {
  History: AppMessage.History,
  Repository: AppMessage.Repository,
  Tree: AppMessage.Tree,
  TreeDirectory: AppMessage.TreeDirectory,
  TreeFile: AppMessage.TreeFile,
  FeatureFile: AppMessage.FeatureFile,
  FeatureCorpus: AppMessage.FeatureCorpus,
} as const;

export type Unreadable = (typeof Unreadable)[keyof typeof Unreadable];
