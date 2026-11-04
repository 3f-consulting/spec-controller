import { QualityCheckFaultCode, type QualityCheckFault } from "../domain/qualityCheckFault.js";
import { UNNAMED_CLAIM_ID } from "../domain/claimReconciliation.js";

export type QualityCheckFaultMessages = {
  readonly [C in QualityCheckFaultCode]: (fault: Extract<QualityCheckFault, { readonly code: C }>) => string;
};

export const QUALITY_CHECK_FAULT_MESSAGES: QualityCheckFaultMessages = {
  [QualityCheckFaultCode.EvidenceDivergesFromOutcome]: (fault) =>
    `QualityCheckReconciliation invariant (@SCN-LDG-030): outcome "${fault.outcome}" has the ` +
    `${fault.evidence === "evidence-obligation" ? "evidence obligation (debit)" : "evidence observation"} ` +
    `side ${fault.presenceForOutcome} for that outcome, but it was ${fault.presenceFound}.`,
};

export enum CoreMessage {
  ErrorsInTheInputsHeading,
  ConfigurationNotReadHeading,
  ScenarioCodeErrorsHeading,
  OutOfBalanceByFeatureHeading,
  ScenarioClaimReconciliationsOutOfBalance,
  GroupedByFeature,
  NotGroupedByFeature,
  PhantomClaimReconciliations,
  UnnamedClaimReconciliations,
  AndJoiner,
  ByFeatureTableHeader,
  NoScnCodeScenarios,
  ClaimReconciliationsHeading,
  ClaimReconciliationTally,
  PhantomClaimTally,
  UnnamedClaimTally,
  ExcludedScnOccurrences,
  UntaggedScenarios,
  SharedScnCodes,
  SharedScnCodeScenario,
  ClaimColumn,
  VerdictColumn,
  ReconcilingItemsColumn,
  CiStepsColumn,
  EvidenceCellKey,
  WatermelonItemKey,
  PendingItem,
  PendingItemFor,
  CheckStepNoOutcome,
  CheckStepSkipped,
  CheckStepEnded,
  AmbiguousNamedStep,
  AmbiguousUnnamedStep,
  OutcomeSatisfied,
  OutcomeMissing,
  OutcomeFailing,
  OutcomeWatermelon,
  OutcomeNoScnCode,
  OutcomeDuplicateScnCode,
  OutcomeCitesUnknownScenario,
  OutcomeCitesNoScenario,
  OutcomeNoEvidenceObligation,
  OutcomeBroken,
  OutcomeBothMissing,
  ObservationPassed,
  ObservationFailed,
  UnnamedClaimGroupCounts,
  UnnamedClaimFailedNames,
  SeveralScnCodes,
  SharedScnCode,
  ConfigurationNotReadIntro = "configuration-not-read-intro",
  ConfigurationWrongKind = "configuration-wrong-kind",
  ConfigurationUnknownKey = "configuration-unknown-key",
  ProofsNeverRan = "proofs-never-ran",
  ScenarioCodeErrorCount = "scenario-code-error-count",
  NoFeatureFileJudged = "no-feature-file-judged",
  CleanNoCodedScenario = "clean-no-coded-scenario",
  CleanEachFileOwnCode = "clean-each-file-own-code",
  CleanOthersNoFeatureCode = "clean-others-no-feature-code",
  UnnamedClaimCiSteps = "unnamed-claim-ci-steps",
  UnnamedClaimCiStepsNamed = "unnamed-claim-ci-steps-named",
  ScenarioCodeErrorsFraming = "scenario-code-errors-framing",
  SeveralScnCodesFraming = "several-scn-codes-framing",
  MisfiledAndSeveralScnCodesFraming = "misfiled-and-several-scn-codes-framing",
  DuplicateScnCodeNotListed = "duplicate-scn-code-not-listed",
  DuplicateFeatureCode = "duplicate-feature-code",
  ForeignScnCodeCarried = "foreign-scn-code-carried",
  ForeignScnCodeNoCarrier = "foreign-scn-code-no-carrier",
  NoFeatureCode = "no-feature-code",
  ScenarioSeveralScnCodes = "several-scn-codes",
  RunnerKeyNotALayer = "runner-key-not-a-layer",
  NotChecksEntryMatchesNoStep = "not-checks-entry-matches-no-step",
  NotChecksEntryNotAStepName = "not-checks-entry-not-a-step-name",
  ManifestKindList = "manifest-kind-list",
  ManifestKindObject = "manifest-kind-object",
  ManifestKindString = "manifest-kind-string",
  ManifestKindStringOrNull = "manifest-kind-string-or-null",
  ManifestKindOfType = "manifest-kind-of-type",
  ReportTitle = "report-title",
  RunProvenanceHeading = "run-provenance-heading",
  ProvenanceTargetRepo = "provenance-target-repo",
  ProvenanceTargetRepoUntargeted = "provenance-target-repo-untargeted",
  ProvenanceNoInputs = "provenance-no-inputs",
  ProvenanceInputs = "provenance-inputs",
  ProvenanceNotSupplied = "provenance-not-supplied",
  ProvenanceRunTimestamp = "provenance-run-timestamp",
  ProvenanceSourceSha = "provenance-source-sha",
  ProvenanceSourceShaUnknown = "provenance-source-sha-unknown",
  ProvenanceToolSha = "provenance-tool-sha",
  ProvenanceToolShaUnknown = "provenance-tool-sha-unknown",
  ProvenanceToolVersion = "provenance-tool-version",
  RunIntegrityHeading = "run-integrity-heading",
  RunUnsound = "run-unsound",
  BrokenEvidenceNotNamed = "broken-evidence-not-named",
  BrokenEvidenceWhatBroke = "broken-evidence-what-broke",
  BrokenEvidenceNoMessage = "broken-evidence-no-message",
  SummaryHeading = "summary-heading",
  RunVerdictHeading = "run-verdict-heading",
  VerdictExit = "verdict-exit",
  ScenarioCodeErrorsHeadline = "scenario-code-errors-headline",
  ScenarioCodeErrorsGloss = "scenario-code-errors-gloss",
  SeveralScnCodesGloss = "several-scn-codes-gloss",
  MisfiledAndSeveralScnCodesGloss = "misfiled-and-several-scn-codes-gloss",
  AlsoOutOfBalance = "also-out-of-balance",
  OutOfBalanceHeadline = "out-of-balance-headline",
  OutOfBalanceGloss = "out-of-balance-gloss",
  UnsoundHeadline = "unsound-headline",
  UnsoundGloss = "unsound-gloss",
  PendingHeadline = "pending-headline",
  PendingGloss = "pending-gloss",
  BalancedHeadline = "balanced-headline",
  BalancedGloss = "balanced-gloss",
  NothingToReconcileHeadline = "nothing-to-reconcile-headline",
  NothingToReconcileGloss = "nothing-to-reconcile-gloss",
  PendingItemsOutstanding = "pending-items-outstanding",
  ReconciliationTotalsHeading = "reconciliation-totals-heading",
  ReconciliationTotalsClaimReconciliationTerm = "reconciliation-totals-claim-reconciliation-term",
  ReconciliationTotalsReconciliationLineTerm = "reconciliation-totals-reconciliation-line-term",
  ReconciliationTotalsEvidenceObligationTerm = "reconciliation-totals-evidence-obligation-term",
  ReconciliationTotalsEvidenceObservationTerm = "reconciliation-totals-evidence-observation-term",
  SubjectColumn = "subject-column",
  TotalColumn = "total-column",
  BalancedColumn = "balanced-column",
  OutOfBalanceColumn = "out-of-balance-column",
  DetailColumn = "detail-column",
  ClaimReconciliationSubject = "claim-reconciliation-subject",
  ReconciliationLineSubject = "reconciliation-line-subject",
  PendingTally = "pending-tally",
  EvidenceObservationsHeading = "evidence-observations-heading",
  EvidenceObservationsSum = "evidence-observations-sum",
  EvidenceObservationsTableHeader = "evidence-observations-table-header",
  FitnessRunner = "fitness-runner",
  FitnessCiStep = "fitness-ci-step",
  RunnerLayerNamesNone = "runner-layer-names-none",
  RunnerLayerUnnamed = "runner-layer-unnamed",
  NoStepCountedAsItsRunnerRunsIt = "no-step-counted-as-its-runner-runs-it",
  ReconcilerStep = "reconciler-step",
  ReconcilerReconciles = "reconciler-reconciles",
  ReconcilerRecords = "reconciler-records",
  StepNonCheck = "step-non-check",
  StepAccountingHeading = "step-accounting-heading",
  StepAccountingTableHeader = "step-accounting-table-header",
  StepAccountingTotal = "step-accounting-total",
  StepAccountingRunnersLabel = "step-accounting-runners-label",
  StepAccountingReconcilerLabel = "step-accounting-reconciler-label",
  StepAccountingNonChecksLabel = "step-accounting-non-checks-label",
  StepAccountingNotAppliedWorkflowsReadLabel = "step-accounting-not-applied-workflows-read-label",
  StepAccountingNotAppliedNoWorkflowReadLabel = "step-accounting-not-applied-no-workflow-read-label",
  StepAccountingPlumbingLabel = "step-accounting-plumbing-label",
  StepAccountingCandidatesTerm = "step-accounting-candidates-term",
  StepAccountingReconcilerTerm = "step-accounting-reconciler-term",
  StepAccountingNonChecksTerm = "step-accounting-non-checks-term",
  StepAccountingPlumbingTerm = "step-accounting-plumbing-term",
  StepAccountingAccountedForTerm = "step-accounting-accounted-for-term",
}

// Each error named under Errors in the inputs, by its code: a handle's value is the code its entry opens with.
export enum CoreError {
  ConfigurationWrongKind = "configuration-wrong-kind",
  ConfigurationUnknownKey = "configuration-unknown-key",
  RunnerKeyNotALayer = "runner-key-not-a-layer",
  NotChecksEntryMatchesNoStep = "not-checks-entry-matches-no-step",
  NotChecksEntryNotAStepName = "not-checks-entry-not-a-step-name",
  DuplicateFeatureCode = "duplicate-feature-code",
  ForeignScnCode = "foreign-scn-code",
  NoFeatureCode = "no-feature-code",
  SeveralScnCodes = "several-scn-codes",
}

interface CoreMessageParams {
  readonly [CoreMessage.ScenarioClaimReconciliationsOutOfBalance]: [outOfBalance: number, claimReconciliations: number];
  readonly [CoreMessage.NotGroupedByFeature]: [ungrouped: string];
  readonly [CoreMessage.PhantomClaimReconciliations]: [count: number];
  readonly [CoreMessage.UnnamedClaimReconciliations]: [count: number];
  readonly [CoreMessage.NoScnCodeScenarios]: [count: number];
  readonly [CoreMessage.ClaimReconciliationTally]: [total: number, balanced: number, outOfBalance: number];
  readonly [CoreMessage.PhantomClaimTally]: [count: number];
  readonly [CoreMessage.UnnamedClaimTally]: [count: number];
  readonly [CoreMessage.ExcludedScnOccurrences]: [count: number];
  readonly [CoreMessage.UntaggedScenarios]: [count: number];
  readonly [CoreMessage.SharedScnCodes]: [scenarios: number, codes: number];
  readonly [CoreMessage.SharedScnCodeScenario]: [feature: string, title: string];
  readonly [CoreMessage.PendingItemFor]: [qualityCheckKind: string];
  readonly [CoreMessage.CheckStepNoOutcome]: [scnId: string];
  readonly [CoreMessage.CheckStepSkipped]: [scnId: string];
  readonly [CoreMessage.CheckStepEnded]: [scnId: string, outcome: string];
  readonly [CoreMessage.AmbiguousNamedStep]: [step: string];
  readonly [CoreMessage.UnnamedClaimGroupCounts]: [ran: number, passed: number, failed: number];
  readonly [CoreMessage.UnnamedClaimFailedNames]: [names: readonly string[]];
  readonly [CoreMessage.SeveralScnCodes]: [codes: readonly string[]];
  readonly [CoreMessage.SharedScnCode]: [code: string];
}

// A handle whose value is a string is worded by the data file; the others, by the table below.
export type WordedCoreMessage = Extract<CoreMessage, string>;

type TabledCoreMessage = Extract<CoreMessage, number>;

export interface CoreMessageValues {
  readonly [CoreMessage.ConfigurationWrongKind]: { readonly entry: string; readonly is: string; readonly reads: string };
  readonly [CoreMessage.ConfigurationUnknownKey]: { readonly key: string };
  readonly [CoreMessage.RunnerKeyNotALayer]: { readonly key: string };
  readonly [CoreMessage.NotChecksEntryMatchesNoStep]: { readonly key: string; readonly entry: string };
  readonly [CoreMessage.NotChecksEntryNotAStepName]: { readonly key: string; readonly entry: string };
  readonly [CoreMessage.ManifestKindOfType]: { readonly type: string };
  readonly [CoreMessage.ProofsNeverRan]: { readonly count: number };
  readonly [CoreMessage.ScenarioCodeErrorCount]: { readonly count: number };
  readonly [CoreMessage.CleanNoCodedScenario]: { readonly featureFiles: number };
  readonly [CoreMessage.CleanEachFileOwnCode]: { readonly featureFiles: number; readonly featureCodes: number };
  readonly [CoreMessage.CleanOthersNoFeatureCode]: { readonly featureFiles: number; readonly featureCodes: number; readonly noFeatureCode: number };
  readonly [CoreMessage.UnnamedClaimCiSteps]: { readonly count: number };
  readonly [CoreMessage.UnnamedClaimCiStepsNamed]: { readonly count: number; readonly list: string };
  readonly [CoreMessage.ScenarioCodeErrorsFraming]: { readonly count: string };
  readonly [CoreMessage.SeveralScnCodesFraming]: { readonly count: string };
  readonly [CoreMessage.MisfiledAndSeveralScnCodesFraming]: { readonly count: string };
  readonly [CoreMessage.DuplicateScnCodeNotListed]: { readonly outcome: string };
  readonly [CoreMessage.DuplicateFeatureCode]: { readonly code: string; readonly fileCount: number; readonly files: string };
  readonly [CoreMessage.ForeignScnCodeCarried]: {
    readonly file: string;
    readonly featureCode: string;
    readonly scnId: string;
    readonly named: string;
    readonly carrierCount: number;
    readonly carriers: string;
  };
  readonly [CoreMessage.ForeignScnCodeNoCarrier]: { readonly file: string; readonly featureCode: string; readonly scnId: string; readonly named: string };
  readonly [CoreMessage.NoFeatureCode]: { readonly file: string };
  readonly [CoreMessage.ScenarioSeveralScnCodes]: { readonly file: string; readonly scenario: string; readonly codeCount: number; readonly codes: string };
  readonly [CoreMessage.ProvenanceTargetRepo]: { readonly target: string };
  readonly [CoreMessage.ProvenanceTargetRepoUntargeted]: { readonly target: string; readonly origin: string };
  readonly [CoreMessage.ProvenanceNotSupplied]: { readonly flags: string };
  readonly [CoreMessage.ProvenanceRunTimestamp]: { readonly runStartUtc: string };
  readonly [CoreMessage.ProvenanceSourceSha]: { readonly sha: string };
  readonly [CoreMessage.ProvenanceToolSha]: { readonly sha: string };
  readonly [CoreMessage.ProvenanceToolVersion]: { readonly version: string };
  readonly [CoreMessage.RunUnsound]: { readonly proofs: string };
  readonly [CoreMessage.BrokenEvidenceWhatBroke]: { readonly locator: string };
  readonly [CoreMessage.VerdictExit]: { readonly code: number };
  readonly [CoreMessage.ScenarioCodeErrorsGloss]: { readonly heading: string; readonly alsoOutOfBalance: string };
  readonly [CoreMessage.SeveralScnCodesGloss]: { readonly heading: string; readonly alsoOutOfBalance: string };
  readonly [CoreMessage.MisfiledAndSeveralScnCodesGloss]: { readonly heading: string; readonly alsoOutOfBalance: string };
  readonly [CoreMessage.NothingToReconcileGloss]: { readonly corpusDir: string };
  readonly [CoreMessage.PendingTally]: { readonly pending: number };
  readonly [CoreMessage.EvidenceObservationsSum]: { readonly total: number; readonly onScenario: number; readonly onPhantomClaim: number; readonly onUnnamedClaim: number };
  readonly [CoreMessage.FitnessCiStep]: { readonly steps: number };
  readonly [CoreMessage.ReconcilerStep]: { readonly step: string; readonly whatItIs: string };
  readonly [CoreMessage.StepNonCheck]: { readonly entry: string };
  readonly [CoreMessage.StepAccountingNotAppliedWorkflowsReadLabel]: { readonly key: string; readonly workflows: string };
  readonly [CoreMessage.StepAccountingNotAppliedNoWorkflowReadLabel]: { readonly key: string };
}

export type CoreMessages = {
  readonly [C in TabledCoreMessage]: C extends keyof CoreMessageParams ? (...params: CoreMessageParams[C]) => string : string;
};

const SATISFIED = "Evidence Observation satisfies its Evidence Obligation";
const MISSING = "Evidence Observation is missing";
const DUPLICATE_SCN_CODE = "Evidence Obligation's @SCN code is carried by another Scenario";
const CITED_WITH_NO_SCENARIO = "cited scenario ids with no real scenario";
const NO_ONE_SCENARIO_CAN_TAKE = "evidence observations no one scenario can take";

export const CORE_MESSAGES: CoreMessages = {
  [CoreMessage.ErrorsInTheInputsHeading]: "## Errors in the inputs",
  [CoreMessage.ConfigurationNotReadHeading]: "### Configuration not read",
  [CoreMessage.ScenarioCodeErrorsHeading]: "### Scenario code errors",
  [CoreMessage.OutOfBalanceByFeatureHeading]: "### Out-of-balance by feature",
  [CoreMessage.ScenarioClaimReconciliationsOutOfBalance]: (outOfBalance, claimReconciliations) => `${outOfBalance} of ${claimReconciliations} Claim Reconciliation(s) of scenarios out of balance`,
  [CoreMessage.GroupedByFeature]: ", grouped by feature",
  [CoreMessage.NotGroupedByFeature]: (ungrouped) =>
    `${ungrouped} out of balance, not grouped by feature (no feature file names them)`,
  [CoreMessage.PhantomClaimReconciliations]: (count) => `${count} Claim Reconciliation(s) for ${CITED_WITH_NO_SCENARIO}`,
  [CoreMessage.UnnamedClaimReconciliations]: (count) => `${count} Claim Reconciliation(s) for ${NO_ONE_SCENARIO_CAN_TAKE}`,
  [CoreMessage.AndJoiner]: " and ",
  [CoreMessage.ByFeatureTableHeader]: "| Feature | Count | Out-of-balance `@SCN` ids |",
  [CoreMessage.NoScnCodeScenarios]: (count) => `${count} with no \`@SCN\` code`,
  [CoreMessage.ClaimReconciliationsHeading]: "## Claim Reconciliations",
  [CoreMessage.ClaimReconciliationTally]: (total, balanced, outOfBalance) =>
    `${total} Claim Reconciliation(s): ${balanced} balanced, ${outOfBalance} out-of-balance.`,
  [CoreMessage.PhantomClaimTally]: (count) =>
    `${count} Claim Reconciliation(s) for ${CITED_WITH_NO_SCENARIO}.`,
  [CoreMessage.UnnamedClaimTally]: (count) =>
    `${count} Claim Reconciliation(s) for ${NO_ONE_SCENARIO_CAN_TAKE}, aggregated into "${UNNAMED_CLAIM_ID}".`,
  [CoreMessage.ExcludedScnOccurrences]: (count) =>
    `${count} @SCN ids seen in non-tag context, excluded: each is an @SCN code written in a feature file's prose, ` +
    "a comment or step text rather than as a tag, so it marks no scenario and raises no claim",
  [CoreMessage.UntaggedScenarios]: (count) => `${count} scenario(s) carry no @SCN code`,
  [CoreMessage.SharedScnCodes]: (scenarios, codes) =>
    `The corpus holds ${scenarios} scenarios — ${codes} @SCN code(s) carried by more than one scenario, each scenario named as \`feature file : scenario title\`:`,
  [CoreMessage.SharedScnCodeScenario]: (feature, title) => `this one is ${feature} : ${title}`,
  [CoreMessage.ClaimColumn]: "Claim",
  [CoreMessage.VerdictColumn]: "Verdict",
  [CoreMessage.ReconcilingItemsColumn]: "Reconciling items",
  [CoreMessage.CiStepsColumn]: "CI steps",
  [CoreMessage.EvidenceCellKey]: [
    "Key: each evidence cell reads *obligation*/*observations*.",
    "- The letter says the scenario's tags raise an Evidence Obligation of that kind: (F)itness, (U)nit, (I)ntegration, (E)2e, (P)erformance. `-` means they raise none of that kind, as a pending tag raises none.",
    "- The number counts the scenario's Evidence Observations of that kind that ran. `-` means none.",
    "- For example, `U/2` is a unit obligation answered by two unit tests; `U/-` is a unit obligation that no unit test answered; `-/1` is one unit test citing a scenario that raises no unit obligation, which puts the row out of balance even where its unit evidence is pending.",
    "- A blank cell means no obligation and no Evidence Observation that ran; `—` marks the row of a phantom claim or of the unnamed claim.",
    "- A row named `feature file : scenario title` is a scenario that carries no @SCN code. The run reads none of its tags, so its evidence cells are blank, and its reconciling item says that no Evidence Observation can link to it.",
    "- In Reconciling items, `—` means the row has no reconciling item, and *untagged* means a scenario that carries an @SCN code and no tag that raises an Evidence Obligation.",
    "- On the unnamed claim's row, the counts after an item, such as `1 ran, 1 passed, 0 failed`, are of that item's own tests, and a fitness item counts its CI steps; a broken item stands alone, outside those counts.",
    "- CI steps names the steps the Evidence observations table gives for each kind of quality check other than fitness that the row obligates or observes, whether or not an Evidence Observation of that kind ran for the row, and the step each of the row's fitness Evidence Observations names: `U/-` beside a step names the step that runs unit tests, none of which answered this row. A blank CI steps cell means no such step is known.",
  ].join("\n"),
  [CoreMessage.WatermelonItemKey]:
    "- Where a row's item says its CI step or its job sets `continue-on-error`, the name in parentheses after it is its fitness function. Remove `continue-on-error` from its CI step and from its job, or set it to false, and the check's red fails the CI run.",
  [CoreMessage.PendingItem]: "pending",
  [CoreMessage.PendingItemFor]: (qualityCheckKind) => `pending: ${qualityCheckKind}`,
  [CoreMessage.CheckStepNoOutcome]: (scnId) =>
    `${scnId}: the CI run's record carries no outcome for this check's step — so the check did not run.`,
  [CoreMessage.CheckStepSkipped]: (scnId) =>
    `${scnId}: the CI run's record says this check's step was skipped — so the check did not run.`,
  [CoreMessage.CheckStepEnded]: (scnId, outcome) =>
    `${scnId}: the CI run's record says this check's step ended \`${outcome}\` — so the check did not run.`,
  [CoreMessage.AmbiguousNamedStep]: (step) =>
    `The step "${step}" is ambiguous — two or more step definitions match it, so the step never ran.`,
  [CoreMessage.AmbiguousUnnamedStep]: "A step is ambiguous — two or more step definitions match it, so the step never ran.",
  [CoreMessage.OutcomeSatisfied]: SATISFIED,
  [CoreMessage.OutcomeMissing]: MISSING,
  [CoreMessage.OutcomeFailing]: "Evidence Observation is failing",
  [CoreMessage.OutcomeWatermelon]:
    "Evidence Observation is passing but its CI step or its job sets `continue-on-error` so its red might not fail the CI run",
  [CoreMessage.OutcomeNoScnCode]: "Evidence Obligation has no @SCN code for an Evidence Observation to link to",
  [CoreMessage.OutcomeDuplicateScnCode]: DUPLICATE_SCN_CODE,
  [CoreMessage.OutcomeCitesUnknownScenario]: "Evidence Observation cites an unknown Scenario",
  [CoreMessage.OutcomeCitesNoScenario]: "Evidence Observation cites no Scenario",
  [CoreMessage.OutcomeNoEvidenceObligation]: "Evidence Observation cites a Scenario with no matching Evidence Obligation",
  [CoreMessage.OutcomeBroken]: "Evidence Observation is broken because its proof never ran to a result",
  [CoreMessage.OutcomeBothMissing]:
    "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited",
  [CoreMessage.ObservationPassed]: "passed",
  [CoreMessage.ObservationFailed]: "failed",
  [CoreMessage.UnnamedClaimGroupCounts]: (ran, passed, failed) => `${ran} ran, ${passed} passed, ${failed} failed`,
  [CoreMessage.UnnamedClaimFailedNames]: (names) => `(failed: ${names.join(" / ")})`,
  [CoreMessage.SeveralScnCodes]: (codes) =>
    `${codes.length} scenario codes cite ${codes.join(", ")} — a test cites exactly one scenario, so this one credits none of them.`,
  [CoreMessage.SharedScnCode]: (code) =>
    `${code} is carried by more than one scenario, so evidence citing it credits none of them.`,
};
