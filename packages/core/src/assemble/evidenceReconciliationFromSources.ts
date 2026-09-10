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
 * engine wearing a callback, and `@SCN-EPG-001` reds over exactly that. `killFloor` is the one
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
import type { EvidenceObservation } from "../model.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import { checkStaticEvidenceObligations } from "../parse/checkStaticEvidenceObligations.js";
import {
  parseMeasuredEvidenceObservations,
  type MeasurementReport,
} from "../parse/measurements.js";
import { ciStepRecordCredits, type CiStepRecord } from "../parse/ciStepRecord.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import { readTargetCorpus, type TargetCorpus } from "../parse/targetCorpus.js";
import {
  resolveCheckRegistry,
  resolveDeferralTags,
  resolveStaticChecks,
  resolveThresholds,
  resolveFitnessChecks,
  type KillFloorReader,
} from "../parse/targetManifest.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/** A target's manifest as this composition reads it — its scripts, and its `specController` block. */
type TargetManifest = PackageJsonScripts & {
  specController?: {
    deferralTags?: unknown;
    staticChecks?: unknown;
    checkRegistry?: unknown;
    thresholds?: unknown;
    fitnessChecks?: unknown;
  };
};

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
 * @param input.measurements the measurement artefact as JSON handed it over (@SCN-CIP-003) — the
 * third observation stream, which arrives already citing.
 * @param input.runtimeObservations the vitest / cucumber observations, parsed at the edge because
 * each source's fallback quality-check is the application layer's mapping, not the engine's.
 * @param input.deferralTags the application layer's STARTER deferral set, which a target's config
 * may only extend (@SCN-PND-021). Product policy, single-sourced there and never here.
 * @param input.guardScriptPrefixes the script-name prefixes the running-check observer treats as
 * static checks — a heuristic for FINDING checks, never the definition of one (@SCN-USG-009), and
 * the app's own convention set for the same reason.
 * @param input.killFloor the reader over the target's mutation records, injected as a closure.
 * @param input.ciStepRecord the CI RUN's own record of what each of its steps did (@SCN-LNT-021,
 * @SCN-LNT-028) — the CONVERTED checks' whole credit stream, and the observation side of the
 * fitness axis, beside the workflow FILE this composition already reads for the derivation side. Two documents, two questions: the file says a check is wired in,
 * the record says what it did on this run. Optional, and absent means what it says — a run handed
 * no record of itself observes exactly what it observed before.
 */
export function evidenceReconciliationFromSources(input: {
  featureSources: readonly string[];
  untaggedScenarios: readonly string[];
  packageJson: TargetManifest;
  ciSources: readonly string[];
  measurements: MeasurementReport;
  runtimeObservations: readonly EvidenceObservation[];
  deferralTags: readonly string[];
  guardScriptPrefixes: readonly string[];
  killFloor: KillFloorReader;
  ciStepRecord?: CiStepRecord;
}): EvidenceReconciliation {
  const { packageJson } = input;
  // ONE READING OF THE CONFIGURED ROWS, shared by both sides of this axis. The DEBIT reads them for
  // the characteristic a converted scenario owes and the CREDIT for the characteristic its reported
  // scenario answers, and two resolutions would be free to disagree about a manifest neither of
  // them wrote — the same guarantee `readTargetCorpus` composes its three readings for.
  const fitnessChecks = resolveFitnessChecks(packageJson, input.killFloor);
  const corpus = readTargetCorpus(
    input.featureSources,
    resolveDeferralTags(packageJson, input.deferralTags),
    resolveCheckRegistry(packageJson),
    resolveThresholds(packageJson, input.killFloor),
    fitnessChecks
  );

  // The feature corpus is BOTH halves: the @SCN-tagged scenarios AND the untagged ones
  // (@SCN-LDG-021). An untagged scenario cannot be linked to an observation, so it reconciles
  // `no-scn-code` on its own out-of-balance row — never silently dropped from the debit side.
  // THE CONCEPT, BUILT BY ITS OWN FACTORY (3F-2233) — nobody assembles a Ledger and leaves someone
  // downstream to total it. The two axis GATES are always on for a `balance` run: both the
  // runtime-observation and the static-check streams are threaded.
  const reconciliation = evidenceReconciliationOf(
    corpus.scenarios,
    [
      ...input.runtimeObservations,
      ...checkObservations(corpus, input.ciSources, packageJson, input.guardScriptPrefixes),
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
      // read here rather than folded into `checkObservations` because that function's two observers
      // both read the target's CONFIG; a measurement is a fact about a run, and the only thing the
      // three share is the axis they ride.
      ...parseMeasuredEvidenceObservations(input.measurements),
    ],
    [...input.untaggedScenarios],
    true,
    true
  );
  return withUnconfiguredFitnessScenarios(reconciliation, corpus);
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
 * The COMPLETE static stream the reconciliation consumes, from the two observers that produce it.
 *
 * The OBLIGATION-side reader answers for every check the corpus obliges (`corpus.checkHandles`),
 * carrying the authoritative exists / enforced-over-real-source detail — and so the only one able
 * to report the watermelon, since a check that runs nowhere is exactly what the other observer
 * filters out. Both the `exists` read and the CI read come from the TARGET (@SCN-LNT-005): a check
 * present in another repository's package.json and absent from its CI is the watermelon there
 * exactly as it is here, and reading either from spec-controller's own tree would answer for a
 * repository this run never looked at.
 *
 * The RUNNING-check observer then adds every running CI check the first did not cover — the static
 * analogue of a runner emitting every test result, so nothing a gate runs is off the books. The
 * exclusion is what keeps them from double-observing one check.
 *
 * WHAT A SURVIVOR CITES IS THE TARGET'S OWN ANSWER (@SCN-LNT-031). A check whose CI step states the
 * code of the configured row it runs posts to that row; one whose step states none cites no
 * scenario and the reconciliation folds it into the suspense row (@SCN-USG-001), which is where an
 * unattributed check is meant to surface. The second is the state a consumer starts in, and it is
 * the report this axis's first useful sentence is made of — not a gap in the first.
 */
function checkObservations(
  corpus: TargetCorpus,
  ciSources: readonly string[],
  packageJson: TargetManifest,
  guardScriptPrefixes: readonly string[]
): EvidenceObservation[] {
  const obligated = [...corpus.checkHandles];
  return [
    ...(obligated.length > 0
      ? checkStaticEvidenceObligations(obligated, ciSources, packageJson, corpus.citedScn)
      : []),
    ...runningStaticChecks(
      ciSources,
      packageJson,
      guardScriptPrefixes,
      // The target's own configurations (@SCN-USG-009) — the checks its gates run under names our
      // conventions do not reach.
      resolveStaticChecks(packageJson),
      // THE CONSUMER'S OWN CITATION, WIRED (@SCN-LNT-031). The walk carries a check step's `id:`
      // and this observer reads it, and until this seam was passed the two met nowhere: every
      // discovered check on the live path cited nothing, so a fully annotated pipeline reconciled
      // exactly as an unannotated one — `new-client` reported over a target in `minimal-adherence`.
      //
      // THE HANDLE IS DELIBERATELY NOT CONSULTED. The row a step's code names carries the
      // characteristic, so both terms come off ONE configured row; reaching for the script's
      // spelling to supply the half a CI step cannot state is the name-match this axis retired.
      // A step with no code, or one naming no configured row, reaches no citation and posts to
      // suspense — which is `new-client`, unnarrowed.
      (_script, citedByStep) => corpus.citedRow(citedByStep)
    ).filter((o) => !corpus.checkHandles.has(o.staticCheck)),
  ];
}
