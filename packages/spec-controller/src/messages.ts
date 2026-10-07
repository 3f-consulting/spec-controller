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
  FeatureCorpusUnparseable,
  FeatureCorpusDirectoryMissing,
  StoredRunDirectoryNotCreated,
  StoredRunManifestNotWritten,
  FormatNamesStoredRunManifest,
  StoredRunReadsItsManifest,
  SeeCommandsAndModifiers,
  SeeModifiers,
  SeeFlags,
  SeeFlagsAndValues,
  SeeArguments,
  NoCommandAfterModifiers,
  ModifierTookCommand,
  GiveModifierItsOwnValue,
  FlagBeforeCommand,
  UnknownCommand,
  ModifiersNotTaken,
  RunWithoutModifiers,
  MissingValue,
  GivenTwice,
  EqualsForm,
  TakesNoValue,
  ExtraArgument,
  NotAFlag,
  MisplacedModifier,
  UnknownFlag,
  PinDrifted,
  OtherwiseSeeFlags,
  RetiredFlag,
  DoNotPinRetired,
  ReRenderNotStored,
  ReRenderWithoutIt,
  ReRenderWithoutThem,
  RunIdWithoutStore,
  KeepRunUnderName,
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
}

interface AppMessageParams {
  [AppMessage.CouldNotBeRead]: [subject: string, reason: string];
  [AppMessage.CouldNotBeReadAt]: [subject: string, path: string, reason: string];
  [AppMessage.UsageError]: [command: string, message: string];
  [AppMessage.GitExited]: [args: readonly string[], status: number | null, said: string];
  [AppMessage.FeatureCorpusDirectoryMissing]: [directory: string];
  [AppMessage.FormatNamesStoredRunManifest]: [formatPath: string, manifestPath: string, runDir: string];
  [AppMessage.StoredRunReadsItsManifest]: [manifestPath: string, inputPath: string, inputSubject: string];
  [AppMessage.SeeFlags]: [scope: string];
  [AppMessage.SeeFlagsAndValues]: [scope: string];
  [AppMessage.SeeArguments]: [scope: string];
  [AppMessage.NoCommandAfterModifiers]: [modifiers: string];
  [AppMessage.ModifierTookCommand]: [modifier: string, command: string];
  [AppMessage.GiveModifierItsOwnValue]: [modifier: string, arg: string, command: string];
  [AppMessage.FlagBeforeCommand]: [flag: string, modifiers: string];
  [AppMessage.UnknownCommand]: [command: string];
  [AppMessage.ModifiersNotTaken]: [command: string, modifiers: string];
  [AppMessage.RunWithoutModifiers]: [command: string];
  [AppMessage.MissingValue]: [flag: string, scope: string, arg: string];
  [AppMessage.GivenTwice]: [flag: string, scope: string];
  [AppMessage.EqualsForm]: [token: string, scope: string, spelling: string];
  [AppMessage.TakesNoValue]: [flag: string, scope: string, value: string];
  [AppMessage.ExtraArgument]: [token: string, scope: string, takes: string];
  [AppMessage.NotAFlag]: [token: string, scope: string];
  [AppMessage.MisplacedModifier]: [modifier: string, command: string];
  [AppMessage.UnknownFlag]: [flag: string, scope: string, toolVersion: string, command: string];
  [AppMessage.PinDrifted]: [command: string, flag: string];
  [AppMessage.OtherwiseSeeFlags]: [scope: string];
  [AppMessage.RetiredFlag]: [flag: string, scope: string, retiredIn: string, toolVersion: string];
  [AppMessage.ReRenderNotStored]: [modifiers: string];
  [AppMessage.RunIdWithoutStore]: [runId: string];
  [AppMessage.KeepRunUnderName]: [command: string];
  [AppMessage.BuiltInDeferralTags]: [tags: string];
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
  [AppMessage.FeatureCorpusUnparseable]: () => "The feature corpus contains a file that could not be parsed as Gherkin:",
  [AppMessage.FeatureCorpusDirectoryMissing]: (directory) => `The feature corpus directory does not exist: ${directory}`,
  [AppMessage.StoredRunDirectoryNotCreated]: () => "The stored run's directory could not be created",
  [AppMessage.StoredRunManifestNotWritten]: () => "The stored run's run.yaml could not be written",
  [AppMessage.FormatNamesStoredRunManifest]: (formatPath, manifestPath, runDir) =>
    `A --format output names ${formatPath}, which is this stored run's own ${manifestPath}. ` +
    `Give the report a path outside ${runDir}.`,
  [AppMessage.StoredRunReadsItsManifest]: (manifestPath, inputPath, inputSubject) =>
    `A file this stored run reads is its own ${manifestPath}: ${inputPath} is ${inputSubject}. ` +
    `Give the store a root outside the files the run reads.`,
  [AppMessage.SeeCommandsAndModifiers]: () =>
    "Run 'spec-controller --help' to see the commands and host modifiers this version accepts.",
  [AppMessage.SeeModifiers]: () => "Run 'spec-controller --help' to see the host modifiers this version accepts.",
  [AppMessage.SeeFlags]: (scope) => `Run '${scope} --help' to see the flags this version accepts.`,
  [AppMessage.SeeFlagsAndValues]: (scope) =>
    `Run '${scope} --help' to see the flags this version accepts and the values they take.`,
  [AppMessage.SeeArguments]: (scope) => `Run '${scope} --help' to see what this version accepts.`,
  [AppMessage.NoCommandAfterModifiers]: (modifiers) =>
    `No command followed the host modifiers given (${modifiers}), so nothing ran: ` +
    `a host modifier needs a command after it, or --help.`,
  [AppMessage.ModifierTookCommand]: (modifier, command) =>
    `The ${modifier} host modifier took '${command}', a command, as its value, and left no command to run.`,
  [AppMessage.GiveModifierItsOwnValue]: (modifier, arg, command) =>
    `Give ${modifier} its own value, as in 'spec-controller ${modifier} ${arg} ${command} …'.`,
  [AppMessage.FlagBeforeCommand]: (flag, modifiers) =>
    `The ${flag} flag was given before the command. Before the command, spec-controller takes ` +
    `only its host modifiers (${modifiers}); a command's own flags go after it, as in ` +
    `'spec-controller <command> ${flag}'.`,
  [AppMessage.UnknownCommand]: (command) => `unknown command "${command}".`,
  [AppMessage.ModifiersNotTaken]: (command, modifiers) =>
    `'${command}' takes no host modifier, and was given ${modifiers}: it answers a query and keeps no run.`,
  [AppMessage.RunWithoutModifiers]: (command) => `Run 'spec-controller ${command} …' without them.`,
  [AppMessage.MissingValue]: (flag, scope, arg) =>
    `The ${flag} flag of '${scope}' needs a value — ${flag} ${arg} — and was given none.`,
  [AppMessage.GivenTwice]: (flag, scope) =>
    `The ${flag} flag of '${scope}' was given more than once, and is read once: give it once.`,
  [AppMessage.EqualsForm]: (token, scope, spelling) =>
    `The ${token} form is not read by '${scope}': a flag and its value are two arguments, as in '${spelling}'.`,
  [AppMessage.TakesNoValue]: (flag, scope, value) =>
    `The ${flag} flag of '${scope}' takes no value, and was given one: '${value}'.`,
  [AppMessage.ExtraArgument]: (token, scope, takes) =>
    `The argument '${token}' is more than '${scope}' takes: it takes ${takes} once, and its flags.`,
  [AppMessage.NotAFlag]: (token, scope) =>
    `The argument '${token}' is not a flag, nor the value of the flag before it: ` +
    `'${scope}' takes only flags and their values.`,
  [AppMessage.MisplacedModifier]: (modifier, command) =>
    `The ${modifier} flag is a host modifier: it goes before the command, as in ` +
    `'spec-controller ${modifier} <value> ${command} …', never after it.`,
  [AppMessage.UnknownFlag]: (flag, scope, toolVersion, command) =>
    `Unknown flag ${flag} for '${scope}' — this is spec-controller ` +
    `${toolVersion}, and that flag is not in its ${command} scope.`,
  [AppMessage.PinDrifted]: (command, flag) =>
    `If this version is pinned, the pin and the tree it is reading have drifted apart: ` +
    `bump the pin to a version whose '${command}' accepts ${flag}.`,
  [AppMessage.OtherwiseSeeFlags]: (scope) => `Otherwise run '${scope} --help' to see the flags this version accepts.`,
  [AppMessage.RetiredFlag]: (flag, scope, retiredIn, toolVersion) =>
    `Retired flag ${flag} for '${scope}' — retired in spec-controller ` +
    `${retiredIn}, and no later version accepts it (this is spec-controller ${toolVersion}).`,
  [AppMessage.DoNotPinRetired]: () =>
    "Do not pin an earlier version to get it back: that restores the route it was retired with.",
  [AppMessage.ReRenderNotStored]: (modifiers) =>
    `'balance --render-from-json' re-renders a saved report to stdout and keeps no run, ` +
    `and was given ${modifiers}: a re-render is not stored.`,
  [AppMessage.ReRenderWithoutIt]: () => "Run 'spec-controller balance --render-from-json <path>' without it.",
  [AppMessage.ReRenderWithoutThem]: () => "Run 'spec-controller balance --render-from-json <path>' without them.",
  [AppMessage.RunIdWithoutStore]: (runId) =>
    `--run-id names a stored run, and was given '${runId}' with no --store, so no run is kept under it.`,
  [AppMessage.KeepRunUnderName]: (command) =>
    `To keep the run under that name, give --store <root> as well; otherwise run '${command}' without --run-id.`,
  [AppMessage.HelpTitle]: () => "spec-controller — reconcile scenarios against observed evidence",
  [AppMessage.HelpUsage]: () => "Usage:",
  [AppMessage.HelpCommands]: () => "Commands:",
  [AppMessage.HelpHostModifiers]: () => "Host modifiers (before the command):",
  [AppMessage.HelpOptions]: () => "Options:",
  [AppMessage.HelpArguments]: () => "Arguments:",
  [AppMessage.HelpPointer]: () => "Full flags, examples, and CI wiring: doc/how_to_use.md.",
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
  [AppMessage.CucumberFlag]: () => "A Cucumber JSON report — runtime test evidence.",
  [AppMessage.CiFlag]: () =>
    "Your CI workflows — a file, or a directory of them (default .github/workflows). " +
    "Where a static check you have not converted is found running over the real source, " +
    "and where a check step's `id:` supplies the @SCN its result cites.",
  [AppMessage.PackageJsonFlag]: () =>
    "The target's package.json — its `scripts`, and its specController.runners, specController.notChecks " +
    "and specController.deferralTags. A fitness check is declared by its @fitness scenario and the CI step " +
    "whose id: is that scenario's @SCN; no manifest key names one.",
  [AppMessage.CiStepsFlag]: () =>
    "The CI run's own record of what each of its steps did — your pipeline's `toJSON(steps)` dump, " +
    "evidence for the converted fitness checks. Omit it if you have converted none.",
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
    "A fitness check is credited by the outcome of its own CI step: put the check's @SCN on that step's `id:` " +
    "and hand balance the run's step record with --ci-steps.",
  [AppMessage.AllocateSummary]: () =>
    "Print the next @SCN code for a feature part: one past the highest the repository has ever carried, " +
    "the code alone on stdout.",
  [AppMessage.FeaturePartArgument]: () => "The feature part: a feature file's header code, two to five of A-Z and 0-9.",
  [AppMessage.NewFlag]: () =>
    "Start a part no feature file's header carries yet: its first code, " +
    "or one past any number the repository already carries for it.",
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
