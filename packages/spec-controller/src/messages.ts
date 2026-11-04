export enum AppMessage {
  HelpTitle,
  HelpUsage,
  HelpCommands,
  HelpHostModifiers,
  HelpOptions,
  HelpArguments,
  HelpPointer,
  HelpFlag,
  StoreModifier,
  RunIdModifier,
  BalanceSummary,
  FeaturesFlag,
  VitestFlag,
  PytestFlag,
  JestFlag,
  JunitFlag,
  RspecFlag,
  CucumberFlag,
  CiFlag,
  PackageJsonFlag,
  CiStepsFlag,
  TargetFlag,
  SourceShaFlag,
  FormatFlag,
  RenderFromJsonFlag,
  StrictFlag,
  ExitZeroFlag,
  ConfigurationHeading,
  DeferralTagsKey,
  DeferralTagsExtend,
  DeferralTagsNeverReplace,
  BuiltInDeferralTags,
  MeasurementsReplacement,
  AllocateSummary,
  FeaturePartArgument,
  NewFlag,
  HistoryBoundary,
  ShallowHistoryUnread,
  NoRepositoryHistoryRead,
  RiskOfPartCode,
  RiskAboveCode,
  HighestSeenNone,
  HighestSeenInTree,
  HighestSeenInCommit,
  PartAlreadyHeaded,
  HelpUsageLine,
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

// A crash line is worded by the table below, so the crash guards read it without loading the data file's formatter.
type CrashError = AppError.UnexpectedError | AppError.UnexpectedErrorAfterVerdict;

export type RefusalError = Exclude<AppError, CrashError>;

interface AppMessageParams {
  [AppMessage.BuiltInDeferralTags]: [tags: string];
  [AppMessage.HistoryBoundary]: [unread: string, risk: string];
  [AppMessage.ShallowHistoryUnread]: [before: string];
  [AppMessage.RiskOfPartCode]: [part: string];
  [AppMessage.RiskAboveCode]: [code: string];
  [AppMessage.HighestSeenInTree]: [code: string, path: string, line: number];
  [AppMessage.HighestSeenInCommit]: [code: string, path: string, line: number, commit: string];
  [AppMessage.PartAlreadyHeaded]: [part: string];
  [AppMessage.HelpUsageLine]: [modifierUsage: string];
  [AppError.UnexpectedError]: [name: string, firstLine: string];
  [AppError.UnexpectedErrorAfterVerdict]: [name: string, firstLine: string];
}

// A handle whose value is a string is worded by the data file; the others, by the table below.
export type WordedAppMessage = Extract<AppMessage, string>;

type TabledAppMessage = Extract<AppMessage, number> | CrashError;

export type PlainWordedAppMessage = Exclude<WordedAppMessage, keyof AppMessageValues>;

export interface AppMessageValues {
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
}

export type PlainAppMessage = Exclude<TabledAppMessage, keyof AppMessageParams>;

export type AppMessages = {
  readonly [C in TabledAppMessage]: (...params: C extends keyof AppMessageParams ? AppMessageParams[C] : []) => string;
};

export const APP_MESSAGES: AppMessages = {
  [AppMessage.HelpTitle]: () => "spec-controller — reconcile scenarios against observed evidence",
  [AppMessage.HelpUsage]: () => "Usage:",
  [AppMessage.HelpCommands]: () => "Commands:",
  [AppMessage.HelpHostModifiers]: () => "Host modifiers (before the command):",
  [AppMessage.HelpOptions]: () => "Options:",
  [AppMessage.HelpArguments]: () => "Arguments:",
  [AppMessage.HelpPointer]: () => "Full flags, examples, and CI wiring: docs/user-guide.md.",
  [AppMessage.HelpFlag]: () => "Show this help and exit.",
  [AppMessage.StoreModifier]: () =>
    "Store the run: write <root>/<target>/<run-id>/ with the reconciliation outputs + a run.yaml manifest. " +
    "Required to store; there is no default (a default would write inside the repo).",
  [AppMessage.RunIdModifier]: () =>
    "Name the stored run (default: an ISO-8601 UTC timestamp). Read only with --store: " +
    "given without it, the run is refused, since no run would be kept under the name.",
  [AppMessage.BalanceSummary]: () =>
    "Reconcile Gherkin scenarios against test/CI evidence and emit the Evidence Reconciliation " +
    "(Markdown to stdout by default).",
  [AppMessage.FeaturesFlag]: () =>
    "Directory of Gherkin .feature files — the scenarios, and the `@`-tags naming what each must prove " +
    "(@unit, @integration, @fitness, …).",
  [AppMessage.VitestFlag]: () => "A Vitest JSON report — runtime test evidence.",
  [AppMessage.PytestFlag]: () => "A pytest JUnit XML report (pytest --junitxml) — runtime unit test evidence.",
  [AppMessage.JestFlag]: () => "A Jest JSON report (jest --json --outputFile) — runtime unit test evidence.",
  [AppMessage.JunitFlag]: () =>
    "A JUnit XML report from any test runner that writes one, such as gotestsum --junitfile, or a directory of them, such as Maven Surefire's — runtime unit test evidence.",
  [AppMessage.RspecFlag]: () =>
    "An RSpec JSON report (rspec --format json --out) — runtime unit test evidence.",
  [AppMessage.CucumberFlag]: () => "A Cucumber JSON report — runtime test evidence.",
  [AppMessage.CiFlag]: () =>
    "Your CI workflows — a file, or a directory of them (default .github/workflows). " +
    "Where a fitness function you have not converted is found running over the real source, " +
    "and where a check step's `id:` supplies the @SCN its result cites.",
  [AppMessage.PackageJsonFlag]: () =>
    "The target's package.json — its `scripts`, and its specController.runners, specController.notChecks " +
    "and specController.deferralTags. A fitness function is named by its @fitness scenario and the CI step " +
    "whose id: is that scenario's @SCN; no manifest key names one.",
  [AppMessage.CiStepsFlag]: () =>
    "The CI run's own record of what each of its steps did — your pipeline's `toJSON(steps)` dump, " +
    "evidence for the converted fitness functions. Omit it if you have converted none.",
  [AppMessage.TargetFlag]: () =>
    "A name recorded verbatim in the report's provenance (which project this run reconciled).",
  [AppMessage.SourceShaFlag]: () =>
    "Override the git commit SHA recorded in provenance (defaults to the resolved HEAD).",
  [AppMessage.FormatFlag]: () =>
    "Where to send output (md or json, optionally :<path> to write to a file). Repeatable.",
  [AppMessage.RenderFromJsonFlag]: () =>
    "Re-render Markdown from a previously saved Evidence Reconciliation JSON — no reconcile, no live inputs.",
  [AppMessage.StrictFlag]: () =>
    "Fail the run (exit 3) when it carries Pending Items — the opt-in that escalates " +
    "otherwise-run-neutral deferred obligations.",
  [AppMessage.ExitZeroFlag]: () =>
    "Print the same report but exit 0 on an out-of-balance or scenario-code-error (1) or --strict pending (3) " +
    "verdict — the on-ramp before gating. Usage (2), unsound (4) and nothing-to-reconcile (5) still fail.",
  [AppMessage.ConfigurationHeading]: () => "Configuration (in the target repo's package.json):",
  [AppMessage.DeferralTagsKey]: () => "specController.deferralTags: string[]",
  [AppMessage.DeferralTagsExtend]: () =>
    "Extra recognised deferral tags. A scenario carrying one defers every obligation it",
  [AppMessage.DeferralTagsNeverReplace]: () =>
    "names to a Pending Item, extending (never replacing) the built-in set.",
  [AppMessage.BuiltInDeferralTags]: (tags) => `Built-in deferral tags: ${tags}`,
  [AppMessage.MeasurementsReplacement]: () =>
    "A fitness function's evidence observation is the outcome of its own CI step: put the check's @SCN on that step's `id:` " +
    "and hand balance the run's step record with --ci-steps.",
  [AppMessage.AllocateSummary]: () =>
    "Print the next @SCN code for a feature part: one past the highest the repository has ever carried, " +
    "the code alone on stdout.",
  [AppMessage.FeaturePartArgument]: () => "The feature part: a feature file's header code, two to five of A-Z and 0-9.",
  [AppMessage.NewFlag]: () =>
    "Start a part no feature file's header carries yet: its first code, " +
    "or one past any number the repository already carries for it.",
  [AppMessage.HistoryBoundary]: (unread, risk) => `history: ${unread}; ${risk} may have been used before`,
  [AppMessage.ShallowHistoryUnread]: (before) => `shallow clone — history before ${before} unread`,
  [AppMessage.NoRepositoryHistoryRead]: () => "not a git repository — none read",
  [AppMessage.RiskOfPartCode]: (part) => `a code of ${part}`,
  [AppMessage.RiskAboveCode]: (code) => `a code above ${code}`,
  [AppMessage.HighestSeenNone]: () => "highest seen: none",
  [AppMessage.HighestSeenInTree]: (code, path, line) => `highest seen: ${code}, ${path}:${line}`,
  [AppMessage.HighestSeenInCommit]: (code, path, line, commit) => `highest seen: ${code}, ${path}:${line} in ${commit}`,
  [AppMessage.PartAlreadyHeaded]: (part) => `note: a feature file's header already carries ${part}, so --new was not needed`,
  [AppMessage.HelpUsageLine]: (modifierUsage) => `spec-controller ${modifierUsage} <command> [command-args]`,
  [AppError.UnexpectedError]: (name, firstLine) =>
    `spec-controller stopped on an unexpected error [${AppError.UnexpectedError}], and gives no verdict: ${name}: ${firstLine}`,
  [AppError.UnexpectedErrorAfterVerdict]: (name, firstLine) =>
    `spec-controller hit an unexpected error [${AppError.UnexpectedErrorAfterVerdict}] after its verdict: ${name}: ${firstLine}`,
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
