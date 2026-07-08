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
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import {
  countStaticEvidenceObservationKinds,
  type StaticEvidenceObservationKindCounts,
} from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import {
  countRuntimeEvidenceObservationKinds,
  type RuntimeEvidenceObservationKindCounts,
} from "@3f-consulting/spec-controller-core";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import type {
  Scenario,
  RuntimeQualityCheck,
  EvidenceObservation,
  EvidenceReconciliation,
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
 * The reconciler's resolved input paths — the CLI options threaded to the readers.
 * Every path is optional; a missing result file is tolerated (its evidence is
 * simply absent). `packageJson` is the EXTERNALLY-SPECIFIED package.json the static
 * (guard) reader reads `exists` from (the --package-json seam, @SCN-LNT-005):
 * default the tool's own cwd `package.json`; set it to reconcile ANOTHER repo's
 * guards — required to render the historical watermelon correctly.
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

function scenariosFromFeatures(featuresDir: string | undefined): Scenario[] {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  return features.flatMap((f) => parseScenarios(readFileSync(f.path, "utf8")));
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
 * Read the evidenceObservations reconciliation over the same inputs `runReconcile` consumes
 * (@SCN-RPT-010): the raw Vitest / Cucumber reports + the declared corpus → `countRuntimeEvidenceObservationKinds`,
 * which counts every evidenceObservation by kind against the `@SCN` anchor in one pass. A sibling read
 * to the balance — the IO orchestration here, the pure counter in the engine's census —
 * threaded to the renderers via `writeOutputs` like `ctx`/`corpus`; `runReconcile`
 * stays unchanged (its `EvidenceReconciliation` contract is consumed by the @LDG / @LNT step tests).
 */
export function readEvidenceObservations(opts: ReconcileOptions): RuntimeEvidenceObservationKindCounts {
  const vitestReport = readJsonIfPresent<VitestJsonReport>(opts.vitest);
  const cucumberReport = readJsonIfPresent<CucumberJsonReport>(opts.cucumber);
  return countRuntimeEvidenceObservationKinds({
    // Each source declares its quality-check at the CLI edge — vitest⇒unit,
    // cucumber⇒integration — rather than countRuntimeEvidenceObservationKinds assuming it.
    vitest: vitestReport ? { report: vitestReport, qualityCheck: VITEST_QUALITY_CHECK } : undefined,
    cucumber: cucumberReport ? { report: cucumberReport, qualityCheck: CUCUMBER_QUALITY_CHECK } : undefined,
    scenarios: scenariosFromFeatures(opts.features),
    // NB: the runtime evidence-observation census is now COUNT-only — it retains no
    // per-item locators, so it takes no run root. The RunContext still relativizes the recorded
    // input paths against the target root (@SCN-RPT-016) below.
  });
}

/**
 * Reconcile declared-vs-observed evidence for a target tree, given resolved input
 * paths. The pure CLI core — exercised directly by @SCN-LNT-005 (`@unit` + the
 * `@integration` Cucumber arm) so the --package-json threading is proven without a
 * subprocess.
 */
export function runReconcile(opts: ReconcileOptions): EvidenceReconciliation {
  const scenarios = scenariosFromFeatures(opts.features);

  // The TARGET repo root the credit locators are made relative to, so a
  // phantom-scenario row's where-to-fix (ruling Q5) stays portable in a banked artefact.
  const root = resolveTargetRoot({ features: opts.features });
  const evidenceObservations: EvidenceObservation[] = [];
  const vitestReport = readJsonIfPresent<VitestJsonReport>(opts.vitest);
  if (vitestReport) evidenceObservations.push(...parseVitestEvidenceObservations(vitestReport, VITEST_QUALITY_CHECK, root));
  const cucumberReport = readJsonIfPresent<CucumberJsonReport>(opts.cucumber);
  if (cucumberReport) evidenceObservations.push(...parseCucumberEvidenceObservations(cucumberReport, CUCUMBER_QUALITY_CHECK, root));

  // Static (guard) kind: observe each declared @lint=<guard> against the CI config
  // + package.json over the real tree. Read the CI + package.json ONCE — both
  // the declared-guard evidence observation AND the reverse CI-guard derivation (below) draw on them.
  const demandedGuards = [
    ...new Set(
      scenarios.flatMap((d) =>
        d.evidenceObligations
          .filter((r) => r.qualityCheck === "lint")
          .map((r) => r.guard!)
      )
    ),
  ];
  // The --package-json seam (@SCN-LNT-005): read the guard's `exists`
  // from the EXTERNALLY-SPECIFIED package.json when given, else the tool's own
  // cwd. Required to reconcile ANOTHER repo's guards — and to render the
  // historical watermelon (exists:true in the target's package.json, unwired in
  // its CI → watermelon, not missing).
  const ciPath = opts.ci ?? ".github/workflows/ci.yml";
  const ciSource = existsSync(ciPath) ? readFileSync(ciPath, "utf8") : "";
  const pkgPath = opts.packageJson ?? "package.json";
  const packageJson = readJsonIfPresent<PackageJsonScripts>(pkgPath) ?? {};
  if (demandedGuards.length > 0) {
    evidenceObservations.push(...checkStaticEvidenceObligations(demandedGuards, ciSource, packageJson));
  }

  // The RUNNING-guard observer: every running CI guard is a
  // GuardEvidenceObservation in the stream — the static analogue of the runner emitting
  // every test result — so the one reconcile engine sees the COMPLETE static stream.
  // Combined with the demanded observations WITHOUT double-observing: a running guard the
  // demanded set already covers carries its authoritative exists/enforcedOverRealSource
  // detail from `checkStaticEvidenceObligations` (the watermelon input), so only the UNDEMANDED
  // running guards are added here. They cite no scenario — the reconciler folds them into the suspense row.
  const demandedGuardSet = new Set(demandedGuards);
  evidenceObservations.push(
    ...runningStaticGuards(ciSource, packageJson).filter((o) => !demandedGuardSet.has(o.guard))
  );

  // The stream is now COMPLETE: every running CI guard is a GuardEvidenceObservation
  // — the demanded ones match their @lint obligation, the undemanded ones (a guard no @lint
  // declares) cite no scenario, so `reconcile` folds them into the SUSPENSE row itself. No
  // derive-and-diff, no `unattributedStaticGuards` param.
  return reconcile(scenarios, evidenceObservations);
}

/**
 * Read the static-guard kind-counts alongside the balance (@SCN-USG-001) —
 * the static-axis sibling of `readEvidenceObservations`. Builds the SAME guard observations
 * `runReconcile` pushes into `reconcile` — every demanded `@lint=<guard>` observed by
 * `checkStaticEvidenceObligations` PLUS every undemanded running CI guard (`runningStaticGuards`) — and
 * COUNTS them by kind (`countStaticEvidenceObservationKinds`), mirroring `readEvidenceObservations` →
 * `countRuntimeEvidenceObservationKinds`. Reconciling a guard to its scenario (or the suspense
 * row) is `reconcile`'s job (a guard that runs in CI with NO `@lint` folds to the suspense row);
 * the census only counts. Threaded to the
 * renderers via `writeOutputs` like ctx/evidenceObligations/evidenceObservations.
 */
export function readStaticEvidenceObservationCounts(opts: ReconcileOptions): StaticEvidenceObservationKindCounts {
  const scenarios = scenariosFromFeatures(opts.features);
  const demandedGuards = [
    ...new Set(
      scenarios.flatMap((d) =>
        d.evidenceObligations
          .filter((r) => r.qualityCheck === "lint")
          .map((r) => r.guard!)
      )
    ),
  ];
  const ciPath = opts.ci ?? ".github/workflows/ci.yml";
  const ciSource = existsSync(ciPath) ? readFileSync(ciPath, "utf8") : "";
  const pkgPath = opts.packageJson ?? "package.json";
  const packageJson = readJsonIfPresent<PackageJsonScripts>(pkgPath) ?? {};
  const demandedSet = new Set(demandedGuards);
  const observations = [
    ...checkStaticEvidenceObligations(demandedGuards, ciSource, packageJson),
    ...runningStaticGuards(ciSource, packageJson).filter((o) => !demandedSet.has(o.guard)),
  ];
  return countStaticEvidenceObservationKinds(observations, demandedGuards);
}
