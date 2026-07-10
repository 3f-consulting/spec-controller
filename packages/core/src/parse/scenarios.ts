/**
 * The `declared` reader — parse spec-controller's own `features/**\/*.feature` source
 * into declared evidence obligations: per scenario, `{ scnId, evidenceObligations }`, with
 * each (kind, level) drawn from the scenario's evidence tags (@unit → runtime/unit,
 * @integration → runtime/integration, @e2e → runtime/e2e, @performance →
 * runtime/performance — the evidence-obligation reading).
 *
 * One of the three separated inputs to the reconciler (declared / observed /
 * guard) — the embryonic declared-side adapter, deliberately not a registry (v1).
 *
 * Approach: scan TAG LINES (a line whose first non-blank char is `@` and whose
 * every whitespace-separated token is a tag) for an @SCN-<FFF>-<NNN> id and any
 * co-located evidence-level tags. A scenario's @SCN id and its level tags sit on
 * the same accumulated tag block immediately above the Scenario keyword, so a tag
 * line carrying an @SCN id contributes that scenario's evidenceObligations from the level
 * tags found across the contiguous tag block.
 *
 * The `lint` quality-check: a `@lint=<guard>` tag in the same block
 * contributes a `{ qualityCheck: "lint", guard }` evidenceObligation — the guard handle is the
 * exact npm-script name, taken as everything after the FIRST `=` (so
 * `@lint=lint:feature-codes` → guard `lint:feature-codes`). The `=` prefix
 * delimiter (operator ruling) replaced an earlier `@lint:` double-colon
 * form, keeping exact-match while removing the double-colon wart.
 *
 * Parent: @SCN-LDG-001.
 */

import type { Scenario, EvidenceObligation, QualityCheck, RuntimeQualityCheck } from "../model.js";

const SCN_CODE = /^SCN-[A-Z0-9]+-\d+$/;

/**
 * The single-sourced STARTER set of recognised community deferral tags (@SCN-PND-016) — bare
 * names (the `@` is tag-line syntax). A scenario whose tag block carries one of these DEFERS
 * every obligation it declares to a Pending Item (scenario-scope), reusing the slice-1/2
 * `pending` machinery. These are the established Cucumber deferral conventions; `parseScenarios`
 * takes the recognised set as a DEFAULTED param, so a project may EXTEND it by configuration
 * (@SCN-PND-021) — the injection reads `package.json` at the ingest edge and is NOT this seam's
 * concern (the core stays pure). Exported so the CLI `--help` can source the starter set.
 */
export const DEFAULT_DEFERRAL_TAGS: readonly string[] = [
  "wip",
  "ignore",
  "skip",
  "todo",
  "pending",
];

/**
 * The recognised `<quality-check>pending` lexicon (evidence-manifesto §11B) — a bare tag
 * (the `@` stripped) that DEFERS an obligation to a later slice. Exact-match keyed, so the
 * `pending` suffix is significant: `integrationpending` is NOT `integration`, and an
 * unrecognised `<x>pending` (or bare `pending`) is absent from the map → ignored. Unlike
 * `TAG_TO_QUALITY_CHECK`, this covers ALL FIVE quality-checks including `lint` (a pending
 * lint obligation is one-sided — no guard payload).
 */
const PENDING_TAG_TO_QUALITY_CHECK: Record<string, QualityCheck> = {
  lintpending: "lint",
  unitpending: "unit",
  integrationpending: "integration",
  e2epending: "e2e",
  performancepending: "performance",
};

/**
 * Recognise a `<quality-check>pending` tag (evidence-manifesto §11B) — return its deferred
 * quality-check, or `null` when the bare tag is not one of the five recognised `<qc>pending`
 * (a bare tier tag, an unknown `<x>pending`, or bare `pending`). The pure per-tag helper
 * `parseScenarios` uses to derive a pending obligation.
 */
export function pendingQualityCheck(tag: string): QualityCheck | null {
  return PENDING_TAG_TO_QUALITY_CHECK[tag] ?? null;
}
/**
 * `lint=<guard>` — the static-guard handle. Split on the FIRST `=`; the guard is
 * everything after it (the exact npm-script name, which may itself contain `:`).
 */
const LINT_TAG = /^lint=(.+)$/;
const TAG_TO_QUALITY_CHECK: Record<string, RuntimeQualityCheck> = {
  unit: "unit",
  integration: "integration",
  e2e: "e2e",
  performance: "performance",
};

/** Is a trimmed line a genuine Gherkin TAG LINE? Return its bare tags, else null. */
function tagLineTags(line: string): string[] | null {
  if (!line.startsWith("@")) return null;
  const tokens = line.split(/\s+/);
  if (!tokens.every((t) => t.startsWith("@"))) return null;
  return tokens.map((t) => t.slice(1));
}

/**
 * `@SCN-FFF-NNN` — a raw scenario-id occurrence ANYWHERE in the source (tag line OR
 * the non-tag context — prose, comments, step text — the tag-line parser ignores).
 * The global flag counts every occurrence (@SCN-RPT-008).
 */
const SCN_OCCURRENCE = /@SCN-[A-Z0-9]+-\d+/g;

/**
 * Count every raw `@SCN-FFF-NNN` occurrence across the WHOLE source — including the
 * non-tag-line context (prose, comments, step text) the tag-line `parseScenarios`
 * deliberately ignores. A sibling read over the same source; `parseScenarios` is
 * unchanged. Each declared scenario contributes exactly one tag-line occurrence, so
 * the delta against `parseScenarios(...).length` is precisely the ids seen in non-tag
 * context.
 */
export function countScnOccurrences(source: string): number {
  return (source.match(SCN_OCCURRENCE) ?? []).length;
}

/**
 * The PROSE-ONLY @SCN codes (@SCN-RPT-015) — codes that appear in non-tag
 * context (prose / comments / step text) but are NEVER an @SCN tag ANYWHERE in the
 * corpus: dangling references. A CROSS-CORPUS set difference `proseCodes − tagCodes`
 * over ALL sources (unique, sorted): per source each line is inspected — a tag line
 * contributes its @SCN tokens to the TAG set; any other line contributes its @SCN
 * matches (the leading `@` stripped) to the PROSE set. The union across files is
 * load-bearing: a code tagged in one file but mentioned in prose in another is NOT
 * prose-only. Distinct from `countScnOccurrences`'s raw count (occurrences, not unique
 * dangling codes). The bare code (e.g. `SCN-FOO-001`) is its own locator.
 */
export function proseOnlyCodes(sources: string[]): string[] {
  const tag = new Set<string>();
  const prose = new Set<string>();
  for (const source of sources) {
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      const tags = line === "" ? null : tagLineTags(line);
      if (tags) {
        for (const t of tags) if (SCN_CODE.test(t)) tag.add(t);
      } else {
        for (const m of line.matchAll(SCN_OCCURRENCE)) prose.add(m[0].slice(1));
      }
    }
  }
  return [...prose].filter((code) => !tag.has(code)).sort();
}

/**
 * A Gherkin scenario-header line: `Scenario:` / `Scenario Outline:` / `Scenario
 * Template:` / `Example:` (the synonym for Scenario), capturing the name after the
 * colon. The colon is anchored immediately after the keyword, so `Examples:` (plural —
 * the Scenario Outline DATA TABLE, not a scenario) does NOT match. Longer keywords lead
 * the alternation for clarity.
 */
const SCENARIO_HEADER =
  /^(?:Scenario Outline|Scenario Template|Scenario|Example):\s*(.*)$/;

/**
 * Parse the UNTAGGED scenarios — Gherkin scenario headers whose preceding contiguous
 * tag block carries no `@SCN` id (@SCN-RPT-014). Mirrors `parseScenarios`'s
 * tag-block accumulation: a tag line accumulates the block; any non-tag line closes it.
 * At each scenario header, the just-accumulated block is checked for an `@SCN` — if it
 * has none, the scenario is untagged (returns its name). The declared-side counterpart
 * to the evidenceObservations aggregate's anomaly terms: a scenario with no evidence anchor.
 */
export function parseUntaggedScenarios(source: string): string[] {
  const untagged: string[] = [];
  let blockTags: string[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const tags = line === "" ? null : tagLineTags(line);
    if (tags) {
      blockTags.push(...tags);
      continue;
    }
    const header = SCENARIO_HEADER.exec(line);
    if (header && !blockTags.some((t) => SCN_CODE.test(t))) {
      untagged.push(header[1]!.trim());
    }
    // Any non-tag line (a scenario header, a step, a blank, Feature:/Rule:) closes the block.
    blockTags = [];
  }
  return untagged;
}

export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = DEFAULT_DEFERRAL_TAGS
): Scenario[] {
  const scenarios: Scenario[] = [];

  // Accumulate the contiguous tag block; when it carries an @SCN id, emit the
  // scenario with the level tags found in that same block. A blank line or a
  // non-tag line closes the block.
  let blockTags: string[] = [];

  const flush = (): void => {
    const scnTag = blockTags.find((t) => SCN_CODE.test(t));
    if (scnTag) {
      const evidenceObligations: EvidenceObligation[] = [];
      const seenQualityChecks = new Set<RuntimeQualityCheck>();
      const seenPending = new Set<QualityCheck>();
      const seenGuards = new Set<string>();
      for (const t of blockTags) {
        // A `<quality-check>pending` tag derives a DEFERRED, one-sided obligation
        // `{ qualityCheck, pending: true }` (no guard payload). Tracked in its own set so
        // it is neither blocked by nor blocks a bare tier of the same quality-check, and
        // recognised SEPARATELY from the bare tier tag (the `pending` suffix is significant).
        const pendingCheck = pendingQualityCheck(t);
        if (pendingCheck && !seenPending.has(pendingCheck)) {
          seenPending.add(pendingCheck);
          evidenceObligations.push({ qualityCheck: pendingCheck, pending: true });
          continue;
        }
        const qualityCheck = TAG_TO_QUALITY_CHECK[t];
        if (qualityCheck && !seenQualityChecks.has(qualityCheck)) {
          seenQualityChecks.add(qualityCheck);
          evidenceObligations.push({ qualityCheck });
          continue;
        }
        const lintMatch = LINT_TAG.exec(t);
        if (lintMatch) {
          const guard = lintMatch[1]!;
          if (!seenGuards.has(guard)) {
            seenGuards.add(guard);
            evidenceObligations.push({ qualityCheck: "lint", guard });
          }
        }
      }
      // SCENARIO-SCOPE community deferral (@SCN-PND-016): when the tag block carries a
      // RECOGNISED community deferral tag (a bare tag ∈ the injected set — the five
      // DEFAULT_DEFERRAL_TAGS by default), the whole scenario is deferred: mark EVERY declared
      // obligation `pending: true`, overriding its observation-derived outcome. Applied AFTER the
      // obligation list is built, so it composes with the `<qc>pending` recognition and covers
      // every obligation kind (runtime tiers AND `@lint=<guard>`). Idempotent on an
      // already-pending obligation. (A deferred scenario declaring ZERO obligations — bare `@wip`
      // — is a LATER slice's synthesised scenario-level Pending Item, @SCN-PND-022; here it is a
      // no-op.)
      if (blockTags.some((t) => deferralTags.includes(t))) {
        for (const obligation of evidenceObligations) obligation.pending = true;
      }
      scenarios.push({ scnId: scnTag, evidenceObligations });
    }
    blockTags = [];
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const tags = line === "" ? null : tagLineTags(line);
    if (tags) {
      blockTags.push(...tags);
    } else {
      // A non-tag line (Scenario:/Given/blank/Feature:/Rule:) closes the block.
      flush();
    }
  }
  flush();

  return scenarios;
}
