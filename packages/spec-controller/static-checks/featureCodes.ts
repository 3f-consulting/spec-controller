/**
 * Feature-code registry + duplicate-code lint (a minimal port without the
 * brand dependency).
 *
 * Per Evidence Manifesto §9A, every scenario ID has the form @SCN-<FFF>-<NNN>,
 * where <FFF> is a short (2–5 char), project-unique feature code carried as a
 * Feature-level @<FFF> header tag in the feature file. The set of feature files
 * IS the registry: grep the headers; this lint enforces that no two features
 * share a code, and that each header code is registered against the expected
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
   * `feature-code-used` — the @<FFF> header tag is present on a feature file now.
   * `feature-code-reserved` — the code is allocated for a not-yet-created feature file.
   */
  status: "feature-code-used" | "feature-code-reserved";
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
    code: "ANM",
    slug: "anemic-domain",
    status: "feature-code-used",
    note: "a concept owns its own behaviour — the static check reds a domain module named for a procedural layer (*-operations / *-service / *-manager), fencing the door 3F-2416's module-size scope exclusion opened",
  },
  {
    code: "API",
    slug: "public-api",
    status: "feature-code-used",
    note: "the public core barrel — the @3f-consulting/spec-controller-core entrypoint exports exactly the frozen v1 contract surface, pinned by the @SCN-API-001 @unit drift guard",
  },
  {
    code: "CLI",
    slug: "cli-balance",
    status: "feature-code-used",
    note: "the spec-controller balance command runs standalone (core + app, no engine) and emits the Evidence Reconciliation",
  },
  {
    code: "LAD",
    slug: "local-ladder",
    status: "feature-code-used",
    note: "the local green-check's gate list, derived from ci.yml rather than typed beside it — pnpm verify runs every CI script step, in CI's order, on CI's command line, so the ladder cannot silently narrow the way it did between 1f7977f and 3F-2444",
  },
  {
    code: "LDG",
    slug: "ledger",
    status: "feature-code-used",
    note: "the runtime spine — the ledger over the @unit/@integration evidence obligations a scenario raises and the evidence observations its tests produce",
  },
  {
    code: "LNT",
    slug: "fitness-reconciliation",
    status: "feature-code-used",
    note: "the fitness axis — reconciling each stepless fitness scenario's bare check against CI wiring over the real source; flags the watermelon. The code is LNT because a code, once allocated, is stable forever: it survives a feature-file rename and is never reused",
  },
  {
    code: "CPX",
    slug: "complexity-threshold",
    status: "feature-code-used",
    note: "the complexity + module-size thresholds — eslint complexity/max-lines/max-lines-per-function over the real tree, held to an EXTERNAL standard (10/40/400, cited) rather than the tree's own measured maximum, with today's exceedances enumerated as dated debt",
  },
  {
    code: "USG",
    slug: "uncited-static-checks",
    status: "feature-code-used",
    note: "the uncited static-check — a CI guard that runs with no @lint naming it (the mirror of a cites-no-scenario runtime evidence observation); derives the CI guard-set + reconciles it against the named @lint set",
  },
  {
    code: "WRN",
    slug: "warnings",
    status: "feature-code-used",
    note: "a scenario raising zero evidence obligations is both-missing — no evidence named, none observed",
  },
  {
    code: "RPT",
    slug: "report",
    status: "feature-code-used",
    note: "the report renders the ledger as sectioned facts — the sectioned renderer + run-provenance header/object over a sibling RunContext",
  },
  {
    code: "FMT",
    slug: "output-format",
    status: "feature-code-used",
    note: "the output-dispatch model — --format <fmt>[:<path>] emits each format to stdout or a caller-given file; no auto-archive, no target resolution",
  },
  {
    code: "RMG",
    slug: "run-management",
    status: "feature-code-used",
    note: "the run-management mechanism — a kept run = a named <root>/<target>/<run-id>/ dir + routed --format outputs (spec-reconciliation.md + trial-balance.json) + a run.yaml manifest, under an injected store root",
  },
  {
    code: "NCR",
    slug: "no-committed-reports",
    status: "feature-code-used",
    note: "the active never-commit enforcement — the lint:no-committed-reports CI guard fails if a report artefact is tracked in the repo; @lint-self-cited so the tool's own ledger reconciles it",
  },
  {
    code: "RMD",
    slug: "report-model",
    status: "feature-code-used",
    note: "the whole-document report model — the ONE model both renderings consume, serialised glue-free to spec-reconciliation.json in the manifesto vocabulary",
  },
  {
    code: "VOC",
    slug: "vocabulary-audit",
    status: "feature-code-used",
    note: "the closed-vocabulary audit — scan every file, decompose every name, flag any word outside the approved word-set; report-only, NOT a CI gate",
  },
  {
    code: "EPG",
    slug: "engine-purity",
    status: "feature-code-used",
    note: "the engine-purity guard — a @unit guard that reds if any production file in the pure core imports from the app package or references IO (node:fs/child_process/process); makes the pure seam executable, the dogfood analogue of @SCN-API-001",
  },
  {
    code: "DPG",
    slug: "domain-purity",
    status: "feature-code-used",
    note: "the domain-purity guard — a @unit guard that reds if any production file under packages/core/src/domain imports from the core's adapter layers (parse/render/assemble/census) or the spec-controller app package; the INNER analogue of engine-purity (@SCN-EPG-001), keeping the reconciliation concepts a pure functional domain (the DDD retrofit, 3F-1994)",
  },
  {
    code: "SSM",
    slug: "scenario-sub-issue-match",
    status: "feature-code-used",
    note: "the hermetic scenario↔sub-issue gate (ported from an earlier internal tool / an adopter's repository 3F-834) — every behaviour-bearing @SCN change on a PR must carry its @SCN cite AND a ticket handle, verified from the diff + CI metadata alone, no Linear call; wired PR-only via lint:scn-subissues (parent 3F-1137)",
  },
  {
    code: "PND",
    slug: "pending-items",
    status: "feature-code-used",
    note: "the pending evidence obligation — a <quality-check>pending tag (evidence-manifesto §11B) parses as a deferred, one-sided obligation ({ qualityCheck, pending: true }); PARSE only, the ledger's Pending Item behaviour is a later slice",
  },
  {
    code: "STG",
    slug: "scn-tags",
    status: "feature-code-used",
    note: "the tier-tag floor over spec-controller's own scenarios (the cobbler's shoes) — the lint:scn-tags CI guard reds if any @SCN scenario names no evidence tier (@unit/@integration/@e2e/@performance, a <tier>pending variant, or — when it is stepless — a registered bare check tag) and is not @wip; carried by its own stepless fitness scenario so the tool's own ledger reconciles it",
  },
  {
    code: "SLF",
    slug: "self-reconciliation",
    status: "feature-code-used",
    note: "the self-reconciliation gate (the cobbler's shoes, the whole pair) — lint:self-balance runs the product's own balance over spec-controller's own tree on every push and PR and exits on the verdict, so the tool's own out-of-balance reds the build rather than printing a report nobody must read; @lint-self-cited so the gate is not itself an uncited static check (3F-2351)",
  },
  {
    code: "NPS",
    slug: "no-parallel-store",
    status: "feature-code-used",
    note: "the no-parallel-store lock (the DDD retrofit capstone, Slice 8) — a @unit guard that reds if any production file in packages/core/src resurrects a retired evidence-observation census (its module file, a retired credit-list/section symbol, or a parallel `attributed` field), plus a @unit round-trip proving every summary aggregate re-folds from the serialised Ledger; makes 'the Ledger is the ONE source of truth' executable (3F-2101)",
  },
  {
    code: "CIP",
    slug: "ci-run-time",
    status: "feature-code-used",
    note: "the MEASURED fitness check — the second way a fitness function is assessed: by running the suite and measuring it, so the obligation carries a threshold and the observation is a number, reconciled satisfied at or under it and failing above. ci-run-time is canon's prototype of the shape; coverage and mutation follow through the same seam (3F-2283). The code matches an adopter's repository's allocation for the same characteristic",
  },
  {
    code: "MUT",
    slug: "mutation-score",
    status: "feature-code-used",
    note: "the measured axis read in EITHER direction — a threshold entry carries the comparison it is read with, so a mutation score is held to a FLOOR (at least) where a ci-run-time is held to a ceiling (at most), and a bare number keeps meaning at-most so the two live @ci-run-time rows are untouched by construction rather than by a sweep (3F-2509)",
  },
  {
    code: "RAT",
    slug: "mutation-ratchet",
    status: "feature-code-used",
    note: "the no-regression ratchet, written as a library that names no project of its own rather than as a reconciler wearing this repository's terms — a gate's record is a PAIR OF COUNTS plus the allowance stated against them, so a lost kill and a grown mutant population reach different verdicts instead of the one red a bare score can raise; every term a project owns (its record file, its gate names, its report path, the tree being judged, what to type to bank a measurement) arrives from the caller (3F-2787)",
  },
  {
    code: "MSG",
    slug: "message-catalogue",
    status: "feature-code-used",
    note: "human-facing message prose off the mutated surface — a domain invariant raises a fault named by a numeric CODE carrying its parameters as fields, and the prose that renders it lives in a catalogue held as data and excluded from the mutate glob, so the mutants that pinned wording cease to exist and what stays mutable is the logic deciding which fault and with what parameters (3F-2237)",
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
  /** Features that carry no code yet (informational, not an error). */
  uncoded: string[];
}

/** A code is valid when it is 2–5 uppercase alphanumerics. */
const CODE_PATTERN = /^[A-Z0-9]{2,5}$/;

/**
 * Lint the feature set against the registry. Errors: duplicate-code,
 * duplicate-registry-code, malformed-code, unknown-code, slug-mismatch,
 * duplicate-scenario-code (per-file). A feature with no header code is
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

  // (1) Header codes across the feature set must be unique and registered.
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
        message: `Feature "${feature.slug}" names code "${code}", which is not 2–5 uppercase alphanumerics.`,
      });
    }

    const prior = seenCodes.get(code);
    if (prior) {
      violations.push({
        kind: "duplicate-code",
        message: `Feature code "${code}" is named by both "${prior}" and "${feature.slug}" — codes must be unique (Evidence Manifesto §9A).`,
      });
    } else {
      seenCodes.set(code, feature.slug);
    }

    const entry = byCode.get(code);
    if (!entry) {
      violations.push({
        kind: "unknown-code",
        message: `Feature "${feature.slug}" names code "${code}", which is not in the registry (static-checks/featureCodes.ts). Allocate it there first.`,
      });
    } else if (entry.slug !== feature.slug) {
      violations.push({
        kind: "slug-mismatch",
        message: `Feature "${feature.slug}" names code "${code}", but the registry allocates "${code}" to "${entry.slug}".`,
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
          message: `Feature "${feature.slug}" names scenario code "@${code}" on ${count} scenarios — each @SCN-<FFF>-<NNN> must be unique within a feature file (Evidence Manifesto §9A; append-only, gaps allowed).`,
        });
      }
    }
  }

  return { ok: violations.length === 0, violations, uncoded };
}
