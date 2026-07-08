/**
 * The `ingest/cucumber` reader — the second named observed-evidence reader.
 * Reads Cucumber-JS's JSON formatter output and normalises each scenario that
 * carries an @SCN tag into an EvidenceObservation at the `integration` level.
 *
 * The level is a DECLARED property of the input: the caller outcomes the level
 * this Cucumber source yields, and the reader stamps it — no Cucumber⇒integration
 * assumption baked into the parser. The JS-ecosystem default (integration) is declared
 * at the CLI edge. A scenario passes iff every step passed.
 *
 * Parent: @SCN-LDG-001 (the foundation seam; balanced path).
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
 * Parse a Cucumber JSON report into observed results at the DECLARED level. One result per
 * scenario: those carrying an @SCN tag cite that scenario; those with NO tag emit a null-scnId
 * credit (@SCN-LDG-007 — previously DROPPED). A null-scnId credit cites no scenario,
 * so the reconciler folds it into the SUSPENSE row. A scenario passes iff every step passed.
 */
export function parseCucumberEvidenceObservations(
  report: CucumberJsonReport,
  qualityCheck: RuntimeQualityCheck,
  root?: string
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const feature of report) {
    // The feature-file locator (the where-to-fix) — carried on every credit (ruling
    // Q5), made portable relative to the run root (verbatim without root).
    const locator = relativizeToRoot(feature.uri ?? feature.name ?? "(unknown feature)", root);
    for (const scenario of feature.elements ?? []) {
      const scnTag = (scenario.tags ?? [])
        .map((t) => SCN_TAG.exec(t.name ?? ""))
        .find((m): m is RegExpExecArray => m !== null);

      const steps = scenario.steps ?? [];
      const passed =
        steps.length > 0 && steps.every((s) => s.result?.status === "passed");
      results.push({
        qualityCheck,
        scnId: scnTag ? scnTag[1]! : null, // no @SCN tag → an uncited credit (SUSPENSE).
        status: passed ? "passed" : "failed",
        locator,
      });
    }
  }
  return results;
}
