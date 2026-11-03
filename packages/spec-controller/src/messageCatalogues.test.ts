import { fileURLToPath } from "node:url";

import {
  isDateElement,
  isLiteralElement,
  isNumberElement,
  isPluralElement,
  isPoundElement,
  isSelectElement,
  isTimeElement,
  parse,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";
import { Ajv } from "ajv";
import { ESLint } from "eslint";
import { describe, it, expect } from "vitest";

import {
  CORE_MESSAGES,
  CoreMessage,
  QUALITY_CHECK_FAULT_MESSAGES,
  QualityCheckFaultCode,
  type CoreMessages,
  type QualityCheckFault,
} from "@3f-consulting/spec-controller-core/internal";
import type { MessageValues } from "@3f-consulting/spec-controller-core";
import APP_TEXTS from "./messages.en.json" with { type: "json" };
import {
  APP_MESSAGES,
  AppError,
  AppMessage,
  UNREADABLE_SUBJECTS,
  Unreadable,
  type AppMessages,
  type AppErrorValues,
  type AppMessageValues,
  type WordedAppMessage,
} from "./messages.js";
import { message } from "./appText.js";

type Code = number | string;

function byCode(a: Code, b: Code): number {
  if (typeof a !== typeof b) return typeof a === "number" ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function codesOf(codes: object): Code[] {
  return Object.entries(codes)
    .filter(([name]) => Number.isNaN(Number(name)))
    .map(([, member]) => member as Code)
    .sort(byCode);
}

function handlesWithoutEntry(handles: object, catalogue: object): string[] {
  return Object.entries(handles)
    .filter(([name, member]) => Number.isNaN(Number(name)) && !Object.hasOwn(catalogue, member as PropertyKey))
    .map(([name]) => name);
}

function entriesWithoutCode(codes: readonly string[], catalogue: object): string[] {
  return Object.keys(catalogue).filter((key) => !codes.includes(key));
}

function keysOf(catalogue: object): Code[] {
  return Object.keys(catalogue)
    .map((key) => (Number.isNaN(Number(key)) ? key : Number(key)))
    .sort(byCode);
}

const NON_BLANK_MESSAGES = { type: "object", additionalProperties: { type: "string", pattern: "\\S" } };

function blankEntries(catalogue: object): string[] {
  const nonBlank = new Ajv({ allErrors: true }).compile(NON_BLANK_MESSAGES);
  if (nonBlank(catalogue)) return [];
  return (nonBlank.errors ?? []).map(({ instancePath }) => instancePath.slice(1));
}

function placeholdersOf(elements: readonly MessageFormatElement[]): string[] {
  return elements.flatMap((element) => {
    if (isLiteralElement(element) || isPoundElement(element)) return [];
    const branches = isSelectElement(element) || isPluralElement(element) ? Object.values(element.options) : [];
    return [element.value, ...branches.flatMap((branch) => placeholdersOf(branch.value))];
  });
}

function placeholdersIn(text: string): string[] {
  return [...new Set(placeholdersOf(parse(text, { ignoreTag: true })))];
}

function placeholdersNotGiven(
  texts: Readonly<Record<string, string>>,
  valuesOf: Readonly<Record<string, MessageValues>>,
): { message: string; placeholder: string }[] {
  return Object.entries(texts).flatMap(([key, text]) =>
    placeholdersIn(text)
      .filter((placeholder) => !Object.hasOwn(valuesOf[key] ?? {}, placeholder))
      .map((placeholder) => ({ message: key, placeholder })),
  );
}

function valuesNotUsed(
  texts: Readonly<Record<string, string>>,
  valuesOf: Readonly<Record<string, MessageValues>>,
): { message: string; value: string }[] {
  return Object.entries(texts).flatMap(([key, text]) => {
    const used = placeholdersIn(text);
    return Object.keys(valuesOf[key] ?? {})
      .filter((value) => !used.includes(value))
      .map((value) => ({ message: key, value }));
  });
}

function unparseable(texts: Readonly<Record<string, string>>): { message: string; error: string; offset: number }[] {
  return Object.entries(texts).flatMap(([key, text]) => {
    try {
      parse(text, { ignoreTag: true });
      return [];
    } catch (error) {
      const { message, location } = error as SyntaxError & { location: { start: { offset: number } } };
      return [{ message: key, error: message, offset: location.start.offset }];
    }
  });
}

// As written, a doubled apostrophe is one apostrophe and a lone brace between apostrophes is that brace.
function asWritten(source: string): string {
  return source.replace(/''|'([{}])'/g, (_, brace?: string) => brace ?? "'");
}

function printsAsWritten(text: string, elements: readonly MessageFormatElement[]): boolean {
  return elements.every((element) => {
    if (isLiteralElement(element)) {
      return element.value === asWritten(text.slice(element.location?.start.offset, element.location?.end.offset));
    }
    if (isSelectElement(element) || isPluralElement(element)) {
      return Object.values(element.options).every((branch) => printsAsWritten(text, branch.value));
    }
    return !isNumberElement(element) && !isDateElement(element) && !isTimeElement(element);
  });
}

function notAsWritten(texts: Readonly<Record<string, string>>): string[] {
  return Object.entries(texts)
    .filter(([, text]) => text.includes("#") || !printsAsWritten(text, parse(text, { ignoreTag: true, captureLocation: true })))
    .map(([key]) => key);
}

function choosesOtherThanByCount(elements: readonly MessageFormatElement[]): boolean {
  return elements.some((element) => {
    if (isSelectElement(element)) return true;
    if (!isPluralElement(element)) return false;
    return Object.entries(element.options).some(([selector, branch]) => selector.startsWith("=") || choosesOtherThanByCount(branch.value));
  });
}

function choosingWords(texts: Readonly<Record<string, string>>): string[] {
  return Object.entries(texts)
    .filter(([, text]) => choosesOtherThanByCount(parse(text, { ignoreTag: true })))
    .map(([key]) => key);
}

function renderedByHandle<C>(handles: object, rendered: (code: C) => string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(handles)
      .filter(([name]) => Number.isNaN(Number(name)))
      .map(([name, member]) => [name, rendered(member as C)]),
  );
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
  [CoreMessage.RunnerKeyNotALayer]: ["smoke"],
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

const SAMPLE_APP_PARAMS: { readonly [C in keyof AppMessages]: Parameters<AppMessages[C]> } = {
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
  [AppMessage.GitExited]: [["log"], 128, "fatal: not a git repository"],
  [AppMessage.FeatureCorpusDirectoryMissing]: ["features"],
  [AppMessage.StoredRunDirectoryNotCreated]: [],
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
  [AppMessage.ReportNotWritten]: ["json"],
  [AppMessage.HistoryBoundary]: ["not a git repository — none read", "a code above SCN-ONE-001"],
  [AppMessage.ShallowHistoryUnread]: ["abc1234"],
  [AppMessage.NoRepositoryHistoryRead]: [],
  [AppMessage.RiskOfPartCode]: ["ONE"],
  [AppMessage.RiskAboveCode]: ["SCN-ONE-001"],
  [AppMessage.HighestSeenNone]: [],
  [AppMessage.HighestSeenInTree]: ["SCN-ONE-005", "features/one.feature", 8],
  [AppMessage.HighestSeenInCommit]: ["SCN-ONE-005", "features/one.feature", 8, "abc1234"],
  [AppMessage.PartAlreadyHeaded]: ["ONE"],
  [AppMessage.ShapeKindList]: [],
  [AppMessage.ShapeKindObject]: [],
  [AppMessage.ShapeKindOfType]: ["number"],
  [AppMessage.ShapeTopLevel]: [],
  [AppMessage.ShapeWrongKind]: ["testResults", "an object", "a list"],
  [AppMessage.ShapeFieldMissing]: ["ledger.claimReconciliations"],
  [AppMessage.HelpUsageLine]: ["[--store <dir>] [--run-id <id>]"],
  [AppError.UnexpectedError]: ["Error", "write EPIPE"],
  [AppError.UnexpectedErrorAfterVerdict]: ["Error", "write EPIPE"],
};

type AppValues = AppMessageValues & AppErrorValues;

const SAMPLE_APP_VALUES: { readonly [C in keyof AppValues]: AppValues[C] } = {
  [AppMessage.UsageError]: { command: "allocate", message: "too many arguments" },
  [AppError.FormatNamesStoredRunManifest]: { formatPath: "store/t/r1/run.yaml", manifestPath: "store/t/r1/run.yaml", runDir: "store/t/r1" },
  [AppError.StoredRunReadsItsManifest]: { manifestPath: "store/t/r1/run.yaml", inputPath: "store/t/r1/run.yaml", inputSubject: "the cucumber report" },
  [AppMessage.SeeFlags]: { scope: "spec-controller balance" },
  [AppMessage.SeeFlagsAndValues]: { scope: "spec-controller balance" },
  [AppMessage.SeeArguments]: { scope: "spec-controller allocate" },
  [AppError.NoCommandAfterModifiers]: { modifiers: "--store" },
  [AppError.ModifierTookCommand]: { modifier: "--store", command: "balance" },
  [AppMessage.GiveModifierItsOwnValue]: { modifier: "--store", arg: "<root>", command: "balance" },
  [AppError.FlagBeforeCommand]: { flag: "--strict", modifiers: "--store, --run-id" },
  [AppError.UnknownCommand]: { command: "frobnicate" },
  [AppError.ModifiersNotTaken]: { command: "allocate", modifiers: "--store" },
  [AppMessage.RunWithoutModifiers]: { command: "allocate" },
  [AppError.MissingValue]: { flag: "--features", scope: "spec-controller balance", arg: "<dir>" },
  [AppError.GivenTwice]: { flag: "--strict", scope: "spec-controller balance" },
  [AppError.EqualsForm]: { token: "--features=x", scope: "spec-controller balance", spelling: "--features x" },
  [AppError.TakesNoValue]: { flag: "--strict", scope: "spec-controller balance", value: "yes" },
  [AppError.ExtraArgument]: { token: "extra", scope: "spec-controller allocate", takes: "<part>" },
  [AppError.NotAFlag]: { token: "stray", scope: "spec-controller balance" },
  [AppError.MisplacedModifier]: { modifier: "--store", command: "balance" },
  [AppError.UnknownFlag]: { flag: "--nope", scope: "spec-controller balance", toolVersion: "1.0.0", command: "balance" },
  [AppMessage.PinDrifted]: { command: "balance", flag: "--nope" },
  [AppMessage.OtherwiseSeeFlags]: { scope: "spec-controller balance" },
  [AppError.RetiredFlag]: { flag: "--measurements", scope: "spec-controller balance", retiredIn: "0.1.0-alpha.5", toolVersion: "1.0.0" },
  [AppError.ReRenderNotStored]: { modifiers: "--store" },
  [AppError.RunIdWithoutStore]: { runId: "r1" },
  [AppMessage.KeepRunUnderName]: { command: "balance" },
  [AppError.ReRenderReadsOnly]: { ignored: "--features" },
  [AppError.UnknownFormat]: { formats: "html", supported: "md, json" },
  [AppError.MoreThanOneToStdout]: { formats: "md, json" },
  [AppError.OutputsShareFile]: { first: "md:out.md", second: "json:out.md" },
  [AppError.OutputOverwritesInput]: { output: "json:vitest.json", subject: "The --vitest report", path: "vitest.json" },
  [AppError.OutputOverwritesStoredRun]: { path: "store/t/r0/run.yaml", runDir: "store/t/r0" },
  [AppError.UnknownPartRefused]: { part: "ZZZ", parts: "ONE, TWO" },
  [AppError.NotAFeaturePart]: { part: "one" },
  [AppMessage.FormatOnStandardOutput]: { fmt: "md" },
  [AppMessage.CodedUsageError]: { command: "allocate", code: AppError.ExtraArgument, message: "too many arguments" },
  [AppMessage.CodedHostUsageError]: { code: AppError.ModifiersNotTaken, message: "--store applies to stored runs only" },
};

function renderedApp(code: AppMessage | AppError): string {
  if (code in APP_MESSAGES) {
    const tabled = code as keyof AppMessages;
    return (APP_MESSAGES[tabled] as (...params: unknown[]) => string)(...SAMPLE_APP_PARAMS[tabled]);
  }
  const worded = code as WordedAppMessage | AppError;
  const values = (SAMPLE_APP_VALUES as Partial<Record<WordedAppMessage | AppError, MessageValues>>)[worded];
  return (message as (code: WordedAppMessage | AppError, values?: MessageValues) => string)(worded, values);
}

const SAMPLE_FAULTS: { readonly [C in QualityCheckFaultCode]: Extract<QualityCheckFault, { readonly code: C }> } = {
  [QualityCheckFaultCode.EvidenceDivergesFromOutcome]: {
    code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
    evidence: "evidence-obligation",
    outcome: "satisfied",
    presenceForOutcome: "Exists",
    presenceFound: "None",
  },
};

function renderedFault(code: QualityCheckFaultCode): string {
  return (QUALITY_CHECK_FAULT_MESSAGES[code] as (fault: QualityCheckFault) => string)(SAMPLE_FAULTS[code]);
}

describe("[SCN-MSG-002] every code has exactly one message", () => {
  it("holds core's report catalogue to every core message code and nothing else", () => {
    const codes = codesOf(CoreMessage);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(CORE_MESSAGES)).toEqual(codes);
    const templates = (codes as CoreMessage[]).filter((code) => typeof CORE_MESSAGES[code] !== "string");
    expect((keysOf(SAMPLE_CORE_PARAMS) as CoreMessage[]).map((code) => CoreMessage[code])).toEqual(templates.map((code) => CoreMessage[code]));
  });

  it("holds the app's catalogue to every app message code and nothing else", () => {
    const codes = [...codesOf(AppMessage), ...codesOf(AppError)].sort(byCode);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf({ ...APP_MESSAGES, ...APP_TEXTS })).toEqual(codes);
  });

  it("names a handle that has no entry in its catalogue", () => {
    const handles = { Kept: "kept", Lost: "lost" };
    expect(handlesWithoutEntry(handles, { kept: "Kept." })).toEqual(["Lost"]);
  });

  it("names a code given two entries in an app data file, linted by the repository's own ESLint configuration", async () => {
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    const eslint = new ESLint({ cwd: root });
    const text = '{\n  "unknown-flag": "One.",\n  "unknown-flag": "Two."\n}\n';
    const [result] = await eslint.lintText(text, { filePath: `${root}packages/spec-controller/src/messages.en.json` });
    const found = result?.messages.map(({ ruleId, message }) => ({ ruleId, message }));
    expect(found).toEqual([{ ruleId: "json/no-duplicate-keys", message: expect.stringContaining('"unknown-flag"') }]);
  });

  it("holds core's fault catalogue to every fault code and nothing else, with no fault rendering blank", () => {
    const codes = codesOf(QualityCheckFaultCode);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(QUALITY_CHECK_FAULT_MESSAGES)).toEqual(codes);

    for (const code of codes as QualityCheckFaultCode[]) expect(renderedFault(code).trim()).not.toBe("");
  });

  it("holds the app's unreadable subjects to every Unreadable member and nothing else, each its own and none blank", () => {
    const members = codesOf(Unreadable) as Unreadable[];
    expect(members.length).toBeGreaterThan(0);
    expect(keysOf(UNREADABLE_SUBJECTS)).toEqual(members);

    const subjects = members.map((member) => UNREADABLE_SUBJECTS[member]);
    expect(new Set(subjects).size).toBe(members.length);
    for (const subject of subjects) expect(subject.trim()).not.toBe("");
  });
});

describe("[SCN-MSG-003] every message belongs to a code", () => {
  it("holds the app's data file to entries an app message or error code uses, naming any other", () => {
    const codes = [...codesOf(AppMessage), ...codesOf(AppError)].filter((code) => typeof code === "string");
    expect(codes.length).toBeGreaterThan(0);
    expect(entriesWithoutCode(codes, APP_TEXTS)).toEqual([]);
  });
});

describe("[SCN-MSG-004] no message is empty", () => {
  it("names an entry that is empty or only whitespace", () => {
    expect(blankEntries({ kept: "Kept.", empty: "", spaces: " \t\n" })).toEqual(["empty", "spaces"]);
  });

  it("holds the app's data file to messages that are not blank", () => {
    expect(blankEntries(APP_TEXTS)).toEqual([]);
  });

  it("holds every entry of core's report catalogue and the app's catalogue to a message that does not render blank, naming it by its handle", () => {
    expect(blankEntries(renderedByHandle(CoreMessage, renderedCore))).toEqual([]);
    expect(blankEntries({ ...renderedByHandle(AppMessage, renderedApp), ...renderedByHandle(AppError, renderedApp) })).toEqual([]);
  });
});

describe("[SCN-MSG-005] a message uses only the values its code gives it", () => {
  it("names a message using a placeholder its code does not give, and the placeholder, in any branch of a plural", () => {
    const texts = { greeting: "Hello {name}, from {sender}.", files: "{count, plural, one {# file in {dir}} other {# files}}" };
    const values = { greeting: { name: "Ada" }, files: { count: 1 } };
    expect(placeholdersNotGiven(texts, values)).toEqual([
      { message: "greeting", placeholder: "sender" },
      { message: "files", placeholder: "dir" },
    ]);
  });

  it("holds every message in the app's data file to the values its code's sample values give", () => {
    expect(placeholdersNotGiven(APP_TEXTS, SAMPLE_APP_VALUES as Readonly<Record<string, MessageValues>>)).toEqual([]);
  });
});

describe("[SCN-MSG-006] a message uses every value its code gives it", () => {
  it("names a message leaving out a value its code gives, and the value, reading every branch of a plural", () => {
    const texts = { greeting: "Hello {name}.", files: "{count, plural, one {# file in {dir}} other {# files}}" };
    const values = { greeting: { name: "Ada", sender: "Bo" }, files: { count: 1, dir: "src", owner: "Cy" } };
    expect(valuesNotUsed(texts, values)).toEqual([
      { message: "greeting", value: "sender" },
      { message: "files", value: "owner" },
    ]);
  });

  it("holds every message in the app's data file to use every value its code's sample values give", () => {
    expect(valuesNotUsed(APP_TEXTS, SAMPLE_APP_VALUES as Readonly<Record<string, MessageValues>>)).toEqual([]);
  });
});

describe("[SCN-MSG-007] every message parses", () => {
  it("names a message the format cannot parse, with the parser's words and the offset where it failed", () => {
    const texts = { kept: "Hello {name}.", unclosed: "unknown command {command." };
    expect(unparseable(texts)).toEqual([{ message: "unclosed", error: "MALFORMED_ARGUMENT", offset: 16 }]);
  });

  it("holds every message in the app's data file to parse", () => {
    expect(unparseable(APP_TEXTS)).toEqual([]);
  });
});

describe("[SCN-MSG-008] every message prints its words as written", () => {
  it("names a message whose apostrophe, brace or hash sign would not print as written, or whose number the locale formats", () => {
    const texts = {
      doubled: "Run ''{scope} --help' to see the flags.",
      quotedBrace: "A literal '{' brace and '}' brace.",
      counted: "{count, plural, one {{count} file} other {{count} files}}",
      beforePlaceholder: "Run '{scope} --help' to see the flags.",
      swallowsText: "The '} flag's value is lost.",
      swallowsBrace: "An unclosed '{ brace.",
      inPlural: "{count, plural, one {'{count}' file} other {{count} files}}",
      hashOutside: "Item #1.",
      hashInside: "{count, plural, one {# file} other {# files}}",
      localeNumber: "{count, number} files.",
    };
    expect(notAsWritten(texts)).toEqual(["beforePlaceholder", "swallowsText", "swallowsBrace", "inPlural", "hashOutside", "hashInside", "localeNumber"]);
  });

  it("holds every message in the app's data file to print its words as written", () => {
    expect(notAsWritten(APP_TEXTS)).toEqual([]);
  });
});

describe("[SCN-MSG-009] no message chooses between words other than by a count's plural forms", () => {
  it("names a message that uses select, or an exact plural selector, at any depth", () => {
    const texts = {
      counted: "{count, plural, one {{count} file} other {{count} files}}",
      selected: "{kind, select, flag {the flag} other {the command}}",
      exact: "{count, plural, =0 {no files} one {{count} file} other {{count} files}}",
      selectedInPlural: "{count, plural, one {{kind, select, flag {a flag} other {a command}}} other {{count} parts}}",
      exactInPlural: "{count, plural, one {{dirs, plural, =1 {one dir} other {dirs}}} other {{count} files}}",
    };
    expect(choosingWords(texts)).toEqual(["selected", "exact", "selectedInPlural", "exactInPlural"]);
  });

  it("holds every message in the app's data file to choose between words only by a count's plural forms", () => {
    expect(choosingWords(APP_TEXTS)).toEqual([]);
  });
});
