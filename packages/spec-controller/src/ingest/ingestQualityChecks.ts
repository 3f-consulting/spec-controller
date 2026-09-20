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
import { basename } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { discoverFeatures, type DiscoveredFeature } from "./ingestScenarios.js";
import {
  parseScenarios,
  countScnOccurrences,
  parseUntaggedScenarios,
  proseOnlyCodes,
} from "@3f-consulting/spec-controller-core";
import {
  MissingFeatureCorpusError,
  UnreadableFeatureCorpusError,
  type GherkinParseError,
} from "./gherkinValidation.js";
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
// THE WHOLE COMPOSITION, THROUGH THE PUBLIC BARREL AND NOTHING ELSE (3F-3086). This module travels
// in the tarball, and until 3F-3089 it reached nine core symbols through the UNPUBLISHED
// `./internal` subpath to assemble the reconciliation itself — which is why an installed
// `spec-controller balance --help` threw ERR_PACKAGE_PATH_NOT_EXPORTED while every gate in this
// workspace stayed green. The nine are still internal (3F-2837 stands, unamended); what moved is
// their CALLER. What is left here is the reads: this edge opens the files and hands the bytes over.
import { evidenceReconciliationFromSources } from "@3f-consulting/spec-controller-core";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
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
 * THIS TOOL, RUN TO RECONCILE (@SCN-USG-014, 3F-3343) — the invocation whose step is the
 * reconciler rather than one of the reconciled rows, SET at the CLI edge and injected into the
 * core like the prefixes above and the workflow names below.
 *
 * HOW THIS PRODUCT IS INVOKED IS THIS LAYER'S FACT. `spec-controller` is the `bin` this package
 * publishes and `balance` is the command that reconciles; the engine holds neither, and a core
 * that assumed them would be asserting something about a command line it never sees.
 *
 * BOTH TOKENS, AND THE SECOND IS NOT DECORATION. This repository's own pipeline runs
 * `pnpm spec-controller tags` beside its balance step — the same binary, doing something that is
 * an ordinary step of the pipeline being reconciled — so an invocation naming the binary alone
 * would take that step off the books. The comparison is whole, adjacent shell tokens
 * (`parse/commandRuns`), so this names the reconciliation and nothing else the tool can do.
 */
const RECONCILER_INVOCATION = "spec-controller balance";

/**
 * The reconciler's resolved input paths — the CLI options threaded to the readers.
 * Every path is optional; a missing result file is tolerated (its evidence is
 * simply absent). `packageJson` is the EXTERNALLY-SPECIFIED package.json the static
 * static-check reader reads `exists` from (the --package-json seam, @SCN-LNT-005):
 * default the tool's own cwd `package.json`; set it to reconcile ANOTHER repo's
 * static checks — required to render the historical watermelon correctly.
 */
export interface ReconcileOptions {
  features?: string;
  vitest?: string;
  cucumber?: string;
  ci?: string;
  packageJson?: string;
  /**
   * The CI RUN'S OWN RECORD of what each of its steps did (@SCN-LNT-021, @SCN-LNT-028) — the credit
   * side of every CONVERTED fitness check, written by the consumer's own pipeline and by neither
   * party to this reconciliation.
   *
   * KEPT APART FROM `ci` BECAUSE THE TWO DOCUMENTS ANSWER DIFFERENT QUESTIONS. The workflow FILE
   * says a check is wired into this pipeline and which row its step cites — a fact about a
   * repository, true between runs. This is one RUN's record: did it run this time, and what did it
   * find. Optional like the other result files: a consumer whose pipeline dumps no record, or a
   * local run with no pipeline at all, hands none, and the converted rows it would have answered
   * read `missing`.
   */
  ciSteps?: string;
}

/** Read + JSON-parse a file if present, else return undefined. */
function readJsonIfPresent<T>(path: string | undefined): T | undefined {
  if (!path || !existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
/**
 * THE CORPUS `balance` READS — the shared discovery, with an ABSENT directory read as NO CORPUS
 * (@SCN-CLI-017, 3F-3345). The single place this command opts in.
 *
 * `new-client` is a supported adoption state, not a degraded one, and most targets have no
 * `features/` directory at all — so an absent DEFAULT corpus is the target's honest shape and
 * `balance` reports on it. Left to escape it was a raw `ENOENT` landing on Node's default exit 1,
 * the OUT-OF-BALANCE code, which is exactly the collision @SCN-CLI-014/015/016 closed on every
 * other input, alive on the one path each new consumer is guaranteed to take.
 *
 * ONE HELPER, NOT FIVE CATCHES, and that is the whole reason it exists: five readers each doing
 * this by hand is five chances for one to stay intolerant, and a run that reports on a corpus for
 * four of its readings and throws on the fifth is worse than one that throws. The translation is
 * also why `discoverFeatures` is not the place to be tolerant — see its own note, and
 * `MissingFeatureCorpusError`'s: `tags` reaches the same reader and keeps refusing.
 *
 * IT IS `[]`, NOT A VERDICT. Zero rows is what @SCN-CLI-019 reads as NOTHING TO RECONCILE, and a
 * corpus-less target that still has uncited credits keeps its suspense row and its exit 1
 * (@SCN-CLI-020) — this reader says what it found, never what the run means.
 *
 * A supplied-but-absent `--features` never arrives here: `checkInputsExist` refuses it at the CLI
 * edge, exit 2 (@SCN-CLI-002). The precedent is `ciSourcePathsOf`, which already answers an absent
 * DEFAULT `.github/workflows` with `[]` for the same reason — the default finding nothing is a fact
 * about the target, not a mistake by its author.
 */
function balanceCorpus(featuresDir: string | undefined): DiscoveredFeature[] {
  try {
    return featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    throw err;
  }
}

/**
 * The discovered feature corpus's SOURCES — read once so the two readings a citing run needs (the
 * obligations, and the corpus hop's `check tag → @SCN`) are taken from the same bytes. Two
 * discoveries could disagree about the corpus, and a citation resolved against a corpus the ledger
 * was not built from is exactly the phantom-row fault (@SCN-LNT-009).
 */
function featureSources(featuresDir: string | undefined): string[] {
  return balanceCorpus(featuresDir).map((f) => readFileSync(f.path, "utf8"));
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
  return balanceCorpus(featuresDir).flatMap((f) =>
    parseUntaggedScenarios(readFileSync(f.path, "utf8")).map(
      (scenario) => `${f.slug}.feature : ${scenario}`
    )
  );
}

/**
 * The feature corpus's INTEGRITY CHECKPOINT (@SCN-CLI-016, 3F-1767) — validate every discovered
 * `.feature` with the REAL Gherkin parser and report the files it cannot read.
 *
 * The feature corpus is the ledger's DEBIT side, and it used to be read by a tag-line scan that
 * never consulted a parser — so a malformed tag line silently deleted its scenario, and a corrupt
 * spec could read BALANCED. A file the parser rejects is one cucumber would refuse to run: the
 * CLI halts on it (exit 2) rather than reconciling a corpus that is a fiction.
 *
 * THIS IS NOW THE CATCH SITE, NOT THE CALL SITE (@SCN-GPG-001, 3F-2817). The validation moved
 * into `discoverFeatures`, which REFUSES an unreadable corpus rather than returning one, so every
 * corpus reader inherits the refusal instead of each restating it. What is left here is the
 * translation back into the list this CLI edge already prints — same files, same order, same
 * verbatim parser messages, so `balance`'s behaviour is unchanged. Anything that is not a corpus
 * refusal is not ours to interpret and rethrows.
 */
export function featureCorpusParseErrors(featuresDir: string | undefined): GherkinParseError[] {
  try {
    balanceCorpus(featuresDir);
    return [];
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) return [...err.errors];
    throw err;
  }
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
 * by invariant (`corpusFaults` raises `duplicate-feature-code`, @SCN-STG-010), so the map is
 * unambiguous. That invariant was `lintFeatureCodes`' until 3F-3313; it is the shipped command's
 * now, which is the first time a CONSUMER of this reader has it too.
 */
export function readFeatureNames(featuresDir?: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of balanceCorpus(featuresDir)) {
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
  const featureFiles = balanceCorpus(features);
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
/**
 * The TARGET's manifest as the reconcile composition reads it — the `scripts` the `exists` read
 * consults, and the `specController` block its resolvers narrow. Every field of it is `unknown`
 * until the engine narrows it, so the type is a statement about what a manifest on disk IS rather
 * than a contract owed to anyone.
 */
type TargetManifest = PackageJsonScripts & {
  specController?: {
    deferralTags?: unknown;
    runners?: unknown;
    notChecks?: unknown;
  };
};

export function runReconcile(opts: ReconcileOptions): EvidenceReconciliation {
  // Read the target's package.json ONCE — its `specController.*` config supplies the deferral-tag
  // extension (@SCN-PND-021) and the configured fitness rows, and its `scripts` back the `exists`
  // read. The disk read stays at this impure edge; the engine takes the resolved values as
  // injected params, staying pure.
  const pkgPath = opts.packageJson ?? "package.json";
  const packageJson = readJsonIfPresent<TargetManifest>(pkgPath) ?? {};
  // The TARGET repo root — the credit locators are made relative to it, so a phantom-scenario row's
  // where-to-fix (ruling Q5) stays portable in a banked artefact. Resolved ONCE here and threaded,
  // which is also what keeps `execFileSync` and `process.cwd()` out of the engine.
  const root = resolveTargetRoot({ features: opts.features });
  // `--ci` names a workflow FILE or a DIRECTORY of them, and defaults to the directory
  // (@SCN-USG-006, 3F-2238): a pipeline split across files enforces its checks just as one
  // file does, and reading only ci.yml both invents watermelons for named checks enforced
  // elsewhere and drops uncited ones off the books entirely. Path semantics carry the
  // file-vs-directory distinction, so one flag stays one flag and an explicit file is still
  // a narrowing (@SCN-USG-008).
  const ciPath = opts.ci ?? ".github/workflows";
  // RESOLVED ONCE, READ TWICE (@SCN-USG-015). The engine takes anonymous source strings and holds
  // no filesystem, so the mapping from a step's source index back to the workflow file it came
  // from is made HERE, where the paths are already in hand — `ciSourcePaths.ts` is explicit that
  // keeping the core that way is the point. Resolving the list twice would be two chances for the
  // bytes and the names to fall out of the order they are paired by.
  const ciPaths = ciSourcePathsOf(ciPath);

  return evidenceReconciliationFromSources({
    // The corpus's bytes, read ONCE at this impure edge (3F-3088). The engine composes the three
    // readings a citing run needs from this one array, so they cannot be assembled from two
    // discoveries that disagree about the corpus (@SCN-LNT-009).
    featureSources: featureSources(opts.features),
    // The untagged half by its `<feature> : <scenario>` locator — parsed here because the locator
    // names the FILE, which the discovery knows and a source string does not.
    untaggedScenarios: untaggedScenariosFromFeatures(opts.features),
    packageJson,
    ciSources: ciPaths.map((path) => readFileSync(path, "utf8")),
    // THE FILE, NOT THE PATH. A `notChecks` entry opens with the workflow's own name — `ci.yml`,
    // `release.yml` — which is what a consumer reads at the head of their run log and the only
    // half of the entry that does not come out of the workflow's own text. The directory it sits
    // in is the caller's `--ci`, not the consumer's subject, so it is not part of what they write.
    ciSourceNames: ciPaths.map((path) => basename(path)),
    // The CONVERTED checks' credit stream, read at this edge like every other report. Absent it is
    // undefined rather than empty, and that distinction reaches the reader (@SCN-LNT-027): "no
    // record" is a run nobody recorded, "a record holding nothing" is a run that recorded none of
    // these steps, and those are opposite facts.
    // STRUCTURALLY, NOT BY NAME: this module travels in the tarball and reaches core through the PUBLIC barrel alone (3F-3086), and
    // `CiStepRecord` is not on it. The shape is the document's, which is the consumer's, so what is
    // written here is what the file holds rather than a contract owed to anyone.
    ciStepRecord: readJsonIfPresent<Record<string, { outcome?: string; conclusion?: string }>>(
      opts.ciSteps
    ),
    runtimeObservations: parseRuntimeObservations(opts, root),
    // The two things the engine's resolvers cannot hold, and each for its own reason: the
    // starter deferral set is the application layer's own policy, and how this tool is invoked to
    // reconcile is a fact about this product's command line. THE PREFIX SET USED TO SIT HERE AND IS GONE (@SCN-USG-004, 3F-3343): the
    // engine no longer decides a check's membership by its name, so there is no convention left
    // for this edge to own.
    deferralTags: DEFAULT_DEFERRAL_TAGS,
    reconcilerInvocation: RECONCILER_INVOCATION,
  });
}

// The static-check kind-counts are no longer read as a parallel census (@SCN-USG-001 / 3F-2118):
// the former `readStaticEvidenceObservationCounts` re-built the static check observations and
// re-derived the running / uncited split from a second read of the CI config. That counting now
// FOLDS onto the Ledger the reconciler already produced (`staticObservationTally`, an internal
// domain fold the renderers apply), so it cannot drift from the verdict — it counts the SAME posted
// static-check credits `runReconcile` banked. The census read is deleted, not relocated.
