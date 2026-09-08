/**
 * Unit test for the exception-list reconciliation — THE RATCHET (@SCN-CPX-003, 3F-2318).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN-CPX-003 id
 * matching features/complexity-threshold.feature, so a grep of the id returns both halves.
 *
 * ONE ARM, ONE CORPUS, ONE ASSERTION (3F-3230, under 3F-3218). The module is a pipeline from
 * eslint's raw findings to a list of disagreements, so the arm plants BOTH ends of it: one eslint
 * run and one exception list that have parted company in every direction at once. Fifteen arms
 * each asserting "this kind is detected" left ORDER and COMPLETENESS unasserted — a module
 * reporting the three disagreements plus a fourth, or in a different order, satisfied all fifteen.
 * One expect over the whole returned verdict closes both, and pins the three sentences with it.
 *
 * WHAT THE ONE CORPUS CARRIES, AND WHY EACH PIECE IS IN IT. Every discrimination the fifteen arms
 * held separately is planted here and pinned by the single verdict below:
 *
 *   · all three rules' REAL message shapes, transcribed verbatim from eslint;
 *   · `complexity`, whose message carries NO parenthesised number — the one `/\((\d+)\)/` that
 *     reads the two line rules finds nothing in it, and the module throws rather than reconciling
 *     a third of the list against air;
 *   · one file/rule pair with THREE findings whose first (61), last (72) and worst (98) are three
 *     different numbers, so only the worst reconciles its entry as written;
 *   · absolute eslint paths against a root, relativised to the form the list records;
 *   · an entry whose rule the tree measured at a DIFFERENT rule for the same path — a join on the
 *     path alone would reconcile a line count against a complexity value;
 *   · the agreeing entry and the over-standard file with NO entry, both pinned by their ABSENCE
 *     from the verdict: the second is deliberately not this check's finding (@SCN-CPX-001 reds it
 *     by name, and one fault with two authors blurs which check owns which sentence).
 *
 * THE MODULE IS IMPORTED THROUGH A NAMESPACE, DELIBERATELY — the same reason
 * `complexityThreshold.test.ts` gives, and the reason `ReconciliationModule` exists in the
 * `.d.mts`: a named import of a missing export is an ESM link error that takes this whole file
 * down before a single assertion runs, and with one arm left that costs @SCN-CPX-003 its only
 * observation and reds the ledger as `missing` rather than as a sentence. Through the namespace a
 * missing export is a failing assertion naming the export, cited to the right scenario.
 *
 * THE REAL TREE IS NOT THIS ARM'S SUBJECT, AND THAT IS MEASURED, NOT ASSUMED (Ruling B, 3F-3218).
 * @SCN-FIT-003 runs `pnpm lint:complexity-exceptions` over this repository on every fitness pass.
 * It was proved to REACH this module rather than merely to be named for it: with
 * `reconcileExceptions` returning a fabricated disagreement the row fails by name and the planted
 * sentence surfaces through it; with `measuredValueFrom` neutered to a constant the row reds on
 * all twenty real entries. The list itself is the anti-vacuity floor — emptying the scan makes
 * every recorded entry a stale entry, so this check cannot go quietly green over nothing.
 *
 * Parent: @SCN-CPX-003 (3F-2318) — the exception-list reconciliation (3F-2286).
 */

import { describe, it, expect } from "vitest";
import * as reconciliation from "./complexityExceptionsReconciliation.mjs";
import type {
  ComplexityException,
  LintFileResult,
  ReconciliationModule,
} from "./complexityExceptionsReconciliation.mjs";

/**
 * One runtime export, asserted PRESENT with a sentence. The cast is to `Partial<…>` so a module
 * that exports only its types still type-checks here — the absence must surface as a red assertion
 * naming which export is missing, not as a compile error.
 */
function exported<K extends keyof ReconciliationModule>(name: K): ReconciliationModule[K] {
  const candidate = (reconciliation as Partial<ReconciliationModule>)[name];
  expect(candidate, `@SCN-CPX-003 needs \`${name}\` exported from the reconciliation module`).toBeTypeOf(
    "function",
  );
  return candidate as ReconciliationModule[K];
}

/** The planted tree's root. eslint reports absolute paths; the list records them relative to this. */
const PLANTED_ROOT = "/planted/tree";

const LEDGER = "packages/core/src/domain/ledger.ts";
const MARKDOWN = "packages/core/src/render/markdown.ts";
const INGEST = "packages/spec-controller/src/ingest/ingestScenarios.ts";

/** One eslint run at the bare standard over the planted tree, in eslint's own message shapes. */
const PLANTED_ESLINT_RUN: readonly LintFileResult[] = [
  {
    filePath: `${PLANTED_ROOT}/${LEDGER}`,
    messages: [
      // First 61, last 72, worst 98 — three different numbers, so a collapse keeping the first or
      // the last reconciles the entry below to silence or to the wrong number.
      { ruleId: "max-lines-per-function", message: "Function 'a' has too many lines (61). Maximum allowed is 40." },
      { ruleId: "max-lines-per-function", message: "Function 'b' has too many lines (98). Maximum allowed is 40." },
      { ruleId: "max-lines-per-function", message: "Function 'c' has too many lines (72). Maximum allowed is 40." },
      { ruleId: "max-lines", message: "File has too many lines (575). Maximum allowed is 400." },
    ],
  },
  {
    // `complexity` states its number in prose. There is no parenthesis in this message at all.
    filePath: `${PLANTED_ROOT}/${MARKDOWN}`,
    messages: [
      { ruleId: "complexity", message: "Function 'render' has a complexity of 21. Maximum allowed is 10." },
    ],
  },
  {
    // Over the standard with no entry at all: an ordinary standard violation, not this check's.
    filePath: `${PLANTED_ROOT}/${INGEST}`,
    messages: [{ ruleId: "max-lines", message: "File has too many lines (999). Maximum allowed is 400." }],
  },
];

/** The claims the planted list makes about that tree — one of them true, three of them stale. */
const PLANTED_LIST: readonly ComplexityException[] = [
  { path: LEDGER, rule: "max-lines", value: 575, since: "2026-01-01" },
  { path: LEDGER, rule: "max-lines-per-function", value: 61, since: "2026-02-02" },
  { path: MARKDOWN, rule: "complexity", value: 30, since: "2026-03-03" },
  // The tree measured `markdown.ts` for `complexity`, never for `max-lines`. Joined on the path
  // alone this entry would read the complexity value 21 as a line count.
  { path: MARKDOWN, rule: "max-lines", value: 456, since: "2026-04-04" },
];

describe("[SCN-CPX-003] an exception list that has stopped stating the measured truth reds the build", () => {
  it("[SCN-CPX-003] names every disagreement in both directions, in the list's order, each under its own kind and sentence, and stays silent on the entry that agrees and the offender with no entry", () => {
    const verdict = exported("reconcileExceptions")(
      PLANTED_LIST,
      exported("worstMeasuredValues")(PLANTED_ESLINT_RUN, PLANTED_ROOT),
    );

    expect(verdict).toEqual([
      {
        path: LEDGER,
        rule: "max-lines-per-function",
        recorded: 61,
        measured: 98,
        kind: "regression",
        message:
          "packages/core/src/domain/ledger.ts: `max-lines-per-function` measures 98, ABOVE the 61 " +
          "recorded on 2026-02-02 — REGRESSION: this file has grown past its recorded value. " +
          "Refactor it back to 61 or below. Never edit the entry up; an exception buys no headroom.",
      },
      {
        // THE RATCHET. Without this direction the list only ever prevents backsliding: an
        // improvement evaporates and the recorded number silently becomes headroom again.
        path: MARKDOWN,
        rule: "complexity",
        recorded: 30,
        measured: 21,
        kind: "improvement-not-banked",
        message:
          "packages/core/src/render/markdown.ts: `complexity` measures 21, BELOW the 30 recorded " +
          "on 2026-03-03 — IMPROVEMENT NOT BANKED: edit the entry down to 21 and re-date it. The " +
          "list only ratchets if it carries the improvement; left alone, 30 is headroom again.",
      },
      {
        // No measured value at all: eslint emits nothing under the standard, so absence IS the
        // signal — and here it is absence for THIS rule, at a path the run did measure.
        path: MARKDOWN,
        rule: "max-lines",
        recorded: 456,
        measured: null,
        kind: "stale-entry",
        message:
          "packages/core/src/render/markdown.ts: `max-lines` measures UNDER the standard — eslint " +
          "reports nothing against it — while the list still records 456 from 2026-04-04 — STALE " +
          "ENTRY: delete the entry, and the list shrinks.",
      },
    ]);
  });
});
