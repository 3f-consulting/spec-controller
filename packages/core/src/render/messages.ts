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
  ReportTitle,
  RunProvenanceHeading,
  ProvenanceTargetRepo,
  ProvenanceTargetRepoUntargeted,
  ProvenanceNoInputs,
  ProvenanceInputs,
  ProvenanceNotSupplied,
  ProvenanceRunTimestamp,
  ProvenanceSourceSha,
  ProvenanceSourceShaUnknown,
  ProvenanceToolSha,
  ProvenanceToolShaUnknown,
  ProvenanceToolVersion,
  ConfigurationNotReadHeading,
  ConfigurationNotReadIntro,
  ConfigurationWrongKind,
  ConfigurationUnknownKey,
  RunIntegrityHeading,
  OneProofNeverRan,
  ProofsNeverRan,
  RunUnsound,
  BrokenEvidenceNotNamed,
  BrokenEvidenceWhatBroke,
  BrokenEvidenceNoMessage,
  ScenarioCodeErrorsHeading,
  OneScenarioCodeError,
  ScenarioCodeErrorCount,
  ScenarioCodeErrorsFraming,
  SeveralScnCodesFraming,
  MisfiledAndSeveralScnCodesFraming,
  DuplicateScnCodeNotListed,
  FeatureFileNoun,
  FeatureCodeNoun,
  NoFeatureFileJudged,
  ScenarioCodesCleanOver,
  CleanNoCodedScenario,
  CleanEachFileOwnCode,
  CleanOthersNoFeatureCode,
  ItPronoun,
  ThemPronoun,
  HoldsVerb,
  HoldVerb,
  DuplicateFeatureCode,
  ForeignScnCodeOneCarrier,
  ForeignScnCodeManyCarriers,
  ForeignScnCodeNoCarrier,
  NoFeatureCode,
  ScenarioSeveralScnCodes,
  SummaryViewsHeading,
  RunVerdictHeading,
  VerdictExit,
  ScenarioCodeErrorsHeadline,
  ScenarioCodeErrorsGloss,
  SeveralScnCodesGloss,
  MisfiledAndSeveralScnCodesGloss,
  AlsoOutOfBalance,
  OutOfBalanceHeadline,
  OutOfBalanceGloss,
  UnsoundHeadline,
  UnsoundGloss,
  PendingHeadline,
  PendingGloss,
  BalancedHeadline,
  BalancedGloss,
  NothingToReconcileHeadline,
  NothingToReconcileGloss,
  PendingItemsOutstanding,
  EvidenceReconciliationHeading,
  EvidenceReconciliationClaimReconciliationTerm,
  EvidenceReconciliationQualityCheckReconciliationTerm,
  EvidenceReconciliationEvidenceObligationTerm,
  EvidenceReconciliationEvidenceObservationTerm,
  SubjectColumn,
  TotalColumn,
  BalancedColumn,
  OutOfBalanceColumn,
  DetailColumn,
  ClaimReconciliationSubject,
  QualityCheckReconciliationSubject,
  PendingTally,
  EvidenceObservationsHeading,
  EvidenceObservationsSum,
  EvidenceObservationsTableHeader,
  BehaviouralRunnersHeading,
  BehaviouralRunnersTableHeader,
  RunnerTierNamesNone,
  RunnerTierUnnamed,
  RunnerKeyNotATier,
  ReconcilerStep,
  ReconcilerReconciles,
  ReconcilerRecords,
  StepExcluded,
  NotChecksEntryMatchesNoStep,
  StepAccountingHeading,
  StepAccountingTableHeader,
  StepAccountingTotal,
  StepAccountingRunnersLabel,
  StepAccountingReconcilerLabel,
  StepAccountingExcludedLabel,
  StepAccountingPlumbingLabel,
  EveryStepAccountedFor,
  StepsNotAccountedFor,
  FitnessHeading,
  FitnessSatisfiedOf,
  FitnessTableHeader,
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
  LedgerTableHeader,
  ClaimColumn,
  VerdictColumn,
  ReconcilingItemsColumn,
  EvidenceCellKey,
  PendingItem,
  PendingItemFor,
  CheckStepNoOutcome,
  CheckStepSkipped,
  CheckStepEnded,
  AmbiguousNamedStep,
  AmbiguousUnnamedStep,
  ManifestKindList,
  ManifestKindObject,
  ManifestKindString,
  ManifestKindStringOrNull,
  ManifestKindOfType,
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
  UnnamedClaimCiSteps,
  UnnamedClaimFailedNames,
  SeveralScnCodes,
  SharedScnCode,
}

interface CoreMessageParams {
  readonly [CoreMessage.ProvenanceTargetRepo]: [target: string];
  readonly [CoreMessage.ProvenanceTargetRepoUntargeted]: [target: string, origin: string];
  readonly [CoreMessage.ProvenanceNotSupplied]: [flags: string];
  readonly [CoreMessage.ProvenanceRunTimestamp]: [runStartUtc: string];
  readonly [CoreMessage.ProvenanceSourceSha]: [sha: string];
  readonly [CoreMessage.ProvenanceToolSha]: [sha: string];
  readonly [CoreMessage.ProvenanceToolVersion]: [version: string];
  readonly [CoreMessage.ConfigurationWrongKind]: [entry: string, is: string, reads: string];
  readonly [CoreMessage.ConfigurationUnknownKey]: [key: string];
  readonly [CoreMessage.ProofsNeverRan]: [count: number];
  readonly [CoreMessage.RunUnsound]: [proofs: string];
  readonly [CoreMessage.BrokenEvidenceWhatBroke]: [locator: string];
  readonly [CoreMessage.ScenarioCodeErrorCount]: [count: number];
  readonly [CoreMessage.ScenarioCodeErrorsFraming]: [count: string];
  readonly [CoreMessage.SeveralScnCodesFraming]: [count: string];
  readonly [CoreMessage.MisfiledAndSeveralScnCodesFraming]: [count: string];
  readonly [CoreMessage.ScenarioCodesCleanOver]: [featureFiles: string, featureCodes: string];
  readonly [CoreMessage.CleanNoCodedScenario]: [over: string, them: string];
  readonly [CoreMessage.CleanEachFileOwnCode]: [over: string];
  readonly [CoreMessage.CleanOthersNoFeatureCode]: [over: string, noFeatureCode: number, hold: string];
  readonly [CoreMessage.DuplicateFeatureCode]: [code: string, fileCount: number, files: string];
  readonly [CoreMessage.ForeignScnCodeOneCarrier]: [file: string, featureCode: string, scnId: string, named: string, carrier: string];
  readonly [CoreMessage.ForeignScnCodeManyCarriers]: [
    file: string,
    featureCode: string,
    scnId: string,
    named: string,
    carrierCount: number,
    carriers: string,
  ];
  readonly [CoreMessage.ForeignScnCodeNoCarrier]: [file: string, featureCode: string, scnId: string, named: string];
  readonly [CoreMessage.NoFeatureCode]: [file: string];
  readonly [CoreMessage.ScenarioSeveralScnCodes]: [file: string, scenario: string, codes: readonly string[]];
  readonly [CoreMessage.VerdictExit]: [code: number];
  readonly [CoreMessage.ScenarioCodeErrorsGloss]: [alsoOutOfBalance: string];
  readonly [CoreMessage.SeveralScnCodesGloss]: [alsoOutOfBalance: string];
  readonly [CoreMessage.MisfiledAndSeveralScnCodesGloss]: [alsoOutOfBalance: string];
  readonly [CoreMessage.NothingToReconcileGloss]: [corpusDir: string];
  readonly [CoreMessage.PendingTally]: [pending: number];
  readonly [CoreMessage.EvidenceObservationsSum]: [total: number, onScenario: number, onPhantomClaim: number, onUnnamedClaim: number];
  readonly [CoreMessage.RunnerTierNamesNone]: [tier: string];
  readonly [CoreMessage.RunnerTierUnnamed]: [tier: string];
  readonly [CoreMessage.RunnerKeyNotATier]: [key: string];
  readonly [CoreMessage.ReconcilerStep]: [step: string, whatItIs: string];
  readonly [CoreMessage.StepExcluded]: [entry: string];
  readonly [CoreMessage.NotChecksEntryMatchesNoStep]: [entry: string];
  readonly [CoreMessage.StepsNotAccountedFor]: [stepsRead: number, accountedFor: number];
  readonly [CoreMessage.FitnessSatisfiedOf]: [satisfied: number, total: number];
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
  readonly [CoreMessage.SharedScnCodes]: [scenarios: number, accounts: number, codes: number];
  readonly [CoreMessage.SharedScnCodeScenario]: [feature: string, title: string];
  readonly [CoreMessage.PendingItemFor]: [qualityCheck: string];
  readonly [CoreMessage.CheckStepNoOutcome]: [scnId: string];
  readonly [CoreMessage.CheckStepSkipped]: [scnId: string];
  readonly [CoreMessage.CheckStepEnded]: [scnId: string, outcome: string];
  readonly [CoreMessage.AmbiguousNamedStep]: [step: string];
  readonly [CoreMessage.ManifestKindOfType]: [type: string];
  readonly [CoreMessage.UnnamedClaimGroupCounts]: [ran: number, passed: number, failed: number];
  readonly [CoreMessage.UnnamedClaimCiSteps]: [names: readonly string[]];
  readonly [CoreMessage.UnnamedClaimFailedNames]: [names: readonly string[]];
  readonly [CoreMessage.SeveralScnCodes]: [codes: readonly string[]];
  readonly [CoreMessage.SharedScnCode]: [code: string];
}

export type CoreMessages = {
  readonly [C in CoreMessage]: C extends keyof CoreMessageParams ? (...params: CoreMessageParams[C]) => string : string;
};

const SATISFIED = "Evidence Observation satisfies its Evidence Obligation";
const MISSING = "Evidence Observation is missing";
const DUPLICATE_SCN_CODE = "Evidence Obligation's @SCN code is carried by another Scenario";
const CITED_WITH_NO_SCENARIO = "cited scenario ids with no real scenario";
const CITING_NO_SCENARIO = "evidence observations citing no scenario";

const IN_ITS_FILE = "every coded scenario sits in the file its code names";

const foreignOpening = (file: string, featureCode: string, scnId: string, named: string): string =>
  `${file} carries the feature code @${featureCode}, but holds the scenario ` +
  `@${scnId}, whose feature part names ${named}. A reconciliation's by-feature cut groups on the id, so `;

const aKind = (type: string): string => `a ${type}`;

const recode = (featureCode: string): string => `Re-code the scenario for @${featureCode}`;

export const CORE_MESSAGES: CoreMessages = {
  [CoreMessage.ReportTitle]: "# Evidence Reconciliation",
  [CoreMessage.RunProvenanceHeading]: "## Run provenance",
  [CoreMessage.ProvenanceTargetRepo]: (target) => `Target repo: ${target}`,
  [CoreMessage.ProvenanceTargetRepoUntargeted]: (target, origin) => `Target repo: ${target} (no --target given; origin is ${origin})`,
  [CoreMessage.ProvenanceNoInputs]: "Inputs: none specified",
  [CoreMessage.ProvenanceInputs]: "Inputs:",
  [CoreMessage.ProvenanceNotSupplied]: (flags) => `Not supplied: ${flags}`,
  [CoreMessage.ProvenanceRunTimestamp]: (runStartUtc) => `Run timestamp (UTC): ${runStartUtc}`,
  [CoreMessage.ProvenanceSourceSha]: (sha) => `Source SHA: ${sha}`,
  [CoreMessage.ProvenanceSourceShaUnknown]: "unknown (non-git target)",
  [CoreMessage.ProvenanceToolSha]: (sha) => `Tool SHA: ${sha}`,
  [CoreMessage.ProvenanceToolShaUnknown]: "unknown (not a git checkout)",
  [CoreMessage.ProvenanceToolVersion]: (version) => `Tool version: ${version}`,
  [CoreMessage.ConfigurationNotReadHeading]: "## Configuration not read",
  [CoreMessage.ConfigurationNotReadIntro]:
    "The target's package.json holds configuration this run could not use. Each entry below was read as absent, and every account in this report is the one the target gives without it.",
  [CoreMessage.ConfigurationWrongKind]: (entry, is, reads) =>
    `${entry} is ${is} where ${reads} is read, so this run read it as absent.`,
  [CoreMessage.ConfigurationUnknownKey]: (key) =>
    `${key} is not a key the specController block reads, so this run read nothing from it.`,
  [CoreMessage.RunIntegrityHeading]: "## Run integrity: unsound",
  [CoreMessage.OneProofNeverRan]: "1 proof never ran, so the behaviour it proves was never exercised.",
  [CoreMessage.ProofsNeverRan]: (count) => `${count} proofs never ran, so the behaviours they prove were never exercised.`,
  [CoreMessage.RunUnsound]: (proofs) =>
    `**This run is unsound.** ${proofs} A row reading "${MISSING}" ` +
    "below may therefore be a BROKEN proof rather than an absent one — it cannot be read as " +
    `"write the test", because the test may already be there. Fix the harness and regenerate.`,
  [CoreMessage.BrokenEvidenceNotNamed]: "(evidence not named by the runner)",
  [CoreMessage.BrokenEvidenceWhatBroke]: (locator) => `${locator} — what broke:`,
  [CoreMessage.BrokenEvidenceNoMessage]: "(no message reported by the runner)",
  [CoreMessage.ScenarioCodeErrorsHeading]: "## Scenario code errors",
  [CoreMessage.OneScenarioCodeError]: "1 scenario code error",
  [CoreMessage.ScenarioCodeErrorCount]: (count) => `${count} scenario code errors`,
  [CoreMessage.ScenarioCodeErrorsFraming]: (count) =>
    `${count} — each misfiles a scenario code, so the by-feature cut below cannot be trusted, and ` +
    "the run fails (exit 1). Every account still reconciles as it would if the code were filed " +
    "correctly.",
  [CoreMessage.SeveralScnCodesFraming]: (count) =>
    `${count} — each is a scenario carrying more than one scenario code, so no account was raised for it ` +
    "under any of them, and the run fails (exit 1).",
  [CoreMessage.MisfiledAndSeveralScnCodesFraming]: (count) =>
    `${count} — each either misfiles a scenario code, so the by-feature cut below cannot be trusted, or ` +
    "is a scenario carrying more than one scenario code, so no account was raised for it under any of " +
    "them. The run fails (exit 1).",
  [CoreMessage.DuplicateScnCodeNotListed]: `A duplicated @SCN code is not listed here: it is reported on its account's rows, as "${DUPLICATE_SCN_CODE}".`,
  [CoreMessage.FeatureFileNoun]: "feature file",
  [CoreMessage.FeatureCodeNoun]: "feature code",
  [CoreMessage.NoFeatureFileJudged]: "No feature file was judged, so no scenario code is vouched for.",
  [CoreMessage.ScenarioCodesCleanOver]: (featureFiles, featureCodes) =>
    `Scenario codes are clean over ${featureFiles} carrying ${featureCodes}`,
  [CoreMessage.CleanNoCodedScenario]: (over, them) => `${over}: no scenario in ${them} carries an @SCN code to misfile.`,
  [CoreMessage.CleanEachFileOwnCode]: (over) => `${over}: each file carries a code of its own, and ${IN_ITS_FILE}.`,
  [CoreMessage.CleanOthersNoFeatureCode]: (over, noFeatureCode, hold) =>
    `${over}: each code is carried by exactly one file, ${IN_ITS_FILE}, and the other ${noFeatureCode} ` +
    `${hold} no coded scenario.`,
  [CoreMessage.ItPronoun]: "it",
  [CoreMessage.ThemPronoun]: "them",
  [CoreMessage.HoldsVerb]: "holds",
  [CoreMessage.HoldVerb]: "hold",
  [CoreMessage.DuplicateFeatureCode]: (code, fileCount, files) =>
    `the feature code @${code} is carried by ${fileCount} feature ` +
    `files — ${files}. A feature code names exactly one feature file: a ` +
    `reconciliation's by-feature cut groups on it, so two files sharing a code report as one ` +
    `row and attribute one file's scenarios to the other. Give one of them a code of its own.`,
  [CoreMessage.ForeignScnCodeOneCarrier]: (file, featureCode, scnId, named, carrier) =>
    `${foreignOpening(file, featureCode, scnId, named)}it counts this scenario under ${carrier}'s row, not ${file}'s. ` +
    `${recode(featureCode)}, or move it to ${carrier}.`,
  [CoreMessage.ForeignScnCodeManyCarriers]: (file, featureCode, scnId, named, carrierCount, carriers) =>
    `${foreignOpening(file, featureCode, scnId, named)}it counts this scenario under the one row for ${named}, which ${carrierCount} feature ` +
    `files carry — ${carriers} — so that row cannot say which of them it belongs to. ` +
    `${recode(featureCode)}, or move it once a single file carries ${named}.`,
  [CoreMessage.ForeignScnCodeNoCarrier]: (file, featureCode, scnId, named) =>
    `${foreignOpening(file, featureCode, scnId, named)}it opens a row for ${named}, which no feature file carries as its header code, so ` +
    `that row stands for no file. ${recode(featureCode)}.`,
  [CoreMessage.NoFeatureCode]: (file) =>
    `${file} carries no feature code, but its scenarios carry @SCN codes. A feature ` +
    `file is the class its scenarios' codes are filed under: give it a header code of its own, ` +
    `and code its scenarios for it.`,
  [CoreMessage.ScenarioSeveralScnCodes]: (file, scenario, codes) =>
    `${file}'s scenario "${scenario}" carries ${codes.length} @SCN codes — ${codes.join(", ")}. A scenario ` +
    `is one account, so it raises its evidence obligations under none of them, and a test citing any ` +
    `of them cites a code no scenario carries. Give it one code.`,
  [CoreMessage.SummaryViewsHeading]: "## Summary views",
  [CoreMessage.RunVerdictHeading]: "### Run verdict",
  [CoreMessage.VerdictExit]: (code) => `exit ${code}`,
  [CoreMessage.ScenarioCodeErrorsHeadline]: "**SCENARIO CODE ERRORS**",
  [CoreMessage.ScenarioCodeErrorsGloss]: (alsoOutOfBalance) =>
    "the corpus files a scenario code under the wrong feature, so the by-feature grouping " +
    `cannot be trusted. Read \`## Scenario code errors\` above.${alsoOutOfBalance} This run FAILED.`,
  [CoreMessage.SeveralScnCodesGloss]: (alsoOutOfBalance) =>
    "a scenario in the corpus carries more than one scenario code, so no account was raised for it " +
    `under any of them. Read \`## Scenario code errors\` above.${alsoOutOfBalance} This run FAILED.`,
  [CoreMessage.MisfiledAndSeveralScnCodesGloss]: (alsoOutOfBalance) =>
    "the corpus files a scenario code under the wrong feature, so the by-feature grouping cannot be " +
    "trusted, and a scenario in it carries more than one scenario code, so no account was raised for it " +
    `under any of them. Read \`## Scenario code errors\` above.${alsoOutOfBalance} This run FAILED.`,
  [CoreMessage.AlsoOutOfBalance]:
    " The accounts do not agree either: at least one Claim Reconciliation carries a reconciling item.",
  [CoreMessage.OutOfBalanceHeadline]: "**OUT-OF-BALANCE**",
  [CoreMessage.OutOfBalanceGloss]:
    "the accounts do not agree. At least one Claim Reconciliation carries a reconciling item. This run FAILED.",
  [CoreMessage.UnsoundHeadline]: "**UNSOUND**",
  [CoreMessage.UnsoundGloss]:
    "the evidence could not be TRUSTED to reconcile. A proof never ran, so the behaviour " +
    "it proves was never exercised. Read the run-integrity stamp above before any count " +
    "below it.",
  [CoreMessage.PendingHeadline]: "**PENDING**",
  [CoreMessage.PendingGloss]:
    "every Claim Reconciliation balances, but Pending Items are outstanding and this run " +
    "treats a deferral as a failure (`--strict`). This run FAILED.",
  [CoreMessage.BalancedHeadline]: "**BALANCED**",
  [CoreMessage.BalancedGloss]: `every Claim Reconciliation balances: every ${SATISFIED}.`,
  [CoreMessage.NothingToReconcileHeadline]: "**NOTHING TO RECONCILE**",
  [CoreMessage.NothingToReconcileGloss]: (corpusDir) =>
    "there were no accounts to agree. The ledger carries no Claim Reconciliation at " +
    `all, so this run has NO BASIS FOR A VERDICT — the corpus \`${corpusDir}\` ` +
    "carried no scenario and nothing was produced. Not balanced: a run that examined nothing must not certify.",
  [CoreMessage.PendingItemsOutstanding]:
    "Pending Items are outstanding — deferred, not out-of-balance, so the verdict stands. " +
    "A run that treats a deferral as a failure gives exit 3 under `--strict`.",
  [CoreMessage.EvidenceReconciliationHeading]: "### Evidence reconciliation",
  [CoreMessage.EvidenceReconciliationClaimReconciliationTerm]:
    "A Claim Reconciliation is one row of the ledger: the evidence for one claim, a scenario, a phantom claim or the unnamed claim, reconciled quality check by quality check.",
  [CoreMessage.EvidenceReconciliationQualityCheckReconciliationTerm]:
    "A Quality Check Reconciliation is one quality check's evidence within a claim. " +
    "A claim holds one for each quality check its evidence names, so a scenario tagged both unit and integration " +
    "adds one to the Claim Reconciliation total and two to the Quality Check Reconciliation total.",
  [CoreMessage.EvidenceReconciliationEvidenceObligationTerm]:
    "An Evidence Obligation is what a scenario asks for: one for each quality check its tags name, met by Evidence Observations.",
  [CoreMessage.EvidenceReconciliationEvidenceObservationTerm]:
    "An Evidence Observation is a test or a fitness function that ran, attributed to the scenario it cites.",
  [CoreMessage.SubjectColumn]: "Subject",
  [CoreMessage.TotalColumn]: "Total",
  [CoreMessage.BalancedColumn]: "Balanced",
  [CoreMessage.OutOfBalanceColumn]: "Out-of-balance",
  [CoreMessage.DetailColumn]: "Detail",
  [CoreMessage.ClaimReconciliationSubject]: "Claim Reconciliation",
  [CoreMessage.QualityCheckReconciliationSubject]: "Quality Check Reconciliation",
  [CoreMessage.PendingTally]: (pending) =>
    `${pending} Pending Item(s) — deferred, tallied apart from balanced and out-of-balance.`,
  [CoreMessage.EvidenceObservationsHeading]: "### Evidence observations",
  [CoreMessage.EvidenceObservationsSum]: (total, onScenario, onPhantomClaim, onUnnamedClaim) =>
    `${total} evidence observations = ${onScenario} on scenarios + ${onPhantomClaim} on ${CITED_WITH_NO_SCENARIO} + ${onUnnamedClaim} citing no scenario.`,
  [CoreMessage.EvidenceObservationsTableHeader]: "| Quality-check | Evidence observations |",
  [CoreMessage.BehaviouralRunnersHeading]: "### Behavioural runners",
  [CoreMessage.BehaviouralRunnersTableHeader]: "| Tier | Runner | Recognised at |",
  [CoreMessage.RunnerTierNamesNone]: (tier) => `${tier} — no runner: the target names none.`,
  [CoreMessage.RunnerTierUnnamed]: (tier) => `${tier} — unnamed: the target has not said.`,
  [CoreMessage.RunnerKeyNotATier]: (key) =>
    `${key} — not a tier: the runner block is keyed by the four tiers, and this key excludes nothing.`,
  [CoreMessage.ReconcilerStep]: (step, whatItIs) => `${step} — the reconciler: ${whatItIs}.`,
  [CoreMessage.ReconcilerReconciles]: "this step runs the reconciliation this report is",
  [CoreMessage.ReconcilerRecords]: "this step writes the step record the reconciliation reads",
  [CoreMessage.StepExcluded]: (entry) => `${entry} — excluded: the target names this step a non-check.`,
  [CoreMessage.NotChecksEntryMatchesNoStep]: (entry) => `${entry} — matches no step: the entry names nothing this run read.`,
  [CoreMessage.StepAccountingHeading]: "### Step accounting",
  [CoreMessage.StepAccountingTableHeader]:
    "| Workflow | Job | Steps read | Candidates | Runners | Reconciler | Excluded | GitHub plumbing | Accounted for |",
  [CoreMessage.StepAccountingTotal]: "Total",
  [CoreMessage.StepAccountingRunnersLabel]: "Runners:",
  [CoreMessage.StepAccountingReconcilerLabel]: "Reconciler:",
  [CoreMessage.StepAccountingExcludedLabel]: "Excluded:",
  [CoreMessage.StepAccountingPlumbingLabel]: "GitHub plumbing:",
  [CoreMessage.EveryStepAccountedFor]: "every step this run read is accounted for.",
  [CoreMessage.StepsNotAccountedFor]: (stepsRead, accountedFor) =>
    `${stepsRead} step(s) read, ${accountedFor} accounted for — the five dispositions do not ` +
    `add up to the steps this run read.`,
  [CoreMessage.FitnessHeading]: "### Fitness evidence obligations",
  [CoreMessage.FitnessSatisfiedOf]: (satisfied, total) =>
    `${satisfied} of ${total} fitness evidence obligations reconcile satisfied.`,
  [CoreMessage.FitnessTableHeader]: "| Scenario | Outcome |",
  [CoreMessage.OutOfBalanceByFeatureHeading]: "### Out-of-balance by feature",
  [CoreMessage.ScenarioClaimReconciliationsOutOfBalance]: (outOfBalance, claimReconciliations) => `${outOfBalance} of ${claimReconciliations} Claim Reconciliation(s) of scenarios out of balance`,
  [CoreMessage.GroupedByFeature]: ", grouped by feature",
  [CoreMessage.NotGroupedByFeature]: (ungrouped) =>
    `${ungrouped} out of balance, not grouped by feature (no feature file names them)`,
  [CoreMessage.PhantomClaimReconciliations]: (count) => `${count} Claim Reconciliation(s) for ${CITED_WITH_NO_SCENARIO}`,
  [CoreMessage.UnnamedClaimReconciliations]: (count) => `${count} Claim Reconciliation(s) for ${CITING_NO_SCENARIO}`,
  [CoreMessage.AndJoiner]: " and ",
  [CoreMessage.ByFeatureTableHeader]: "| Feature | Count | Out-of-balance `@SCN` ids |",
  [CoreMessage.NoScnCodeScenarios]: (count) => `${count} with no \`@SCN\` code`,
  [CoreMessage.ClaimReconciliationsHeading]: "## Claim Reconciliations",
  [CoreMessage.ClaimReconciliationTally]: (total, balanced, outOfBalance) =>
    `${total} Claim Reconciliation(s): ${balanced} balanced, ${outOfBalance} out-of-balance.`,
  [CoreMessage.PhantomClaimTally]: (count) =>
    `${count} Claim Reconciliation(s) for ${CITED_WITH_NO_SCENARIO}.`,
  [CoreMessage.UnnamedClaimTally]: (count) =>
    `${count} Claim Reconciliation(s) for ${CITING_NO_SCENARIO}, aggregated into "${UNNAMED_CLAIM_ID}".`,
  [CoreMessage.ExcludedScnOccurrences]: (count) => `${count} @SCN ids seen in non-tag context, excluded`,
  [CoreMessage.UntaggedScenarios]: (count) => `${count} scenario(s) carry no @SCN tag`,
  [CoreMessage.SharedScnCodes]: (scenarios, accounts, codes) =>
    `The corpus holds ${scenarios} scenarios in ${accounts} accounts — ${codes} @SCN code(s) carried by more than one scenario:`,
  [CoreMessage.SharedScnCodeScenario]: (feature, title) => `this one is ${feature} : ${title}`,
  [CoreMessage.LedgerTableHeader]: "| Claim | Verdict | Reconciling items |",
  [CoreMessage.ClaimColumn]: "Claim",
  [CoreMessage.VerdictColumn]: "Verdict",
  [CoreMessage.ReconcilingItemsColumn]: "Reconciling items",
  [CoreMessage.EvidenceCellKey]: [
    "Key: each evidence cell reads *obligation*/*observations*.",
    "- The letter says the scenario's tags raise an Evidence Obligation of that kind: (F)itness, (U)nit, (I)ntegration, (E)2e, (P)erformance. `-` means none is raised, or the obligation is pending.",
    "- The number counts the Evidence Observations posted to the scenario for that kind. `-` means none.",
    "- For example, `U/2` is a unit obligation answered by two unit tests; `U/-` is a unit obligation that no unit test answered; `-/1` is one unit test citing a scenario that asks for no unit evidence, or whose unit evidence is pending.",
    "- A blank cell means neither; `—` marks a row that is not a scenario of the corpus: a cited code no feature declares, or evidence that cites no scenario.",
    "- In Reconciling items, `—` means the row has no reconciling item.",
  ].join("\n"),
  [CoreMessage.PendingItem]: "pending",
  [CoreMessage.PendingItemFor]: (qualityCheck) => `pending: ${qualityCheck}`,
  [CoreMessage.CheckStepNoOutcome]: (scnId) =>
    `${scnId}: the CI run's record carries no outcome for this check's step — so the check did not run.`,
  [CoreMessage.CheckStepSkipped]: (scnId) =>
    `${scnId}: the CI run's record says this check's step was skipped — so the check did not run.`,
  [CoreMessage.CheckStepEnded]: (scnId, outcome) =>
    `${scnId}: the CI run's record says this check's step ended \`${outcome}\` — so the check did not run.`,
  [CoreMessage.AmbiguousNamedStep]: (step) =>
    `The step "${step}" is ambiguous — two or more step definitions match it, so the step never ran.`,
  [CoreMessage.AmbiguousUnnamedStep]: "A step is ambiguous — two or more step definitions match it, so the step never ran.",
  [CoreMessage.ManifestKindList]: "a list",
  [CoreMessage.ManifestKindObject]: "an object",
  [CoreMessage.ManifestKindString]: aKind("string"),
  [CoreMessage.ManifestKindStringOrNull]: "a string or null",
  [CoreMessage.ManifestKindOfType]: aKind,
  [CoreMessage.OutcomeSatisfied]: SATISFIED,
  [CoreMessage.OutcomeMissing]: MISSING,
  [CoreMessage.OutcomeFailing]: "Evidence Observation is failing",
  [CoreMessage.OutcomeWatermelon]: "Evidence Observation is passing but its check could not fail its job",
  [CoreMessage.OutcomeNoScnCode]: "Evidence Obligation has no @SCN code for an Evidence Observation to link to",
  [CoreMessage.OutcomeDuplicateScnCode]: DUPLICATE_SCN_CODE,
  [CoreMessage.OutcomeCitesUnknownScenario]: "Evidence Observation cites an unknown Scenario",
  [CoreMessage.OutcomeCitesNoScenario]: "Evidence Observation cites no Scenario",
  [CoreMessage.OutcomeNoEvidenceObligation]: "Evidence Observation cites a Scenario with no matching Evidence Obligation",
  [CoreMessage.OutcomeBroken]:
    "Evidence Observation ATTEMPT errored before its proof ran (behaviour never exercised)",
  [CoreMessage.OutcomeBothMissing]:
    "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited",
  [CoreMessage.ObservationPassed]: "passed",
  [CoreMessage.ObservationFailed]: "failed",
  [CoreMessage.UnnamedClaimGroupCounts]: (ran, passed, failed) => `${ran} ran, ${passed} passed, ${failed} failed`,
  [CoreMessage.UnnamedClaimCiSteps]: (names) => `${names.length} CI step${names.length === 1 ? "" : "s"}: ${names.join(", ")}`,
  [CoreMessage.UnnamedClaimFailedNames]: (names) => `(failed: ${names.join(" / ")})`,
  [CoreMessage.SeveralScnCodes]: (codes) =>
    `${codes.length} scenario codes cite ${codes.join(", ")} — a test cites exactly one scenario, so this one credits none of them.`,
  [CoreMessage.SharedScnCode]: (code) =>
    `${code} is carried by more than one scenario, so this test credits none of them.`,
};
