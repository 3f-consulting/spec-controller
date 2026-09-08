/**
 * Unit test for the complexity + module-size thresholds (@SCN-CPX-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * @SCN-CPX-001 id matching features/complexity-threshold.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * ONE ARM, ONE PLANTED SET OF CEILINGS, ONE ASSERTION (3F-3231, under 3F-3218). This module is not a
 * scanner and has no list of findings to return: its ENTIRE output is the rule table it hands
 * eslint, so that table is the verdict, and the planted input is every ceiling the config can ask it
 * for — all three rules, both scopes, and an exception's recorded value. Twenty-four arms each
 * asserting "this number is right" or "this shape is right" left the table's COMPLETENESS
 * unasserted: a module emitting the right entries plus a fourth, or omitting one, satisfied all
 * twenty-four. One expect over the whole table closes that, and pins in one place every rule this
 * module states:
 *
 *   · the three external numbers — NIST/McCabe 10, Google 40, the chosen 400 — as literals, so a
 *     reinstated tree-derived seed (25 / 1024 / 261 / 7 / 2419 / 221) reds here whatever else moves;
 *   · the two scopes agreeing by construction, which is the provenance proof: the populations differ
 *     by 2.4x at the file level, so two MEASURED thresholds could not coincide;
 *   · the test scope's `max-lines-per-function` ABSTENTION surviving the emitter unchanged — no
 *     substitute number invented for it, which is the self-certification 3F-2286 removed;
 *   · the per-rule SHAPE asymmetry — `complexity` takes a bare number, the line rules an options
 *     object. Hand eslint the wrong one and it does not complain: it mis-reads the option and applies
 *     no ceiling at all, which looks exactly like a file under its ceiling. Nothing else notices this;
 *   · the counting mode riding on every emitted line rule (3F-2395) — the threshold holds the CODE a
 *     reader must hold in their head, not the file's bytes, and every value in the debt list is
 *     measured in this mode, so any other mode changes the whole list at once and in silence;
 *   · the frozen ceiling at EXACTLY the recorded value and never an `"off"` — the difference from the
 *     rule this one replaced, where an exception switched a rule off and the file could grow without
 *     limit.
 *
 * WHAT THIS ARM DOES NOT PIN, SAID PLAINLY. `STANDARD_SOURCES` (each number naming its source) and
 * the enumerated `RETIRED_TREE_DERIVED_SEEDS` no longer carry a @unit assertion of their own; the
 * literals above catch a reinstated seed by its value, not by its membership of that list, and no
 * arm now reads the citations. The debt list's own shape and the concept-module set likewise leave
 * this tier — @SCN-CPX-003's reconciliation reds a stale or wrong entry over the real tree, and the
 * @integration arms below plant against every entry and every root rather than against one sample.
 *
 * THE MODULE IS IMPORTED THROUGH A NAMESPACE, DELIBERATELY — the same reason
 * `complexityExceptionsReconciliation.test.ts` gives. A named import of a missing export is an ESM
 * link error that takes this whole file down before a single assertion runs, and with one arm left
 * that costs @SCN-CPX-001 its only observation and reds the ledger as `missing` rather than as a
 * sentence. Through the namespace a missing export is a failing assertion naming the export.
 *
 * THE REAL TREE IS NOT THIS ARM'S SUBJECT, AND THAT IS MEASURED, NOT ASSUMED (Ruling B, 3F-3218).
 * @SCN-FIT-001 runs `eslint` over this repository on every fitness pass, through the config that
 * imports this module. It was proved to REACH this module rather than merely to be named for it: with
 * `PRODUCTION_THRESHOLD.complexity` moved from 10 to 1 the row fails by name on 317 findings. The
 * OPPOSITE plant — the thresholds neutered so nothing breaches, which is the prescription that reads
 * as the obvious one — leaves the row GREEN and byte-identical to the control, because a check that
 * has stopped looking finds nothing and a clean tree also finds nothing. Only the direction that
 * makes the check report a violation that is not there discriminates.
 *
 * Parent: @SCN-CPX-001 (3F-2316) — the complexity/module-size fitness function (3F-2286).
 */

import { describe, it, expect } from "vitest";
import * as thresholdModule from "./complexityThresholds.mjs";
import {
  PRODUCTION_THRESHOLD,
  TEST_THRESHOLD,
  type ComplexityThreshold,
  type EslintRuleId,
} from "./complexityThresholds.mjs";

/**
 * The emitter, asserted PRESENT with a sentence rather than named-imported. The cast is deliberate:
 * a module that exports only its types must still type-check here, so the absence surfaces as a red
 * assertion naming the export and cited to @SCN-CPX-001, not as a compile error.
 */
const ruleAtCeiling = (): typeof thresholdModule.ruleAtCeiling => {
  const candidate = (thresholdModule as Partial<typeof thresholdModule>).ruleAtCeiling;
  expect(
    candidate,
    "@SCN-CPX-001 needs `ruleAtCeiling` exported from the threshold module",
  ).toBeTypeOf("function");
  return candidate as typeof thresholdModule.ruleAtCeiling;
};

/** eslint rule id → the threshold key holding its ceiling. The config asks in exactly these pairs. */
const RULE_TO_KEY = {
  complexity: "complexity",
  "max-lines": "maxLines",
  "max-lines-per-function": "maxLinesPerFunction",
} as const satisfies Record<EslintRuleId, keyof ComplexityThreshold>;

/**
 * A recorded value standing in for a debt-list entry, planted as a literal.
 *
 * Read from the real list this would assert over whatever the tree happens to carry today; the claim
 * here is about the emitter, and the list's own truth is @SCN-CPX-003's — reconciled against the
 * measured tree — and the @integration arm's, which plants at every entry's value and at one past it.
 */
const RECORDED_VALUE = 575;

/** Every rule the module holds, at one scope's ceilings, in the shape eslint receives. */
const emittedFor = (ceilings: ComplexityThreshold): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(RULE_TO_KEY).map(([rule, key]) => [
      rule,
      ruleAtCeiling()(rule as EslintRuleId, ceilings[key]),
    ]),
  );

/** The options object both line rules carry, at whatever ceiling they are held to. */
const linesAt = (max: number) => ["error", { max, skipBlankLines: true, skipComments: true }];

describe("[SCN-CPX-001] a function or module over the external standard reds the build", () => {
  it("[SCN-CPX-001] hands eslint every rule at the cited external number in that rule's own shape, holds both scopes to the same standard but for the test scope's abstention, and freezes an exempt file at exactly its recorded value", () => {
    const verdict = {
      production: emittedFor(PRODUCTION_THRESHOLD),
      test: emittedFor(TEST_THRESHOLD),
      exempt: emittedFor({
        complexity: RECORDED_VALUE,
        maxLines: RECORDED_VALUE,
        maxLinesPerFunction: RECORDED_VALUE,
      }),
    };

    expect(verdict).toEqual({
      production: {
        complexity: ["error", 10],
        "max-lines": linesAt(400),
        "max-lines-per-function": linesAt(40),
      },
      test: {
        complexity: ["error", 10],
        "max-lines": linesAt(400),
        "max-lines-per-function": "off",
      },
      exempt: {
        complexity: ["error", RECORDED_VALUE],
        "max-lines": linesAt(RECORDED_VALUE),
        "max-lines-per-function": linesAt(RECORDED_VALUE),
      },
    });
  });
});
