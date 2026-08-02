/**
 * Feature-code registry + duplicate-code lint (a minimal port without the
 * brand dependency).
 *
 * Per Evidence Manifesto §9A, every scenario ID has the form @SCN-<FFF>-<NNN>,
 * where <FFF> is a short (2–5 char), project-unique feature code declared as a
 * Feature-level @<FFF> header tag in the feature file. The set of feature files
 * IS the registry: grep the headers; this lint enforces that no two features
 * share a code, and that each declared code is registered against the expected
 * slug.
 *
 * A product quality check, NOT part of the app — it lives in static-checks/ (a
 * sibling of src/), driven by the lint:feature-codes CI static check. The
 * feature-file discovery it reads (`discoverFeatures`) is the app's ingest reader;
 * the `scnId → feature-code` grammar helper is the engine's (featureCodeOf).
 *
 * The registry is seeded with one entry per shipped feature (LDG is the @LDG
 * runtime spine). Further codes are allocated here as features are added.
 */

import { discoverFeatures, type DiscoveredFeature } from "../src/ingest/ingestScenarios.js";

/** A single feature-code allocation. */
export interface FeatureCodeEntry {
  /** The 2–5 char project-unique feature code (the <FFF> in @SCN-<FFF>-<NNN>). */
  code: string;
  /** The capability slug — the feature-file basename (without .feature). */
  slug: string;
  /**
   * `declared` — the @<FFF> header tag is present on a feature file now.
   * `reserved` — the code is allocated for a not-yet-created feature file.
   */
  status: "declared" | "reserved";
  /** One-line note on the code's home / disposition. */
  note: string;
}

/**
 * The feature-code registry — the canonical <FFF> allocation. Once allocated, a
 * code is stable forever: it survives a feature-file rename and is never reused
 * for a different capability.
 */
export const REGISTRY: readonly FeatureCodeEntry[] = [
  {
    code: "API",
    slug: "public-api",
    status: "declared",
    note: "the public core barrel — the @3f-consulting/spec-controller-core entrypoint exports exactly the frozen v1 contract surface, pinned by the @SCN-API-001 @unit drift guard",
  },
  {
    code: "CLI",
    slug: "cli-balance",
    status: "declared",
    note: "the spec-controller balance command runs standalone (core + app, no engine) and emits the Evidence Reconciliation",
  },
  {
    code: "LDG",
    slug: "ledger",
    status: "declared",
    note: "the runtime spine — the ledger over declared-vs-observed @unit/@integration evidence",
  },
  {
    code: "LNT",
    slug: "lint-reconciliation",
    status: "declared",
    note: "the @lint static-check quality-check — reconciling @lint:<guard> scenarios against CI wiring over the real source; flags the watermelon",
  },
  {
    code: "CPX",
    slug: "complexity-threshold",
    status: "declared",
    note: "the complexity + module-size thresholds — eslint complexity/max-lines/max-lines-per-function over the real tree, held to an EXTERNAL standard (10/40/400, cited) rather than the tree's own measured maximum, with today's exceedances enumerated as dated debt",
  },
  {
    code: "USG",
    slug: "uncited-static-checks",
    status: "declared",
    note: "the uncited static-check — a CI guard that runs with no @lint declaring it (the mirror of a cites-no-scenario runtime evidence observation); derives the CI guard-set + reconciles it against the declared @lint set",
  },
  {
    code: "WRN",
    slug: "warnings",
    status: "declared",
    note: "a scenario declaring zero evidence obligations is both-missing — no evidence named, none observed",
  },
  {
    code: "RPT",
    slug: "report",
    status: "declared",
    note: "the report renders the ledger as sectioned facts — the sectioned renderer + run-provenance header/object over a sibling RunContext",
  },
  {
    code: "FMT",
    slug: "output-format",
    status: "declared",
    note: "the output-dispatch model — --format <fmt>[:<path>] emits each format to stdout or a caller-given file; no auto-archive, no target resolution",
  },
  {
    code: "RMG",
    slug: "run-management",
    status: "declared",
    note: "the run-management mechanism — a kept run = a named <root>/<target>/<run-id>/ dir + routed --format outputs (spec-reconciliation.md + trial-balance.json) + a run.yaml manifest, under an injected store root",
  },
  {
    code: "NCR",
    slug: "no-committed-reports",
    status: "declared",
    note: "the active never-commit enforcement — the lint:no-committed-reports CI guard fails if a report artefact is tracked in the repo; @lint-self-declared so the tool's own ledger reconciles it",
  },
  {
    code: "RMD",
    slug: "report-model",
    status: "declared",
    note: "the whole-document report model — the ONE model both renderings consume, serialised glue-free to spec-reconciliation.json in the manifesto vocabulary",
  },
  {
    code: "VOC",
    slug: "vocabulary-audit",
    status: "declared",
    note: "the closed-vocabulary audit — scan every file, decompose every name, flag any word outside the approved word-set; report-only, NOT a CI gate",
  },
  {
    code: "EPG",
    slug: "engine-purity",
    status: "declared",
    note: "the engine-purity guard — a @unit guard that reds if any production file in the pure core imports from the app package or references IO (node:fs/child_process/process); makes the pure seam executable, the dogfood analogue of @SCN-API-001",
  },
  {
    code: "DPG",
    slug: "domain-purity",
    status: "declared",
    note: "the domain-purity guard — a @unit guard that reds if any production file under packages/core/src/domain imports from the core's adapter layers (parse/render/assemble/census) or the spec-controller app package; the INNER analogue of engine-purity (@SCN-EPG-001), keeping the reconciliation concepts a pure functional domain (the DDD retrofit, 3F-1994)",
  },
  {
    code: "SSM",
    slug: "scenario-sub-issue-match",
    status: "declared",
    note: "the hermetic scenario↔sub-issue gate (ported from an earlier internal tool / an adopter's repository 3F-834) — every behaviour-bearing @SCN change on a PR must carry its @SCN cite AND a ticket handle, verified from the diff + CI metadata alone, no Linear call; wired PR-only via lint:scn-subissues (parent 3F-1137)",
  },
  {
    code: "PND",
    slug: "pending-items",
    status: "declared",
    note: "the pending evidence obligation — a <quality-check>pending tag (evidence-manifesto §11B) parses as a deferred, one-sided obligation ({ qualityCheck, pending: true }); PARSE only, the ledger's Pending Item behaviour is a later slice",
  },
  {
    code: "STG",
    slug: "scn-tags",
    status: "declared",
    note: "the tier-tag floor over spec-controller's own scenarios (the cobbler's shoes) — the lint:scn-tags CI guard reds if any @SCN scenario declares no evidence tier (@unit/@integration/@e2e/@performance, a <tier>pending variant, or @lint=<guard>) and is not @wip; @lint-self-declared so the tool's own ledger reconciles it",
  },
  {
    code: "NPS",
    slug: "no-parallel-store",
    status: "declared",
    note: "the no-parallel-store lock (the DDD retrofit capstone, Slice 8) — a @unit guard that reds if any production file in packages/core/src resurrects a retired evidence-observation census (its module file, a retired credit-list/section declaration, or a parallel `attributed` field), plus a @unit round-trip proving every summary aggregate re-folds from the serialised Ledger; makes 'the Ledger is the ONE source of truth' executable (3F-2101)",
  },
];

/** A single lint finding. */
export interface LintViolation {
  kind:
    | "duplicate-code"
    | "duplicate-scenario-code"
    | "unknown-code"
    | "slug-mismatch"
    | "duplicate-registry-code"
    | "malformed-code";
  message: string;
}

/** The result of a lint run. */
export interface LintResult {
  ok: boolean;
  violations: LintViolation[];
  /** Features that have not yet declared a code (informational, not an error). */
  uncoded: string[];
}

/** A code is valid when it is 2–5 uppercase alphanumerics. */
const CODE_PATTERN = /^[A-Z0-9]{2,5}$/;

/**
 * Lint the feature set against the registry. Errors: duplicate-code,
 * duplicate-registry-code, malformed-code, unknown-code, slug-mismatch,
 * duplicate-scenario-code (per-file). A feature with no declared code is
 * reported in `uncoded`, not an error.
 */
export function lintFeatureCodes(
  features: DiscoveredFeature[] = discoverFeatures(),
  registry: readonly FeatureCodeEntry[] = REGISTRY
): LintResult {
  const violations: LintViolation[] = [];

  // (0) The registry must itself be internally unique.
  const registrySeen = new Map<string, string>();
  for (const entry of registry) {
    if (!CODE_PATTERN.test(entry.code)) {
      violations.push({
        kind: "malformed-code",
        message: `Registry code "${entry.code}" (${entry.slug}) is not 2–5 uppercase alphanumerics.`,
      });
    }
    const prior = registrySeen.get(entry.code);
    if (prior) {
      violations.push({
        kind: "duplicate-registry-code",
        message: `Registry code "${entry.code}" is allocated to both "${prior}" and "${entry.slug}".`,
      });
    } else {
      registrySeen.set(entry.code, entry.slug);
    }
  }
  const byCode = new Map(registry.map((e) => [e.code, e]));

  // (1) Declared codes across the feature set must be unique and registered.
  const seenCodes = new Map<string, string>();
  const uncoded: string[] = [];
  for (const feature of features) {
    if (feature.featureCode === null) {
      uncoded.push(feature.slug);
      continue;
    }
    const code = feature.featureCode;

    if (!CODE_PATTERN.test(code)) {
      violations.push({
        kind: "malformed-code",
        message: `Feature "${feature.slug}" declares code "${code}", which is not 2–5 uppercase alphanumerics.`,
      });
    }

    const prior = seenCodes.get(code);
    if (prior) {
      violations.push({
        kind: "duplicate-code",
        message: `Feature code "${code}" is declared by both "${prior}" and "${feature.slug}" — codes must be unique (Evidence Manifesto §9A).`,
      });
    } else {
      seenCodes.set(code, feature.slug);
    }

    const entry = byCode.get(code);
    if (!entry) {
      violations.push({
        kind: "unknown-code",
        message: `Feature "${feature.slug}" declares code "${code}", which is not in the registry (static-checks/featureCodes.ts). Allocate it there first.`,
      });
    } else if (entry.slug !== feature.slug) {
      violations.push({
        kind: "slug-mismatch",
        message: `Feature "${feature.slug}" declares code "${code}", but the registry allocates "${code}" to "${entry.slug}".`,
      });
    }
  }

  // (2) Per-file scenario-code uniqueness.
  for (const feature of features) {
    const counts = new Map<string, number>();
    for (const code of feature.scenarioCodes) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    for (const [code, count] of counts) {
      if (count > 1) {
        violations.push({
          kind: "duplicate-scenario-code",
          message: `Feature "${feature.slug}" declares scenario code "@${code}" on ${count} scenarios — each @SCN-<FFF>-<NNN> must be unique within a feature file (Evidence Manifesto §9A; append-only, gaps allowed).`,
        });
      }
    }
  }

  return { ok: violations.length === 0, violations, uncoded };
}
