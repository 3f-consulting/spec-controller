import { describe, it, expect } from "vitest";

import {
  CORE_MESSAGES,
  CoreMessage,
  QUALITY_CHECK_FAULT_MESSAGES,
  QualityCheckFaultCode,
  type CoreMessages,
  type QualityCheckFault,
} from "@3f-consulting/spec-controller-core/internal";
import { APP_MESSAGES, AppMessage, UNREADABLE_SUBJECTS, Unreadable, type AppMessages } from "./messages.js";

function codesOf(codes: object): number[] {
  return Object.values(codes)
    .filter((member): member is number => typeof member === "number")
    .sort((a, b) => a - b);
}

function keysOf(catalogue: object): number[] {
  return Object.keys(catalogue)
    .map(Number)
    .sort((a, b) => a - b);
}

const SAMPLE_FAULTS: {
  readonly [C in QualityCheckFaultCode]: readonly Extract<QualityCheckFault, { code: C }>[];
} = {
  [QualityCheckFaultCode.EvidenceDivergesFromOutcome]: [
    {
      code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
      evidence: "evidence-obligation",
      outcome: "watermelon",
      presenceForOutcome: "Exists",
      presenceFound: "None",
    },
    {
      code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
      evidence: "evidence-observation",
      outcome: "cites-unknown-scenario",
      presenceForOutcome: "None",
      presenceFound: "Exists",
    },
  ],
};

function renderedFault(fault: QualityCheckFault): string {
  return (QUALITY_CHECK_FAULT_MESSAGES[fault.code] as (f: QualityCheckFault) => string)(fault);
}

function presencesOf(fault: QualityCheckFault): readonly string[] {
  return [fault.presenceForOutcome, fault.presenceFound];
}

type CoreTemplate = {
  [C in CoreMessage]: CoreMessages[C] extends string ? never : C;
}[CoreMessage];

const SAMPLE_CORE_PARAMS: { readonly [C in CoreTemplate]: Parameters<CoreMessages[C]> } = {
  [CoreMessage.ProvenanceTargetRepo]: ["/repo"],
  [CoreMessage.ProvenanceTargetRepoUntargeted]: ["unknown-target", "owner/repo"],
  [CoreMessage.ProvenanceNotSupplied]: ["--results"],
  [CoreMessage.ProvenanceRunTimestamp]: ["2026-10-04T00:00:00Z"],
  [CoreMessage.ProvenanceSourceSha]: ["abc1234"],
  [CoreMessage.ProvenanceToolSha]: ["def5678"],
  [CoreMessage.ProvenanceToolVersion]: ["1.0.0"],
  [CoreMessage.ConfigurationWrongKind]: ["specController.runners", "a string", "an object"],
  [CoreMessage.ConfigurationUnknownKey]: ["specController.extra"],
  [CoreMessage.ProofsNeverRan]: [2],
  [CoreMessage.RunUnsound]: ["2 proofs never ran."],
  [CoreMessage.BrokenEvidenceWhatBroke]: ["features/a.feature:3"],
  [CoreMessage.ScenarioCodeErrorCount]: [2],
  [CoreMessage.ScenarioCodeErrorsFraming]: ["2 scenario code errors"],
  [CoreMessage.SeveralScnCodesFraming]: ["1 scenario code error"],
  [CoreMessage.MisfiledAndSeveralScnCodesFraming]: ["2 scenario code errors"],
  [CoreMessage.ScenarioCodesCleanOver]: ["2 feature files", "2 feature codes"],
  [CoreMessage.CleanNoCodedScenario]: ["over 1 feature file", "it"],
  [CoreMessage.CleanEachFileOwnCode]: ["over 2 feature files"],
  [CoreMessage.CleanOthersNoFeatureCode]: ["over 3 feature files", 1, "holds"],
  [CoreMessage.DuplicateFeatureCode]: ["ABC", 2, "a.feature, b.feature"],
  [CoreMessage.ForeignScnCodeOneCarrier]: ["a.feature", "ABC", "SCN-DEF-001", "DEF", "d.feature"],
  [CoreMessage.ForeignScnCodeManyCarriers]: ["a.feature", "ABC", "SCN-DEF-001", "DEF", 2, "d.feature, e.feature"],
  [CoreMessage.ForeignScnCodeNoCarrier]: ["a.feature", "ABC", "SCN-DEF-001", "DEF"],
  [CoreMessage.NoFeatureCode]: ["a.feature"],
  [CoreMessage.ScenarioSeveralScnCodes]: ["a.feature", "a scenario", ["SCN-ABC-001", "SCN-ABC-002"]],
  [CoreMessage.VerdictExit]: [1],
  [CoreMessage.ScenarioCodeErrorsGloss]: [""],
  [CoreMessage.SeveralScnCodesGloss]: [""],
  [CoreMessage.MisfiledAndSeveralScnCodesGloss]: [""],
  [CoreMessage.NothingToReconcileGloss]: ["features"],
  [CoreMessage.PendingTally]: [1],
  [CoreMessage.EvidenceObservationsSum]: [3, 1, 1, 1],
  [CoreMessage.FitnessCiStep]: [2],
  [CoreMessage.RunnerKeyNotATier]: ["smoke"],
  [CoreMessage.ReconcilerStep]: ["ci.yml / build / balance", "this step runs the reconciliation this report is"],
  [CoreMessage.StepExcluded]: ["ci.yml / build / lint"],
  [CoreMessage.NotChecksEntryMatchesNoStep]: ["`specController.notChecks`", "ci.yml / build / gone"],
  [CoreMessage.NotChecksEntryNotAStepName]: ["`specController.notChecks`", "`Deploy`"],
  [CoreMessage.StepAccountingNotAppliedLabel]: ["`specController.notChecks`", "`ci.yml`"],
  [CoreMessage.ScenarioClaimReconciliationsOutOfBalance]: [1, 3],
  [CoreMessage.NotGroupedByFeature]: ["1 Claim Reconciliation(s) for cited scenario ids with no real scenario"],
  [CoreMessage.PhantomClaimReconciliations]: [1],
  [CoreMessage.UnnamedClaimReconciliations]: [1],
  [CoreMessage.NoScnCodeScenarios]: [1],
  [CoreMessage.ClaimReconciliationTally]: [3, 2, 1],
  [CoreMessage.PhantomClaimTally]: [1],
  [CoreMessage.UnnamedClaimTally]: [1],
  [CoreMessage.ExcludedScnOccurrences]: [1],
  [CoreMessage.UntaggedScenarios]: [1],
  [CoreMessage.SharedScnCodes]: [4, 1],
  [CoreMessage.SharedScnCodeScenario]: ["login.feature", "a user with the right password is let in"],
  [CoreMessage.PendingItemFor]: ["unit"],
  [CoreMessage.CheckStepNoOutcome]: ["SCN-ABC-001"],
  [CoreMessage.CheckStepSkipped]: ["SCN-ABC-001"],
  [CoreMessage.CheckStepEnded]: ["SCN-ABC-001", "cancelled"],
  [CoreMessage.AmbiguousNamedStep]: ["Given a thing"],
  [CoreMessage.ManifestKindOfType]: ["number"],
  [CoreMessage.UnnamedClaimGroupCounts]: [3, 2, 1],
  [CoreMessage.UnnamedClaimCiSteps]: [["lint:bar", "lint:foo"]],
  [CoreMessage.UnnamedClaimFailedNames]: [["spawns yarn", "reads the lockfile"]],
  [CoreMessage.SeveralScnCodes]: [["SCN-ABC-001", "SCN-ABC-002"]],
  [CoreMessage.SharedScnCode]: ["SCN-ABC-001"],
};

function renderedCore(code: CoreMessage): string {
  const entry = CORE_MESSAGES[code];
  if (typeof entry === "string") return entry;
  return (entry as (...params: unknown[]) => string)(...SAMPLE_CORE_PARAMS[code as CoreTemplate]);
}

const SAMPLE_APP_PARAMS: { readonly [C in AppMessage]: Parameters<AppMessages[C]> } = {
  [AppMessage.History]: [],
  [AppMessage.Repository]: [],
  [AppMessage.Tree]: [],
  [AppMessage.TreeDirectory]: [],
  [AppMessage.TreeFile]: [],
  [AppMessage.FeatureFile]: [],
  [AppMessage.FeatureCorpus]: [],
  [AppMessage.WorkingDirectory]: [],
  [AppMessage.CouldNotBeRead]: ["the tree", "EACCES"],
  [AppMessage.CouldNotBeReadAt]: ["a file in the tree", "features/a.feature", "EISDIR"],
  [AppMessage.UsageError]: ["allocate", "too many arguments"],
  [AppMessage.GitExited]: [["log"], 128, "fatal: not a git repository"],
  [AppMessage.FeatureCorpusDirectoryMissing]: ["features"],
  [AppMessage.StoredRunDirectoryNotCreated]: [],
  [AppMessage.FormatNamesStoredRunManifest]: ["store/t/r1/run.yaml", "store/t/r1/run.yaml", "store/t/r1"],
  [AppMessage.StoredRunReadsItsManifest]: ["store/t/r1/run.yaml", "store/t/r1/run.yaml", "the cucumber report"],
  [AppMessage.SeeCommandsAndModifiers]: [],
  [AppMessage.SeeModifiers]: [],
  [AppMessage.SeeFlags]: ["spec-controller balance"],
  [AppMessage.SeeFlagsAndValues]: ["spec-controller balance"],
  [AppMessage.SeeArguments]: ["spec-controller allocate"],
  [AppMessage.NoCommandAfterModifiers]: ["--store"],
  [AppMessage.ModifierTookCommand]: ["--store", "balance"],
  [AppMessage.GiveModifierItsOwnValue]: ["--store", "<root>", "balance"],
  [AppMessage.FlagBeforeCommand]: ["--strict", "--store, --run-id"],
  [AppMessage.UnknownCommand]: ["frobnicate"],
  [AppMessage.ModifiersNotTaken]: ["allocate", "--store"],
  [AppMessage.RunWithoutModifiers]: ["allocate"],
  [AppMessage.MissingValue]: ["--features", "spec-controller balance", "<dir>"],
  [AppMessage.GivenTwice]: ["--strict", "spec-controller balance"],
  [AppMessage.EqualsForm]: ["--features=x", "spec-controller balance", "--features x"],
  [AppMessage.TakesNoValue]: ["--strict", "spec-controller balance", "yes"],
  [AppMessage.ExtraArgument]: ["extra", "spec-controller allocate", "<part>"],
  [AppMessage.NotAFlag]: ["stray", "spec-controller balance"],
  [AppMessage.MisplacedModifier]: ["--store", "balance"],
  [AppMessage.UnknownFlag]: ["--nope", "spec-controller balance", "1.0.0", "balance"],
  [AppMessage.PinDrifted]: ["balance", "--nope"],
  [AppMessage.OtherwiseSeeFlags]: ["spec-controller balance"],
  [AppMessage.RetiredFlag]: ["--measurements", "spec-controller balance", "0.1.0-alpha.5", "1.0.0"],
  [AppMessage.DoNotPinRetired]: [],
  [AppMessage.ReRenderNotStored]: ["--store"],
  [AppMessage.ReRenderWithoutIt]: [],
  [AppMessage.ReRenderWithoutThem]: [],
  [AppMessage.RunIdWithoutStore]: ["r1"],
  [AppMessage.KeepRunUnderName]: ["balance"],
  [AppMessage.HelpTitle]: [],
  [AppMessage.HelpUsage]: [],
  [AppMessage.HelpCommands]: [],
  [AppMessage.HelpHostModifiers]: [],
  [AppMessage.HelpOptions]: [],
  [AppMessage.HelpArguments]: [],
  [AppMessage.HelpPointer]: [],
  [AppMessage.HelpFlag]: [],
  [AppMessage.StoreModifier]: [],
  [AppMessage.RunIdModifier]: [],
  [AppMessage.BalanceSummary]: [],
  [AppMessage.FeaturesFlag]: [],
  [AppMessage.VitestFlag]: [],
  [AppMessage.PytestFlag]: [],
  [AppMessage.JestFlag]: [],
  [AppMessage.JunitFlag]: [],
  [AppMessage.RspecFlag]: [],
  [AppMessage.CucumberFlag]: [],
  [AppMessage.CiFlag]: [],
  [AppMessage.PackageJsonFlag]: [],
  [AppMessage.CiStepsFlag]: [],
  [AppMessage.TargetFlag]: [],
  [AppMessage.SourceShaFlag]: [],
  [AppMessage.FormatFlag]: [],
  [AppMessage.RenderFromJsonFlag]: [],
  [AppMessage.StrictFlag]: [],
  [AppMessage.ExitZeroFlag]: [],
  [AppMessage.ConfigurationHeading]: [],
  [AppMessage.DeferralTagsKey]: [],
  [AppMessage.DeferralTagsExtend]: [],
  [AppMessage.DeferralTagsNeverReplace]: [],
  [AppMessage.BuiltInDeferralTags]: ["@wip, @pending"],
  [AppMessage.MeasurementsReplacement]: [],
  [AppMessage.AllocateSummary]: [],
  [AppMessage.FeaturePartArgument]: [],
  [AppMessage.NewFlag]: [],
  [AppMessage.LegacyJsonRemoved]: [],
  [AppMessage.InputPathMissing]: ["--vitest", "vitest.json"],
  [AppMessage.FlaggedFile]: ["--vitest"],
  [AppMessage.FlaggedReport]: ["--vitest"],
  [AppMessage.FlaggedRecord]: ["--ci-steps"],
  [AppMessage.FlaggedManifest]: ["--package-json"],
  [AppMessage.FlaggedSavedReport]: ["--render-from-json"],
  [AppMessage.FlaggedCorpus]: ["--features"],
  [AppMessage.FlaggedWorkflows]: ["--ci"],
  [AppMessage.DefaultPackageJson]: [],
  [AppMessage.DefaultFeatureCorpus]: [],
  [AppMessage.DefaultCiWorkflows]: [],
  [AppMessage.VitestReportShape]: [],
  [AppMessage.JunitReportShape]: [],
  [AppMessage.JestReportShape]: [],
  [AppMessage.JunitXmlReportShape]: [],
  [AppMessage.RspecReportShape]: [],
  [AppMessage.CucumberReportShape]: [],
  [AppMessage.CiStepRecordShape]: [],
  [AppMessage.PackageManifestShape]: [],
  [AppMessage.NotValidJson]: ["The --vitest report", "vitest.json", "Unexpected end of JSON input"],
  [AppMessage.NotValidJsonInShape]: ["The --jest report", "of the JSON report jest --json writes", "jest.json", "Unexpected end of JSON input"],
  [AppMessage.XmlFaultAtLine]: ["char '{' is not expected", 1],
  [AppMessage.NotValidXml]: ["The --pytest report", "of the JUnit XML report pytest --junitxml writes", "report.xml", "char '{' is not expected at line 1"],
  [AppMessage.NotInShape]: ["The --vitest report", "the Vitest JSON reporter writes", "vitest.json", "testResults is missing"],
  [AppMessage.NotASavedReconciliation]: ["The --render-from-json file", "saved.json", "ledger is missing"],
  [AppMessage.NotRenderableAsSaved]: ["The --render-from-json file", "saved.json", "cannot read properties of undefined"],
  [AppMessage.CorpusFileUnparseable]: ["The --features corpus", "features/a.feature", "(3:1): expected: #Feature"],
  [AppMessage.WorkflowNotYaml]: ["The --ci workflows", "ci.yml", "Flow sequence in block collection must end with a ]"],
  [AppMessage.ReRenderReadsOnly]: ["--features"],
  [AppMessage.UnknownFormat]: ["html", "md, json"],
  [AppMessage.MoreThanOneToStdout]: ["md, json"],
  [AppMessage.OutputsShareFile]: ["md:out.md", "json:out.md"],
  [AppMessage.OutputOverwritesInput]: ["json:vitest.json", "The --vitest report", "vitest.json"],
  [AppMessage.OutputOverwritesStoredRun]: ["store/t/r0/run.yaml", "store/t/r0"],
  [AppMessage.ReportNotWritten]: ["json"],
  [AppMessage.HistoryBoundary]: ["not a git repository — none read", "a code above SCN-ONE-001"],
  [AppMessage.ShallowHistoryUnread]: ["abc1234"],
  [AppMessage.NoRepositoryHistoryRead]: [],
  [AppMessage.RiskOfPartCode]: ["ONE"],
  [AppMessage.RiskAboveCode]: ["SCN-ONE-001"],
  [AppMessage.HighestSeenNone]: [],
  [AppMessage.HighestSeenInTree]: ["SCN-ONE-005", "features/one.feature", 8],
  [AppMessage.HighestSeenInCommit]: ["SCN-ONE-005", "features/one.feature", 8, "abc1234"],
  [AppMessage.UnknownPartRefused]: ["ZZZ", "ONE, TWO"],
  [AppMessage.NoPartsCarried]: [],
  [AppMessage.PartAlreadyHeaded]: ["ONE"],
  [AppMessage.NoFeaturePartGiven]: [],
  [AppMessage.NotAFeaturePart]: ["one"],
  [AppMessage.DefaultCorpusFeatureFile]: [],
  [AppMessage.FlaggedCorpusFeatureFile]: [],
  [AppMessage.DefaultCiWorkflow]: [],
  [AppMessage.FlaggedCiWorkflow]: [],
  [AppMessage.FlaggedCiFolderWorkflow]: [],
  [AppMessage.FormatOnStandardOutput]: ["md"],
  [AppMessage.ShapeKindList]: [],
  [AppMessage.ShapeKindObject]: [],
  [AppMessage.ShapeKindOfType]: ["number"],
  [AppMessage.ShapeTopLevel]: [],
  [AppMessage.ShapeWrongKind]: ["testResults", "an object", "a list"],
  [AppMessage.ShapeFieldMissing]: ["ledger.claimReconciliations"],
  [AppMessage.HostUsageError]: ["--store applies to stored runs only"],
  [AppMessage.HelpUsageLine]: ["[--store <dir>] [--run-id <id>]"],
  [AppMessage.UnexpectedError]: ["Error", "write EPIPE"],
  [AppMessage.UnexpectedErrorAfterVerdict]: ["Error", "write EPIPE"],
};

function renderedApp(code: AppMessage): string {
  return (APP_MESSAGES[code] as (...params: unknown[]) => string)(...SAMPLE_APP_PARAMS[code]);
}

describe("[SCN-MSG-002] every message catalogue is total over its codes, with no empty entry", () => {
  it("holds core's fault catalogue to every fault code and nothing else, and every rendered message to its own fault's parameters", () => {
    const codes = codesOf(QualityCheckFaultCode);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(QUALITY_CHECK_FAULT_MESSAGES)).toEqual(codes);
    expect(keysOf(SAMPLE_FAULTS)).toEqual(codes);

    for (const fault of Object.values(SAMPLE_FAULTS).flat()) {
      const message = renderedFault(fault);
      expect(message.trim()).not.toBe("");
      expect(message).toContain(fault.outcome);
      for (const presence of presencesOf(fault)) expect(message).toContain(presence);
    }
  });

  it("holds core's report catalogue to every core message code and nothing else, with no entry rendering blank", () => {
    const codes = codesOf(CoreMessage);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(CORE_MESSAGES)).toEqual(codes);
    const templates = (codes as CoreMessage[]).filter((code) => typeof CORE_MESSAGES[code] !== "string");
    expect(keysOf(SAMPLE_CORE_PARAMS).map((code) => CoreMessage[code])).toEqual(templates.map((code) => CoreMessage[code]));

    for (const code of codes as CoreMessage[]) expect(renderedCore(code).trim()).not.toBe("");
  });

  it("holds the app's catalogue to every app message code and nothing else, with no entry rendering blank", () => {
    const codes = codesOf(AppMessage);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(APP_MESSAGES)).toEqual(codes);

    for (const code of codes as AppMessage[]) expect(renderedApp(code).trim()).not.toBe("");
  });

  it("holds the app's unreadable subjects to every Unreadable member and nothing else, with no blank subject", () => {
    const members = codesOf(Unreadable) as Unreadable[];
    expect(members.length).toBeGreaterThan(0);
    expect(keysOf(UNREADABLE_SUBJECTS)).toEqual(members);

    for (const member of members) expect(UNREADABLE_SUBJECTS[member].trim()).not.toBe("");
  });
});
