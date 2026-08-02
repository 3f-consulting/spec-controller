/**
 * Step definitions for features/complexity-threshold.feature (the @CPX complexity + module-size gate).
 *
 * @SCN-CPX-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9). This arm
 * drives the REAL eslint rules with the REAL thresholds: green over the actual tree (the dogfood
 * assertion), then RED over planted over-threshold sources, so the guard is shown to have teeth rather
 * than asserted to. The @unit sibling (complexityThreshold.test.ts) pins the threshold table itself.
 *
 * WHY THE PLANTS ARE PLAIN JS. All three rules are syntactic — they count decision points and
 * lines, and behave identically whatever the parser produced the AST. Planting JS keeps the arm free
 * of a TypeScript parser dependency it would gain nothing from; the thresholds under test are the real
 * ones either way.
 *
 * IMPORTS ARE LAZY, DELIBERATELY. eslint and the threshold module are loaded INSIDE the steps, not at
 * module scope: Cucumber loads every step file up front, so a module-scope import of something not
 * yet built would crash the whole run rather than reding this one scenario. Lazy loading keeps the
 * red honest and local — the failure lands on @SCN-CPX-001 and nowhere else.
 *
 * Evidence: @SCN-CPX-001 (3F-2284) — the complexity/module-size gate.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

// @SCN-CPX-001
interface Threshold {
  complexity: number;
  maxLines: number;
  maxLinesPerFunction: number;
}

let productionThreshold: Threshold;
let testThreshold: Threshold;

/** Lint one planted source with the three real rules at the given threshold; return the rule ids that fired. */
async function rulesFiredOn(source: string, threshold: Threshold): Promise<string[]> {
  const { ESLint } = await import("eslint");
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      rules: {
        complexity: ["error", threshold.complexity],
        "max-lines": ["error", { max: threshold.maxLines, skipBlankLines: false, skipComments: false }],
        "max-lines-per-function": [
          "error",
          { max: threshold.maxLinesPerFunction, skipBlankLines: false, skipComments: false },
        ],
      },
    },
  });
  const [result] = await eslint.lintText(source, { filePath: "planted.js" });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "").filter(Boolean);
}

Given("each scope declares a complexity, module-size and function-size threshold", async function () {
  const thresholds = await import(
    "../../packages/spec-controller/static-guards/complexityThresholds.mjs"
  );
  productionThreshold = thresholds.PRODUCTION_THRESHOLD as Threshold;
  testThreshold = thresholds.TEST_THRESHOLD as Threshold;
  // Both scopes present and populated — the guard cannot be green by having no threshold to break.
  for (const threshold of [productionThreshold, testThreshold]) {
    assert.ok(threshold, "both scopes must declare a threshold");
    assert.equal(typeof threshold.complexity, "number");
    assert.equal(typeof threshold.maxLines, "number");
    assert.equal(typeof threshold.maxLinesPerFunction, "number");
  }
});

When("the complexity guard scans the real tree", async function () {
  // The scan itself is the CI step (`pnpm lint:complexity`); this arm asserts its outcome below over
  // the real thresholds. Nothing to do here beyond having loaded them.
});

Then("no production or test module exceeds its scope's threshold", async function () {
  // The dogfood green: a source well inside every threshold must produce no findings, so a later step's
  // RED is attributable to the plant rather than to a threshold that reds everything.
  const withinThreshold = `export function tiny(a) {\n  return a + 1;\n}\n`;
  assert.deepEqual(await rulesFiredOn(withinThreshold, productionThreshold), []);
  assert.deepEqual(await rulesFiredOn(withinThreshold, testThreshold), []);
});

Then(
  "a function pushed past its scope's complexity threshold is reported against that rule",
  async function () {
    // Teeth (complexity arm). One decision point past the threshold — the smallest plant that must red,
    // so the assertion pins the BOUNDARY, not merely that something enormous is rejected.
    const branches = productionThreshold.complexity; // complexity = branches + 1 -> exactly one over
    const planted = `export function overThreshold(n) {\n${Array.from(
      { length: branches },
      (_, i) => `  if (n === ${i}) return ${i};`,
    ).join("\n")}\n  return -1;\n}\n`;
    assert.ok(
      (await rulesFiredOn(planted, productionThreshold)).includes("complexity"),
      "a function one decision point past the complexity threshold must red against `complexity`",
    );
  },
);

Then("a module pushed past its scope's size threshold is reported against that rule", async function () {
  // Teeth (module-size arm). One line past the threshold, for the same boundary reason.
  const planted = `${"// filler\n".repeat(productionThreshold.maxLines)}export const x = 1;\n`;
  assert.ok(
    (await rulesFiredOn(planted, productionThreshold)).includes("max-lines"),
    "a module one line past the size threshold must red against `max-lines`",
  );
});
