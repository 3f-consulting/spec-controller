/**
 * Ingest the target's quality-check inputs — the IMPURE reads behind the balance
 * command (split out of the old cli.ts). Reads declared evidence
 * obligations from the repo's feature files, observed evidence from the Vitest +
 * Cucumber result JSON, and the static-guard evidence from the CI config + package.json,
 * turning each into the engine's in-memory model. The orchestration (arg parsing, the
 * output plan/write, main) stays in cli-balance/cli.ts; these are the file reads it calls.
 *
 * Configurable input paths (no adapter registry in v1 — the readers are named, not
 * registered). Missing result files are tolerated: their evidence is simply absent
 * (the scenario reconciles as missing for that level). The static (guard) kind reads
 * `--ci` (default `.github/workflows/ci.yml`) + `package.json` to observe each declared
 * `@lint=<guard>`.
 */

import { readFileSync, existsSync } from "node:fs";
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
import { runningStaticGuards } from "@3f-consulting/spec-controller-core";
// The DEMANDED-static-guard rule lives ONCE on the journal (the static-axis twin of
// `evidenceObligationPairsOf`); this command reads it rather than rebuilding the derivation inline.
// Reached by relative path because the frozen v1 barrel (@SCN-API-001) does not — and must not —
// export this core-internal helper; the app→core direction the purity guards permit.
import { demandedStaticGuardsOf } from "../../../core/src/domain/journal.js";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import type {
  Scenario,
  RuntimeQualityCheck,
  EvidenceObservation,
  Ledger,
} from "@3f-consulting/spec-controller-core";

/**
 * The declared per-input quality-check for each JS-ecosystem result source — the
 * source→quality-check mapping, DECLARED at the CLI edge rather than hardcoded in the core
 * parsers / countRuntimeEvidenceObservationKinds. A second ecosystem (pytest / JUnit) declares its own here (or
 * via an adapter); the core never assumes a mapping. No CLI override flag yet — that
 * earns its place at the second ecosystem, not now.
 */
const VITEST_QUALITY_CHECK: RuntimeQualityCheck = "unit";
const CUCUMBER_QUALITY_CHECK: RuntimeQualityCheck = "integration";

/**
 * The static-guard script-prefix convention set — which package.json script names the
 * running-guard observer (`runningStaticGuards`) recognises as static guards, DECLARED at the
 * CLI edge rather than hardcoded in the core parser. `lint:*` is an earlier internal tool's own convention;
 * `guard:*` is an adopter's repository's (four `guard:*` guards run in an adopter's repository's CI). A third convention adds its
 * prefix here; the core never assumes the set. No CLI override flag yet — that earns its place
 * at a third ecosystem, not now (mirrors the VITEST_QUALITY_CHECK stance above).
 * `qualityCheck: "lint"` (the static-guard axis name) is unchanged — this is the script prefix,
 * not the axis.
 */
const GUARD_SCRIPT_PREFIXES: readonly string[] = ["lint:", "guard:"];

/**
 * The reconciler's resolved input paths — the CLI options threaded to the readers.
 * Every path is optional; a missing result file is tolerated (its evidence is
 * simply absent). `packageJson` is the EXTERNALLY-SPECIFIED package.json the static
 * (guard) reader reads `exists` from (the --package-json seam, @SCN-LNT-005):
 * default the tool's own cwd `package.json`; set it to reconcile ANOTHER repo's
 * static guards — required to render the historical watermelon correctly.
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

function scenariosFromFeatures(
  featuresDir: string | undefined,
  deferralTags: readonly string[] = DEFAULT_DEFERRAL_TAGS
): Scenario[] {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  return features.flatMap((f) => parseScenarios(readFileSync(f.path, "utf8"), deferralTags));
}

/**
 * The declared corpus's UNTAGGED half (@SCN-LDG-021, 3F-1774) — the scenarios `parseScenarios`
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
 * The declared corpus's INTEGRITY CHECKPOINT (@SCN-CLI-016, 3F-1767) — validate every discovered
 * `.feature` with the REAL Gherkin parser and report the files it cannot read.
 *
 * The impure edge (discover + read); the validation itself is the pure `parseErrorsIn`. The
 * declared corpus is the ledger's DEBIT side, and it used to be read by a tag-line scan that
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
 * The `@SCN` ids the declared corpus DECLARES MORE THAN ONCE (@SCN-LDG-020's guardrail, 3F-1775).
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
 * back to the bare `FFF` for any id whose code no file declares. One-prefix-one-file holds
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
 * Read the declared-corpus census over the discovered feature files (the same
 * `discoverFeatures` corpus `scenariosFromFeatures` reads): sum the raw @SCN
 * occurrences (`countScnOccurrences`) and the declared-scenario count
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
 * two can never disagree. Each source declares its FALLBACK quality-check at the CLI edge
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
 * Reconcile declared-vs-observed evidence into the Ledger for a target tree, from a SINGLE parse of
 * the runtime observations (@SCN-RPT-017 / 3F-1452 FULL UNIFY). The runtime evidence-observation
 * VIEWS (Test volume, the evidence grid) are no longer counted here: they are FOLDS the renderers
 * derive off THIS Ledger's posted credits (@SCN-RPT-010 / 3F-2103 — the runtime census is retired),
 * so they cannot drift from the verdict (they ARE the same rows). This function's job is now just
 * to produce the balance.
 */
export function runReconcile(opts: ReconcileOptions): Ledger {
  // Read the target's package.json ONCE — its `specController.deferralTags` config extends the
  // recognised deferral-tag set (@SCN-PND-021), and its `scripts` back the static-guard `exists`
  // read (the --package-json seam, below). The disk read stays at this impure edge; the core parser
  // takes the resolved set as its injected `deferralTags` param, staying pure.
  const pkgPath = opts.packageJson ?? "package.json";
  const packageJson =
    readJsonIfPresent<PackageJsonScripts & { specController?: { deferralTags?: unknown } }>(pkgPath) ?? {};
  const deferralTags = resolveDeferralTags(packageJson);
  const scenarios = scenariosFromFeatures(opts.features, deferralTags);

  // The TARGET repo root the credit locators are made relative to, so a
  // phantom-scenario row's where-to-fix (ruling Q5) stays portable in a banked artefact.
  const root = resolveTargetRoot({ features: opts.features });

  // Parse the runtime observations ONCE — the SAME set feeds both the reconciler and the census.
  const runtimeObservations = parseRuntimeObservations(opts, root);

  // The full observation stream `reconcile` consumes: the runtime observations PLUS the static
  // (static guard) observations. The census is the RUNTIME axis, so only `runtimeObservations` is projected.
  const evidenceObservations: EvidenceObservation[] = [...runtimeObservations];

  // Static (guard) kind: observe each declared @lint=<guard> against the CI config
  // + package.json over the real tree. Read the CI + package.json ONCE — both
  // the declared-guard evidence observation AND the reverse CI-guard derivation (below) draw on them.
  const demandedGuardSet = demandedStaticGuardsOf(scenarios);
  const demandedGuards = [...demandedGuardSet];
  // The --package-json seam (@SCN-LNT-005): read the static guard's `exists`
  // from the EXTERNALLY-SPECIFIED package.json when given, else the tool's own
  // cwd. Required to reconcile ANOTHER repo's static guards — and to render the
  // historical watermelon (exists:true in the target's package.json, unwired in
  // its CI → watermelon, not missing).
  const ciPath = opts.ci ?? ".github/workflows/ci.yml";
  const ciSource = existsSync(ciPath) ? readFileSync(ciPath, "utf8") : "";
  if (demandedGuards.length > 0) {
    evidenceObservations.push(...checkStaticEvidenceObligations(demandedGuards, ciSource, packageJson));
  }

  // The RUNNING-guard observer: every running CI static guard is a
  // GuardEvidenceObservation in the stream — the static analogue of the runner emitting
  // every test result — so the one reconcile engine sees the COMPLETE static stream.
  // Combined with the demanded observations WITHOUT double-observing: a running static guard the
  // demanded set already covers carries its authoritative exists/enforcedOverRealSource
  // detail from `checkStaticEvidenceObligations` (the watermelon input), so only the UNDEMANDED
  // running static guards are added here. They cite no scenario — the reconciler folds them into the suspense row.
  // (`demandedGuardSet` is the journal rule's Set, read once above.)
  evidenceObservations.push(
    ...runningStaticGuards(ciSource, packageJson, GUARD_SCRIPT_PREFIXES).filter(
      (o) => !demandedGuardSet.has(o.staticGuard)
    )
  );

  // The stream is now COMPLETE: every running CI static guard is a GuardEvidenceObservation
  // — the demanded ones match their @lint obligation, the undemanded ones (a static guard no @lint
  // declares) cite no scenario, so `reconcile` folds them into the SUSPENSE row itself. No
  // derive-and-diff, no `uncitedStaticGuards` param.
  // The declared corpus is BOTH halves: the @SCN-tagged scenarios AND the untagged ones
  // (@SCN-LDG-021). An untagged scenario cannot be linked to an observation, so it reconciles
  // `no-scn-code` on its own out-of-balance row — never silently dropped from the debit side.
  const balance = reconcile(
    scenarios,
    evidenceObservations,
    untaggedScenariosFromFeatures(opts.features)
  );

  return balance;
}

// The static-guard kind-counts are no longer read as a parallel census (@SCN-USG-001 / 3F-2118):
// the former `readStaticEvidenceObservationCounts` re-built the static guard observations and
// re-derived the running / uncited split from a second read of the CI config. That counting now
// FOLDS onto the Ledger the reconciler already produced (`staticObservationTally`, an internal
// domain fold the renderers apply), so it cannot drift from the verdict — it counts the SAME posted
// static-guard credits `runReconcile` banked. The census read is deleted, not relocated.
