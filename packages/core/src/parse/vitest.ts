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
 * The reader classifies THREE-WAY (@SCN-PND-015), uniform with the cucumber reader
 * (@SCN-PND-013): a `passed` assertion → a `passed` observation (satisfied); a `failed`
 * assertion → a `failed` observation (failing); an INCONCLUSIVE vitest status (`skipped`/`todo`,
 * and any status ∉ {passed, failed}) → the assertion is DROPPED (no observation), so its
 * obligation reconciles missing by absence — pending is never inferred from status. A skipped/todo
 * unit test is a GAP, not a failure.
 *
 * Parent: @SCN-LDG-001 (the foundation seam; balanced path).
 */

import type { RuntimeQualityCheck, EvidenceObservation } from "../model.js";
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

/**
 * Parse a Vitest JSON report into observed results at the DECLARED level. One result per
 * EMITTED assertion: those carrying an @SCN id cite that scenario; those with NO id emit a
 * null-scnId credit (@SCN-LDG-007 — previously DROPPED). A null-scnId credit cites no scenario,
 * so the reconciler folds it into the SUSPENSE row. Every result carries its test-file locator.
 *
 * THREE-WAY classification (@SCN-PND-015), uniform with the cucumber reader (@SCN-PND-013) —
 * pending is NEVER inferred from status:
 *   - `passed` → a `passed` observation → satisfied.
 *   - `failed` → a `failed` observation → failing.
 *   - otherwise (`skipped`/`todo`, and any status ∉ {passed, failed}) → INCONCLUSIVE: an assertion
 *     that RAN but proved nothing. Emit NOTHING — the declared obligation then finds no matching
 *     observation and reconciles missing BY ABSENCE.
 * Treating any non-pass-non-fail status as inconclusive keeps the reader robust to vitest's status
 * spelling (`skipped`/`todo`/`pending`). `EvidenceStatus` stays binary (no new status, no reconciler
 * change): the DROP is what realises inconclusive→missing. The uncited (null-scnId) SUSPENSE credit
 * is preserved for genuine passed/failed results — only inconclusive assertions are dropped.
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
      const status = assertion.status;
      // THREE-WAY (@SCN-PND-015): drop any inconclusive assertion (status ∉ {passed, failed}) —
      // skipped/todo/pending/undefined proved nothing, so the obligation reconciles missing by
      // absence. Only genuine passed/failed emit (the guard narrows `status` to EvidenceStatus).
      if (status !== "passed" && status !== "failed") continue;
      const name = `${assertion.fullName ?? ""} ${assertion.title ?? ""}`;
      const m = SCN_IN_NAME.exec(name);
      results.push({
        qualityCheck,
        scnId: m ? m[0] : null, // no @SCN → an uncited credit (SUSPENSE).
        status,
        locator,
      });
    }
  }
  return results;
}
