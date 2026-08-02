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

/** The three rules an exception can freeze. Each takes a DIFFERENT plant shape — see `sourceAt`. */
const RULES = ["complexity", "max-lines", "max-lines-per-function"] as const;

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

// @SCN-CPX-002
/**
 * A source that measures EXACTLY `value` against `rule` — the plant shape differs per rule because
 * the three rules measure different things, and a single shape would silently measure 1 against two
 * of them. `complexity` counts decision points (a function of complexity V has V-1 branches), the two
 * line rules count lines of a function and of a module respectively.
 */
const sourceAt = (rule: (typeof RULES)[number], value: number): string => {
  switch (rule) {
    case "complexity":
      return functionOfComplexity(value - 1);
    case "max-lines-per-function":
      return functionOfLines(value);
    case "max-lines":
      return moduleOfLines(value);
  }
};

Given("a file on the exception list at its recorded value", async function () {
  const exceptionModule = await import(
    "../../packages/spec-controller/static-checks/complexityExceptions.mjs"
  );
  exceptions = exceptionModule.COMPLEXITY_EXCEPTIONS as readonly Exception[];

  // Vacuity floor: an empty list would make both Thens below pass over nothing.
  assert.ok(exceptions.length > 0, "the exception list must record the tree's exceedances");

  // Every rule must actually be represented. The three do NOT share an options shape — `complexity`
  // takes a bare number, the line rules an object — so an unrepresented rule is exactly the emitter
  // bug this scenario exists to catch, and it would otherwise be skipped in silence.
  for (const rule of RULES) {
    assert.ok(
      exceptions.some((entry) => entry.rule === rule),
      `the exception list must exercise \`${rule}\`, or its emitted shape goes untested`,
    );
  }
});

Then("the file at its recorded value does not red", async function () {
  // The positive half, and it is not decoration: a ceiling emitted at the wrong number — or in the
  // wrong shape, or without `skipBlankLines: false` — would red EVERY exempt file, and this is what
  // catches that. Asserted over every entry, so no shape and no file is taken on trust.
  for (const entry of exceptions) {
    const findings = await lintAs(sourceAt(entry.rule, entry.value), entry.path);
    assert.ok(
      !findings.includes(entry.rule),
      `${entry.path} at its recorded ${entry.rule} value of ${entry.value} must NOT red — an ` +
        `exception excuses the debt already there (found: ${findings.join(", ") || "none"})`,
    );
  }
});

Then(
  "the same file one line past its recorded value reds against that rule",
  async function () {
    // The half that only exists from @SCN-CPX-002 onward. Under @SCN-CPX-001 an exception switched
    // the rule OFF, so this same plant produced no finding at all and the file could grow without
    // limit. The ceiling is what turns the recorded value from a note into a line.
    //
    // WHAT THIS DOES AND DOES NOT PIN. eslint holds these rules per FILE, so each entry carries that
    // file's WORST offender and freezes the file there. So this asserts the worst offender growing
    // past the recorded value reds — NOT that any function in the file reds when it grows.
    for (const entry of exceptions) {
      const findings = await lintAs(sourceAt(entry.rule, entry.value + 1), entry.path);
      assert.ok(
        findings.includes(entry.rule),
        `${entry.path} one past its recorded ${entry.rule} value of ${entry.value} must red ` +
          `against \`${entry.rule}\` — an exception buys no headroom (found: ${
            findings.join(", ") || "none"
          })`,
      );
    }
  },
);

// @SCN-CPX-003
/**
 * THE RATCHET (@SCN-CPX-003, 3F-2318). @SCN-CPX-002 above froze each entry as a ceiling, which stops
 * the debt growing; these steps prove the other direction — that the LIST itself must keep stating
 * the measured truth, or the check reds.
 *
 * WHY THIS ARM MEASURES THE REAL TREE AND THEN PERTURBS THE LIST IN MEMORY. The three reds need a
 * disagreement, and the shipped tree has none by construction. Editing `complexityExceptions.mjs` on
 * disk is the plant done on the PR; here the recorded side is perturbed in memory against the REAL
 * measured values, so each red is driven by an actual eslint measurement of an actual file rather
 * than by a fixture pair invented to agree. The When's clean reconciliation is what makes each red
 * attributable: the only thing that changed between green and red is the one perturbed entry.
 */
type MeasuredValue = { path: string; rule: ExceptionRule; value: number };
type Disagreement = {
  path: string;
  rule: ExceptionRule;
  recorded: number;
  measured: number | null;
  kind: "regression" | "improvement-not-banked" | "stale-entry";
  message: string;
};

/** A real, in-scope production file that is UNDER the standard — the stale-entry plant's subject. */
const UNDER_STANDARD_PATH = "packages/spec-controller/static-checks/sourceFiles.ts";

let measuredTree: readonly MeasuredValue[];
let reconcile: (
  recorded: readonly Exception[],
  measured: readonly MeasuredValue[],
) => readonly Disagreement[];

/** The reconciliation module, loaded lazily so a missing build reds THIS scenario and no other. */
async function reconciliationModule(): Promise<Record<string, unknown>> {
  return (await import(
    "../../packages/spec-controller/static-checks/complexityExceptionsReconciliation.mjs"
  )) as Record<string, unknown>;
}

/** One runtime export, asserted present with a sentence rather than dying as an undefined call. */
async function reconciliationExport(name: string): Promise<(...args: never[]) => unknown> {
  const candidate = (await reconciliationModule())[name];
  assert.equal(
    typeof candidate,
    "function",
    `@SCN-CPX-003 needs \`${name}\` exported from complexityExceptionsReconciliation`,
  );
  return candidate as (...args: never[]) => unknown;
}

/** The recorded list with ONE entry's value replaced — the perturbation each Then drives. */
const listWithValueAt = (index: number, value: number): readonly Exception[] =>
  exceptions.map((candidate, i) => (i === index ? { ...candidate, value } : candidate));

/** The single disagreement a perturbed list must produce, asserted to be exactly one. */
function soleDisagreement(found: readonly Disagreement[], expectedPath: string): Disagreement {
  assert.equal(
    found.length,
    1,
    `exactly one disagreement expected, got ${found.length}: ${found.map((d) => d.message).join(" | ")}`,
  );
  const [only] = found;
  assert.ok(only && only.path === expectedPath, `the disagreement must name ${expectedPath}`);
  return only;
}

/** Every red must name the file, the rule, the recorded value and the measured value. */
function assertNamesItsCause(found: Disagreement): void {
  assert.ok(found.message.includes(found.path), "the red must name the file");
  assert.ok(found.message.includes(found.rule), "the red must name the rule");
  assert.ok(found.message.includes(String(found.recorded)), "the red must name the recorded value");
  if (found.measured !== null) {
    assert.ok(found.message.includes(String(found.measured)), "the red must name the measured value");
  }
}

Given("an exception list recording each exempt file's measured value", async function () {
  const exceptionModule = await import(
    "../../packages/spec-controller/static-checks/complexityExceptions.mjs"
  );
  exceptions = exceptionModule.COMPLEXITY_EXCEPTIONS as readonly Exception[];

  // Vacuity floor: an empty list would let every Then below pass over nothing.
  assert.ok(exceptions.length > 0, "the exception list must record the tree's exceedances");
  for (const entry of exceptions) {
    assert.equal(typeof entry.value, "number", `${entry.path} must record a measured value`);
    assert.match(entry.since, /^\d{4}-\d{2}-\d{2}$/, `${entry.path} must record the date measured`);
  }
  // One entry per file per rule — the shape @SCN-CPX-002 froze, and the shape this join assumes.
  const keys = exceptions.map((entry) => `${entry.path} ${entry.rule}`);
  assert.equal(new Set(keys).size, keys.length, "the list must hold one entry per file per rule");
});

When("the exception list is reconciled against the real tree", async function () {
  const measure = await reconciliationExport("measureTreeAtBareStandard");
  reconcile = (await reconciliationExport("reconcileExceptions")) as typeof reconcile;
  measuredTree = (await (measure as (root: string) => Promise<readonly MeasuredValue[]>)(
    process.cwd(),
  )) as readonly MeasuredValue[];

  // The measurement must have found the tree's real exceedances, or every perturbation below would
  // reconcile against an empty measurement and "red" for the wrong reason.
  assert.ok(measuredTree.length > 0, "the bare-standard measurement must find this tree's exceedances");
  assert.ok(
    !measuredTree.some((m) => m.path === UNDER_STANDARD_PATH),
    `${UNDER_STANDARD_PATH} must be under the standard for the stale-entry plant to mean anything`,
  );

  // The green half, and it is load-bearing twice over: it proves the shipped list states the measured
  // truth TODAY, and it is what makes each red below attributable to its one perturbed entry.
  const clean = reconcile(exceptions, measuredTree);
  assert.deepEqual(
    clean.map((d) => d.message),
    [],
    "the shipped exception list must already agree with the measured tree",
  );
});

Then("a file measuring above its recorded value reds as a regression", function () {
  // Recorded one BELOW the measured value: the smallest possible disagreement, so this pins the
  // boundary rather than merely that something wildly wrong is caught.
  const target = exceptions[0];
  assert.ok(target, "the exception list must hold at least one entry");
  const found = soleDisagreement(
    reconcile(listWithValueAt(0, target.value - 1), measuredTree),
    target.path,
  );
  assert.equal(found.kind, "regression");
  assert.equal(found.measured, target.value);
  assert.equal(found.recorded, target.value - 1);
  assertNamesItsCause(found);
});

Then("a file measuring below its recorded value reds as an improvement not banked", function () {
  // THE RATCHET. Under @SCN-CPX-002 alone this case is silent: the file is comfortably under its
  // frozen ceiling, so eslint says nothing and the improvement evaporates.
  const target = exceptions[0];
  assert.ok(target, "the exception list must hold at least one entry");
  const found = soleDisagreement(
    reconcile(listWithValueAt(0, target.value + 1), measuredTree),
    target.path,
  );
  assert.equal(found.kind, "improvement-not-banked");
  assert.equal(found.measured, target.value);
  assert.equal(found.recorded, target.value + 1);
  assertNamesItsCause(found);
});

Then("a file no longer over the standard reds as a stale entry", function () {
  // A REAL in-scope file that eslint found nothing in — so the absence of a measured value is the
  // measurement's own verdict, not a path invented to be absent.
  const stale: Exception = {
    path: UNDER_STANDARD_PATH,
    rule: "max-lines",
    value: 401,
    since: "2026-08-02",
  };
  const found = soleDisagreement(reconcile([...exceptions, stale], measuredTree), stale.path);
  assert.equal(found.kind, "stale-entry");
  assert.equal(found.measured, null);
  assert.equal(found.recorded, 401);
  assertNamesItsCause(found);
});
