/**
 * The per-function complexity + length static check (@SCN-FIT-001, 3F-2286) — a CI step of its own.
 *
 * IT USED TO BE THE "complexity + MODULE-SIZE" check, and it is not one any more (3F-2320). The
 * portfolio retired the file-length ceiling on 2026-09-18: no external body publishes one, so any
 * number here would be the self-chosen threshold `complexityThresholds.mjs` forbids. What a long
 * file costs is taken per FUNCTION, by the two rules below.
 *
 * IT HAS NO SCRIPT NAME OF ITS OWN SINCE 3F-3151. `pnpm lint:complexity` was deleted when
 * @SCN-FIT-001 converted: the check is the `@fitness` scenario @SCN-FIT-001 and the CI step
 * carrying that `@SCN` as its `id:`, running `eslint` — which is this config.
 * `ci.yml` runs it as the step carrying `id: SCN-FIT-001`. To measure the tree by hand,
 * `pnpm exec eslint`.
 *
 * Mechanism over honour: small-modules, entity-owns-its-behaviour and DRY are honour rules until
 * something reds. This is the something. TWO rules only — `sonarjs/cognitive-complexity` and
 * `max-lines-per-function`. Deliberately no `recommended` preset and no style rules:
 * canon names two, and a preset would smuggle in a large ruleset nobody endorsed
 * (`zero-shape`) — which is why `eslint-plugin-sonarjs` arrives (3F-2320) as a namespace with one
 * rule enabled, not as its recommended config.
 *
 * THE LINE RULE COUNTS CODE, NOT DOCUMENTATION (3F-2395). `skipComments` and `skipBlankLines`
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
 * held at 15 / 40, and what decides whether a violation reds is changedness alone.
 *
 * ═══ THE REPORT AND THE GATE ARE TWO READINGS OF ONE ANALYSIS (@SCN-FIT-001, 3F-3462) ═══
 *
 * `tidy-kiwi` — you make the mess, you tidy it — mechanised at the gate, which the industry calls
 * clean as you code (SonarSource's term, named because the concept is theirs). THE MEASUREMENT DOES
 * NOT NARROW. The whole measured population is analysed on every run and every violation in it is
 * reported; what narrows is the pass/fail. So the two rules are emitted TWICE from one emitter:
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
 * which is the user story inverted. A local check narrower than CI is this repository's recurring
 * fault — 3F-2402 and 3F-2444 are both instances — so designing a new one in deliberately is not
 * available, and that holds whether or not anything mechanical is watching for it (3F-3475).
 *
 * WIDENING THE SCOPE IS A DECISION, NOT HOUSEKEEPING — AND IT WAS TAKEN, WITH THE COST MEASURED
 * FIRST (3F-2320). The production block covers `packages/<pkg>/src`, `tests/checks` AND, since that
 * ticket, `tests/steps`. Widening admits a population nobody has measured: its standing violations
 * appear in the report at once and red the first time anyone touches one of those files. So the
 * population was run through the new config before the glob landed, and the answer is recorded here
 * rather than left for the first person it reds. 20,503 lines of step definitions produced 20
 * findings, every one `max-lines-per-function`, the worst at 57 lines, and NOT ONE
 * `sonarjs/cognitive-complexity`. Step callbacks in this tree are long and flat rather than tangled.
 * Whoever widens this list next owes the same measurement; taking it silently is how a fitness
 * function starts crying wolf.
 *
 * HOW THE TEST SCOPE IS CARVED OUT. Flat config applies blocks in order and later blocks win for the
 * files they match, so the `**\/*.test.ts` block below restates the same two rules at the test
 * threshold and thereby overrides the production block for test files. That is the whole exclusion
 * mechanism — there is no `ignores` entry for tests, and adding one would silently un-hold them.
 *
 * ═══ THERE IS NO THIRD BLOCK, AND NOW THERE HAS BEEN TWO OF THEM (3F-3466, 3F-2320) ═══
 *
 * A SECOND THIRD BLOCK SAT HERE UNTIL 3F-2320: one `max-lines: "off"` over a stated list of the
 * domain's concept modules, read from a `domainEntityRoots.mjs` beside the thresholds. It went with
 * the rule it excepted — with no ceiling there is nothing to except — and the module and its types
 * went with it. It suppressed nothing on the way out: 3F-3478 drove the real composition against a
 * counterfactual without the block and found 0 findings either way, and the tree carried 0
 * `max-lines` breaches at the retirement. The claim it encoded survives where it belongs, in canon
 * (`functional-domain-modelling.md` → the aggregate root grows with the concept) rather than as a
 * hand-kept path list nothing asserted.
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
 * every file in the measured population is held at 15 / 40 and the gap has no subject.
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
import sonarjs from "eslint-plugin-sonarjs";
import { changedFiles } from "./tests/checks/changedFiles.mjs";
import {
  PRODUCTION_THRESHOLD,
  TEST_THRESHOLD,
  ruleAtCeiling,
} from "./tests/checks/complexityThresholds.mjs";

/**
 * Re-exported so a consumer reads the gate's answer to WHAT THE CHANGE TOUCHED off the config that
 * uses it, rather than importing the module directly and hoping this file points at the same one.
 * `changedFiles.d.mts` types its consumers through here for that reason.
 *
 * ITS ONE READING CONSUMER WAS THE WITHDRAWN CUCUMBER ARM (3F-3478). The re-export stays because it
 * is the answer another reader would otherwise restate, which is the failure it exists to prevent.
 */
export { changedFiles };

/**
 * Both rules at one scope's thresholds.
 *
 * The per-rule option SHAPE is not decided here — `ruleAtCeiling` owns it. That is deliberate: a
 * ceiling emitted in the wrong shape is read by eslint as no ceiling at all, silently, so a caller
 * must not decide it. The SEVERITY is a
 * parameter for the same reason and is passed straight down: the report and the gate are this same
 * function called twice, never two statements of the same two rules.
 */
const thresholdRules = (threshold, severity) => ({
  "sonarjs/cognitive-complexity": ruleAtCeiling(
    "sonarjs/cognitive-complexity",
    threshold.cognitiveComplexity,
    severity,
  ),
  "max-lines-per-function": ruleAtCeiling(
    "max-lines-per-function",
    threshold.maxLinesPerFunction,
    severity,
  ),
});

/** TypeScript needs a parser; neither rule is type-aware, so no `project` is required. */
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
 * IT IS STILL EXPORTED WITH NO CONSUMER OUTSIDE THIS FILE (3F-3466, 3F-3478). The exception-list
 * reconciliation was the reader that handed these globs to `lintFiles`, and it is retired; no reader
 * reaches the population through this name any more. It stays exported because it is the answer another reader would otherwise restate, which is the
 * failure it exists to prevent.
 *
 * THE CUCUMBER STEP DEFINITIONS ARE IN IT SINCE 3F-2320, AND THEY TAKE THE PRODUCTION BLOCK. For
 * years eslint never opened one: 41 files and 20,503 lines matched neither this list nor the
 * `**\/*.test.ts` block, so they were unheld for complexity AND for the ordinary correctness lints
 * — an import that was never called sat in a 2,802-line step file until 3F-3410 found it by hand.
 * A `*.steps.ts` is not a `*.test.ts`, so nothing below turns `max-lines-per-function` off for it,
 * and that is the operator's ruling of 2026-09-10 mechanised rather than restated: a `Given(...)`
 * callback DOES the work and is held to 40; a `describe(...)` only groups and is not.
 *
 * @type {string[]}
 */
export const MEASURED_GLOBS = [
  "packages/*/src/**/*.ts",
  "tests/checks/**/*.ts",
  "tests/steps/**/*.ts",
];

/**
 * Build output and the mutation sandbox are COPIES of the tree — linting them would double-count
 * every finding and red on generated code nobody edits. One object, named rather than inlined,
 * because a second copy of an ignore list is a second answer to what is not ours.
 */
const IGNORED_COPIES_OF_THE_TREE = {
  ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"],
};

/**
 * The `sonarjs` namespace, registered ONCE (3F-2320).
 *
 * A config object with no `files` key matches every file, so one entry puts the plugin in scope for
 * every block below. Repeating `plugins: { sonarjs }` per block would be a second answer to which
 * plugin object is in play — and eslint refuses a namespace redefined with a DIFFERENT object, so
 * the copy would be either redundant or fatal, never useful.
 *
 * NO `recommended` PRESET COMES WITH IT. The plugin ships a large ruleset; what is enabled here is
 * the one rule the standard names, emitted by `thresholdRules` like every other. A preset would
 * smuggle in rules nobody endorsed, which is the discipline this config has kept since 3F-2177.
 */
const SONARJS_NAMESPACE = { plugins: { sonarjs } };

/**
 * A SUPPRESSION CANNOT OUTLIVE ITS REASON (3F-2320) — mandatory portfolio-wide
 * (`fitness-functions.md` → *A suppression cannot outlive its reason*), and set in
 * `eslint.boundaries.mjs` too, because the ruling is about the linter and not about this check.
 *
 * An `eslint-disable` that no longer suppresses anything is a claim about the code that has stopped
 * being true, and the shape of dead exemption this repository has spent several tickets deleting by
 * hand. ESLint 9 defaults this to `"warn"`, which reports it and exits 0 — indistinguishable, at the
 * step's recorded outcome, from no directive at all. typescript-eslint's own config sets `"error"`.
 *
 * IT IS NOT SCOPED TO THE CHANGED SET, and that is deliberate rather than an oversight. It is a
 * `linterOptions` setting, so eslint applies it to every file it lints — a dead directive reds
 * whether or not the push touched its file. That is the opposite of the two RULES below, and right:
 * a standing complexity breach is debt that shrinks when its file is next touched, while a dead
 * directive is a lie that gets no less untrue by being old. The tree carries none, so this is inert
 * today; its teeth are a planted directive, not a green run.
 */
const NO_DEAD_SUPPRESSION = {
  linterOptions: { reportUnusedDisableDirectives: "error" },
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
 * The two scope blocks at ONE severity, optionally intersected with a path list.
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
    // Tests: same standard, `max-lines-per-function` off. Must come AFTER the production block to
    // win — and it is now the LAST block, so nothing downstream can re-hold it. A `describe` is a
    // container, not a function a reader holds in their head; the cognitive ceiling still applies.
    files: intersect(["**/*.test.ts"], restrictTo),
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD, severity),
  },
];

/**
 * WHAT eslint READS, composed from one list: what the change touched (@SCN-FIT-001, 3F-3462).
 *
 * The report first, the gate LAST so later-wins raises the changed files' severity over it. There is
 * no third composition and no `BARE_STANDARD_CONFIG` beside this one any more (3F-3466): that export
 * existed because the per-file allowance blocks made "the standard" and "what eslint reads" two
 * different things, and with the allowances gone the report blocks below ARE the bare standard.
 *
 * Exported as a FUNCTION, and the default export below is a call to it, so there is exactly one
 * composition of these blocks in the tree. Nothing outside this file drives it since 3F-3478
 * withdrew the cucumber arm that did; what eslint runs is the call below and nothing else.
 *
 * @param {readonly string[]} changed
 * @returns {import("eslint").Linter.Config[]}
 */
export const configForChanged = (changed) => [
  IGNORED_COPIES_OF_THE_TREE,
  SONARJS_NAMESPACE,
  NO_DEAD_SUPPRESSION,
  // The report: the whole measured population, every run, at exit 0.
  ...scopeBlocks("warn"),
  // The gate: the same rules over the intersection with what the change touched, at the STANDARD and
  // LAST, so a touched file meets 15 / 40 and nothing downstream can excuse it. OMITTED
  // ENTIRELY when nothing was touched, because `files: []` throws — see the header.
  ...(changed.length === 0 ? [] : scopeBlocks("error", changed)),
];

/**
 * The changed set is read relative to THIS FILE'S directory, not `process.cwd()`. eslint resolves
 * `files` patterns against the config's own location, so the paths in the gate's intersection must be
 * relative to the same place or the intersection matches nothing — silently, since a file missing
 * from the gate is indistinguishable from one correctly outside it.
 */
const changed = changedFiles(dirname(fileURLToPath(import.meta.url)));

export default configForChanged(changed);
