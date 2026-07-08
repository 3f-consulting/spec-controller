/**
 * The `ingest/vitest` reader — one of the two named observed-evidence readers
 * (the embryonic adapters, deliberately not a registry in v1). Reads Vitest's
 * JSON reporter output and normalises each assertion that cites an @SCN id into
 * an EvidenceObservation at the `unit` level.
 *
 * The level is a DECLARED property of the input: the caller outcomes the level
 * this Vitest source yields, and the reader stamps it — no Vitest⇒unit assumption baked
 * into the parser. The JS-ecosystem default (unit) is declared at the CLI edge.
 *
 * The @SCN id is the bracketed `[SCN-<FFF>-<NNN>]` token carried in the test's
 * `describe`/`it` name (the bidirectional-link rule), surfaced by Vitest as
 * `assertionResults[].fullName`.
 *
 * Parent: @SCN-LDG-001 (the foundation seam; balanced path).
 */

import type { EvidenceStatus, RuntimeQualityCheck, EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";

/** The minimal shape of Vitest's JSON reporter output this reader depends on. */
export interface VitestJsonReport {
  testResults?: Array<{
    /** The test-file path — the locator for the evidenceObservations reconciliation. */
    name?: string;
    assertionResults?: Array<{
      fullName?: string;
      title?: string;
      status?: string;
    }>;
  }>;
}

const SCN_IN_NAME = /\bSCN-[A-Z0-9]+-\d+\b/;

/** Map a Vitest assertion status to the reconciler's pass/fail. */
function toStatus(status: string | undefined): EvidenceStatus {
  return status === "passed" ? "passed" : "failed";
}

/**
 * Parse a Vitest JSON report into observed results at the DECLARED level. One result per
 * assertion: those carrying an @SCN id cite that scenario; those with NO id emit a null-scnId
 * credit (@SCN-LDG-007 — previously DROPPED). A null-scnId credit cites no scenario,
 * so the reconciler folds it into the SUSPENSE row. Every result carries its test-file locator.
 */
export function parseVitestEvidenceObservations(
  report: VitestJsonReport,
  qualityCheck: RuntimeQualityCheck,
  root?: string
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const file of report.testResults ?? []) {
    // The test-file locator (the where-to-fix) — carried on every credit (ruling
    // Q5), made portable relative to the run root (verbatim when no root given).
    const locator = relativizeToRoot(file.name ?? "(unknown vitest file)", root);
    for (const assertion of file.assertionResults ?? []) {
      const name = `${assertion.fullName ?? ""} ${assertion.title ?? ""}`;
      const m = SCN_IN_NAME.exec(name);
      results.push({
        qualityCheck,
        scnId: m ? m[0] : null, // no @SCN → an uncited credit (SUSPENSE).
        status: toStatus(assertion.status),
        locator,
      });
    }
  }
  return results;
}
