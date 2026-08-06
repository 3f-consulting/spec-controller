/**
 * Unit test for the exception-list reconciliation — THE RATCHET (@SCN-CPX-003, 3F-2318).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN-CPX-003 id
 * matching features/complexity-threshold.feature, so a grep of the id returns both halves.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. The MEASURING is eslint's behaviour and is proven over the
 * real tree by the @integration arm and by plant on the PR — a third party's rule engine is not
 * something a unit test should re-run. What is OURS, and what this file pins, is the two pieces
 * between eslint and the red: the per-rule PARSE (which silently returns nothing if written once for
 * all three rules) and the JOIN (which decides whether a difference is a regression, an unbanked
 * improvement, or a stale entry). Both are pure, and both are where this check could pass vacuously.
 *
 * THE MODULE IS IMPORTED THROUGH A NAMESPACE, DELIBERATELY — the same reason
 * `complexityThreshold.test.ts` gives: a named import of a missing export is an ESM link error that
 * takes this whole file, and with it @SCN-CPX-003's evidence, down before a single assertion runs.
 * Through the namespace, a missing export is a failing assertion with a sentence.
 *
 * Parent: @SCN-CPX-003 (3F-2318) — the exception-list reconciliation (3F-2286).
 */

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { runningStaticChecks } from "@3f-consulting/spec-controller-core";
import * as reconciliation from "./complexityExceptionsReconciliation.mjs";
import type {
  ComplexityException,
  LintFileResult,
  MeasuredValue,
  ReconciliationModule,
} from "./complexityExceptionsReconciliation.mjs";

/** The repo root, from this file's location — the tests run with cwd at the workspace root. */
const ROOT = process.cwd();

/** The static check this scenario NAMES, and the prefix that makes the ledger observe it. */
const CHECK_NAME = "lint:complexity-exceptions";
const OBSERVED_PREFIX = "lint:";

/**
 * One runtime export, asserted PRESENT with a sentence. The cast is to `Partial<…>` so a module that
 * exports only its types still type-checks here — the absence must surface as a red assertion, not
 * as a compile error that hides which export is missing.
 */
function exported<K extends keyof ReconciliationModule>(name: K): ReconciliationModule[K] {
  const candidate = (reconciliation as Partial<ReconciliationModule>)[name];
  expect(candidate, `@SCN-CPX-003 needs \`${name}\` exported from the reconciliation module`).toBeTypeOf(
    "function",
  );
  return candidate as ReconciliationModule[K];
}

/** eslint's REAL message shapes, transcribed verbatim — the whole point of a per-rule parse. */
const REAL_MESSAGES = {
  "max-lines": "File has too many lines (575). Maximum allowed is 400.",
  "max-lines-per-function": "Function 'reconcile' has too many lines (230). Maximum allowed is 40.",
  complexity: "Function 'reconcile' has a complexity of 21. Maximum allowed is 10.",
} as const;

const entry = (
  path: string,
  rule: ComplexityException["rule"],
  value: number,
): ComplexityException => ({ path, rule, value, since: "2026-08-02" });

const measured = (path: string, rule: MeasuredValue["rule"], value: number): MeasuredValue => ({
  path,
  rule,
  value,
});

describe("[SCN-CPX-003] measuredValueFrom — the per-rule parse", () => {
  it("[SCN-CPX-003] reads the value out of each rule's OWN message shape", () => {
    const parse = exported("measuredValueFrom");
    expect(parse("max-lines", REAL_MESSAGES["max-lines"])).toBe(575);
    expect(parse("max-lines-per-function", REAL_MESSAGES["max-lines-per-function"])).toBe(230);
    expect(parse("complexity", REAL_MESSAGES.complexity)).toBe(21);
  });

  it("[SCN-CPX-003] reads complexity, whose message carries NO parenthesised number", () => {
    // The trap, pinned from both sides. The single parenthesis regex that reads the two line rules
    // finds nothing here — so this asserts BOTH that the naive parse would have yielded nothing, and
    // that the real parse still returns 21. Without the first half the second could pass under a
    // regex that had quietly stopped working for a third of the list.
    expect(/\((\d+)\)/.exec(REAL_MESSAGES.complexity)).toBeNull();
    expect(exported("measuredValueFrom")("complexity", REAL_MESSAGES.complexity)).toBe(21);
  });

  it("[SCN-CPX-003] throws rather than returning nothing when extraction fails", () => {
    // A check that cannot measure must red, never shrug: a silent null is what lets a third of the
    // list reconcile against nothing and pass.
    const parse = exported("measuredValueFrom");
    expect(() => parse("complexity", "Function 'x' is complicated.")).toThrow(/complexity/);
  });
});

describe("[SCN-CPX-003] worstMeasuredValues — one value per file per rule", () => {
  const results: readonly LintFileResult[] = [
    {
      filePath: `${ROOT}/packages/core/src/domain/ledger.ts`,
      messages: [
        { ruleId: "max-lines-per-function", message: "Function 'a' has too many lines (61). Maximum allowed is 40." },
        { ruleId: "max-lines-per-function", message: "Function 'b' has too many lines (98). Maximum allowed is 40." },
        { ruleId: "max-lines", message: "File has too many lines (575). Maximum allowed is 400." },
      ],
    },
  ];

  it("[SCN-CPX-003] keeps the WORST offender, not the first or the last", () => {
    // eslint holds these rules per FILE, so the recorded value is the file's worst — comparing
    // against anything else would be comparing unlike with unlike.
    const collapsed = exported("worstMeasuredValues")(results, ROOT);
    expect(collapsed).toContainEqual(
      measured("packages/core/src/domain/ledger.ts", "max-lines-per-function", 98),
    );
  });

  it("[SCN-CPX-003] keeps the rules apart and relativises the path", () => {
    const collapsed = exported("worstMeasuredValues")(results, ROOT);
    expect(collapsed).toHaveLength(2);
    expect(collapsed).toContainEqual(measured("packages/core/src/domain/ledger.ts", "max-lines", 575));
  });

  it("[SCN-CPX-003] throws on a finding it cannot attribute to one of the three rules", () => {
    // An unrecognised finding means the config or the parse has moved; guessing would hide it.
    expect(() =>
      exported("worstMeasuredValues")(
        [{ filePath: `${ROOT}/a.ts`, messages: [{ ruleId: "no-undef", message: "x" }] }],
        ROOT,
      ),
    ).toThrow(/no-undef/);
  });

  it("[SCN-CPX-003] throws on a fatal message, which carries no rule at all", () => {
    expect(() =>
      exported("worstMeasuredValues")(
        [{ filePath: `${ROOT}/a.ts`, messages: [{ ruleId: null, message: "Parsing error" }] }],
        ROOT,
      ),
    ).toThrow();
  });
});

describe("[SCN-CPX-003] reconcileExceptions — the list must state the measured truth", () => {
  const path = "packages/core/src/domain/ledger.ts";

  it("[SCN-CPX-003] stays silent when the recorded value IS the measured value", () => {
    const found = exported("reconcileExceptions")(
      [entry(path, "max-lines", 575)],
      [measured(path, "max-lines", 575)],
    );
    expect(found).toEqual([]);
  });

  it("[SCN-CPX-003] reds a file measuring ABOVE its recorded value as a regression", () => {
    const [found, ...rest] = exported("reconcileExceptions")(
      [entry(path, "max-lines", 575)],
      [measured(path, "max-lines", 576)],
    );
    expect(rest).toEqual([]);
    expect(found?.kind).toBe("regression");
    expect(found?.recorded).toBe(575);
    expect(found?.measured).toBe(576);
  });

  it("[SCN-CPX-003] reds a file measuring BELOW its recorded value as an improvement not banked", () => {
    // THE RATCHET. Without this half the list only ever prevents backsliding: an improvement
    // evaporates and the recorded number silently becomes headroom again.
    const [found, ...rest] = exported("reconcileExceptions")(
      [entry(path, "max-lines", 575)],
      [measured(path, "max-lines", 500)],
    );
    expect(rest).toEqual([]);
    expect(found?.kind).toBe("improvement-not-banked");
    expect(found?.recorded).toBe(575);
    expect(found?.measured).toBe(500);
  });

  it("[SCN-CPX-003] reds a file no longer over the standard as a stale entry", () => {
    // No measured value at all: eslint emits nothing under the standard, so absence IS the signal.
    const [found, ...rest] = exported("reconcileExceptions")([entry(path, "max-lines", 575)], []);
    expect(rest).toEqual([]);
    expect(found?.kind).toBe("stale-entry");
    expect(found?.recorded).toBe(575);
    expect(found?.measured).toBeNull();
  });

  it("[SCN-CPX-003] names the file, the rule, the recorded value and the measured value in every red", () => {
    // A red whose stated cause is not its actual cause is the failure 3F-2286 exists to remove, so
    // every sentence is asserted to carry all four facts and to distinguish its own kind.
    const found = exported("reconcileExceptions")(
      [entry(path, "max-lines", 575), entry(path, "complexity", 12), entry(path, "max-lines-per-function", 98)],
      [measured(path, "max-lines", 576), measured(path, "complexity", 11)],
    );
    expect(found).toHaveLength(3);
    for (const disagreement of found) {
      expect(disagreement.message).toContain(path);
      expect(disagreement.message).toContain(disagreement.rule);
      expect(disagreement.message).toContain(String(disagreement.recorded));
      if (disagreement.measured !== null) {
        expect(disagreement.message).toContain(String(disagreement.measured));
      }
    }
    expect(found.map((d) => d.kind)).toEqual([
      "regression",
      "improvement-not-banked",
      "stale-entry",
    ]);
    // Three faults, three DIFFERENT sentences — an operator must be able to tell which fix applies.
    expect(new Set(found.map((d) => d.message)).size).toBe(3);
  });

  it("[SCN-CPX-003] leaves an over-standard file with NO entry to lint:complexity", () => {
    // Deliberately not this check's finding: an unexcepted file over the standard is an ordinary
    // standard violation, and @SCN-CPX-001 reds it by name. Two authors for one fault would blur
    // which check owns which sentence.
    expect(exported("reconcileExceptions")([], [measured(path, "max-lines", 999)])).toEqual([]);
  });

  it("[SCN-CPX-003] joins on file AND rule, never on file alone", () => {
    // Each entry is one file's worst offender for ONE rule; matching on the path alone would
    // reconcile a complexity value against a line count.
    const found = exported("reconcileExceptions")(
      [entry(path, "complexity", 12)],
      [measured(path, "max-lines", 12)],
    );
    expect(found.map((d) => d.kind)).toEqual(["stale-entry"]);
  });
});

describe("[SCN-CPX-003] the check is observed by the ledger, not kept off the books", () => {
  it("[SCN-CPX-003] carries the lint: prefix that makes runningStaticChecks see it", () => {
    // Not cosmetic. A CI script whose name lacks an observed prefix runs while being structurally
    // invisible to spec-controller's own ledger — a real quality check kept off the books, which is
    // exactly where a watermelon hides. Asserted through the ledger's OWN observer, over the REAL
    // package.json and ci.yml, so the claim is the ledger's rather than this test's.
    expect(CHECK_NAME.startsWith(OBSERVED_PREFIX)).toBe(true);
    const packageJson = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const ci = readFileSync(`${ROOT}/.github/workflows/ci.yml`, "utf8");
    const observed = runningStaticChecks([ci], packageJson, [OBSERVED_PREFIX]).map((o) => o.staticCheck);
    expect(observed).toContain(CHECK_NAME);
  });
});
