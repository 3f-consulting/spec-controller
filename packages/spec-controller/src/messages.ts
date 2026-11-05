export enum AppMessage {
  HelpTitle = "help-title",
  HelpUsage = "help-usage",
  HelpCommands = "help-commands",
  HelpHostModifiers = "help-host-modifiers",
  HelpOptions = "help-options",
  HelpArguments = "help-arguments",
  HelpPointer = "help-pointer",
  HelpFlag = "help-flag",
  StoreModifier = "store-modifier",
  RunIdModifier = "run-id-modifier",
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
  RenderFromJsonFlag = "render-from-json-flag",
  StrictFlag = "strict-flag",
  ExitZeroFlag = "exit-zero-flag",
  ConfigurationHeading = "configuration-heading",
  DeferralTagsKey = "deferral-tags-key",
  DeferralTagsExplanation = "deferral-tags-explanation",
  BuiltInDeferralTags = "built-in-deferral-tags",
  MeasurementsReplacement = "measurements-replacement",
  AllocateSummary = "allocate-summary",
  FeaturePartArgument = "feature-part-argument",
  NewFlag = "new-flag",
  ShallowHistoryRisksPartCode = "shallow-history-risks-part-code",
  ShallowHistoryRisksCodeAbove = "shallow-history-risks-code-above",
  NoRepositoryRisksPartCode = "no-repository-risks-part-code",
  NoRepositoryRisksCodeAbove = "no-repository-risks-code-above",
  HighestSeenNone = "highest-seen-none",
  HighestSeenInTree = "highest-seen-in-tree",
  HighestSeenInCommit = "highest-seen-in-commit",
  PartAlreadyHeaded = "part-already-headed",
  HelpUsageLine = "help-usage-line",
  SeeCommandsAndModifiers = "see-commands-and-modifiers",
  SeeModifiers = "see-modifiers",
  SeeFlags = "see-flags",
  SeeFlagsAndValues = "see-flags-and-values",
  SeeArguments = "see-arguments",
  GiveModifierItsOwnValue = "give-modifier-its-own-value",
  RunWithoutModifiers = "run-without-modifiers",
  PinDrifted = "pin-drifted",
  OtherwiseSeeFlags = "otherwise-see-flags",
  DoNotPinRetired = "do-not-pin-retired",
  ReRenderWithout = "re-render-without",
  KeepRunUnderName = "keep-run-under-name",
  NoPartsCarried = "no-parts-carried",
  DefaultCorpusFeatureFile = "default-corpus-feature-file",
  FlaggedCorpusFeatureFile = "flagged-corpus-feature-file",
  DefaultCiWorkflow = "default-ci-workflow",
  FlaggedCiWorkflow = "flagged-ci-workflow",
  FlaggedCiFolderWorkflow = "flagged-ci-folder-workflow",
  FormatOnStandardOutput = "format-on-standard-output",
  CodedUsageError = "coded-usage-error",
  CodedHostUsageError = "coded-host-usage-error",
  History = "history",
  Repository = "repository",
  Tree = "tree",
  TreeDirectory = "tree-directory",
  TreeFile = "tree-file",
  FeatureFile = "feature-file",
  FeatureCorpus = "feature-corpus",
  WorkingDirectory = "working-directory",
  GitExited = "git-exited",
  FeatureCorpusDirectoryMissing = "feature-corpus-directory-missing",
  FlaggedFile = "flagged-file",
  FlaggedReport = "flagged-report",
  FlaggedRecord = "flagged-record",
  FlaggedManifest = "flagged-manifest",
  FlaggedSavedReport = "flagged-saved-report",
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
  RetiredFlag = "retired-flag",
  UnknownCommand = "unknown-command",
  MissingValue = "missing-value",
  GivenTwice = "given-twice",
  EqualsForm = "equals-form",
  TakesNoValue = "takes-no-value",
  ExtraArgument = "extra-argument",
  NotAFlag = "not-a-flag",
  MisplacedModifier = "misplaced-modifier",
  FlagBeforeCommand = "flag-before-command",
  NoCommandAfterModifiers = "no-command-after-modifiers",
  ModifierTookCommand = "modifier-took-command",
  ModifiersNotTaken = "modifiers-not-taken",
  ReRenderNotStored = "re-render-not-stored",
  RunIdWithoutStore = "run-id-without-store",
  LegacyJsonRemoved = "legacy-json-removed",
  ReRenderReadsOnly = "re-render-reads-only",
  UnknownFormat = "unknown-format",
  MoreThanOneToStdout = "more-than-one-to-stdout",
  OutputsShareFile = "outputs-share-file",
  OutputOverwritesInput = "output-overwrites-input",
  OutputOverwritesStoredRun = "output-overwrites-stored-run",
  FormatNamesStoredRunManifest = "format-names-stored-run-manifest",
  StoredRunReadsItsManifest = "stored-run-reads-its-manifest",
  UnknownPartRefused = "unknown-part-refused",
  NoFeaturePartGiven = "no-feature-part-given",
  NotAFeaturePart = "not-a-feature-part",
  WorkingDirectoryUnreadable = "working-directory-unreadable",
  CouldNotBeRead = "could-not-be-read",
  StoredRunDirectoryNotCreated = "stored-run-directory-not-created",
  InputPathMissing = "input-path-missing",
  NotValidJson = "not-valid-json",
  NotValidJsonInShape = "not-valid-json-in-shape",
  NotValidXml = "not-valid-xml",
  NotInShape = "not-in-shape",
  NotASavedReconciliation = "not-a-saved-reconciliation",
  NotRenderableAsSaved = "not-renderable-as-saved",
  CorpusFileUnparseable = "corpus-file-unparseable",
  WorkflowNotYaml = "workflow-not-yaml",
  ReportNotWritten = "report-not-written",
  UnexpectedError = "unexpected-error",
  UnexpectedErrorAfterVerdict = "unexpected-error-after-verdict",
}

// A crash line is filled by the crash guards from the data file's entry, so they word it without loading the formatter.
export type CrashError = AppError.UnexpectedError | AppError.UnexpectedErrorAfterVerdict;

export type RefusalError = Exclude<AppError, CrashError>;

export type WordedAppMessage = AppMessage;

export type PlainWordedAppMessage = Exclude<WordedAppMessage, keyof AppMessageValues>;

export interface AppMessageValues {
  [AppMessage.BuiltInDeferralTags]: { tags: string };
  [AppMessage.ShallowHistoryRisksPartCode]: { before: string; part: string };
  [AppMessage.ShallowHistoryRisksCodeAbove]: { before: string; code: string };
  [AppMessage.NoRepositoryRisksPartCode]: { part: string };
  [AppMessage.NoRepositoryRisksCodeAbove]: { code: string };
  [AppMessage.HighestSeenInTree]: { code: string; path: string; line: number };
  [AppMessage.HighestSeenInCommit]: { code: string; path: string; line: number; commit: string };
  [AppMessage.PartAlreadyHeaded]: { part: string };
  [AppMessage.HelpUsageLine]: { modifierUsage: string };
  [AppMessage.SeeFlags]: { scope: string };
  [AppMessage.SeeFlagsAndValues]: { scope: string };
  [AppMessage.SeeArguments]: { scope: string };
  [AppMessage.GiveModifierItsOwnValue]: { modifier: string; arg: string; command: string };
  [AppMessage.RunWithoutModifiers]: { command: string };
  [AppMessage.PinDrifted]: { command: string; flag: string };
  [AppMessage.OtherwiseSeeFlags]: { scope: string };
  [AppMessage.ReRenderWithout]: { count: number };
  [AppMessage.KeepRunUnderName]: { command: string };
  [AppMessage.FormatOnStandardOutput]: { fmt: string };
  [AppMessage.CodedUsageError]: { command: string; code: AppError; message: string };
  [AppMessage.CodedHostUsageError]: { code: AppError; message: string };
  [AppMessage.GitExited]: { command: string; status: string; said: string };
  [AppMessage.FeatureCorpusDirectoryMissing]: { directory: string };
  [AppMessage.FlaggedFile]: { flag: string };
  [AppMessage.FlaggedReport]: { flag: string };
  [AppMessage.FlaggedRecord]: { flag: string };
  [AppMessage.FlaggedManifest]: { flag: string };
  [AppMessage.FlaggedSavedReport]: { flag: string };
  [AppMessage.FlaggedCorpus]: { flag: string };
  [AppMessage.FlaggedWorkflows]: { flag: string };
  [AppMessage.XmlFaultAtLine]: { fault: string; line: number };
  [AppMessage.ShapeKindOfType]: { type: string };
  [AppMessage.ShapeWrongKind]: { where: string; found: string; expected: string };
  [AppMessage.ShapeFieldMissing]: { path: string };
}

export interface AppErrorValues {
  [AppError.UnknownFlag]: { flag: string; scope: string; toolVersion: string; command: string };
  [AppError.RetiredFlag]: { flag: string; scope: string; retiredIn: string; toolVersion: string };
  [AppError.UnknownCommand]: { command: string };
  [AppError.MissingValue]: { flag: string; scope: string; arg: string };
  [AppError.GivenTwice]: { flag: string; scope: string };
  [AppError.EqualsForm]: { token: string; scope: string; spelling: string };
  [AppError.TakesNoValue]: { flag: string; scope: string; value: string };
  [AppError.ExtraArgument]: { token: string; scope: string; takes: string };
  [AppError.NotAFlag]: { token: string; scope: string };
  [AppError.MisplacedModifier]: { modifier: string; command: string };
  [AppError.FlagBeforeCommand]: { flag: string; modifiers: string };
  [AppError.NoCommandAfterModifiers]: { modifiers: string };
  [AppError.ModifierTookCommand]: { modifier: string; command: string };
  [AppError.ModifiersNotTaken]: { command: string; modifiers: string };
  [AppError.ReRenderNotStored]: { modifiers: string };
  [AppError.RunIdWithoutStore]: { runId: string };
  [AppError.ReRenderReadsOnly]: { ignored: string };
  [AppError.UnknownFormat]: { formats: string; supported: string };
  [AppError.MoreThanOneToStdout]: { formats: string };
  [AppError.OutputsShareFile]: { first: string; second: string };
  [AppError.OutputOverwritesInput]: { output: string; subject: string; path: string };
  [AppError.OutputOverwritesStoredRun]: { path: string; runDir: string };
  [AppError.FormatNamesStoredRunManifest]: { formatPath: string; manifestPath: string; runDir: string };
  [AppError.StoredRunReadsItsManifest]: { manifestPath: string; inputPath: string; inputSubject: string };
  [AppError.UnknownPartRefused]: { part: string; parts: string };
  [AppError.NotAFeaturePart]: { part: string };
  [AppError.WorkingDirectoryUnreadable]: { subject: string; reason: string };
  [AppError.CouldNotBeRead]: { subject: string; path: string; reason: string };
  [AppError.StoredRunDirectoryNotCreated]: { path: string; reason: string };
  [AppError.InputPathMissing]: { flag: string; path: string };
  [AppError.NotValidJson]: { subject: string; path: string; reason: string };
  [AppError.NotValidJsonInShape]: { subject: string; shape: string; path: string; reason: string };
  [AppError.NotValidXml]: { subject: string; shape: string; path: string; reason: string };
  [AppError.NotInShape]: { subject: string; shape: string; path: string; fault: string };
  [AppError.NotASavedReconciliation]: { subject: string; path: string; fault: string };
  [AppError.NotRenderableAsSaved]: { subject: string; path: string; reason: string };
  [AppError.CorpusFileUnparseable]: { corpus: string; file: string; message: string };
  [AppError.WorkflowNotYaml]: { workflows: string; file: string; message: string };
  [AppError.ReportNotWritten]: { format: string; path: string; reason: string };
  [AppError.UnexpectedError]: { name: string; firstLine: string };
  [AppError.UnexpectedErrorAfterVerdict]: { name: string; firstLine: string };
}

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
