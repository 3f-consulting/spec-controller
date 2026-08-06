/**
 * The `ingest/vitest` reader — one of the two named observed-evidence readers
 * (the embryonic adapters, deliberately not a registry in v1). Reads Vitest's
 * JSON reporter output and normalises each assertion that cites an @SCN id into
 * an EvidenceObservation at the `unit` level.
 *
 * The level is supplied by the CALLER, not inferred: the caller states the level this Vitest
 * source yields, and the reader stamps it — no Vitest⇒unit assumption baked into the parser. The
 * JS-ecosystem default (unit) is set at the CLI edge.
 *
 * The @SCN id is the bracketed `[SCN-<FFF>-<NNN>]` token carried in the test's
 * `describe`/`it` name (the bidirectional-link rule). The bracket is what makes it a
 * citation and not a mention: this module's regex used to match any SCN-shaped token
 * anywhere in the name, so fixture data and prose cross-references cited scenarios nobody
 * meant to cite (@SCN-LDG-033, 3F-2368). The form now lives in `lib/scnCitation.ts`,
 * shared with the scn-subissue gate's cite scan so one answer serves both readers.
 *
 * Vitest surfaces the assertion's OWN name as `assertionResults[].title` and its
 * ANCESTOR PATH (describe → it) as `fullName`;
 * the citation belongs to the assertion, so the reader reads the leaf's title FIRST and
 * falls back to the ancestor path only when the leaf does not self-cite — most-specific-
 * citation-wins (@SCN-LDG-016).
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
import { parseScnCitation } from "../lib/scnCitation.js";

/** The minimal shape of Vitest's JSON reporter output this reader depends on. */
export interface VitestJsonReport {
  testResults?: Array<{
    /** The test-file path — the locator for the evidenceObservations reconciliation. */
    name?: string;
    /**
     * The FILE-level status (@SCN-LDG-017) — previously read and discarded. A file that failed to
     * COLLECT reports `"failed"` here WITH a `message` and ZERO `assertionResults`: it errored
     * before naming a test. That pair (failed + zero assertions) is the collection-failure
     * signature the reader now emits as a `broken` observation. (A file whose tests merely FAILED
     * also reports `"failed"` here — but it carries assertions, so it is not broken.)
     */
    status?: string;
    /** The FILE-level error message a collection failure reports (@SCN-LDG-017). */
    message?: string;
    assertionResults?: Array<{
      fullName?: string;
      title?: string;
      status?: string;
    }>;
  }>;
}

/**
 * Parse a Vitest JSON report into observed results at the CALLER-SUPPLIED level. One result per
 * EMITTED assertion: those carrying an @SCN id cite that scenario; those with NO id emit a
 * null-scnId credit (@SCN-LDG-007 — previously DROPPED). A null-scnId credit cites no scenario,
 * so the reconciler folds it into the SUSPENSE row. Every result carries its test-file locator.
 *
 * THREE-WAY classification (@SCN-PND-015), uniform with the cucumber reader (@SCN-PND-013) —
 * pending is NEVER inferred from status:
 *   - `passed` → a `passed` observation → satisfied.
 *   - `failed` → a `failed` observation → failing.
 *   - otherwise (`skipped`/`todo`, and any status ∉ {passed, failed}) → INCONCLUSIVE: an assertion
 *     that RAN but proved nothing. Emit NOTHING — the evidence obligation then finds no matching
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
    // BROKEN, NOT ABSENT (@SCN-LDG-017) — the COLLECTION FAILURE. A file that failed to collect
    // reports `status: "failed"` WITH a message and ZERO assertionResults: it errored before it
    // named a test. Walking `assertionResults[]` alone saw nothing to emit, so the scenario whose
    // proof lived here reconciled `missing` — indistinguishable from an unwritten test, and the
    // wrong remedy (write a test vs fix the harness). Emit ONE observation carrying the collection
    // failure: `broken: true`, the file locator (WHERE to fix), and the runner's message (WHAT
    // broke). It cites NO scenario (`scnId: null`) — a suite that named no test cites no @SCN — so
    // the reconciler posts it to the SUSPENSE row.
    //
    // The signature is the PAIR (failed + zero assertions), never file status alone: an ordinary
    // red run also reports `status: "failed"` at file level, but its assertions ARE named and
    // attributable, and already land as `failing` on the scenarios they cite (the boundary). A
    // green file with zero assertions is likewise not broken — nothing errored.
    const assertions = file.assertionResults ?? [];
    if (file.status === "failed" && assertions.length === 0) {
      results.push({
        qualityCheck,
        scnId: null,
        // `status` is structurally required and the runner did report `failed`; the FAIL-SAFE in
        // the reconciler checks `broken` BEFORE `status`, so this never reconciles as `failing`.
        status: "failed",
        locator,
        broken: true,
        ...(file.message !== undefined ? { message: file.message } : {}),
      });
      continue;
    }
    for (const assertion of assertions) {
      const status = assertion.status;
      // THREE-WAY (@SCN-PND-015): drop any inconclusive assertion (status ∉ {passed, failed}) —
      // skipped/todo/pending/undefined proved nothing, so the obligation reconciles missing by
      // absence. Only genuine passed/failed emit (the guard narrows `status` to EvidenceStatus).
      if (status !== "passed" && status !== "failed") continue;
      // MOST-SPECIFIC-CITATION-WINS (@SCN-LDG-016): the citation belongs to the ASSERTION, and
      // the assertion's OWN name is `title`; `fullName` is the ancestor PATH (outermost describe
      // → innermost it). So read the leaf's own title FIRST and fall back to the ancestor path
      // only when the leaf does not self-cite. This preserves the "describe carries the bracket,
      // plain `it`s beneath" style (a bare leaf falls through to the describe's citation) while
      // letting a self-citing leaf OVERRIDE its ancestor. The retired first-match-on-
      // `fullName + " " + title` did the opposite: a grouping describe's citation SHADOWED a
      // self-citing child, so the leaf's scenario reconciled missing while the ancestor took a
      // spurious SECOND credit. Semantic, not positional — last-match on the concatenation would
      // misfire when a leaf's prose names a second scenario after its own.
      const scnId =
        parseScnCitation(assertion.title ?? "") ?? parseScnCitation(assertion.fullName ?? "");
      results.push({
        qualityCheck,
        scnId, // no BRACKETED @SCN → an uncited credit (SUSPENSE).
        status,
        locator,
      });
    }
  }
  return results;
}
