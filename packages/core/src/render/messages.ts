export enum CoreMessage {
  ErrorsInTheInputsHeading = "errors-in-the-inputs-heading",
  ConfigurationNotReadHeading = "configuration-not-read-heading",
  ClaimCodeErrorsHeading = "claim-code-errors-heading",
  ConfigurationNotReadIntro = "configuration-not-read-intro",
  ConfigurationWrongKind = "configuration-wrong-kind",
  ConfigurationUnknownKey = "configuration-unknown-key",
  ProofsNeverRan = "proofs-never-ran",
  ClaimCodeErrorCount = "claim-code-error-count",
  NoFeatureFileJudged = "no-feature-file-judged",
  CleanNoCodedScenario = "clean-no-coded-scenario",
  CleanEachFileOwnCode = "clean-each-file-own-code",
  CleanOthersNoFeatureCode = "clean-others-no-feature-code",
  UnnamedClaimCiSteps = "unnamed-claim-ci-steps",
  UnnamedClaimCiStepsNamed = "unnamed-claim-ci-steps-named",
  ClaimCodeErrorsFraming = "claim-code-errors-framing",
  SeveralClaimCodesFraming = "several-claim-codes-framing",
  MisfiledAndSeveralClaimCodesFraming = "misfiled-and-several-claim-codes-framing",
  DuplicateClaimCodeNotListed = "duplicate-claim-code-not-listed",
  DuplicateFeatureCode = "duplicate-feature-code",
  ForeignClaimCodeCarried = "foreign-claim-code-carried",
  ForeignClaimCodeNoCarrier = "foreign-claim-code-no-carrier",
  NoFeatureCode = "no-feature-code",
  ScenarioSeveralClaimCodes = "several-claim-codes",
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
  ClaimCodeErrorsHeadline = "claim-code-errors-headline",
  ClaimCodeErrorsGloss = "claim-code-errors-gloss",
  SeveralClaimCodesGloss = "several-claim-codes-gloss",
  MisfiledAndSeveralClaimCodesGloss = "misfiled-and-several-claim-codes-gloss",
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
  OutOfBalanceByFeatureHeading = "out-of-balance-by-feature-heading",
  ScenarioClaimReconciliationsOutOfBalance = "scenario-claim-reconciliations-out-of-balance",
  GroupedByFeature = "grouped-by-feature",
  NotGroupedByFeature = "not-grouped-by-feature",
  PhantomClaimReconciliations = "phantom-claim-reconciliations",
  UnnamedClaimReconciliations = "unnamed-claim-reconciliations",
  AndJoiner = "and-joiner",
  ByFeatureTableHeader = "by-feature-table-header",
  NoClaimCodeScenarios = "no-claim-code-scenarios",
  CodesAndNoClaimCodeScenarios = "codes-and-no-claim-code-scenarios",
  ClaimReconciliationsHeading = "claim-reconciliations-heading",
  ClaimReconciliationTally = "claim-reconciliation-tally",
  PhantomClaimTally = "phantom-claim-tally",
  UnnamedClaimTally = "unnamed-claim-tally",
  ExcludedClaimOccurrences = "excluded-claim-occurrences",
  UntaggedScenarios = "untagged-scenarios",
  SharedClaimCodes = "shared-claim-codes",
  SharedClaimCodeScenario = "shared-claim-code-scenario",
  ClaimColumn = "claim-column",
  VerdictColumn = "verdict-column",
  ReconcilingItemsColumn = "reconciling-items-column",
  CiStepsColumn = "ci-steps-column",
  EvidenceCellKey = "evidence-cell-key",
  WatermelonItemKey = "watermelon-item-key",
  PendingItem = "pending-item",
  PendingItemFor = "pending-item-for",
  CheckStepNoOutcome = "check-step-no-outcome",
  CheckStepSkipped = "check-step-skipped",
  CheckStepEnded = "check-step-ended",
  AmbiguousNamedStep = "ambiguous-named-step",
  AmbiguousUnnamedStep = "ambiguous-unnamed-step",
  OutcomeSatisfied = "outcome-satisfied",
  OutcomeMissing = "outcome-missing",
  OutcomeFailing = "outcome-failing",
  OutcomeWatermelon = "outcome-watermelon",
  OutcomeNoClaimCode = "outcome-no-claim-code",
  OutcomeDuplicateClaimCode = "outcome-duplicate-claim-code",
  OutcomeCitesUnknownScenario = "outcome-cites-unknown-scenario",
  OutcomeCitesNoScenario = "outcome-cites-no-scenario",
  OutcomeNoEvidenceObligation = "outcome-no-evidence-obligation",
  OutcomeBroken = "outcome-broken",
  OutcomeBothMissing = "outcome-both-missing",
  ObservationPassed = "observation-passed",
  ObservationFailed = "observation-failed",
  UnnamedClaimGroupCounts = "unnamed-claim-group-counts",
  UnnamedClaimFailedNames = "unnamed-claim-failed-names",
  SeveralClaimCodesCited = "several-claim-codes-cited",
  SharedClaimCode = "shared-claim-code",
  EvidenceObligationDivergesFromOutcome = "evidence-obligation-diverges-from-outcome",
  EvidenceObservationDivergesFromOutcome = "evidence-observation-diverges-from-outcome",
}

// Each error named under Errors in the inputs, by its code: a handle's value is the code its entry opens with.
export enum CoreError {
  ConfigurationWrongKind = "configuration-wrong-kind",
  ConfigurationUnknownKey = "configuration-unknown-key",
  RunnerKeyNotALayer = "runner-key-not-a-layer",
  NotChecksEntryMatchesNoStep = "not-checks-entry-matches-no-step",
  NotChecksEntryNotAStepName = "not-checks-entry-not-a-step-name",
  DuplicateFeatureCode = "duplicate-feature-code",
  ForeignClaimCode = "foreign-claim-code",
  NoFeatureCode = "no-feature-code",
  SeveralClaimCodes = "several-claim-codes",
}


export type WordedCoreMessage = Extract<CoreMessage, string>;

export interface CoreMessageValues {
  readonly [CoreMessage.ConfigurationWrongKind]: { readonly entry: string; readonly is: string; readonly reads: string };
  readonly [CoreMessage.ConfigurationUnknownKey]: { readonly key: string };
  readonly [CoreMessage.RunnerKeyNotALayer]: { readonly key: string };
  readonly [CoreMessage.NotChecksEntryMatchesNoStep]: { readonly key: string; readonly entry: string };
  readonly [CoreMessage.NotChecksEntryNotAStepName]: { readonly key: string; readonly entry: string };
  readonly [CoreMessage.ManifestKindOfType]: { readonly type: string };
  readonly [CoreMessage.ProofsNeverRan]: { readonly count: number };
  readonly [CoreMessage.ClaimCodeErrorCount]: { readonly count: number };
  readonly [CoreMessage.CleanNoCodedScenario]: { readonly featureFiles: number };
  readonly [CoreMessage.CleanEachFileOwnCode]: { readonly featureFiles: number; readonly featureCodes: number };
  readonly [CoreMessage.CleanOthersNoFeatureCode]: { readonly featureFiles: number; readonly featureCodes: number; readonly noFeatureCode: number };
  readonly [CoreMessage.UnnamedClaimCiSteps]: { readonly count: number };
  readonly [CoreMessage.UnnamedClaimCiStepsNamed]: { readonly count: number; readonly list: string };
  readonly [CoreMessage.ClaimCodeErrorsFraming]: { readonly count: string };
  readonly [CoreMessage.SeveralClaimCodesFraming]: { readonly count: string };
  readonly [CoreMessage.MisfiledAndSeveralClaimCodesFraming]: { readonly count: string };
  readonly [CoreMessage.DuplicateClaimCodeNotListed]: { readonly outcome: string };
  readonly [CoreMessage.DuplicateFeatureCode]: { readonly code: string; readonly fileCount: number; readonly files: string };
  readonly [CoreMessage.ForeignClaimCodeCarried]: {
    readonly file: string;
    readonly featureCode: string;
    readonly claimCode: string;
    readonly named: string;
    readonly carrierCount: number;
    readonly carriers: string;
  };
  readonly [CoreMessage.ForeignClaimCodeNoCarrier]: { readonly file: string; readonly featureCode: string; readonly claimCode: string; readonly named: string };
  readonly [CoreMessage.NoFeatureCode]: { readonly file: string };
  readonly [CoreMessage.ScenarioSeveralClaimCodes]: { readonly file: string; readonly scenario: string; readonly codeCount: number; readonly codes: string };
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
  readonly [CoreMessage.ClaimCodeErrorsGloss]: { readonly heading: string; readonly alsoOutOfBalance: string };
  readonly [CoreMessage.SeveralClaimCodesGloss]: { readonly heading: string; readonly alsoOutOfBalance: string };
  readonly [CoreMessage.MisfiledAndSeveralClaimCodesGloss]: { readonly heading: string; readonly alsoOutOfBalance: string };
  readonly [CoreMessage.NothingToReconcileGloss]: { readonly corpusDir: string };
  readonly [CoreMessage.PendingTally]: { readonly pending: number };
  readonly [CoreMessage.EvidenceObservationsSum]: { readonly total: number; readonly onScenario: number; readonly onPhantomClaim: number; readonly onUnnamedClaim: number };
  readonly [CoreMessage.FitnessCiStep]: { readonly steps: number };
  readonly [CoreMessage.ReconcilerStep]: { readonly step: string; readonly whatItIs: string };
  readonly [CoreMessage.StepNonCheck]: { readonly entry: string };
  readonly [CoreMessage.StepAccountingNotAppliedWorkflowsReadLabel]: { readonly key: string; readonly workflows: string };
  readonly [CoreMessage.StepAccountingNotAppliedNoWorkflowReadLabel]: { readonly key: string };
  readonly [CoreMessage.ScenarioClaimReconciliationsOutOfBalance]: { readonly outOfBalance: number; readonly claimReconciliations: number };
  readonly [CoreMessage.NotGroupedByFeature]: { readonly ungrouped: string };
  readonly [CoreMessage.PhantomClaimReconciliations]: { readonly count: number };
  readonly [CoreMessage.UnnamedClaimReconciliations]: { readonly count: number };
  readonly [CoreMessage.NoClaimCodeScenarios]: { readonly count: number };
  readonly [CoreMessage.CodesAndNoClaimCodeScenarios]: { readonly codes: string; readonly count: number };
  readonly [CoreMessage.ClaimReconciliationTally]: { readonly total: number; readonly balanced: number; readonly outOfBalance: number };
  readonly [CoreMessage.PhantomClaimTally]: { readonly count: number };
  readonly [CoreMessage.UnnamedClaimTally]: { readonly count: number; readonly unnamedClaimId: string };
  readonly [CoreMessage.ExcludedClaimOccurrences]: { readonly count: number };
  readonly [CoreMessage.UntaggedScenarios]: { readonly count: number };
  readonly [CoreMessage.SharedClaimCodes]: { readonly scenarios: number; readonly codes: number };
  readonly [CoreMessage.SharedClaimCodeScenario]: { readonly feature: string; readonly title: string };
  readonly [CoreMessage.PendingItemFor]: { readonly qualityCheckKind: string };
  readonly [CoreMessage.CheckStepNoOutcome]: { readonly claimCode: string };
  readonly [CoreMessage.CheckStepSkipped]: { readonly claimCode: string };
  readonly [CoreMessage.CheckStepEnded]: { readonly claimCode: string; readonly outcome: string };
  readonly [CoreMessage.AmbiguousNamedStep]: { readonly step: string };
  readonly [CoreMessage.UnnamedClaimGroupCounts]: { readonly ran: number; readonly passed: number; readonly failed: number };
  readonly [CoreMessage.UnnamedClaimFailedNames]: { readonly names: string };
  readonly [CoreMessage.SeveralClaimCodesCited]: { readonly count: number; readonly codes: string };
  readonly [CoreMessage.SharedClaimCode]: { readonly code: string };
  readonly [CoreMessage.EvidenceObligationDivergesFromOutcome]: {
    readonly outcome: string;
    readonly presenceForOutcome: string;
    readonly presenceFound: string;
  };
  readonly [CoreMessage.EvidenceObservationDivergesFromOutcome]: {
    readonly outcome: string;
    readonly presenceForOutcome: string;
    readonly presenceFound: string;
  };
}
