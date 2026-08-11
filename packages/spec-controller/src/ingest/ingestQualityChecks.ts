/**
 * Ingest the target's quality-check inputs — the IMPURE reads behind the balance
 * command (split out of the old cli.ts). Reads evidence
 * obligations from the repo's feature files, observed evidence from the Vitest +
 * Cucumber result JSON, and the static-check evidence from the CI config + package.json,
 * turning each into the engine's in-memory model. The orchestration (arg parsing, the
 * output plan/write, main) stays in cli-balance/cli.ts; these are the file reads it calls.
 *
 * Configurable input paths (no adapter registry in v1 — the readers are named, not
 * registered). Missing result files are tolerated: their evidence is simply absent
 * (the scenario reconciles as missing for that level). The static check kind reads
 * `--ci` (a workflow file or a directory of them, default `.github/workflows`) +
 * `package.json` to observe each fitness check the corpus cites.
 */

import { readFileSync, existsSync } from "node:fs";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { discoverFeatures } from "./ingestScenarios.js";
import {
  parseScenarios,
  countScnOccurrences,
  parseUntaggedScenarios,
  proseOnlyCodes,
} from "@3f-consulting/spec-controller-core";
import { parseErrorsIn, type GherkinParseError } from "./gherkinValidation.js";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";
import {
  evidenceObligations,
  type EvidenceObligations,
  type UntaggedScenario,
} from "@3f-consulting/spec-controller-core";
import {
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
} from "@3f-consulting/spec-controller-core";
import { checkStaticEvidenceObligations } from "@3f-consulting/spec-controller-core";
import { runningStaticChecks } from "@3f-consulting/spec-controller-core";
// The citation seam (@SCN-LNT-005) — the registry read, the corpus hop, and the two composed.
// Core-internal rather than public: where a target's registry is AUTHORED is still open (the
// registry-home question, increment D), so the seam's shape is not a v1 contract yet.
import {
  checkRegistryOf,
  registeredCheckTags,
  fitnessCitations,
  citationOfScript,
  parseTaggedScenarios,
  type CheckRegistry,
  type FitnessCitations,
  type ScriptCitation,
} from "@3f-consulting/spec-controller-core/internal";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import type {
  Scenario,
  RuntimeQualityCheck,
  EvidenceObservation,
  EvidenceReconciliation,
} from "@3f-consulting/spec-controller-core";

/**
 * The per-input FALLBACK quality-check for each JS-ecosystem result source — the
 * source→quality-check mapping, SET at the CLI edge rather than hardcoded in the core
 * parsers / countRuntimeEvidenceObservationKinds. A second ecosystem (pytest / JUnit) sets its own here (or
 * via an adapter); the core never assumes a mapping. No CLI override flag yet — that
 * earns its place at the second ecosystem, not now.
 */
const VITEST_QUALITY_CHECK: RuntimeQualityCheck = "unit";
const CUCUMBER_QUALITY_CHECK: RuntimeQualityCheck = "integration";

/**
 * The static-check script-prefix convention set — which package.json script names the
 * running-guard observer (`runningStaticChecks`) recognises as static checks, SET at the
 * CLI edge rather than hardcoded in the core parser. `lint:*` is an earlier internal tool's own convention;
 * `guard:*` is an adopter's repository's (four `guard:*` guards run in an adopter's repository's CI). A third convention adds its
 * prefix here; the core never assumes the set. No CLI override flag yet — that earns its place
 * at a third ecosystem, not now (mirrors the VITEST_QUALITY_CHECK stance above).
 * `qualityCheck: "lint"` (the static-check axis name) is unchanged — this is the script prefix,
 * not the axis.
 *
 * A HEURISTIC FOR FINDING CHECKS, NEVER THE DEFINITION OF ONE (@SCN-USG-009, 3F-2495). Membership
 * is a property of the CHECK — does it analyse source without executing it — so a target whose
 * gate this set misses configures it by name via `specController.staticChecks` (below) rather than
 * renaming its scripts to our convention, which is not a thing the tool can ask of a client.
 */
const GUARD_SCRIPT_PREFIXES: readonly string[] = ["lint:", "guard:"];

/**
 * The scripts the TARGET configures AS static checks (@SCN-USG-009, 3F-2495) — read from
 * `specController.staticChecks`, EXTENDING the prefix discovery above.
 *
 * WHY A CONFIGURATION AND NOT A RENAME. `tsc --noEmit` is static analysis on any reading and reds
 * the build on a violation, and no prefix recognises it. Renaming the script fixes one repository;
 * a client's scripts are not ours to rename, so the tool has to be able to be TOLD.
 *
 * EXTENDS, NEVER REPLACES — the `resolveDeferralTags` contract one function up, and for the same
 * reason: a target cannot un-recognise a check the convention already finds. Bare script names
 * (no `@`-stripping — these are manifest keys, not tags); non-string / non-array config ignored
 * defensively, consistent with the deferral-tag reader.
 *
 * It widens only the DISCOVERY direction. The named-obligation observer never consulted the
 * prefixes, so any named check always reconciled; what this buys is finding a check NOBODY
 * cites — the unattributed check, which was invisible exactly when it was unattributed.
 */
export function resolveStaticChecks(packageJson: {
  specController?: { staticChecks?: unknown };
}): readonly string[] {
  const configured = packageJson.specController?.staticChecks;
  if (!Array.isArray(configured)) return [];
  return [...new Set(configured.filter((name): name is string => typeof name === "string"))];
}

/**
 * The TARGET's check registry (@SCN-LNT-005) — `specController.checkRegistry`, read as
 * `script handle → bare check tag` through the engine's own `checkRegistryOf`.
 *
 * IT IS THE TARGET'S, AND THAT IS THE WHOLE POINT. spec-controller reconciles a tree that is
 * usually not its own, and a bare check tag means what the target says it means. Resolved from the
 * tool's own manifest instead, a target registering nothing raises no fitness obligation at all,
 * and one registering the same word for a different script credits the wrong row — so the registry
 * travels with the scripts and the CI config it is read alongside, and every one of them comes from
 * `--package-json`.
 *
 * The third of this edge's `specController.*` resolvers, and defensive like the two above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and a malformed entry is dropped by
 * `checkRegistryOf` rather than thrown. There is no starter set — unlike deferral tags there is no
 * built-in a target would inherit, and a registry entry the target did not write would put a
 * fitness obligation on its books under a word it never used.
 *
 * Where a registry is AUTHORED is still open (the registry-home question, increment D); this key is
 * the seam it is read from today, and the tier-tag floor reads it through THIS function so the
 * floor admits exactly the tags the obligation rule raises against.
 */
export function resolveCheckRegistry(packageJson: {
  specController?: { checkRegistry?: unknown };
}): CheckRegistry {
  const configured = packageJson.specController?.checkRegistry;
  if (typeof configured !== "object" || configured === null || Array.isArray(configured)) {
    return checkRegistryOf({});
  }
  return checkRegistryOf(configured as Record<string, unknown>);
}

/**
 * The runnable script handles the OBLIGATION-side observer is asked about — the reader that carries
 * exists-but-unwired, and so the only one able to produce a watermelon.
 *
 * THE REGISTRY'S INVERSE, NARROWED BY THE CORPUS. A fitness obligation names the BARE check tag its
 * stepless scenario carries, which is not a script and would be observed as one nobody wrote; the
 * runnable handle for it is what the registry maps onto that tag. A handle joins only when the
 * corpus actually carries a scenario for its check, because a registered check nobody wrote a
 * scenario for is the UNCITED case — it must reach no row and surface in suspense, not be asked
 * about here as though something obliged it.
 *
 * A SECOND SOURCE STOOD HERE and is gone with the by-name route (3F-2590): the corpus's named
 * HANDLES, from the retired `@lint=<handle>` form. That form raises no obligation at all now
 * (@SCN-LNT-007), so the set it contributed is empty by construction — and every bare check a
 * fitness obligation names is a REGISTERED tag, which the old filter dropped anyway.
 *
 * It doubles as the no-double-observe key: the running-check stream drops whatever appears here,
 * because a check this reader covers already carries the authoritative exists / enforced detail.
 */
function observedCheckHandles(
  registry: CheckRegistry,
  citations: FitnessCitations
): Set<string> {
  const handles = new Set<string>();
  for (const [handle, tag] of registry) {
    if (citations.has(tag)) handles.add(handle);
  }
  return handles;
}

/**
 * The target's feature corpus as ONE run reads it — the obligations it raises, the runnable check
 * handles those obligations reach, and the `@SCN` a run of any handle cites.
 *
 * THE THREE ARE ONE READING, which is why they are produced together. All three are derived from
 * the same bytes and the same registry, and the fault they exist to foreclose is precisely their
 * disagreeing: a citation resolved against a corpus the ledger was not built from names a row
 * nobody wrote (@SCN-LNT-009), and a handle set derived from a second discovery observes checks the
 * obligations never asked about. Returning them separately would leave a caller free to assemble
 * them from different reads.
 *
 * EVERY INPUT IS THE TARGET'S (@SCN-LNT-005). `registry` came from the target's manifest and the
 * sources from the target's features directory, so a bare check tag means what that target says it
 * means and the scenario carrying it is one that target wrote.
 */
interface TargetCorpus {
  /** The `@SCN`-carrying scenarios, with their evidence obligations raised. */
  scenarios: Scenario[];
  /** The runnable script handles the obligation-side observer is asked about. */
  checkHandles: ReadonlySet<string>;
  /**
   * What a run of this script handle cites — the bare check tag it IS and the `@SCN` carrying that
   * check — or `null` where the seam reaches none. Both terms, because the `@SCN` picks the ROW and
   * the tag picks which of that row's fitness obligations the credit answers (@SCN-LNT-012).
   */
  citedScn: (script: string) => ScriptCitation | null;
}

function readTargetCorpus(
  featuresDir: string | undefined,
  deferralTags: readonly string[],
  registry: CheckRegistry
): TargetCorpus {
  const checkTags = registeredCheckTags(registry);
  const sources = featureSources(featuresDir);
  const scenarios = sources.flatMap((source) => parseScenarios(source, deferralTags, checkTags));
  const citations = fitnessCitations(
    sources.flatMap((source) => parseTaggedScenarios(source)),
    checkTags
  );
  return {
    scenarios,
    checkHandles: observedCheckHandles(registry, citations),
    citedScn: (script) => citationOfScript(script, registry, citations),
  };
}

/**
 * The reconciler's resolved input paths — the CLI options threaded to the readers.
 * Every path is optional; a missing result file is tolerated (its evidence is
 * simply absent). `packageJson` is the EXTERNALLY-SPECIFIED package.json the static
 * (guard) reader reads `exists` from (the --package-json seam, @SCN-LNT-005):
 * default the tool's own cwd `package.json`; set it to reconcile ANOTHER repo's
 * static checks — required to render the historical watermelon correctly.
 */
export interface ReconcileOptions {
  features?: string;
  vitest?: string;
  cucumber?: string;
  ci?: string;
  packageJson?: string;
}

/** Read + JSON-parse a file if present, else return undefined. */
function readJsonIfPresent<T>(path: string | undefined): T | undefined {
  if (!path || !existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/**
 * Resolve the recognised deferral-tag set for the target (@SCN-PND-021) — the single-sourced
 * starter constant `DEFAULT_DEFERRAL_TAGS` EXTENDED by the target `package.json`'s
 * `specController.deferralTags`. Config EXTENDS, never replaces: a project cannot un-recognise a
 * built-in (`@wip` always defers). Configured tags are bare names, `@`-stripped, consistent with
 * `DEFAULT_DEFERRAL_TAGS`; non-string / non-array config is ignored defensively. The set is the
 * impure edge's to build (it reads the `package.json` off disk); the core parser stays pure — it
 * takes the union as the injected `deferralTags` param.
 */
export function resolveDeferralTags(packageJson: {
  specController?: { deferralTags?: unknown };
}): readonly string[] {
  const configured = packageJson.specController?.deferralTags;
  const extras = Array.isArray(configured)
    ? configured
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.replace(/^@/, ""))
    : [];
  // Union: the starter set FIRST (extends, never replaces — a project cannot un-recognise a
  // built-in), then the configured extras; de-duplicated to keep the set clean.
  return [...new Set([...DEFAULT_DEFERRAL_TAGS, ...extras])];
}

/**
 * The discovered feature corpus's SOURCES — read once so the two readings a citing run needs (the
 * obligations, and the corpus hop's `check tag → @SCN`) are taken from the same bytes. Two
 * discoveries could disagree about the corpus, and a citation resolved against a corpus the ledger
 * was not built from is exactly the phantom-row fault (@SCN-LNT-009).
 */
function featureSources(featuresDir: string | undefined): string[] {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  return features.map((f) => readFileSync(f.path, "utf8"));
}

function scenariosFromFeatures(
  featuresDir: string | undefined,
  deferralTags: readonly string[] = DEFAULT_DEFERRAL_TAGS
): Scenario[] {
  return featureSources(featuresDir).flatMap((source) => parseScenarios(source, deferralTags));
}

/**
 * The feature corpus's UNTAGGED half (@SCN-LDG-021, 3F-1774) — the scenarios `parseScenarios`
 * discards because they carry no `@SCN`. They are REAL scenarios: cucumber runs them, so each
 * owns a real Evidence Obligation — but the obligation has no code for an Evidence Observation to
 * link to, so it can never be discharged. `reconcile` gives each its own out-of-balance row
 * (`no-scn-code`); before this read they were invisible to the ledger, and a run whose only fault
 * was an untagged scenario printed "N scenario(s) carry no @SCN tag" and exited 0 BALANCED.
 *
 * Each is handled by its `<feature> : <scenario>` locator — the SAME locator the untagged warning
 * prints — because a bare scenario name is not unique across the corpus, and the row must say
 * where to go.
 */
function untaggedScenariosFromFeatures(featuresDir: string | undefined): string[] {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  return features.flatMap((f) =>
    parseUntaggedScenarios(readFileSync(f.path, "utf8")).map(
      (scenario) => `${f.slug}.feature : ${scenario}`
    )
  );
}

/**
 * The feature corpus's INTEGRITY CHECKPOINT (@SCN-CLI-016, 3F-1767) — validate every discovered
 * `.feature` with the REAL Gherkin parser and report the files it cannot read.
 *
 * The impure edge (discover + read); the validation itself is the pure `parseErrorsIn`. The
 * feature corpus is the ledger's DEBIT side, and it used to be read by a tag-line scan that
 * never consulted a parser — so a malformed tag line silently deleted its scenario, and a corrupt
 * spec could read BALANCED. A file the parser rejects is one cucumber would refuse to run: the
 * CLI halts on it (exit 2) rather than reconciling a corpus that is a fiction.
 */
export function featureCorpusParseErrors(featuresDir: string | undefined): GherkinParseError[] {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  return features.flatMap((f) => parseErrorsIn(f.path, readFileSync(f.path, "utf8")));
}

/**
 * The `@SCN` ids the feature corpus CARRIES MORE THAN ONCE (@SCN-LDG-020's guardrail, 3F-1775).
 *
 * An `@SCN` identifies exactly ONE scenario — that is the whole basis of attributing evidence to
 * it. If two scenarios carry the same id, a test citing it could be proving EITHER, and the tool
 * cannot know which: the corpus is ambiguous, and any verdict over it is a guess.
 *
 * WHY THIS EXISTS. Tag inheritance made this reachable: an `@SCN` hoisted to a `Feature:`/`Rule:`
 * is inherited by every scenario beneath it (cucumber does this, so we do — parity). Left
 * unhandled, ONE passing test then marked EVERY scenario sharing that id `balanced`, including
 * scenarios nothing proves — a BALANCED-WHEN-BROKEN run, exit 0. A new silent false-green,
 * introduced by the very fix that closed the last one.
 *
 * Refused at the edge (exit 2) rather than reconciled, under the Rule already shipped for the
 * observed side and the corrupt corpus (@SCN-CLI-014/015/016): an input the tool cannot read is a
 * usage error, never a verdict. Whether hoisting an `@SCN` is an authoring fault worth a richer
 * diagnostic is the deferred policy question (3F-1774's sibling); refusing to reconcile a corpus we
 * cannot read is not a policy — it is the floor.
 */
export function featureCorpusDuplicateScnIds(featuresDir: string | undefined): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const scenario of scenariosFromFeatures(featuresDir)) {
    if (seen.has(scenario.scnId)) duplicates.add(scenario.scnId);
    seen.add(scenario.scnId);
  }
  return [...duplicates].sort();
}

/**
 * Read the target's `feature-code → slug` map over the same `discoverFeatures` corpus
 * (@SCN-RPT-006) — each coded feature file's `@<FFF>` header (`featureCode`)
 * mapped to its filename `slug`, the full feature name. This is the mapping
 * `scenariosFromFeatures` discards (it keeps only the parsed scenarios). A sibling read to
 * the balance, threaded to `renderMarkdown` (via `writeOutputs`) as the 5th sibling arg
 * (markdown-only — the by-feature cut is markdown-only, so it is NOT serialised to JSON).
 * Uncoded files (`featureCode === null`) are omitted, so the by-feature emitter falls
 * back to the bare `FFF` for any id whose code no file registers. One-prefix-one-file holds
 * by invariant (`lintFeatureCodes` flags a duplicate code), so the map is unambiguous.
 */
export function readFeatureNames(featuresDir?: string): Map<string, string> {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  const map = new Map<string, string>();
  for (const f of features) {
    if (f.featureCode !== null) map.set(f.featureCode, f.slug);
  }
  return map;
}

/**
 * Read the scenario-corpus census over the discovered feature files (the same
 * `discoverFeatures` corpus `scenariosFromFeatures` reads): sum the raw @SCN
 * occurrences (`countScnOccurrences`) and the scenario count
 * (`parseScenarios(...).length`) across every file, and build the `EvidenceObligations`
 * sibling (@SCN-RPT-008). Also collects the UNTAGGED scenarios
 * (@SCN-RPT-014) — `parseUntaggedScenarios` per file, each paired with its feature-file
 * locator, sorted by (feature, scenario). Read alongside the balance in `main()` and
 * threaded to the renderers via `writeOutputs`; `runReconcile` stays unchanged.
 */
export function readEvidenceObligations(features?: string): EvidenceObligations {
  const featureFiles =
    features !== undefined ? discoverFeatures(features) : discoverFeatures();
  let raw = 0;
  let scenarioCount = 0;
  const untagged: UntaggedScenario[] = [];
  const sources: string[] = [];
  for (const f of featureFiles) {
    const source = readFileSync(f.path, "utf8");
    sources.push(source);
    raw += countScnOccurrences(source);
    scenarioCount += parseScenarios(source).length;
    for (const scenario of parseUntaggedScenarios(source)) {
      untagged.push({ feature: `${f.slug}.feature`, scenario });
    }
  }
  untagged.sort(
    (a, b) => a.feature.localeCompare(b.feature) || a.scenario.localeCompare(b.scenario)
  );
  // The prose-only codes are a CROSS-CORPUS difference (a code tagged in any file isn't
  // dangling), so it reads all sources at once — not per-file like the others.
  return evidenceObligations(raw, scenarioCount, untagged, proseOnlyCodes(sources));
}

/**
 * Parse the target's RUNTIME observations ONCE — the tag-derived, per-tier observation set
 * (@SCN-RPT-017 / 3F-1452 FULL UNIFY) fed to BOTH the reconciler and the runtime census, so the
 * two can never disagree. Each source's FALLBACK quality-check is set at the CLI edge
 * (vitest⇒unit, cucumber⇒integration); the parsers DERIVE the level from the cited scenario's tier
 * tag (@SCN-LDG-011 / 3F-1434), using the fallback only for an untagged scenario. A missing report
 * contributes nothing. Root-relative so a phantom-scenario row's where-to-fix stays portable.
 */
function parseRuntimeObservations(opts: ReconcileOptions, root: string | undefined): EvidenceObservation[] {
  const out: EvidenceObservation[] = [];
  const vitestReport = readJsonIfPresent<VitestJsonReport>(opts.vitest);
  if (vitestReport) out.push(...parseVitestEvidenceObservations(vitestReport, VITEST_QUALITY_CHECK, root));
  const cucumberReport = readJsonIfPresent<CucumberJsonReport>(opts.cucumber);
  if (cucumberReport) out.push(...parseCucumberEvidenceObservations(cucumberReport, CUCUMBER_QUALITY_CHECK, root));
  return out;
}

/**
 * Reconcile obligation-vs-observation evidence into the Ledger for a target tree, from a SINGLE parse of
 * the runtime observations (@SCN-RPT-017 / 3F-1452 FULL UNIFY). The runtime evidence-observation
 * VIEWS (Test volume, the evidence grid) are no longer counted here: they are FOLDS the renderers
 * derive off THIS Ledger's posted credits (@SCN-RPT-010 / 3F-2103 — the runtime census is retired),
 * so they cannot drift from the verdict (they ARE the same rows). This function's job is now just
 * to produce the balance.
 */
export function runReconcile(opts: ReconcileOptions): EvidenceReconciliation {
  // Read the target's package.json ONCE — its `specController.*` config supplies the deferral-tag
  // extension (@SCN-PND-021), the check registry (@SCN-LNT-005) and the configured check names
  // (@SCN-USG-009), and its `scripts` back the `exists` read. The disk read stays at this impure
  // edge; the core parsers take the resolved values as injected params, staying pure.
  const pkgPath = opts.packageJson ?? "package.json";
  const packageJson =
    readJsonIfPresent<
      PackageJsonScripts & {
        specController?: {
          deferralTags?: unknown;
          staticChecks?: unknown;
          checkRegistry?: unknown;
        };
      }
    >(pkgPath) ?? {};
  const corpus = readTargetCorpus(
    opts.features,
    resolveDeferralTags(packageJson),
    resolveCheckRegistry(packageJson)
  );

  // The TARGET repo root the credit locators are made relative to, so a
  // phantom-scenario row's where-to-fix (ruling Q5) stays portable in a banked artefact.
  const root = resolveTargetRoot({ features: opts.features });

  // `--ci` names a workflow FILE or a DIRECTORY of them, and defaults to the directory
  // (@SCN-USG-006, 3F-2238): a pipeline split across files enforces its checks just as one
  // file does, and reading only ci.yml both invents watermelons for named checks enforced
  // elsewhere and drops uncited ones off the books entirely. Path semantics carry the
  // file-vs-directory distinction, so one flag stays one flag and an explicit file is still
  // a narrowing (@SCN-USG-008).
  const ciPath = opts.ci ?? ".github/workflows";
  const ciSources = ciSourcePathsOf(ciPath).map((path) => readFileSync(path, "utf8"));

  // The feature corpus is BOTH halves: the @SCN-tagged scenarios AND the untagged ones
  // (@SCN-LDG-021). An untagged scenario cannot be linked to an observation, so it reconciles
  // `no-scn-code` on its own out-of-balance row — never silently dropped from the debit side.
  // THE CONCEPT, BUILT BY ITS OWN FACTORY (3F-2233) — the app no longer assembles a Ledger and
  // leaves someone downstream to total it. The two axis GATES are always on at this edge: the CLI
  // threads both the runtime-observation and the static-check reads.
  return evidenceReconciliationOf(
    corpus.scenarios,
    // Parse the runtime observations ONCE — the SAME set feeds both the reconciler and the census.
    [...parseRuntimeObservations(opts, root), ...checkObservations(corpus, ciSources, packageJson)],
    untaggedScenariosFromFeatures(opts.features),
    true,
    true
  );
}

/**
 * The COMPLETE static stream `reconcile` consumes, from the two observers that produce it.
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
 * exclusion is what keeps them from double-observing one check; the survivors cite no scenario, and
 * `reconcile` folds them into the suspense row (@SCN-USG-001), which is where an unattributed check
 * is meant to surface.
 */
function checkObservations(
  corpus: TargetCorpus,
  ciSources: readonly string[],
  packageJson: PackageJsonScripts & { specController?: { staticChecks?: unknown } }
): EvidenceObservation[] {
  const obligated = [...corpus.checkHandles];
  return [
    ...(obligated.length > 0
      ? checkStaticEvidenceObligations(obligated, ciSources, packageJson, corpus.citedScn)
      : []),
    ...runningStaticChecks(
      ciSources,
      packageJson,
      GUARD_SCRIPT_PREFIXES,
      // The target's own configurations (@SCN-USG-009) — the checks its gates run under names our
      // conventions do not reach. Read here, at the edge that already owns the prefix set, so the
      // core still assumes neither.
      resolveStaticChecks(packageJson)
    ).filter((o) => !corpus.checkHandles.has(o.staticCheck)),
  ];
}

// The static-check kind-counts are no longer read as a parallel census (@SCN-USG-001 / 3F-2118):
// the former `readStaticEvidenceObservationCounts` re-built the static check observations and
// re-derived the running / uncited split from a second read of the CI config. That counting now
// FOLDS onto the Ledger the reconciler already produced (`staticObservationTally`, an internal
// domain fold the renderers apply), so it cannot drift from the verdict — it counts the SAME posted
// static-check credits `runReconcile` banked. The census read is deleted, not relocated.
