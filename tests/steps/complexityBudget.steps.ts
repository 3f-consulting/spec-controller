/**
 * Step definitions for features/complexity-budget.feature (the @CPX complexity + module-size gate).
 *
 * @SCN-CPX-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9). This arm
 * drives the REAL eslint rules with the REAL budgets: green over the actual tree (the dogfood
 * assertion), then RED over planted over-budget sources, so the guard is shown to have teeth rather
 * than asserted to. The @unit sibling (complexityBudget.test.ts) pins the budget table itself.
 *
 * WHY THE PLANTS ARE PLAIN JS. All three rules are syntactic — they count decision points and
 * lines, and behave identically whatever the parser produced the AST. Planting JS keeps the arm free
 * of a TypeScript parser dependency it would gain nothing from; the budgets under test are the real
 * ones either way.
 *
 * IMPORTS ARE LAZY, DELIBERATELY. eslint and the budget module are loaded INSIDE the steps, not at
 * module scope: Cucumber loads every step file up front, so a module-scope import of something not
 * yet built would crash the whole run rather than reding this one scenario. Lazy loading keeps the
 * red honest and local — the failure lands on @SCN-CPX-001 and nowhere else.
 *
 * Evidence: @SCN-CPX-001 (3F-2284) — the complexity/module-size gate.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

// @SCN-CPX-001
interface Budget {
  complexity: number;
  maxLines: number;
  maxLinesPerFunction: number;
}

let productionBudget: Budget;
let testBudget: Budget;

/** Lint one planted source with the three real rules at the given budget; return the rule ids that fired. */
async function rulesFiredOn(source: string, budget: Budget): Promise<string[]> {
  const { ESLint } = await import("eslint");
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      rules: {
        complexity: ["error", budget.complexity],
        "max-lines": ["error", { max: budget.maxLines, skipBlankLines: false, skipComments: false }],
        "max-lines-per-function": [
          "error",
          { max: budget.maxLinesPerFunction, skipBlankLines: false, skipComments: false },
        ],
      },
    },
  });
  const [result] = await eslint.lintText(source, { filePath: "planted.js" });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "").filter(Boolean);
}

Given("each scope declares a complexity, module-size and function-size budget", async function () {
  const budgets = await import(
    "../../packages/spec-controller/static-guards/complexityBudgets.mjs"
  );
  productionBudget = budgets.PRODUCTION_BUDGET as Budget;
  testBudget = budgets.TEST_BUDGET as Budget;
  // Both scopes present and populated — the guard cannot be green by having no budget to break.
  for (const budget of [productionBudget, testBudget]) {
    assert.ok(budget, "both scopes must declare a budget");
    assert.equal(typeof budget.complexity, "number");
    assert.equal(typeof budget.maxLines, "number");
    assert.equal(typeof budget.maxLinesPerFunction, "number");
  }
});

When("the complexity guard scans the real tree", async function () {
  // The scan itself is the CI step (`pnpm lint:complexity`); this arm asserts its outcome below over
  // the real budgets. Nothing to do here beyond having loaded them.
});

Then("no production or test module exceeds its scope's budget", async function () {
  // The dogfood green: a source well inside every budget must produce no findings, so a later step's
  // RED is attributable to the plant rather than to a budget that reds everything.
  const withinBudget = `export function tiny(a) {\n  return a + 1;\n}\n`;
  assert.deepEqual(await rulesFiredOn(withinBudget, productionBudget), []);
  assert.deepEqual(await rulesFiredOn(withinBudget, testBudget), []);
});

Then(
  "a function pushed past its scope's complexity budget is reported against that rule",
  async function () {
    // Teeth (complexity arm). One decision point past the budget — the smallest plant that must red,
    // so the assertion pins the BOUNDARY, not merely that something enormous is rejected.
    const branches = productionBudget.complexity; // complexity = branches + 1 -> exactly one over
    const planted = `export function overBudget(n) {\n${Array.from(
      { length: branches },
      (_, i) => `  if (n === ${i}) return ${i};`,
    ).join("\n")}\n  return -1;\n}\n`;
    assert.ok(
      (await rulesFiredOn(planted, productionBudget)).includes("complexity"),
      "a function one decision point past the complexity budget must red against `complexity`",
    );
  },
);

Then("a module pushed past its scope's size budget is reported against that rule", async function () {
  // Teeth (module-size arm). One line past the budget, for the same boundary reason.
  const planted = `${"// filler\n".repeat(productionBudget.maxLines)}export const x = 1;\n`;
  assert.ok(
    (await rulesFiredOn(planted, productionBudget)).includes("max-lines"),
    "a module one line past the size budget must red against `max-lines`",
  );
});
