/**
 * Step definitions for features/complexity-threshold.feature (the @CPX complexity + module-size
 * fitness function).
 *
 * @SCN-CPX-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * THIS ARM DRIVES THE REAL `eslint.config.mjs`, not a hand-rebuilt copy of its rules. Until 3F-2316 it
 * re-declared `complexity` / `max-lines` / `max-lines-per-function` from the threshold module and lint
 * against THAT — which proved the numbers had teeth while proving nothing about the config CI actually
 * runs. With an exception list in play that gap stops being academic: the exceptions live in the
 * config's block ordering, so a copy of the rules cannot see them at all. Loading the real config file
 * is what makes "outside the exception list" a claim this arm can test.
 *
 * WHY EACH PLANT IS PAIRED. Every Then plants the same over-standard source twice — once at a path
 * with no exception for that rule (must red) and once at a path the list exempts (must not). The red
 * alone would pass just as well if the exception machinery did nothing; the pair is what pins the word
 * "outside".
 *
 * WHY THE PLANTS ARE PLAIN JS. All three rules are syntactic — they count decision points and lines,
 * and behave identically whatever the parser produced the AST. The planted sources are given `.ts`
 * paths so the real config's globs match them; the syntax inside is plain JS on purpose.
 *
 * IMPORTS ARE LAZY, DELIBERATELY. eslint and the two config modules are loaded INSIDE the steps, not
 * at module scope: Cucumber loads every step file up front, so a module-scope import of something not
 * yet built would crash the whole run rather than reding this one scenario. Lazy loading keeps the red
 * honest and local — the failure lands on @SCN-CPX-001 and nowhere else.
 *
 * Evidence: @SCN-CPX-001 (3F-2316) — the complexity/module-size fitness function (3F-2286).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

// @SCN-CPX-001
type ExceptionRule = "complexity" | "max-lines" | "max-lines-per-function";
interface Exception {
  path: string;
  rule: ExceptionRule;
  value: number;
  since: string;
}

/** The external standard, as the feature states it — 10 / 40 / 400. */
const STANDARD = { complexity: 10, maxLinesPerFunction: 40, maxLines: 400 } as const;

/** A production path the exception list does not cover; the plants that MUST red go here. */
const UNEXEMPT_PATH = "packages/core/src/planted/overStandard.ts";

let exceptions: readonly Exception[];
/** Lints one planted source against the REAL eslint.config.mjs, as the file at `path`. */
let lintAs: (source: string, path: string) => Promise<string[]>;

/** A function of cyclomatic complexity `branches + 1`. */
const functionOfComplexity = (branches: number): string =>
  `export function planted(x) {\n${Array.from(
    { length: branches },
    (_, i) => `  if (x === ${i}) return ${i};`,
  ).join("\n")}\n  return -1;\n}\n`;

/** A single function spanning exactly `lines` lines. */
const functionOfLines = (lines: number): string =>
  `export function planted() {\n${"  void 0;\n".repeat(lines - 2)}}\n`;

/** A module spanning exactly `lines` lines and declaring no function at all. */
const moduleOfLines = (lines: number): string =>
  `${"// filler\n".repeat(lines - 1)}export const x = 1;\n`;

/** The first file the list exempts from `rule` — read from the list, never named here. */
const exemptPathFor = (rule: ExceptionRule): string => {
  const entry = exceptions.find((candidate) => candidate.rule === rule);
  assert.ok(entry, `the exception list must exempt at least one file from \`${rule}\``);
  return entry.path;
};

/** The paired assertion: over-standard reds where no exception covers it, and not where one does. */
async function redsOutsideButNotInside(source: string, rule: ExceptionRule): Promise<void> {
  assert.ok(
    (await lintAs(source, UNEXEMPT_PATH)).includes(rule),
    `a source one step past the ${rule} standard must red against \`${rule}\` outside the exception list`,
  );
  assert.ok(
    !(await lintAs(source, exemptPathFor(rule))).includes(rule),
    `the same source must NOT red against \`${rule}\` in a file the exception list covers`,
  );
}

Given("the thresholds are the external standard, not a measurement of this tree", async function () {
  const thresholds = await import(
    "../../packages/spec-controller/static-checks/complexityThresholds.mjs"
  );
  const exceptionModule = await import(
    "../../packages/spec-controller/static-checks/complexityExceptions.mjs"
  );
  exceptions = exceptionModule.COMPLEXITY_EXCEPTIONS as readonly Exception[];

  // The numbers the feature names, read from the module the config consumes. Both scopes carry the
  // SAME complexity and max-lines — two measurements of populations this different could not agree,
  // so their agreeing is the evidence neither is a measurement.
  const production = thresholds.PRODUCTION_THRESHOLD;
  const test = thresholds.TEST_THRESHOLD;
  assert.equal(production.complexity, STANDARD.complexity);
  assert.equal(production.maxLinesPerFunction, STANDARD.maxLinesPerFunction);
  assert.equal(production.maxLines, STANDARD.maxLines);
  assert.equal(test.complexity, STANDARD.complexity);
  assert.equal(test.maxLines, STANDARD.maxLines);
  assert.equal(test.maxLinesPerFunction, "off");

  // The debt list must actually carry debt, or every "not inside the list" assertion below is vacuous.
  assert.ok(exceptions.length > 0, "the exception list must record the tree's exceedances");
  assert.ok(
    !exceptions.some((entry) => entry.path === UNEXEMPT_PATH),
    "the path the plants red at must be outside the exception list",
  );
});

When("the complexity fitness function scans the real tree", async function () {
  const { ESLint } = await import("eslint");
  // The REAL config file — thresholds, scope split and exception blocks exactly as CI resolves them.
  const eslint = new ESLint({ cwd: process.cwd(), overrideConfigFile: "eslint.config.mjs" });
  lintAs = async (source, path) => {
    const [result] = await eslint.lintText(source, { filePath: path });
    return (result?.messages ?? []).map((message) => message.ruleId ?? "").filter(Boolean);
  };

  // The dogfood green: a source well inside every threshold produces no findings, so each red below is
  // attributable to the plant rather than to a config that reds everything it is handed.
  assert.deepEqual(await lintAs("export function tiny(a) {\n  return a + 1;\n}\n", UNEXEMPT_PATH), []);
});

Then("a function over complexity 10 outside the exception list reds", async function () {
  // One decision point past the standard — the smallest plant that must red, so this pins the
  // BOUNDARY rather than merely that something enormous is rejected.
  await redsOutsideButNotInside(functionOfComplexity(STANDARD.complexity), "complexity");
});

Then("a function over 40 lines outside the exception list reds", async function () {
  await redsOutsideButNotInside(
    functionOfLines(STANDARD.maxLinesPerFunction + 1),
    "max-lines-per-function",
  );
});

Then("a module over 400 lines outside the exception list reds", async function () {
  await redsOutsideButNotInside(moduleOfLines(STANDARD.maxLines + 1), "max-lines");
});
