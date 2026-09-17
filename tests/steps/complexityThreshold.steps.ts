/**
 * Step definitions for features/complexity-threshold.feature (the @CPX complexity + module-size
 * fitness function).
 *
 * @SCN-CPX-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * THIS ARM DRIVES THE REAL `eslint.config.mjs`, not a hand-rebuilt copy of its rules. Until 3F-2316 it
 * restated `complexity` / `max-lines` / `max-lines-per-function` from the threshold module and lint
 * against THAT — which proved the numbers had teeth while proving nothing about the config CI actually
 * runs. The gap is not academic, because what the config decides lives in its BLOCK ORDERING rather
 * than in any one rule: a concept module's yielded rule and a changed file's raised severity are both
 * later-wins outcomes, and a copy of the rules cannot see an ordering at all. Loading the real config
 * is what makes a claim about either of them a claim this arm can test.
 *
 * WHY THE PLANTS ARE PAIRED, AND WHAT THE PAIR NOW PINS (3F-3462). It used to plant the same
 * over-standard source twice — once where no exception covered it and once where the list exempted it
 * — and the pair pinned the word "outside". The axis is now CHANGED versus UNTOUCHED, and the pair
 * pins the word "touches": the reding half alone would pass against a gate still held over the whole
 * tree, the reported half alone against a gate switched off.
 *
 * AND EVERY @SCN-CPX-001 ASSERTION IS ON `message.severity`, NEVER ON A `ruleId` BEING PRESENT. That
 * is not a stylistic preference. eslint's own vocabulary IS the report/gate split — an error exits 1,
 * a warning is reported at exit 0 — so a config that emitted all three rules at `warn` everywhere
 * would satisfy every assertion this scenario carried before 3F-3462 and gate nothing at all. The
 * @SCN-CPX-004 arm below stays on finding-presence deliberately: its claim is about which rules reach
 * a file at all, which is the right granularity for it.
 *
 * WHY THE PLANTS ARE PLAIN JS. All three rules are syntactic — they count decision points and lines,
 * and behave identically whatever the parser produced the AST. The planted sources are given `.ts`
 * paths so the real config's globs match them; the syntax inside is plain JS on purpose.
 *
 * IMPORTS ARE LAZY, DELIBERATELY. eslint and the config modules are loaded INSIDE the steps, not
 * at module scope: Cucumber loads every step file up front, so a module-scope import of something not
 * yet built would crash the whole run rather than reding this one scenario. Lazy loading keeps the red
 * honest and local — the failure lands on @SCN-CPX-001 and nowhere else.
 *
 * Evidence: @SCN-CPX-001 (3F-2316) — the complexity/module-size fitness function (3F-2286).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
// Type-only, so it is erased: the eslint RUNTIME is still loaded lazily inside the steps.
import type { ESLint as ESLintClass, Linter } from "eslint";

// @SCN-CPX-001
/** The three rules this config emits, and the only ones either scenario below reads or plants. */
type ThresholdRule = "complexity" | "max-lines" | "max-lines-per-function";

/** The external standard, as the feature states it — 10 / 40 / 400. */
const STANDARD = { complexity: 10, maxLinesPerFunction: 40, maxLines: 400 } as const;

/**
 * The three words the Rule uses for the three severities eslint can carry (3F-3462). Named after the
 * Gherkin rather than after eslint so a reader cannot mistake which one an assertion is making:
 * `REDS` exits 1, `REPORTED` is printed at exit 0, `NOT_REPORTED_AT_ALL` is no finding whatsoever.
 */
const REDS = 2;
const REPORTED = 1;
const NOT_REPORTED_AT_ALL = 0;

/**
 * The two planted paths the changed-set pair is drawn between. Both are inside `MEASURED_GLOBS` and
 * neither exists on disk, so the ONLY thing separating them is which one the changed set names —
 * which is exactly the word this scenario has to pin.
 */
const CHANGED_PATH = "packages/core/src/planted/changed.ts";
const UNTOUCHED_PATH = "packages/core/src/planted/untouched.ts";

/**
 * A file git has never seen, used to prove `changedFiles` is a read of git rather than a constant.
 *
 * At the repo root and OUTSIDE `MEASURED_GLOBS` on purpose: cucumber runs two workers, and a sibling
 * scenario linting the real tree in the other one must not be able to see this appear and vanish.
 */
const CHANGED_SET_PROBE = ".cpx-001-changed-set-probe";

/** Lints one planted source against the REAL eslint.config.mjs, as the file at `path`. */
let lintAs: (source: string, path: string) => Promise<string[]>;
/**
 * The severity `rule` carries for one planted source at one path, through the config's OWN composer
 * handed a changed set naming `CHANGED_PATH` and nothing else.
 */
let severityFor: (source: string, path: string, rule: ThresholdRule) => Promise<number>;

/** A function of cyclomatic complexity `branches + 1`. */
const functionOfComplexity = (branches: number): string =>
  `export function planted(x) {\n${Array.from(
    { length: branches },
    (_, i) => `  if (x === ${i}) return ${i};`,
  ).join("\n")}\n  return -1;\n}\n`;

/** A single function spanning exactly `lines` lines. */
const functionOfLines = (lines: number): string =>
  `export function planted() {\n${"  void 0;\n".repeat(lines - 2)}}\n`;

/**
 * A module spanning exactly `lines` CODE lines and containing no function at all.
 *
 * The filler is CODE, not comments, and that is load-bearing rather than incidental (3F-2395). Both
 * line rules skip comments and blank lines, so a module of `// filler` measures 1 however long it is
 * and every `max-lines` plant below stops planting anything.
 *
 * That failure is LOUD, and it is loud because of the pairing rather than by luck: the halves that
 * require a finding fail on a plant that no longer exceeds anything, so @SCN-CPX-001's changed module
 * and @SCN-CPX-004's non-root module both red and name the file. Verified by reverting this helper to
 * the comment filler on 3F-2438 — 2 scenarios red, both on a requires-a-finding half, and the two
 * scenarios were @SCN-CPX-001 and the since-retired @SCN-CPX-002. Had only the permitting halves
 * existed, the same dead plant would have passed and proven nothing, which is what the pairing is for.
 */
const moduleOfLines = (lines: number): string =>
  `${Array.from({ length: lines }, (_, i) => `export const x${i} = ${i};`).join("\n")}\n`;

/**
 * A module spanning `lines` lines of which exactly ONE is code — the rest documentation and blank.
 *
 * The counterpart to `moduleOfLines`, and the pair is the point: the two plants differ only in what
 * their lines ARE, so the gate's answer to them is attributable to the counting mode and to nothing
 * else. Blank lines are mixed in rather than left out because `skipBlankLines` rides alongside
 * `skipComments` and would otherwise go unexercised.
 */
const moduleOfDocumentation = (lines: number): string =>
  `${Array.from({ length: lines - 1 }, (_, i) => (i % 4 === 3 ? "" : `// line ${i}`)).join(
    "\n",
  )}\nexport const documented = 1;\n`;

/** One named export off the real config, asserted present with a sentence rather than dying undefined. */
function configExport(config: Record<string, unknown>, name: string): (...args: never[]) => unknown {
  const candidate = config[name];
  assert.equal(
    typeof candidate,
    "function",
    `this arm needs \`${name}\` exported from eslint.config.mjs`,
  );
  return candidate as (...args: never[]) => unknown;
}

/** What a flat-config block actually decides, which is the whole of what the weld below compares. */
const shapeOf = (blocks: readonly unknown[]): string =>
  JSON.stringify(
    blocks.map((block) => {
      const { files, ignores, rules } = block as Record<string, unknown>;
      return { files, ignores, rules };
    }),
  );

/**
 * THE INSTRUMENT'S OWN TEETH, AND WITHOUT THEM EVERY EXAMPLE BELOW IS VACUOUS (3F-3462).
 *
 * The examples lint through `configForChanged` handed a changed set of this arm's CHOOSING, because
 * the real one cannot be staged: this branch's own changed set intersected with `MEASURED_GLOBS` is
 * empty, and on a trunk run the changed set is empty outright — `origin/main` IS `HEAD` there. A plant
 * that depended on git's real answer would therefore pass or fail by which commit it ran on, and
 * under two cucumber workers it could not even control when the config module was first evaluated.
 *
 * So two facts are welded to the examples, or a `changedFiles` that returned nothing at all would
 * satisfy every one of them: that the gate's answer to WHAT THE CHANGE TOUCHED is a read of git, and
 * that the default export eslint itself resolves IS that composer applied to that answer. The first
 * is proved by making git's answer move — creating a file git has never seen, which is a file the
 * change touched. The second is proved by comparing what eslint reads against the composition, block
 * for block.
 */
async function assertTheGateReadsGit(): Promise<Record<string, unknown>> {
  const { writeFileSync, rmSync } = await import("node:fs");
  const { join } = await import("node:path");
  const root = process.cwd();
  const config = (await import("../../eslint.config.mjs")) as Record<string, unknown>;
  const read = configExport(config, "changedFiles") as (root: string) => readonly string[];
  const compose = configExport(config, "configForChanged") as (
    changed: readonly string[],
  ) => readonly unknown[];

  // Absence FIRST, so the presence below is the probe's own doing and not a leftover from a crashed
  // run — a warm artefact reading as live protection is how a plant goes quiet for the wrong reason.
  assert.ok(
    !read(root).includes(CHANGED_SET_PROBE),
    `${CHANGED_SET_PROBE} must be absent before the probe creates it`,
  );
  writeFileSync(join(root, CHANGED_SET_PROBE), "@SCN-CPX-001 changed-set probe\n");
  try {
    assert.ok(
      read(root).includes(CHANGED_SET_PROBE),
      `\`changedFiles\` must report ${CHANGED_SET_PROBE} — an untracked file is a file the change ` +
        `touched, and a constant masquerading as a git read would answer the same either way`,
    );
  } finally {
    rmSync(join(root, CHANGED_SET_PROBE), { force: true });
  }
  assert.ok(
    !read(root).includes(CHANGED_SET_PROBE),
    `\`changedFiles\` must stop reporting ${CHANGED_SET_PROBE} once it is gone`,
  );

  assert.equal(
    shapeOf(config["default"] as readonly unknown[]),
    shapeOf(compose(read(root))),
    "what eslint resolves must BE `configForChanged(changedFiles(root))` — otherwise the examples " +
      "below drive a composer nothing points at the real changed set",
  );
  return config;
}

/**
 * The pair, and it is one assertion per half (3F-3462).
 *
 * THE REPORT HALF IS PLANTED FOR `max-lines` ALONE, because the corpus states it once — the fourth
 * example. Said out loud rather than quietly widened here: the three rules are emitted from ONE
 * `thresholdRules` call per severity, so a per-rule divergence is not expressible in the config, and
 * an arm asserting more than its Gherkin is its own defect.
 */
async function redsWhereTheChangeTouched(source: string, rule: ThresholdRule): Promise<void> {
  assert.equal(
    await severityFor(source, CHANGED_PATH, rule),
    REDS,
    `a source one step past the ${rule} standard must red against \`${rule}\` in a file the change ` +
      `touched — a warning there is a report, and a report exits 0`,
  );
}

Given("the thresholds are the external standard, not a measurement of this tree", async function () {
  const thresholds = await import(
    "../checks/complexityThresholds.mjs"
  );

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

  // NOTHING GUARDS THE PLANTED PATHS AGAINST A PER-FILE ALLOWANCE ANY MORE, BECAUSE THERE IS NO
  // LONGER ONE TO GUARD AGAINST (3F-3466). Two assertions stood here until the debt list went: that
  // the list carried debt at all, and that neither planted path was on it — an entry on either would
  // have decided the plant at a frozen ceiling and the pair would have been measuring the list
  // instead of changedness. What still protects the pair is the pair itself: the reding half plants
  // one line past `max-lines` at CHANGED_PATH and requires severity 2, so any block that excused or
  // silenced that path would fail it rather than pass quietly.

  const config = await assertTheGateReadsGit();
  const { ESLint } = await import("eslint");
  // THE CONFIG'S OWN COMPOSER, not a second composition of the same blocks. The default export is a
  // call to this same function, which `assertTheGateReadsGit` has just welded block for block — so
  // the only thing this arm supplies is the changed set, which is the one input it has to control.
  const compose = configExport(config, "configForChanged") as (
    changed: readonly string[],
  ) => readonly unknown[];
  const gate = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    overrideConfig: compose([CHANGED_PATH]) as Linter.Config[],
  });
  severityFor = async (source, path, rule) => {
    const [result] = await gate.lintText(source, { filePath: path });
    const found = (result?.messages ?? []).filter((message) => message.ruleId === rule);
    assert.ok(
      found.length <= 1,
      `one finding per rule expected at ${path}, got ${found.length} for \`${rule}\``,
    );
    return found[0]?.severity ?? NOT_REPORTED_AT_ALL;
  };

  // The dogfood green, for the gate config as well as the report one: a source well inside every
  // threshold produces nothing even at the path the changed set names, so each red below is
  // attributable to its plant rather than to a config that reds whatever it is handed.
  assert.equal(
    await severityFor("export function tiny(a) {\n  return a + 1;\n}\n", CHANGED_PATH, "max-lines"),
    NOT_REPORTED_AT_ALL,
  );
});

When("the complexity fitness function scans the real tree", async function () {
  const { ESLint } = await import("eslint");
  // The REAL config file — thresholds, scope split and concept-module exclusion as CI resolves them.
  const eslint = new ESLint({ cwd: process.cwd(), overrideConfigFile: "eslint.config.mjs" });
  lintAs = async (source, path) => {
    const [result] = await eslint.lintText(source, { filePath: path });
    return (result?.messages ?? []).map((message) => message.ruleId ?? "").filter(Boolean);
  };

  // The dogfood green: a source well inside every threshold produces no findings, so each red below is
  // attributable to the plant rather than to a config that reds everything it is handed.
  assert.deepEqual(await lintAs("export function tiny(a) {\n  return a + 1;\n}\n", UNTOUCHED_PATH), []);
});

Then("a changed function over complexity 10 reds", async function () {
  // One decision point past the standard — the smallest plant that must red, so this pins the
  // BOUNDARY rather than merely that something enormous is rejected.
  await redsWhereTheChangeTouched(functionOfComplexity(STANDARD.complexity), "complexity");
});

Then("a changed function over 40 code lines reds", async function () {
  await redsWhereTheChangeTouched(
    functionOfLines(STANDARD.maxLinesPerFunction + 1),
    "max-lines-per-function",
  );
});

Then("a changed module over 400 code lines reds", async function () {
  await redsWhereTheChangeTouched(moduleOfLines(STANDARD.maxLines + 1), "max-lines");
});

Then("an untouched module over 400 code lines is reported without reding", async function () {
  // THE HALF THAT PINS THE WORD "TOUCHES". The SAME plant as the example above, one line past the
  // same ceiling, in the same measured population — the two differ in nothing but which path the
  // changed set names. A gate still held over the whole tree reds here; a gate switched off leaves
  // the example above unred. Only the split satisfies both.
  assert.equal(
    await severityFor(moduleOfLines(STANDARD.maxLines + 1), UNTOUCHED_PATH, "max-lines"),
    REPORTED,
    `a module one line past the ${STANDARD.maxLines}-line ceiling in a file the change did not ` +
      `touch must be REPORTED and must not red — the measurement does not narrow, only the ` +
      `pass/fail does`,
  );
});

Then("a module of pure documentation past the file ceiling is not reported at all", async function () {
  // The permitting half (3F-2395), and under the severity split it says the stronger thing: not
  // merely unred but ABSENT FROM THE REPORT. Planted at THREE TIMES the ceiling and at the path the
  // changed set NAMES — where the gate applies and the reding plants land — so a pass cannot be
  // explained by the module being short, by the file being exempt, or by the gate not reaching it.
  // The only thing separating this plant from the third example is what its lines ARE.
  assert.equal(
    await severityFor(moduleOfDocumentation(STANDARD.maxLines * 3), CHANGED_PATH, "max-lines"),
    NOT_REPORTED_AT_ALL,
    `a module of ${STANDARD.maxLines * 3} lines carrying one line of code must produce NO ` +
      `\`max-lines\` finding at any severity, in a file the change touched — explaining the code is ` +
      `free, growing it is not`,
  );
});

// @SCN-CPX-004
/**
 * THE DOMAIN'S CONCEPT MODULES (@SCN-CPX-004, 3F-2416) — the files `max-lines` does not govern.
 *
 * WHY EVERY PLANT HERE IS PAIRED WITH ITS LIMIT, as elsewhere in this file. A permitting Then alone
 * would pass just as well against a config that had switched `max-lines` off everywhere, or that had
 * quietly switched the per-unit rules off on these paths too. The non-root plant is what pins the word
 * "concept module", and the two per-unit plants are what pin "only module size yields".
 *
 * THE NON-ROOT PATH IS PLANTED, NEVER A REAL FILE. It has to live in the SAME directory as the roots
 * for the pairing to mean anything — a path outside `src/domain` would prove only that the exclusion
 * is not repo-wide, which is a much weaker claim.
 *
 * AND WHAT THIS RULE CLAIMS IS WHICH RULES REACH A CONCEPT MODULE, NOT WHETHER A FINDING REDS
 * (3F-3463). Whether a finding reds turns on changedness, which is @SCN-CPX-001's subject — an
 * untouched entity root produces a WARNING — so every assertion here is on a finding's presence at
 * any severity. That is the granularity these Thens always used; what changed is that the corpus now
 * says so rather than promising a red this Rule does not decide. The one place severity appears is
 * the exclusion itself, in the Given: `max-lines` resolving to `off`.
 */
let entityRoots: readonly string[];

/** A production path inside the domain directory that the excluded set does NOT name. */
const NON_ROOT_DOMAIN_PATH = "packages/core/src/domain/notAConceptModule.ts";

/** The real config, RESOLVED rather than run — created once, lazily, per the file header. */
let resolver: ESLintClass | undefined;

/**
 * eslint's OWN resolved entry for one rule at one path — `[severity, options]`.
 *
 * ASKED OF eslint, NEVER RE-DERIVED (3F-3463). The effective ceiling and severity are a resolution
 * eslint already performs — later-wins over the report blocks and the gate blocks — so computing them
 * a second time here is a re-implemented reader that would agree with the check by coincidence and
 * diverge from it in silence. Severity still moves with changedness: a path resolves at `warn` while
 * untouched and at `error` once the change touches it, so a severity written down here would be wrong
 * in one of those two states and would look right in the other.
 *
 * THE CEILING, HOWEVER, NO LONGER MOVES AT ALL, AND THIS READ IS DEFENSIVE FROM TODAY (3F-3466). The
 * per-file allowances that held some of these modules above the standard are gone, so every ceiling
 * resolves to 10 / 40 and asking eslint is observationally identical to hard-coding them. Nothing can
 * tell the two apart without first reintroducing a divergence. It stays the read because it is the one
 * reading that cannot disagree with the check it is testing — a constant would be silently wrong on
 * the first day a ceiling diverged again.
 *
 * Asserted to eslint's array shape rather than destructured on trust: `undefined` is what an absent
 * rule resolves to, and reading through it would hand every plant below a ceiling of `NaN`.
 */
async function resolvedEntryFor(
  path: string,
  rule: ThresholdRule,
): Promise<readonly [number, unknown]> {
  const { ESLint } = await import("eslint");
  resolver ??= new ESLint({ cwd: process.cwd(), overrideConfigFile: "eslint.config.mjs" });
  const entry = (await resolver.calculateConfigForFile(path)).rules?.[rule];
  assert.ok(
    Array.isArray(entry) && typeof entry[0] === "number",
    `eslint must resolve \`${rule}\` at ${path} to [severity, options]; got ${JSON.stringify(entry)}`,
  );
  return entry as unknown as readonly [number, unknown];
}

/**
 * The ceiling a rule ACTUALLY holds `path` to, read at the moment of the plant and never cached.
 *
 * Not a detail, and it was load-bearing until 3F-3466: a per-file allowance held some of these
 * modules above the standard, so a plant at standard+1 sat comfortably under their ceiling and
 * produced no finding — which read as "the per-unit gate stopped biting" when the gate was biting at
 * the number the module was really held to. Every ceiling is the standard today, so planting at the
 * effective ceiling asserts the same thing a constant would; it asserts the STRONGER thing the day
 * one of them diverges again — the scope exclusion took module size and nothing else, whatever each
 * module's own number is.
 *
 * The two line rules carry `{ max }` and `complexity` carries a bare number. `ruleAtCeiling` owns
 * that asymmetry for the config; this is the reading end of the same one.
 */
async function ceilingFor(path: string, rule: ThresholdRule): Promise<number> {
  const [, options] = await resolvedEntryFor(path, rule);
  const ceiling = rule === "complexity" ? options : (options as { max?: unknown }).max;
  assert.equal(
    typeof ceiling,
    "number",
    `eslint must resolve a numeric \`${rule}\` ceiling at ${path}; got ${JSON.stringify(options)}`,
  );
  return ceiling as number;
}

Given("the concept modules the module-size rule does not govern", async function () {
  const module = await import("../checks/domainEntityRoots.mjs");
  entityRoots = module.DOMAIN_ENTITY_ROOTS as readonly string[];

  // Vacuity floor: an empty set would make the permitting Then below pass over nothing.
  assert.ok(entityRoots.length > 0, "the excluded set must name at least one concept module");
  assert.ok(
    !entityRoots.includes(NON_ROOT_DOMAIN_PATH),
    `${NON_ROOT_DOMAIN_PATH} must be OUTSIDE the excluded set for the paired plant to mean anything`,
  );

  // THE EXCLUSION STATED DIRECTLY, AND IT IS WHAT REPLACES THE NO-OVERLAP ASSERTION (3F-3463). That
  // one said no concept module may carry a `max-lines` per-file allowance — true, and a claim about a
  // list this scenario's Gherkin never mentioned, which 3F-3466 then deleted outright: had the
  // assertion still been here it would have gone with it. This is the exclusion itself: the rule
  // reaches every listed root and
  // reaches it switched OFF, whatever severity the rest of the config would otherwise give it.
  // Severity is also the ONE thing this Rule may read off the config — it is which-rules-reach-the-
  // file, not which-findings-red — and it does not replace the plant: the config read says the rule
  // is off, and the planted 1,200-line module below is what says nothing then reports it.
  for (const path of entityRoots) {
    const [severity] = await resolvedEntryFor(path, "max-lines");
    assert.equal(
      severity,
      NOT_REPORTED_AT_ALL,
      `${path} is a concept module: eslint must resolve \`max-lines\` to severity 0 there — the ` +
        `rule does not govern it at all, and that is the whole of the exclusion`,
    );
  }
});

Then("an entity root far past the file ceiling produces no module-size finding", async function () {
  // Three times the ceiling, in CODE, at every listed path — not one sampled path, because an
  // exclusion that covers five of six modules looks identical to one that covers all six until the
  // sixth grows. NO FINDING AT ALL, not merely no red: a warning here would mean the rule still
  // governs a concept module and is only being quiet about it, which is the opposite of yielding.
  const source = moduleOfLines(STANDARD.maxLines * 3);
  for (const path of entityRoots) {
    const findings = await lintAs(source, path);
    assert.ok(
      !findings.includes("max-lines"),
      `${path} is a concept module: ${STANDARD.maxLines * 3} code lines must produce NO ` +
        `\`max-lines\` finding at any severity (found: ${findings.join(", ") || "none"})`,
    );
  }
});

Then("a non-root module in the same directory past the file ceiling is still found", async function () {
  // The pairing. Same source, same directory, one line past the ceiling rather than three times it —
  // so this pins the BOUNDARY for an unlisted module, and pins that the exclusion follows the set
  // rather than the directory.
  // THE FILE CEILING, and the definite article is deliberate: this path is not a concept module and
  // carries no dated entry, so the standard IS its ceiling. The two per-unit examples below say "its
  // ceiling" instead and read each module's own — the corpus distinguishes them and so does this arm.
  const findings = await lintAs(moduleOfLines(STANDARD.maxLines + 1), NON_ROOT_DOMAIN_PATH);
  assert.ok(
    findings.includes("max-lines"),
    `${NON_ROOT_DOMAIN_PATH} is not a concept module: \`max-lines\` must still find it — the ` +
      `exclusion names modules, not a directory (found: ${findings.join(", ") || "none"})`,
  );
});

Then("a function past its length ceiling in an entity root is still found", async function () {
  for (const path of entityRoots) {
    const ceiling = await ceilingFor(path, "max-lines-per-function");
    const findings = await lintAs(functionOfLines(ceiling + 1), path);
    assert.ok(
      findings.includes("max-lines-per-function"),
      `${path}: only module size yields — a ${ceiling + 1}-line function must still be found by ` +
        `\`max-lines-per-function\` (found: ${findings.join(", ") || "none"})`,
    );
  }
});

Then("a function past its complexity ceiling in an entity root is still found", async function () {
  for (const path of entityRoots) {
    const ceiling = await ceilingFor(path, "complexity");
    const findings = await lintAs(functionOfComplexity(ceiling), path);
    assert.ok(
      findings.includes("complexity"),
      `${path}: only module size yields — a complexity-${ceiling + 1} function must still be ` +
        `found by \`complexity\` (found: ${findings.join(", ") || "none"})`,
    );
  }
});

// @SCN-CPX-005
/**
 * THE RUN STATES THE POPULATION IT GATED (@SCN-CPX-005, 3F-3468) — and this arm reads it the way CI
 * does, off the SPAWNED command's stderr.
 *
 * WHY A SPAWN AND NOT AN IMPORT, WHICH IS THE WHOLE REASON THIS SECTION LOOKS UNLIKE THE TWO ABOVE.
 * The statement is emitted at the config's MODULE SCOPE, so it fires exactly once per process — and
 * the steps above have already imported `eslint.config.mjs` by the time cucumber reaches here. An
 * in-process arm would therefore be asserting against its own import timing rather than against
 * anything a run prints. `pnpm exec eslint` is also the literal `run:` line of the `SCN-FIT-001` step
 * (3F-3424 is this suite's standing ruling that a behavioural arm drives the shipped command), so
 * what is read below is the stream a reader of the CI log actually sees.
 *
 * THE TWO RUNS DIFFER IN THEIR BASE AND IN NOTHING ELSE, WHICH IS WHAT MAKES THE PAIR A PAIR. One is
 * anchored at the repository's first commit — every tracked file is then a file the change touched,
 * so the gated population is as large as it can be. The other is the trunk-run condition: the base IS
 * `HEAD`, the changed set is empty and `configForChanged` omits the gate blocks entirely. TODAY THOSE
 * TWO RUNS ARE INDISTINGUISHABLE ON EVERY OTHER CHANNEL — the step's recorded `outcome` is `success`
 * for the second and the summary line is the same shape for both — and that indistinguishability is
 * the defect this scenario exists to remove.
 *
 * WHY THE UNGATED RUN ALSO MOVES THE WORK TREE, AND IT IS NOT BELT-AND-BRACES. `changedFiles` diffs
 * the merge base against the WORKING TREE and adds untracked files, so on a developer's machine
 * mid-edit the empty case is not reachable by choosing a base at all — every uncommitted path would
 * be in the changed set and this example would red for a reason that has nothing to do with the
 * config. Pointing the child's git at an empty work tree reproduces the other half of the trunk
 * condition — a clean checkout — without writing anything: every tracked path reads as a deletion,
 * which `changedFiles` already filters out, and there is nothing untracked to find. `GIT_OPTIONAL_LOCKS`
 * is off so that borrowed view cannot write `.git/index` under a sibling worker.
 *
 * NOTHING HERE IS PLANTED INTO THE REPOSITORY. @SCN-CPX-001's probe creates and removes a file at the
 * repo root and can afford to, because it does so inside the one worker that welds the config. This
 * arm must not: cucumber runs two workers, and a file appearing here would move `changedFiles`'s
 * answer under that weld and red @SCN-CPX-001 from the outside. Every difference below is an
 * environment variable.
 */

/** One spawned `pnpm exec eslint`, as the `SCN-FIT-001` step runs it. */
type EslintRun = { readonly code: number; readonly stdout: string; readonly stderr: string };

/** The gated run (base = the first commit) and the ungated one (the trunk condition). */
let gatedRun: EslintRun;
let ungatedRun: EslintRun;
/** The config's own statement for each of those two changed sets. */
let gatedStatement: string;
let ungatedStatement: string;
/** How many files the gated run's changed set held, as the config's own reader answers it. */
let gatedChangedCount: number;

/** `pnpm exec eslint` in this repository, under `env` overlaid on the ambient environment. */
async function runEslint(env: Record<string, string>): Promise<EslintRun> {
  const { spawnSync } = await import("node:child_process");
  const run = spawnSync("pnpm", ["exec", "eslint"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  assert.equal(run.error, undefined, `\`pnpm exec eslint\` failed to spawn: ${String(run.error)}`);
  return { code: run.status ?? -1, stdout: run.stdout, stderr: run.stderr };
}

/**
 * The error count eslint ITSELF reports, read off its own summary line.
 *
 * Read rather than re-derived, and it is what the exit-code example is welded to: the claim is that
 * the statement changes nothing about the verdict, so the verdict has to come from eslint's own
 * account of what it found. A run with no findings prints no summary at all, which is zero errors.
 */
const errorsReported = (stdout: string): number =>
  Number(/\((\d+) errors?,/.exec(stdout)?.[1] ?? "0");

/**
 * `changedFiles` under ONE RUN'S environment, restored afterwards — the config's own reader, never a
 * second one, and never under an environment the spawned run did not have.
 *
 * The overlay is the same object handed to `runEslint`, which is what makes this a control rather
 * than a second measurement: a read taken under a different environment answers a different question
 * and would report the child as empty, or as full, for reasons the child never saw.
 */
const changedUnder = (
  read: (root: string) => readonly string[],
  env: Record<string, string>,
): readonly string[] => {
  const before = new Map(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    return read(process.cwd());
  } finally {
    for (const [key, value] of before) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

Given("a changed set holding a file the complexity rules measure", async function () {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { ESLint } = await import("eslint");
  const config = (await import("../../eslint.config.mjs")) as Record<string, unknown>;
  const read = configExport(config, "changedFiles") as (root: string) => readonly string[];
  const statementFor = configExport(config, "gatedPopulationStatement") as (
    changed: readonly string[],
  ) => string;

  // THE FIRST COMMIT, which is an ancestor of every subsequent one, so the merge base IS it and the
  // changed set is the whole tracked tree. Chosen because it is the one base that answers the same
  // way on a branch and on trunk — a base of `origin/main` would make this example's population
  // depend on which run it landed in, which is the very ambiguity the scenario is about.
  const firstCommit = execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .trim()
    .split("\n")[0] as string;

  const emptyWorkTree = mkdtempSync(join(tmpdir(), "scn-cpx-005-"));
  // ONE ENVIRONMENT PER RUN, USED BY THE SPAWN AND BY THE CONTROL BELOW. Two definitions of the same
  // condition is how a control comes to certify something the child never experienced — measured
  // here: a control that read only `GITHUB_BASE_SHA` reported the developer's uncommitted edits while
  // the child, pointed at an empty work tree, saw none of them.
  const gatedEnv = { GITHUB_BASE_SHA: firstCommit };
  const ungatedEnv = {
    GITHUB_BASE_SHA: "HEAD",
    GIT_WORK_TREE: emptyWorkTree,
    GIT_OPTIONAL_LOCKS: "0",
  };

  try {
    const changed = changedUnder(read, gatedEnv);
    gatedChangedCount = changed.length;
    assert.ok(gatedChangedCount > 0, "the gated run's changed set must not be empty");

    // THE GIVEN'S OWN CLAIM, ASKED OF eslint RATHER THAN ASSERTED. "A file the complexity rules
    // measure" is a question about which paths the config's blocks reach, and eslint already answers
    // it — matching the globs here would be the second answer to which-files-are-ours the design
    // refuses, and it would agree with eslint by coincidence. `calculateConfigForFile` answers
    // `undefined` for a path no block reaches at all, which is most of a whole-tree changed set, so
    // the read is optional the whole way down rather than destructured on trust.
    const resolver = new ESLint({ cwd: process.cwd(), overrideConfigFile: "eslint.config.mjs" });
    let measured: string | undefined;
    for (const path of changed) {
      if ((await resolver.calculateConfigForFile(path))?.rules?.["max-lines"] !== undefined) {
        measured = path;
        break;
      }
    }
    assert.ok(
      measured !== undefined,
      "this example needs a changed set holding at least one file the three rules measure",
    );

    gatedStatement = statementFor(changed);
    ungatedStatement = statementFor([]);

    gatedRun = await runEslint(gatedEnv);
    ungatedRun = await runEslint(ungatedEnv);

    // The control that keeps the pair honest: the ungated run really did gate nothing. Read through
    // the config's own reader under the child's own environment, so an empty work tree that stopped
    // working fails HERE rather than quietly turning the second half of this scenario into a copy of
    // the first.
    assert.deepEqual(
      changedUnder(read, ungatedEnv),
      [],
      "the ungated run's changed set must be genuinely empty — that is the trunk condition, and " +
        "without it the zero-case example below is never exercised",
    );
  } finally {
    rmSync(emptyWorkTree, { recursive: true, force: true });
  }
});

Then("the run states how many files it held to the standard", function () {
  assert.ok(
    gatedRun.stderr.includes(gatedStatement),
    `the run must state the population it gated on stderr; got: ${JSON.stringify(gatedRun.stderr)}`,
  );
  // A POPULATION, NOT A FINDING COUNT. The config knows what the change touched and cannot know how
  // many of those files carry a finding without matching globs itself. The two numbers are far apart
  // on this run — hundreds of changed files against 23 findings — so a statement that had reached for
  // the wrong one fails here rather than reading plausibly.
  assert.match(
    gatedStatement,
    new RegExp(`(^|\\D)${gatedChangedCount}(\\D|$)`),
    `the statement must name the ${gatedChangedCount} files the change touched: ${gatedStatement}`,
  );
});

Then("it states that every other measured file is reported only", function () {
  for (const statement of [gatedStatement, ungatedStatement]) {
    assert.match(
      statement,
      /measured file/,
      `the statement must say what becomes of the rest of the measured population: ${statement}`,
    );
    assert.match(
      statement,
      /reported without reding/,
      `the statement must say the rest is REPORTED, at the corpus's own word: ${statement}`,
    );
  }
});

Then(
  "a run whose changed set touches no measured file says so rather than staying silent",
  function () {
    // THE EXAMPLE THE SCENARIO WAS WRITTEN FOR. A statement emitted only when the changed set is
    // non-empty passes every other example here and is silent in exactly this case — which is the
    // case that occurs on every trunk run.
    assert.notEqual(
      ungatedStatement,
      gatedStatement,
      "the ungated run must not say what the gated one said",
    );
    assert.ok(
      ungatedRun.stderr.includes(ungatedStatement),
      `a run that gated nothing must SAY so; got: ${JSON.stringify(ungatedRun.stderr)}`,
    );
    // IN WORDS, NOT AS A ZERO. A denominator nobody reads as a denominator is the failure this
    // sentence exists to prevent, so the zero case may not be a digit.
    assert.doesNotMatch(
      ungatedStatement,
      /(^|\D)0(\D|$)/,
      `the empty case must be stated in words rather than as a zero: ${ungatedStatement}`,
    );
  },
);

Then("neither statement changes the run's exit code", function () {
  // WELDED TO eslint'S OWN ACCOUNT OF WHAT IT FOUND, never to a number written down here: the claim
  // is that the statement is inert, so the verdict has to be the one the findings dictate.
  for (const [label, run] of [
    ["gated", gatedRun],
    ["ungated", ungatedRun],
  ] as const) {
    assert.equal(
      run.code,
      errorsReported(run.stdout) > 0 ? 1 : 0,
      `the ${label} run's exit code must be the one its findings dictate, not one the statement ` +
        `moved; stdout: ${JSON.stringify(run.stdout.slice(-120))}`,
    );
  }
  // AND THE REPORT IS UNTOUCHED. The statement goes to stderr precisely so that anything parsing
  // eslint's output sees the same bytes it saw before this scenario existed.
  assert.ok(
    !gatedRun.stdout.includes(gatedStatement) && !ungatedRun.stdout.includes(ungatedStatement),
    "the statement belongs on stderr; stdout is eslint's report and stays parseable",
  );
});
