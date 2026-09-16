/**
 * THE RECONCILE COMPOSITION — a target's already-read sources reconciled into its Evidence
 * Reconciliation. The ONE entry point core's `.` barrel gains at 3F-3086, and the last step of
 * moving the composition off the app's ingest edge (3F-3087, 3F-3088).
 *
 * WHY IT IS ONE FUNCTION AND NOT A SURFACE. `ingestQualityChecks.ts` is a published module, and it
 * reached nine core symbols through the unpublished `./internal` subpath to assemble this — which
 * is why an installed `spec-controller balance --help` threw ERR_PACKAGE_PATH_NOT_EXPORTED while
 * every gate in the workspace stayed green. Promoting those nine onto the public barrel would fix
 * the crash by freezing exactly the surface `3F-2837` un-published, and the registry-home question
 * (increment D) still governs their shape. So the CALLERS move to core's side of the boundary
 * instead, and the app reaches the whole composition through this one membership decision
 * (`3F-2804`). Nothing here is re-exported: the nine stay internal.
 *
 * WHY THE ARGUMENTS ARE DATA AND NOT READERS. Everything below is already in memory by the time
 * the edge calls this — the feature bytes, the manifest object, the CI bytes, the measurement
 * artefact, the runtime observations. Handing a reader for any of them would move I/O into the
 * engine wearing a callback, and `lint:boundaries`' `core-imports-io` rule reds over exactly that
 * (@SCN-EPG-001's `io-import` arm until 3F-3437). `killFloor` is the one
 * function, and only because a mutation record is opened lazily and at most once per pass: the
 * closure already exists at the edge and already carries that guarantee, so injecting it preserves
 * a behaviour rather than inventing a seam — and it is what keeps the engine from ever learning
 * that mutation ratchets exist (`3F-2841`'s pattern, and `3F-2859` stands).
 *
 * THE TARGET ROOT DOES NOT CROSS. It is resolved at the edge and every remaining use of it is
 * there: building the reader above, and relativising the runtime observations before they arrive.
 * Threading it in as well would put `node:child_process` and `process.cwd()`'s answer inside the
 * engine to be read by nothing.
 *
 * THE INPUT IS AN INLINE OBJECT TYPE, deliberately. A named exported interface would be a second
 * symbol on the frozen v1 surface for a shape only this function takes, and `@SCN-API-001` freezes
 * that barrel exactly — one entry point means one name.
 */

import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import { bareTerm } from "../lib/bareTerm.js";
import type { EvidenceObservation } from "../model.js";
import type { CiWorkflowStep, PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import {
  parseMeasuredEvidenceObservations,
  type MeasurementReport,
} from "../parse/measurements.js";
import { ciStepRecordCredits, type CiStepRecord } from "../parse/ciStepRecord.js";
import { recognisedRunners, runningStaticChecks } from "../parse/runningStaticChecks.js";
import { readTargetCorpus, type TargetCorpus } from "../parse/targetCorpus.js";
import { stepExclusions, type StepExclusions } from "../parse/stepExclusions.js";
import { discoveryScope } from "../parse/discoveryScope.js";
import { stepAccounting } from "../parse/stepAccounting.js";
import { reconcilerSteps, type ReconcilerSteps } from "../parse/reconcilerSteps.js";
import type { FitnessCheckIndex } from "../domain/fitnessChecks.js";
import {
  resolveDeferralTags,
  resolveNotChecks,
  resolveRetiredKeys,
  resolveRunners,
  type ResolvedRunners,
  resolveThresholds,
  resolveFitnessChecks,
  type KillFloorReader,
} from "../parse/targetManifest.js";
import type { BehaviouralRunner } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/** A target's manifest as this composition reads it — its scripts, and its `specController` block. */
type TargetManifest = PackageJsonScripts & {
  specController?: {
    deferralTags?: unknown;
    staticChecks?: unknown;
    thresholds?: unknown;
    fitnessChecks?: unknown;
    runners?: unknown;
    notChecks?: unknown;
  };
};

/**
 * THE FOUR OBSERVATION STREAMS a `balance` run reconciles, in one place.
 *
 * ITS OWN FUNCTION, extracted when the consumer's exclusion seam (@SCN-USG-015) took the
 * composition past the `max-lines-per-function` ceiling — `withUnconfiguredFitnessScenarios`'s
 * precedent, and the same seam: the streams are one idea with a name, and what is left above is
 * the composition that reads a target and hands them to the factory. Nothing about any of them
 * changed in the move.
 */
function observationStreams(
  input: {
    runtimeObservations: readonly EvidenceObservation[];
    ciSources: readonly string[];
    measurements: MeasurementReport;
    ciStepRecord?: CiStepRecord;
  },
  corpus: TargetCorpus,
  packageJson: TargetManifest,
  fitnessChecks: FitnessCheckIndex,
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: StepExclusions["isExcluded"]
): EvidenceObservation[] {
  // WHICH ROWS THE RUN'S OWN RECORD ANSWERS FOR, so the derivation reader does not answer them
  // again (@SCN-LNT-021, @SCN-LNT-022, @SCN-LNT-030; forced by @SCN-USG-004). A converted check
  // used to be one no discovery reader could SEE — its command is not a script of the manifest, so
  // no prefix reached it — and that accident is what kept one check from being observed twice.
  // Under the inverted membership rule every step is discovered, so the guarantee has to be a
  // mechanism: where a run is handed its own record, the CONFIGURED rows are answered by that
  // record (and by the measurement stream for the rows carrying a bar), and derivation answers the
  // residue — the steps citing no configured row at all.
  //
  // IT IS THE ROWS AND NOT THE ENTRIES, because the record answers for a row it holds NO entry for
  // too: that is broken evidence naming the row (@SCN-LNT-027), and a derivation credit landing
  // beside it would soften the loudest thing this axis can say into an ordinary green.
  //
  // NOT A FIFTH DISPOSITION AND NOT A DROP. The step is on the books either way; what this decides
  // is WHICH stream credits it, and the streams differ in what they know — the record carries what
  // the step DID, and a derivation credit carries only that it is wired in. Two credits on one row
  // let the poorer one win, which is measurable: a `continue-on-error` step the record says failed
  // reconciles `watermelon` rather than `failing` when both are posted.
  const answeredByTheRecord =
    input.ciStepRecord === undefined ? new Set<string>() : new Set(fitnessChecks.keys());
  return [
    ...input.runtimeObservations,
    ...checkObservations(
      corpus,
      input.ciSources,
      packageJson,
      runnerTiers,
      isExcluded,
      answeredByTheRecord
    ),
    // THE CONVERTED CHECKS' CREDITS (@SCN-LNT-021, @SCN-LNT-028) — the CI RUN'S OWN RECORD, the
    // observation side, beside the workflow FILE the two config-reading observers above already
    // read. Two documents and two questions: the file says a check is wired into this pipeline
    // and which row its step cites, the record says what that step DID on this run. Neither can
    // be got from the other's document, which is why both are read and neither replaces the
    // other.
    //
    // THEY JOIN THE STATIC STREAM BESIDE THE TWO CONFIG-READING OBSERVERS RATHER THAN REPLACING
    // EITHER: a target mid-conversion runs both kinds at once, and a converted check is simply
    // one no script-handle observer can see — it is never discovered, so nothing double-observes
    // it. The rows are the SAME reading the obligations were raised from, taken from `corpus`'s
    // own registry, so a credit can never cite a characteristic the debit side never owed.
    //
    // THE OPTIONALITY IS PASSED THROUGH RATHER THAN FLATTENED (@SCN-LNT-027). A run handed NO
    // record is not a run handed a record carrying nothing, and those are opposite facts. The
    // first is a consumer whose pipeline dumps no record, or a run nobody recorded: its rows
    // reconcile missing and the run is out of balance. The second is a run that happened and
    // named not one of these steps, which is every configured check broken. The reader tells
    // them apart; nothing here may.
    ...ciStepRecordCredits(input.ciStepRecord, fitnessChecks),
    // THE THIRD STREAM (@SCN-CIP-003) — the measurements, which arrive already citing. They are
    // read here rather than folded into `checkObservations` because that function's observer
    // reads the target's CONFIG; a measurement is a fact about a run, and the only thing the
    // three share is the axis they ride.
    ...parseMeasuredEvidenceObservations(input.measurements),
  ];
}

/**
 * EVERYTHING A `balance` RUN IS HANDED — the target's bytes, its manifest, and the two things the
 * application layer owns rather than the engine. Named rather than written inline on the function
 * below, so the function stays under the `max-lines-per-function` ceiling by being smaller rather
 * than by an exception, and so the contract a caller writes against has somewhere to be read. Each
 * member is documented on the function's own `@param` list, where it has always been.
 */
export interface EvidenceReconciliationSources {
  featureSources: readonly string[];
  untaggedScenarios: readonly string[];
  packageJson: TargetManifest;
  ciSources: readonly string[];
  ciSourceNames?: readonly string[];
  reconcilerInvocation?: string;
  measurements: MeasurementReport;
  runtimeObservations: readonly EvidenceObservation[];
  deferralTags: readonly string[];
  killFloor: KillFloorReader;
  ciStepRecord?: CiStepRecord;
}

/**
 * Reconcile a target's obligations against its observations, from sources somebody else read.
 *
 * @param input.featureSources the target's `.feature` bytes, discovered and read ONCE at the edge —
 * one array rather than a directory, so the three readings a citing run needs are taken from the
 * same bytes and a citation can never be resolved against a corpus the ledger was not built from
 * (@SCN-LNT-009).
 * @param input.untaggedScenarios the corpus's untagged half, each by its `<feature> : <scenario>`
 * locator (@SCN-LDG-021). Parsed at the edge because the locator names the FILE, and the file is
 * what the discovery knows and a source string does not.
 * @param input.packageJson the TARGET's manifest object (@SCN-LNT-005) — its `specController`
 * config and the `scripts` the `exists` read consults.
 * @param input.ciSources the target's workflow bytes, file-or-directory resolved at the edge
 * (@SCN-USG-006).
 * @param input.ciSourceNames the workflow FILE each of those sources was read from, in the same
 * order — the half of a `notChecks` entry the core cannot know (@SCN-USG-015). Mapped at the edge
 * where the paths were already resolved, because the core holds no filesystem and `ciSourcePaths`
 * is explicit that keeping it that way is the point. Optional: a caller that supplies none names
 * no source, and a source with no name is one no entry can exclude.
 * @param input.reconcilerInvocation how this tool is invoked to reconcile (@SCN-USG-014) — the
 * step running it is the reconciler rather than one of the reconciled rows, and a citation on it
 * could never be satisfied. Set at the edge, which is where the command line is a known fact;
 * optional, and a run told none recognises no reconciling step, which is the safe direction — a
 * candidate too many, named on the report, rather than a step taken off the books by nothing.
 * @param input.measurements the measurement artefact as JSON handed it over (@SCN-CIP-003) — the
 * third observation stream, which arrives already citing.
 * @param input.runtimeObservations the vitest / cucumber observations, parsed at the edge because
 * each source's fallback quality-check is the application layer's mapping, not the engine's.
 * @param input.deferralTags the application layer's STARTER deferral set, which a target's config
 * may only extend (@SCN-PND-021). Product policy, single-sourced there and never here.
 * @param input.killFloor the reader over the target's mutation records, injected as a closure.
 * @param input.ciStepRecord the CI RUN's own record of what each of its steps did (@SCN-LNT-021,
 * @SCN-LNT-028) — the CONVERTED checks' whole credit stream, and the observation side of the
 * fitness axis, beside the workflow FILE this composition already reads for the derivation side. Two documents, two questions: the file says a check is wired in,
 * the record says what it did on this run. Optional, and absent means what it says — a run handed
 * no record of itself observes exactly what it observed before.
 */
/**
 * WHAT A TARGET SAID ABOUT ITS OWN PIPELINE — the two dispositions its manifest can name, the one
 * this tool names for itself, and the single seam discovery is asked through.
 *
 * ITS OWN FUNCTION, extracted when the scope account (@SCN-USG-020) took the composition past the
 * `max-lines-per-function` ceiling — `observationStreams`'s precedent, and a real seam rather than
 * a cut for length: these are the readings taken off a target's WORKFLOWS, where everything left
 * above is taken off its CORPUS. Nothing about any of them changed in the move.
 */
interface PipelineReadings {
  readonly runners: ResolvedRunners;
  readonly exclusions: StepExclusions;
  readonly reconciler: ReconcilerSteps;
  readonly isExcluded: (step: CiWorkflowStep) => boolean;
}

function pipelineReadings(input: EvidenceReconciliationSources): PipelineReadings {
  const { packageJson } = input;
  // THE CONSUMER'S OWN EXCLUSIONS, RESOLVED ONCE (@SCN-USG-015), and both things this run does
  // with them come off that one reading: the seam the discovery reader is asked through, and the
  // account the report carries. Two resolutions would be free to describe two different manifests
  // in one report — a step excluded from the books and named nowhere, or named as excluded while
  // still on them, and each of those is a report that lies in a different direction.
  const exclusions = stepExclusions(
    input.ciSources,
    input.ciSourceNames ?? [],
    resolveNotChecks(packageJson)
  );

  // THE TARGET'S OWN RUNNERS, RESOLVED ONCE (@SCN-USG-004, @SCN-USG-011), for the reason the two
  // readings beside them are: what a run does with them is the membership rule the discovery
  // observer asks AND the account the report carries, and two resolutions would be free to name a
  // step the unit runner in one section while the books posted it as an uncited check in another.
  const runners = resolveRunners(packageJson);

  // THE RECONCILER'S OWN STEPS (@SCN-USG-014), read off the same bytes and the same manifest, and
  // read whatever the target configured — it is the one exclusion no consumer writes, and the one
  // that has to hold over a manifest saying nothing. Like the exclusions above, both things this
  // run does with it come off ONE reading: the seam discovery is asked through, and the account
  // the report carries.
  const reconciler = reconcilerSteps(
    input.ciSources,
    input.ciSourceNames ?? [],
    input.reconcilerInvocation ?? "",
    packageJson
  );

  // THE TWO EXCLUSIONS, COMPOSED HERE AND NOWHERE ELSE. Discovery needs one answer per step, and
  // the precedence between "the reconciler" and "the consumer said so" is the report's business
  // rather than an observer's: both take the step out of the books, and each says so in its own
  // section. The reconciler is asked first because it holds whatever the manifest says. The
  // runner is NOT one of them: it is the membership rule itself and the observer applies it, so
  // folding it in here would put the same question in two places.
  //
  // ONE COMPOSITION, TWO READERS (@SCN-USG-020). The observer posts a check for every step this
  // leaves in, and the scope census counts them per job — so a second composition would let the
  // report state a number of candidates for a job that the books beneath it never posted.
  return {
    runners,
    exclusions,
    reconciler,
    isExcluded: (step) => reconciler.isReconciler(step) || exclusions.isExcluded(step),
  };
}

export function evidenceReconciliationFromSources(
  input: EvidenceReconciliationSources
): EvidenceReconciliation {
  const { packageJson } = input;
  // ONE READING OF THE CONFIGURED ROWS, shared by both sides of this axis. The DEBIT reads them for
  // the characteristic a converted scenario owes and the CREDIT for the characteristic its reported
  // scenario answers, and two resolutions would be free to disagree about a manifest neither of
  // them wrote — the same guarantee `readTargetCorpus` composes its three readings for.
  const fitnessChecks = resolveFitnessChecks(packageJson, input.killFloor);
  const corpus = readTargetCorpus(
    input.featureSources,
    resolveDeferralTags(packageJson, input.deferralTags),
    resolveThresholds(packageJson, input.killFloor),
    fitnessChecks
  );

  // WHAT THE TARGET SAID ABOUT ITS OWN PIPELINE, read once (see `pipelineReadings`).
  const { runners, exclusions, reconciler, isExcluded } = pipelineReadings(input);

  // The feature corpus is BOTH halves: the @SCN-tagged scenarios AND the untagged ones
  // (@SCN-LDG-021). An untagged scenario cannot be linked to an observation, so it reconciles
  // `no-scn-code` on its own out-of-balance row — never silently dropped from the debit side.
  // THE CONCEPT, BUILT BY ITS OWN FACTORY (3F-2233) — nobody assembles a Ledger and leaves someone
  // downstream to total it. The two axis GATES are always on for a `balance` run: both the
  // runtime-observation and the static-check streams are threaded.
  const reconciliation = evidenceReconciliationOf(
    corpus.scenarios,
    observationStreams(input, corpus, packageJson, fitnessChecks, runners.tiers, isExcluded),
    [...input.untaggedScenarios],
    true,
    true
  );
  return withReaderAccounts(
    reconciliation,
    corpus,
    input,
    packageJson,
    runners,
    exclusions,
    reconciler,
    isExcluded
  );
}

/**
 * EVERYTHING THE READER SAW THAT THE JOURNAL CANNOT HOLD, grafted onto the summary the factory
 * built — the corpus's half-converted checks, what the target said about its runners and what a
 * run recognised off that, the reconciler's own steps, and the consumer's own exclusions.
 *
 * ITS OWN FUNCTION, extracted when the reconciler account (@SCN-USG-014) took the composition past
 * the `max-lines-per-function` ceiling — `observationStreams`'s precedent, and the same seam. Each
 * graft states its own reason for being a graft; what they share, and what this name says, is that
 * none of them is an obligation or an observation, so no row exists for any of them to be derived
 * from. Nothing about any of them changed in the move.
 *
 * THE ORDER IS THE REPORT'S, NOT A PREFERENCE. Each graft only adds its own member, so no two can
 * overwrite one another and the composition is free to read in the order a reader meets the
 * sections: what the corpus said, what ran the suites, what this tool took out of its own books,
 * then what the consumer took out.
 */
function withReaderAccounts(
  reconciliation: EvidenceReconciliation,
  corpus: TargetCorpus,
  input: { ciSources: readonly string[]; ciSourceNames?: readonly string[] },
  packageJson: TargetManifest,
  runners: ResolvedRunners,
  exclusions: StepExclusions,
  reconciler: ReconcilerSteps,
  isExcluded: (step: CiWorkflowStep) => boolean
): EvidenceReconciliation {
  return withStepAccounting(
    withScopeAccount(
      withExclusionAccount(
        withReconcilerAccount(
          withRunnerAccount(
            withRetiredKeysAccount(
              withUnconfiguredFitnessScenarios(reconciliation, corpus),
              packageJson
            ),
            input.ciSources,
            packageJson,
            runners
          ),
          reconciler
        ),
        exclusions
      ),
      input,
      packageJson,
      runners.tiers,
      isExcluded
    ),
    input.ciSources,
    packageJson,
    runners.tiers,
    reconciler,
    exclusions
  );
}

/**
 * THE RETIRED-KEY ACCOUNT (@SCN-USG-021) — the target's own `specController.*` keys this reader
 * no longer reads, carried onto the summary the factory built rather than threaded through it,
 * for the reason the half-converted scenarios beside it are: the factory's inputs are the
 * JOURNAL, and a retired key is neither an obligation nor an observation. Nothing reads it, so
 * there is no row for it to be derived from — only a name for the report to carry.
 *
 * READ OFF THE SAME MANIFEST EVERY OTHER GRAFT IN THIS MODULE COMES FROM, and nothing else: a
 * retired key is a fact about what the target WROTE, not about its pipeline, so it needs no CI
 * bytes and no corpus reading to resolve.
 *
 * ONLY WHEN THERE IS SOMETHING TO SAY, so a target that has never written a retired key — every
 * target today — renders and serialises byte-identically to before.
 */
function withRetiredKeysAccount(
  reconciliation: EvidenceReconciliation,
  packageJson: TargetManifest
): EvidenceReconciliation {
  const retiredKeys = resolveRetiredKeys(packageJson);
  if (retiredKeys.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: { ...reconciliation.summary, retiredKeys },
  };
}

/**
 * THE ACCOUNTING IDENTITY (@SCN-USG-018) — what became of every step this run read, carried onto
 * the summary the factory built for the reason the four accounts beside it are: the factory's
 * inputs are the JOURNAL, and three of the four dispositions post no row at all.
 *
 * LAST OF THE GRAFTS, because it is the one that counts what the others named. It takes the
 * reconciler and the exclusions as their two SEPARATE seams rather than as the composed answer the
 * observer is asked through: the observer needs one answer per step and cannot tell the two facts
 * apart, while this reader has to, because a report that folded them would tell a consumer who
 * configured nothing that their configuration took two steps out.
 *
 * IT ASKS THE PRODUCT'S OWN RULES rather than re-deriving any of them, and `parse/stepAccounting`
 * states why: a count that decided membership for itself would agree with itself over books that
 * said something else, which is the one disagreement a reader of a total cannot see.
 *
 * ONLY WHEN A STEP WAS READ, so a run handed no CI configuration renders and serialises
 * byte-identically to before.
 */
function withStepAccounting(
  reconciliation: EvidenceReconciliation,
  ciSources: readonly string[],
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  reconciler: ReconcilerSteps,
  exclusions: StepExclusions
): EvidenceReconciliation {
  const accounting = stepAccounting(
    ciSources,
    packageJson,
    runnerTiers,
    reconciler.isReconciler,
    exclusions.isExcluded
  );
  if (accounting.stepsRead === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: { ...reconciliation.summary, stepAccounting: accounting },
  };
}

/**
 * THE SCOPE ACCOUNT (@SCN-USG-020) — which workflow files and which of their jobs this run read,
 * with the steps each held and how many became candidates, carried onto the summary the factory
 * built for the reason the three accounts beside it are: the factory's inputs are the JOURNAL, and
 * a job is neither an obligation nor an observation. It is where the steps CAME FROM, so there is
 * no row for it to be derived from.
 *
 * LAST OF THE GRAFTS AND FIRST OF THE SECTIONS, and that is not a contradiction. It is grafted
 * last because it is the only one needing the composed exclusion seam the observer was asked
 * through — the same seam, so the candidates it counts per job are the candidates the books
 * posted. It renders first because it is the pipeline every figure under it was read from.
 *
 * ONLY WHEN THERE IS SOMETHING TO SAY, so a run handed no CI configuration renders and serialises
 * byte-identically to before.
 */
function withScopeAccount(
  reconciliation: EvidenceReconciliation,
  input: { ciSources: readonly string[]; ciSourceNames?: readonly string[] },
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: (step: CiWorkflowStep) => boolean
): EvidenceReconciliation {
  const scope = discoveryScope(
    input.ciSources,
    input.ciSourceNames ?? [],
    packageJson,
    runnerTiers,
    isExcluded
  );
  if (scope.length === 0) return reconciliation;
  return { ...reconciliation, summary: { ...reconciliation.summary, discoveryScope: scope } };
}

/**
 * THE RECONCILER ACCOUNT (@SCN-USG-014) — the steps of the target's pipeline that ARE this
 * reconciliation, carried onto the summary the factory built rather than threaded through it, for
 * the reason the two accounts beside it are: the factory's inputs are the JOURNAL, and the
 * reconciler is neither an obligation nor an observation. It is the disposition a step got INSTEAD
 * of reaching the books, so there is no row for it to be derived from.
 *
 * SEPARATE FROM THE EXCLUSION ACCOUNT, deliberately, though both end as steps that are off the
 * books. That one is a list the consumer wrote; this one is nobody's. Folding them would tell a
 * consumer who configured nothing that their configuration took two steps out — and a consumer who
 * then went looking for the entries would find none.
 *
 * ONLY WHEN THERE IS SOMETHING TO SAY, so a target whose pipeline does not run this tool renders
 * and serialises byte-identically to before.
 */
function withReconcilerAccount(
  reconciliation: EvidenceReconciliation,
  reconciler: ReconcilerSteps
): EvidenceReconciliation {
  if (reconciler.steps.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: { ...reconciliation.summary, reconcilerSteps: reconciler.steps },
  };
}

/**
 * THE EXCLUSION ACCOUNT (@SCN-USG-015) — the steps the target named non-checks and the entries of
 * its list that named none, carried onto the summary the factory built rather than threaded
 * through it, for the reason the runner account beside it is: the factory's inputs are the
 * JOURNAL, and an excluded step is neither an obligation nor an observation. It is the disposition
 * a step got INSTEAD of reaching the books, so there is no row for it to be derived from.
 *
 * BOTH HALVES OFF ONE PARTITION, which is why they are grafted together. They are the two sides of
 * the same list and their totals have to add up to it — an entry in neither is an exclusion the
 * consumer wrote that nothing anywhere accounts for.
 *
 * EACH ONLY WHEN THERE IS SOMETHING TO SAY, so a target that names no non-checks renders and
 * serialises byte-identically to before.
 */
function withExclusionAccount(
  reconciliation: EvidenceReconciliation,
  exclusions: StepExclusions
): EvidenceReconciliation {
  const { excluded, unmatchedEntries } = exclusions;
  if (excluded.length === 0 && unmatchedEntries.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(excluded.length > 0 ? { excludedSteps: excluded } : {}),
      ...(unmatchedEntries.length > 0 ? { unmatchedNotChecks: unmatchedEntries } : {}),
    },
  };
}

/**
 * THE RUNNER ACCOUNT — what the target SAID about each tier (@SCN-USG-016) and which steps a run
 * RECOGNISED off it (@SCN-USG-011), carried onto the summary the factory built rather than threaded
 * through it, for the reason the half-converted scenarios beside them are: the factory's inputs are
 * the JOURNAL, and a runner is neither an obligation nor an observation. It is the disposition a
 * step gets INSTEAD of reaching the books, so there is no row for it to be derived from.
 *
 * ONE READING OF THE BLOCK BEHIND BOTH, which is why they are one function and not two. They are
 * opposite facts — one about the manifest, one about the pipeline — and the interesting cases are
 * exactly where they fail to line up: a tier the target says it has NO runner for is recognised at
 * no step, and so is a tier it never mentioned. Two resolutions would be free to describe two
 * different manifests in one report, and the report would read as though it had found something.
 *
 * EACH ONLY WHEN THERE IS SOMETHING TO SAY, so a target that has named no runners — no block, or a
 * block nothing could be read out of — renders and serialises byte-identically to before.
 *
 * AND THAT IS WHAT A `new-client` IS OWED, settled by the scenario that was still open when this
 * graft was written (@SCN-USG-017). Such a target has named nothing, so nothing is taken out of
 * discovery and every step of its pipeline reaches the books as a candidate — which is the whole of
 * the report that state is sold on. It is the OBSERVER that owes them that, not this graft: there
 * is no runner to account for, and an account of four tiers nobody named would read as the tool
 * asking for configuration before it will answer.
 */
function withRunnerAccount(
  reconciliation: EvidenceReconciliation,
  ciSources: readonly string[],
  packageJson: TargetManifest,
  { tiers: runnerTiers, unrecognisedKeys }: ResolvedRunners
): EvidenceReconciliation {
  // THE PARTITION, NOT THE BLOCK (@SCN-USG-019). Only the entries keyed by a canon tier reach the
  // recognition below; a key outside the four is carried to the report instead, where it is named.
  // Reading the whole block would let a consumer take their own checks out of discovery one
  // invented key at a time, which is the closure's whole subject — and since @SCN-USG-004 that is
  // no longer only a reporting question: these tiers ARE the membership rule.
  //
  // RULE D, over the SAME manifest and the SAME CI bytes every other reading in this module comes
  // from (@SCN-USG-011), and through the same `namedRunnersAt` the discovery observer asks. So a
  // step named here as a runner is the same step that is not on the books as a fitness check.
  const behaviouralRunners: readonly BehaviouralRunner[] = recognisedRunners(
    ciSources,
    packageJson,
    runnerTiers
  );
  const named = Object.keys(runnerTiers).length > 0;
  if (behaviouralRunners.length === 0 && !named && unrecognisedKeys.length === 0) {
    return reconciliation;
  }
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(behaviouralRunners.length > 0 ? { behaviouralRunners } : {}),
      ...(named ? { runnerTiers } : {}),
      ...(unrecognisedKeys.length > 0 ? { unrecognisedRunnerKeys: unrecognisedKeys } : {}),
    },
  };
}

/**
 * THE CORPUS'S HALF-CONVERTED CHECKS (@SCN-LNT-020), carried onto the summary the factory built
 * rather than threaded through it. The factory's inputs are the JOURNAL — obligations and
 * observations — and this is neither: it is what the corpus said about itself that no row answered,
 * so a scenario naming it raises nothing for a Ledger to hold. It is grafted where the corpus
 * reading and the reconciliation are both in hand, and only when there is something to name, so a
 * target that has converted nothing serialises exactly as before.
 *
 * ITS OWN FUNCTION, extracted when the credit stream (@SCN-LNT-021) took the composition past the
 * `max-lines-per-function` ceiling. The graft is one idea with a name; nothing about it changed.
 */
function withUnconfiguredFitnessScenarios(
  reconciliation: EvidenceReconciliation,
  corpus: TargetCorpus
): EvidenceReconciliation {
  if (corpus.unconfiguredFitnessScenarios.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      unconfiguredFitnessScenarios: corpus.unconfiguredFitnessScenarios,
    },
  };
}

/**
 * The COMPLETE static stream the reconciliation consumes, from the RUNNING-check observer — the
 * static analogue of a runner emitting every test result, so nothing a gate runs is off the books.
 *
 * THE OBLIGATION-SIDE OBSERVER THIS COMPOSED ALONGSIDE IS RETIRED (3F-3161, @SCN-LNT-017). It
 * answered for every check the corpus obliged by a REGISTERED handle (`corpus.checkHandles`), and
 * that discovery went with the registry it was keyed from: every check now either states its own
 * row's code on its CI step, which the running-check observer already reads, or is a converted
 * `@fitness` row with no runnable script handle to be discovered by. There is no second observer
 * left to double-observe against.
 *
 * WHAT A SURVIVOR CITES IS THE TARGET'S OWN ANSWER (@SCN-LNT-031). A check whose CI step states the
 * code of the configured row it runs posts to that row; one whose step states none cites no
 * scenario and the reconciliation folds it into the suspense row (@SCN-USG-001), which is where an
 * unattributed check is meant to surface. That is the state a consumer starts in, and it is the
 * report this axis's first useful sentence is made of.
 */
function checkObservations(
  corpus: TargetCorpus,
  ciSources: readonly string[],
  packageJson: TargetManifest,
  // @SCN-USG-004 — the target's declared behavioural runners, resolved ONCE by the composition and
  // read by both the account the report carries and the membership rule below. Two resolutions
  // would be free to name a step the unit runner in one section while the books posted it as a
  // fitness check in the other.
  runnerTiers: Readonly<Record<string, string | null>>,
  // @SCN-USG-015 — the consumer's own exclusions, reaching the DISCOVERY observer.
  isExcluded: StepExclusions["isExcluded"],
  // The configured rows this run's own record answers for — none when it was handed no record.
  // Stated at the composition (`observationStreams`), because which STREAM answers a row is a
  // question about the run's inputs and not one an observer has any business holding.
  answeredByTheRecord: ReadonlySet<string>
): EvidenceObservation[] {
  return [
    ...runningStaticChecks(
      ciSources,
      packageJson,
      runnerTiers,
      // THE CONSUMER'S OWN CITATION, WIRED (@SCN-LNT-031). The walk carries a check step's `id:`
      // and this observer reads it, and until this seam was passed the two met nowhere: every
      // discovered check on the live path cited nothing, so a fully annotated pipeline reconciled
      // exactly as an unannotated one — `new-client` reported over a target in `annotated`.
      //
      // THE HANDLE IS DELIBERATELY NOT CONSULTED. The row a step's code names carries the
      // characteristic, so both terms come off ONE configured row; reaching for the script's
      // spelling to supply the half a CI step cannot state is the name-match this axis retired.
      // A step with no code, or one naming no configured row, reaches no citation and posts to
      // suspense — which is `new-client`, unnarrowed.
      (_script, citedByStep) => corpus.citedRow(citedByStep),
      isExcluded
    ).filter((o) => !(o.scnId !== undefined && answeredByTheRecord.has(bareTerm(o.scnId)))),
  ];
}
