/**
 * The `ingest/cucumber` reader — the second named observed-evidence reader.
 * Reads Cucumber-JS's JSON formatter output and normalises each scenario that
 * carries an @SCN tag into an EvidenceObservation, LEVELLED by the scenario's own
 * declared tier tag (@integration / @e2e / @performance).
 *
 * The level is DERIVED from the cited scenario's declared tier tag, NOT from the input
 * source (Cucumber-as-orchestrator-across-levels: the scenario declares its tier, cucumber
 * runs whichever). An @e2e scenario proven via cucumber yields an e2e observation. The
 * caller-declared level (the JS-ecosystem default, integration, declared at the CLI edge)
 * survives only as the fallback for an UNTAGGED scenario. A scenario passes iff every step passed.
 *
 * Parent: @SCN-LDG-011 (the tag-derivation headline) over @SCN-LDG-001 (the foundation seam).
 */

import type { RuntimeQualityCheck, EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";

/** The minimal shape of Cucumber-JS's JSON formatter output this reader depends on. */
export type CucumberJsonReport = Array<{
  /** The feature-file path (`uri`) / `name` — the locator for the evidenceObservations reconciliation. */
  uri?: string;
  name?: string;
  elements?: Array<{
    tags?: Array<{ name?: string }>;
    steps?: Array<{ result?: { status?: string } }>;
  }>;
}>;

const SCN_TAG = /^@?(SCN-[A-Z0-9]+-\d+)$/;

/**
 * The non-unit runtime tiers a scenario can declare by tag. A cucumber observation's
 * level is DERIVED from the cited scenario's own declared tier tag — the product thesis
 * of Cucumber-as-orchestrator-ACROSS-levels: the scenario declares its tier (@integration /
 * @e2e / @performance) and cucumber runs whichever, so an @e2e scenario proven via cucumber
 * yields an e2e observation. `@unit` is deliberately NOT here: unit is the vitest substrate,
 * and a cucumber run genuinely exercises the integrated tiers, not isolation. The caller-declared
 * `fallbackQualityCheck` survives only for a scenario carrying NO tier tag (the JS-ecosystem
 * default, declared at the CLI edge).
 */
const TIER_TAG = /^@?(integration|e2e|performance)$/;

/**
 * Derive a cucumber observation's level from the cited scenario's declared tier tag(s),
 * falling back to the caller-declared level when the scenario carries none. Returns the
 * single declared tier today (@SCN-LDG-011). A scenario declaring MULTIPLE non-unit tiers
 * — one cucumber run discharging every tier — is per-tier emission, a later sibling
 * (3F-1438); this scans the tag array so extending to one observation per matched tier is
 * a local change here, not a reshape.
 */
function deriveLevel(
  tags: Array<{ name?: string }>,
  fallbackQualityCheck: RuntimeQualityCheck
): RuntimeQualityCheck {
  for (const t of tags) {
    const m = TIER_TAG.exec(t.name ?? "");
    if (m) return m[1] as RuntimeQualityCheck;
  }
  return fallbackQualityCheck;
}

/**
 * Parse a Cucumber JSON report into observed results, each levelled by DERIVING it from the
 * cited scenario's declared tier tag (falling back to `fallbackQualityCheck` for an untagged
 * scenario). One result per scenario: those carrying an @SCN tag cite that scenario; those with
 * NO @SCN tag emit a null-scnId credit (@SCN-LDG-007 — previously DROPPED). A null-scnId credit
 * cites no scenario, so the reconciler folds it into the SUSPENSE row. A scenario passes iff
 * every step passed.
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
      const passed =
        steps.length > 0 && steps.every((s) => s.result?.status === "passed");
      results.push({
        // The level is DERIVED from the scenario's declared tier tag, not the input
        // source; the caller-declared level is the fallback for an untagged scenario.
        qualityCheck: deriveLevel(tags, fallbackQualityCheck),
        scnId: scnTag ? scnTag[1]! : null, // no @SCN tag → an uncited credit (SUSPENSE).
        status: passed ? "passed" : "failed",
        locator,
      });
    }
  }
  return results;
}
