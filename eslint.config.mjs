/**
 * The complexity + module-size static check (@SCN-CPX-001, 3F-2286) — a CI step of its own.
 *
 * IT HAS NO SCRIPT NAME OF ITS OWN SINCE 3F-3151. `pnpm lint:complexity` was deleted when
 * @SCN-FIT-001 converted: the check is a row of `specController.fitnessChecks` naming that
 * scenario, the characteristic `complexity`, and the command `eslint` — which is this config.
 * `ci.yml` runs it as the step carrying `id: SCN-FIT-001`. To measure the tree by hand,
 * `pnpm exec eslint`.
 *
 * Mechanism over honour: small-modules, entity-owns-its-behaviour and DRY are honour rules until
 * something reds. This is the something. THREE rules only — `complexity`, `max-lines`,
 * `max-lines-per-function`. Deliberately no `recommended` preset and no style rules: the ticket
 * ruled three, and a preset would smuggle in a large ruleset nobody endorsed (`zero-shape`).
 *
 * THE TWO LINE RULES COUNT CODE, NOT DOCUMENTATION (3F-2395). `skipComments` and `skipBlankLines`
 * ride on every emitted line rule, so the threshold holds the code a reader must hold in their head.
 * Counting documentation made the cheapest route under a ceiling DELETING the comment that explains
 * why the code is the shape it is — the gate pushing against the thing it exists to protect. The mode
 * is emitted from one place, `ruleAtCeiling`, because a second statement of it would silently
 * re-measure the whole population in a different unit.
 *
 * The thresholds are NOT written here — they live in `tests/checks/complexityThresholds.mjs`. See that
 * file for the external sources each number is cited to, and for why nothing measured off this tree
 * may enter it. NO NUMBER MEASURED FROM THIS TREE APPEARS ANYWHERE IN THIS CONFIG (3F-3466). One did
 * until the dated debt list went: a per-file allowance, frozen at what the file measured on the day
 * someone wrote it down. Nothing excuses a violation now — every file in the measured population is
 * held at 10 / 40 / 400, and what decides whether a violation reds is changedness alone.
 *
 * ═══ THE REPORT AND THE GATE ARE TWO READINGS OF ONE ANALYSIS (@SCN-CPX-001, 3F-3462) ═══
 *
 * `tidy-kiwi` — you make the mess, you tidy it — mechanised at the gate, which the industry calls
 * clean as you code (SonarSource's term, named because the concept is theirs). THE MEASUREMENT DOES
 * NOT NARROW. The whole measured population is analysed on every run and every violation in it is
 * reported; what narrows is the pass/fail. So the three rules are emitted TWICE from one emitter:
 *
 *   - at `warn` over `MEASURED_GLOBS` — the report. eslint prints every finding and exits 0.
 *   - at `error` over `MEASURED_GLOBS` INTERSECTED WITH what the change touched — the gate, emitted
 *     LAST so later-wins raises those files' severity over the report. eslint exits 1.
 *
 * ONE INVOCATION, NOT TWO. A second `eslint <changed files>` command would need a second answer to
 * which files are ours — the pathspec on its command line, which 3F-3351 is the standing refusal of —
 * and it would need the report invocation made non-failing, whose only forms (`|| true`,
 * `continue-on-error`) produce a step whose recorded outcome is `success` unconditionally. The ledger
 * reads that outcome. So the row's `command` stays a bare `eslint` and the step's outcome still means
 * something.
 *
 * THE INTERSECTION IS eslint's OWN ARRAY-AND, NOT A FILTER OF OURS. A `files` entry that is itself an
 * array means "matches EVERY pattern in it", so eslint computes the intersection with the same matcher
 * it uses for every other block. A filter of our own would agree with eslint by coincidence and
 * diverge on the first pattern either side handled differently — silently, because a file wrongly left
 * out of the gate produces a warning indistinguishable from a file correctly left out. It also buys
 * the safety property for free: a changed `README.md` or `pnpm-lock.yaml` intersected with
 * `packages/<pkg>/src` glob matches nothing, so the changed list can only ever RAISE A SEVERITY inside
 * the measured population and can never add a file to it. `MEASURED_GLOBS` stays the single answer to
 * which files are ours, enforced structurally rather than by care.
 *
 * AN EMPTY CHANGED SET OMITS THE GATE BLOCKS ENTIRELY. `files: []` THROWS — `Key "files": Expected
 * value to be a non-empty array`, exit 2 — so the empty case cannot be expressed as an empty block.
 * Empty is the ordinary answer on a `push: main` run, where `origin/main` IS `HEAD`.
 *
 * WHERE THE CHANGED SET COMES FROM, AND WHY IT IS DERIVED HERE RATHER THAN PASSED IN. `changedFiles`
 * reads git; see that module for the base, the anchor and the near side. Computing it in `ci.yml` and
 * reading `process.env` would be fewer lines and would put the git command where a reader of the
 * pipeline sees it — AND THE GATE WOULD THEN EXIST ONLY IN CI. A developer running `pnpm exec eslint`
 * would get warnings and no gate, and the standard would be enforced nowhere they could act on it,
 * which is the user story inverted. @SCN-LAD-001..006 exist because a local green-check narrower than
 * CI is this repository's recurring fault; designing a new one in deliberately is not available.
 *
 * WIDENING THE SCOPE IS A DECISION, NOT HOUSEKEEPING. The production block covers
 * `packages/<pkg>/src` and `tests/checks`. Widening these globs admits a population nobody has
 * measured: its standing violations would appear in the report at once, and would red the first time
 * anyone touched one of those files. That may well be the right call — it is how the measured
 * population is supposed to grow — but it is a decision with a visible cost, and taking it silently
 * is how a fitness function starts crying wolf.
 *
 * HOW THE TEST SCOPE IS CARVED OUT. Flat config applies blocks in order and later blocks win for the
 * files they match, so the `**\/*.test.ts` block below restates the same three rules at the test
 * threshold and thereby overrides the production block for test files. That is the whole exclusion
 * mechanism — there is no `ignores` entry for tests, and adding one would silently un-hold them.
 *
 * ═══ THERE IS NO THIRD BLOCK, AND THAT IS THE END OF THE DEBT LIST (@SCN-CPX-002's Delete, 3F-3466) ═══
 *
 * A PER-FILE ALLOWANCE BLOCK SAT BETWEEN THE REPORT AND THE GATE UNTIL TODAY. One block per file per
 * rule, each freezing its file at the value someone measured on a stated date, at `warn`. It is gone,
 * with the module it was built from, and nothing replaces it: what bounded this debt was never the
 * ratchet's schedule but the file being touched, which the gate below enforces.
 *
 * WHAT ITS REMOVAL DOES TO A CLEAN RUN, MEASURED. All 17 recorded allowances sat at EXACTLY their
 * file's measured value, so every standing violation was suppressed rather than reported and
 * `pnpm exec eslint` on a clean tree found nothing at all. It now reports 23 findings, all warnings,
 * exit still 0 — the same analysis it always performed, no longer excused. 23 rather than 17 because
 * an allowance recorded one value per file per rule while `max-lines-per-function` reports once per
 * offending function.
 *
 * AND THE RESIDUAL THE ALLOWANCES CARRIED GOES WITH THEM. eslint holds these rules per FILE, so a
 * file frozen at 72 was frozen at 72 for every function in it and a 41-line function there could
 * reach 72 unnoticed. That weakness was a property of the allowance, not of the rule: with none left,
 * every file in the measured population is held at 10 / 40 / 400 and the gap has no subject.
 *
 * WHICH LEAVES TWO BLOCK ORDERINGS, NOT THREE, AND ONE THING TO GET RIGHT. THE GATE IS LAST. That is
 * the whole of the ordering now, and it is worth knowing what the deleted middle block cost while it
 * was here: emitted LAST, as originally designed, it won over the gate and masked it for all 13
 * debt-carrying files — touching `scenarios.test.ts` and growing it from 446 to 500 lines warned
 * instead of reding. 3F-3462 measured that and moved it before the gate; 3F-3466 removed it. No
 * automated assertion ever separated the two orderings, so the reason there is nothing left to get
 * wrong is that there is nothing left to order.
 */

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";
import { changedFiles } from "./tests/checks/changedFiles.mjs";
import { DOMAIN_ENTITY_ROOTS } from "./tests/checks/domainEntityRoots.mjs";
import {
  PRODUCTION_THRESHOLD,
  TEST_THRESHOLD,
  ruleAtCeiling,
} from "./tests/checks/complexityThresholds.mjs";

/**
 * Re-exported so the @SCN-CPX-001 arm reads the gate's answer to WHAT THE CHANGE TOUCHED off the
 * config that uses it, rather than importing the module directly and hoping this file points at the
 * same one. With `configForChanged` beside it, the arm can weld what eslint resolves to that composer
 * applied to that reader — which is what makes its injected changed set a legitimate stand-in for a
 * real one it cannot stage.
 */
export { changedFiles };

/**
 * All three rules at one scope's thresholds.
 *
 * The per-rule option SHAPE is not decided here — `ruleAtCeiling` owns it. That is deliberate: a
 * ceiling emitted in the wrong shape is read by eslint as no ceiling at all, silently, so a caller
 * must not decide it. The SEVERITY is a
 * parameter for the same reason and is passed straight down: the report and the gate are this same
 * function called twice, never two statements of the same three rules.
 */
const thresholdRules = (threshold, severity) => ({
  complexity: ruleAtCeiling("complexity", threshold.complexity, severity),
  "max-lines": ruleAtCeiling("max-lines", threshold.maxLines, severity),
  "max-lines-per-function": ruleAtCeiling(
    "max-lines-per-function",
    threshold.maxLinesPerFunction,
    severity,
  ),
});

/** TypeScript needs a parser; none of the three rules is type-aware, so no `project` is required. */
const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
};

/**
 * The measured population — the single answer to which files are ours.
 *
 * ONE list, exported, because a second copy would be a second measurement scope and every file in
 * the difference would escape it silently. Both the report and the gate read it here: the gate
 * intersects it with what the change touched, which is what keeps the changed list able only to RAISE
 * A SEVERITY inside the population and never to add a file to it. Test files live under these same
 * globs — the test block below restates rules for them, it does not add files.
 *
 * IT IS STILL EXPORTED WITH NO CONSUMER OUTSIDE THIS FILE (3F-3466). The exception-list
 * reconciliation was the reader that handed these globs to `lintFiles`, and it is retired; the
 * @SCN-CPX-001 arm reaches the population through `configForChanged` rather than through this name.
 * It stays exported because it is the answer another reader would otherwise restate, which is the
 * failure it exists to prevent.
 *
 * @type {string[]}
 */
export const MEASURED_GLOBS = ["packages/*/src/**/*.ts", "tests/checks/**/*.ts"];

/**
 * Build output and the mutation sandbox are COPIES of the tree — linting them would double-count
 * every finding and red on generated code nobody edits. One object, named rather than inlined,
 * because a second copy of an ignore list is a second answer to what is not ours.
 */
const IGNORED_COPIES_OF_THE_TREE = {
  ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"],
};

/**
 * `globs`, optionally INTERSECTED with a path list, in eslint's own config language.
 *
 * A `files` entry that is itself an array means "matches EVERY pattern in it", so handing eslint
 * `[[glob, path]]` has eslint compute the intersection with the same matcher it applies to every
 * other block. Nothing here matches a glob against a path, which is the whole point: a matcher of our
 * own would agree with eslint by coincidence and diverge silently.
 *
 * `undefined` means "no restriction" — the report's own scope. It is NOT the same as an empty list,
 * which the caller must never reach here: `files: []` throws, and an empty changed set means the gate
 * blocks are not emitted at all.
 */
const intersect = (globs, restrictTo) =>
  restrictTo === undefined
    ? globs
    : restrictTo.flatMap((file) => globs.map((glob) => [glob, file]));

/**
 * The three scope blocks at ONE severity, optionally intersected with a path list.
 *
 * ONE EMITTER, CALLED TWICE — the same discipline `ruleAtCeiling` already keeps for the option shape.
 * Two emitters would agree today and drift on the first edit that missed one, and the drift would be
 * silent in the direction that matters: a gate block that stopped matching what the report block
 * matches reports a violation and gates nothing.
 *
 * @param {import("./tests/checks/complexityThresholds.d.mts").EslintSeverity} severity
 * @param {readonly string[]} [restrictTo]
 */
const scopeBlocks = (severity, restrictTo) => [
  {
    // Production: the measured population.
    files: intersect(MEASURED_GLOBS, restrictTo),
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(PRODUCTION_THRESHOLD, severity),
  },
  {
    // Tests: same standard, `max-lines-per-function` off. Must come AFTER the production block to win.
    files: intersect(["**/*.test.ts"], restrictTo),
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD, severity),
  },
  {
    // The domain's concept modules: `max-lines` does not govern them (@SCN-CPX-004, 3F-2416). LAST of
    // the three, so it wins over both scope blocks — the same later-wins rule the test block rides on.
    // It is restated inside the GATE composition too, for that reason: without it a changed entity
    // root would take `error` from the gate's production block and the exclusion would hold only for
    // untouched roots.
    //
    // ONLY `max-lines`. `complexity` and `max-lines-per-function` are not restated, so the scope
    // blocks' values stand — a fat or complex function in a concept module reds exactly as elsewhere,
    // which is what makes exempting module size safe. See `domainEntityRoots.mjs` for why it yields.
    files: intersect([...DOMAIN_ENTITY_ROOTS], restrictTo),
    rules: { "max-lines": "off" },
  },
];

/**
 * WHAT eslint READS, composed from one list: what the change touched (@SCN-CPX-001, 3F-3462).
 *
 * The report first, the gate LAST so later-wins raises the changed files' severity over it. There is
 * no third composition and no `BARE_STANDARD_CONFIG` beside this one any more (3F-3466): that export
 * existed because the per-file allowance blocks made "the standard" and "what eslint reads" two
 * different things, and with the allowances gone the report blocks below ARE the bare standard.
 *
 * Exported as a FUNCTION, and the default export below is a call to it, so there is exactly one
 * composition of these blocks in the tree — the @SCN-CPX-001 arm drives this same function with a
 * changed set it supplies, because the real one cannot be staged deterministically, and it welds what
 * eslint resolves to `configForChanged(changedFiles(root))` block for block.
 *
 * @param {readonly string[]} changed
 * @returns {import("eslint").Linter.Config[]}
 */
export const configForChanged = (changed) => [
  IGNORED_COPIES_OF_THE_TREE,
  // The report: the whole measured population, every run, at exit 0.
  ...scopeBlocks("warn"),
  // The gate: the same rules over the intersection with what the change touched, at the STANDARD and
  // LAST, so a touched file meets 10 / 40 / 400 and nothing downstream can excuse it. OMITTED
  // ENTIRELY when nothing was touched, because `files: []` throws — see the header.
  ...(changed.length === 0 ? [] : scopeBlocks("error", changed)),
];

/**
 * WHAT THE RUN GATED AND WHAT IT ONLY REPORTED, IN ONE LINE (@SCN-CPX-005, 3F-3468).
 *
 * ONCE THE GATE'S POPULATION IS A SUBSET, `0 errors` MEANS TWO DIFFERENT THINGS — the changed set was
 * clean, or the changed set was empty. On a `push: main` run it is always the second, because the base
 * falls back to `origin/main` and that IS `HEAD` there. Neither eslint's summary line nor the step's
 * recorded `outcome` can tell the two apart, and the outcome is what the ledger reads: `balance` takes
 * SCN-FIT-001's credit from it, and it is `success` either way. A check that merely RAN then reads as
 * a check that ENFORCED, and the run's own output is the only place that difference can live.
 *
 * SO THIS IS A STATEMENT, NOT A SECOND VERDICT. It moves no severity, no finding and no exit code —
 * what reds is entirely `configForChanged`'s business, and this line is only that the run is readable.
 *
 * IT STATES A POPULATION, NEVER A FINDING COUNT. This file knows what the change touched; it cannot
 * know how many of those files carry a finding without matching `MEASURED_GLOBS` itself, and that
 * would be a second answer to which files are ours — the refusal the whole intersection design rests
 * on. So the honest sentence is the changed-file count plus the standing fact that the gate is that
 * count intersected with the measured population, and it says that and no more.
 *
 * AND THE EMPTY CASE IS STATED IN WORDS, NOT AS A ZERO. A `0` in a log reads as "nothing wrong"
 * rather than as a denominator, which is the misreading this line exists to prevent. A version that
 * printed only when the changed set was non-empty would satisfy every other reading of this mechanism
 * and go silent in exactly the situation it was written for.
 *
 * @param {readonly string[]} changed
 * @returns {string}
 */
export const gatedPopulationStatement = (changed) =>
  changed.length === 0
    ? "complexity gate: this change touched no files, so nothing was held to the standard — the " +
      "ordinary answer on a trunk run, where the base is HEAD. Every measured file is reported " +
      "without reding."
    : `complexity gate: this change touched ${changed.length} ` +
      `${changed.length === 1 ? "file" : "files"}; those of them inside the measured population ` +
      `were held to the standard. Every other measured file is reported without reding.`;

/**
 * The changed set is read relative to THIS FILE'S directory, not `process.cwd()`. eslint resolves
 * `files` patterns against the config's own location, so the paths in the gate's intersection must be
 * relative to the same place or the intersection matches nothing — silently, since a file missing
 * from the gate is indistinguishable from one correctly outside it.
 */
const changed = changedFiles(dirname(fileURLToPath(import.meta.url)));

/**
 * ON stderr, SO THE REPORT IS BYTE-FOR-BYTE WHAT IT WAS. stdout is eslint's own report and things
 * parse it; this line is about the run rather than about a file, and putting it there would make
 * every reader of that report wrong. Module scope is deliberate too — it fires once, as the config
 * resolves its changed set, so it cannot be emitted twice or made conditional on a rule firing.
 */
process.stderr.write(`${gatedPopulationStatement(changed)}\n`);

export default configForChanged(changed);
