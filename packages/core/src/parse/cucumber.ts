/**
 * The `ingest/cucumber` reader — the second named observed-evidence reader.
 * Reads Cucumber-JS's JSON formatter output and normalises each scenario that
 * carries an @SCN tag into an EvidenceObservation, LEVELLED by the scenario's own
 * tier tag (@integration / @e2e / @performance).
 *
 * The level is DERIVED from the cited scenario's own tier tag, NOT from the input
 * source (Cucumber-as-orchestrator-across-levels: the scenario NAMES its tier by tag, cucumber
 * runs whichever). An @e2e scenario proven via cucumber yields an e2e observation. The
 * caller-supplied level (the JS-ecosystem default, integration, set at the CLI edge)
 * survives only as the fallback for an UNTAGGED scenario. The reader classifies FOUR-WAY
 * (@SCN-PND-013, extended by @SCN-LDG-019): any AMBIGUOUS step → a `broken` observation (a broken
 * harness — two step definitions match, so the step cannot run); any failed step → a `failed`
 * observation; all passed → a `passed` observation; otherwise INCONCLUSIVE (undefined/pending/
 * skipped) → the scenario is DROPPED (no observation), so its obligation reconciles missing by
 * absence — pending is never inferred from status.
 *
 * Parent: @SCN-LDG-011 (the tag-derivation headline) over @SCN-LDG-001 (the foundation seam).
 */

import type { RuntimeQualityCheck, EvidenceObservation, EvidenceStatus } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";

/** The minimal shape of Cucumber-JS's JSON formatter output this reader depends on. */
export type CucumberJsonReport = Array<{
  /** The feature-file path (`uri`) / `name` — the locator for the evidenceObservations reconciliation. */
  uri?: string;
  name?: string;
  elements?: Array<{
    tags?: Array<{ name?: string }>;
    steps?: Array<{
      /**
       * The step's Gherkin keyword and text (@SCN-LDG-019) — previously unread. An AMBIGUOUS step
       * carries no `error_message` (its result object is exactly `{ status, duration }`), so the
       * reader has nothing to quote: it must NAME the step itself, from these two fields, when it
       * synthesises the broken observation's what-broke message.
       */
      keyword?: string;
      name?: string;
      result?: { status?: string; duration?: number };
    }>;
  }>;
}>;

const SCN_TAG = /^@?(SCN-[A-Z0-9]+-\d+)$/;

/**
 * The non-unit runtime tiers a scenario can NAME by tag. A cucumber observation's
 * level is DERIVED from the cited scenario's own tier tag — the product thesis
 * of Cucumber-as-orchestrator-ACROSS-levels: the scenario names its tier (@integration /
 * @e2e / @performance) and cucumber runs whichever, so an @e2e scenario proven via cucumber
 * yields an e2e observation. `@unit` is deliberately NOT here: unit is the vitest substrate,
 * and a cucumber run genuinely exercises the integrated tiers, not isolation. The caller-supplied
 * `fallbackQualityCheck` survives only for a scenario carrying NO tier tag (the JS-ecosystem
 * default, set at the CLI edge).
 */
const TIER_TAG = /^@?(integration|e2e|performance)$/;

/**
 * Derive the SET of levels a cucumber observation discharges from the cited scenario's own
 * tier tag(s), falling back to a single caller-supplied level when the scenario carries none.
 *
 * The MULTI-TAG RULE (@SCN-LDG-014, generalising @SCN-LDG-011): a cucumber observation discharges
 * EVERY non-unit runtime obligation its cited scenario raises. So a scenario naming
 * `@integration @e2e` yields TWO levels from a SINGLE cucumber pass (integration + e2e); the caller
 * emits one observation per level. A single-tier scenario yields exactly ONE level (LDG-011/012/013
 * — the single-tier instances of this rule); an untagged scenario yields the single fallback tier.
 * Duplicates are collapsed so a repeated tag never fans out an extra observation.
 *
 * Why discharging both is honest, not double-crediting (Evidence Manifesto §11): §11 complementarity
 * is scoped to `@unit`-vs-the-run (isolation vs the integrated system, DIFFERENT runners) — so `@unit`
 * still needs its own vitest observation. §11 does NOT bite WITHIN the cucumber tiers: one cucumber
 * execution genuinely exercises the integrated components AND the end-to-end journey (the journey
 * CONTAINS the integration), so covering both from the one run is truthful.
 */
function deriveLevels(
  tags: Array<{ name?: string }>,
  fallbackQualityCheck: RuntimeQualityCheck
): RuntimeQualityCheck[] {
  const levels: RuntimeQualityCheck[] = [];
  for (const t of tags) {
    const m = TIER_TAG.exec(t.name ?? "");
    if (m) {
      const level = m[1] as RuntimeQualityCheck;
      if (!levels.includes(level)) levels.push(level); // dedup — one observation per distinct tier.
    }
  }
  return levels.length > 0 ? levels : [fallbackQualityCheck];
}

/**
 * SYNTHESISE the what-broke message of an ambiguous step's `broken` observation (@SCN-LDG-019).
 *
 * Cucumber emits NO `error_message` for an ambiguous step — its result object is exactly
 * `{ "status": "ambiguous", "duration": 0 }` (the "Multiple step definitions match: …" detail is
 * PRETTY-FORMATTER-ONLY, never in the JSON). So the reader cannot quote the runner as the vitest
 * reader does (which passes the collection error through VERBATIM); it must STATE THE DIAGNOSIS
 * itself, from the one thing the report does give: the step's keyword and text.
 *
 * It names WHAT BROKE — this step, matched by two or more step definitions, so it never ran. It
 * prescribes NO CURE: which of the colliding definitions is the wrong one is not the ledger's to
 * say.
 */
function ambiguousMessage(step: { keyword?: string; name?: string }): string {
  const text = `${(step.keyword ?? "").trim()} ${step.name ?? ""}`.trim();
  const named = text.length > 0 ? `The step "${text}"` : "A step";
  return `${named} is ambiguous — two or more step definitions match it, so the step never ran.`;
}

/**
 * Parse a Cucumber JSON report into observed results, each levelled by DERIVING it from the
 * cited scenario's own tier tag (falling back to `fallbackQualityCheck` for an untagged
 * scenario). One result per scenario: those carrying an @SCN tag cite that scenario; those with
 * NO @SCN tag emit a null-scnId credit (@SCN-LDG-007 — previously DROPPED). A null-scnId credit
 * cites no scenario, so the reconciler folds it into the SUSPENSE row. A scenario is classified
 * THREE-WAY (@SCN-PND-013): passed (all steps passed) / failed (any step failed) / INCONCLUSIVE
 * (otherwise) — an inconclusive scenario emits NOTHING, dropped so it reconciles missing by absence.
 */
export function parseCucumberEvidenceObservations(
  report: CucumberJsonReport,
  fallbackQualityCheck: RuntimeQualityCheck,
  root?: string
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const feature of report) {
    // The feature-file locator (the where-to-fix) — carried on every credit (ruling
    // Q5), made portable relative to the run root (verbatim without root).
    const locator = relativizeToRoot(feature.uri ?? feature.name ?? "(unknown feature)", root);
    for (const scenario of feature.elements ?? []) {
      const tags = scenario.tags ?? [];
      const scnTag = tags
        .map((t) => SCN_TAG.exec(t.name ?? ""))
        .find((m): m is RegExpExecArray => m !== null);

      const steps = scenario.steps ?? [];
      // FOUR-WAY classification (@SCN-PND-013, extended by @SCN-LDG-019) — pending is NEVER
      // inferred from status. The DROP is what realises inconclusive→missing and the `broken`
      // FLAG is what realises ambiguous→suspense, so `EvidenceStatus` stays binary: no new
      // status, no reconciler change. The drop is WHOLE-SCENARIO — an inconclusive scenario emits
      // no observation at ANY named tier (the `continue` below). The statuses that stay dropped
      // stay honest: `undefined` (no step definition is written — the test genuinely IS absent),
      // `pending` (explicitly deferred), `skipped` (never ran).
      //
      // THE AMBIGUOUS ARM IS ORDERED FIRST (@SCN-LDG-019) because cucumber halts the scenario at
      // the ambiguous step — every step after it reads `skipped`, so the inconclusive drop would
      // otherwise swallow the ambiguity along with them. An ambiguous step is not a stub that
      // proved nothing but a BROKEN HARNESS: two step definitions match one step, so the proof
      // exists and cannot execute. Dropping it as inconclusive sent the reader the WRONG remedy —
      // write a test that already exists, rather than fix the colliding step definitions. It is
      // cucumber's instance of the `broken` outcome vitest's collection failure established
      // (@SCN-LDG-017): evidence that NEVER MATERIALISED.
      //
      // ONE observation for the whole scenario (never one per named tier): the harness broke ONCE,
      // so a multi-tier scenario posts ONE broken item, levelled at its first named tier. Unlike
      // vitest's collection failure (citation-less by construction — a file that fails to collect
      // names no test), this observation CARRIES the scnId: the cucumber scenario DID cite its
      // @SCN; only its step could not run. The reconciler's fail-safe checks `broken` BEFORE
      // `status`, so it can never discharge (or fail) the obligation it cites; it posts to the
      // SUSPENSE row and the obligation reconciles `missing` BY ABSENCE (pinned in
      // reconcile.test.ts [SCN-LDG-019], under BOTH status values).
      const ambiguous = steps.find((s) => s.result?.status === "ambiguous");
      if (ambiguous) {
        results.push({
          qualityCheck: deriveLevels(tags, fallbackQualityCheck)[0]!,
          scnId: scnTag ? scnTag[1]! : null,
          // Structurally required, and the step certainly did not pass; the reconciler's fail-safe
          // checks `broken` BEFORE `status`, so this never reconciles as `failing`.
          status: "failed",
          locator,
          broken: true,
          message: ambiguousMessage(ambiguous),
        });
        continue;
      }
      const anyFailed = steps.some((s) => s.result?.status === "failed");
      const allPassed = steps.length > 0 && steps.every((s) => s.result?.status === "passed");
      if (!anyFailed && !allPassed) continue; // inconclusive → drop the whole scenario.
      const status: EvidenceStatus = anyFailed ? "failed" : "passed";
      // One observation PER named non-unit tier: a cucumber run of an @integration @e2e
      // scenario discharges BOTH obligations, so it emits an integration AND an e2e observation
      // (the multi-tag ruling's teeth, @SCN-LDG-014). A single-tier or untagged scenario emits
      // exactly one. The levels are DERIVED from the scenario's own tier tags, not the input
      // source; the caller-supplied level is the fallback for an untagged scenario.
      for (const level of deriveLevels(tags, fallbackQualityCheck)) {
        results.push({
          qualityCheck: level,
          scnId: scnTag ? scnTag[1]! : null, // no @SCN tag → an uncited credit (SUSPENSE).
          status,
          locator,
        });
      }
    }
  }
  return results;
}
