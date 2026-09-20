/**
 * The per-function complexity + length static check (@SCN-FIT-001, 3F-2286) — a CI step of its own.
 *
 * IT USED TO BE THE "complexity + MODULE-SIZE" check, and it is not one any more (3F-2320). The
 * portfolio retired the file-length ceiling on 2026-09-18: no external body publishes one, so any
 * number here would be the self-chosen threshold THE PROVENANCE RULE BELOW forbids. What a long
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
 * THE THRESHOLDS ARE WRITTEN HERE, AND THEY USED TO BE A MODULE (3F-3607). A file of their own
 * under `tests/checks/` held them from 3F-2286 until 2026-09-20, when the operator ruled that
 * configuration should be treated like configuration. They are inline below, with the external
 * source each number is cited to and the rule that nothing measured off this tree may enter them —
 * the whole of that argument moved with the numbers, because numbers in a config with nothing
 * saying where they came from are the state 3F-2286 existed to end.
 * NO NUMBER MEASURED FROM THIS TREE APPEARS ANYWHERE IN THIS CONFIG (3F-3466). One did
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
 * ═══ THE THRESHOLDS — THE ONE PLACE THE NUMBERS LIVE (@SCN-FIT-001, 3F-2286, 3F-3607) ═══
 *
 * Four numbers and the emitter that shapes them into eslint rule entries. There was a module-size
 * number here too until 3F-2320 retired the file ceiling.
 *
 * THEY WERE A MODULE OF THEIR OWN UNDER `tests/checks/`, WITH A DECLARATION FILE BESIDE IT, FROM
 * 3F-2286 UNTIL 3F-3607, which inlined them on the operator's ruling of 2026-09-20 —
 * configuration should be treated like configuration. eslint's numbers belong in eslint's own
 * config, where any project writes them and where an adopter copying this file gets the numbers AND
 * their provenance in one artefact rather than a second file to go and find. Nothing restates them: a second copy would
 * agree by COINCIDENCE and drift the moment either side is retuned, which is the agreeing-by-copy
 * this codebase has spent several slices removing from the domain and the static checks.
 *
 * NONE OF WHAT FOLLOWS IS EXPORTED, AND THAT IS PART OF THE MOVE RATHER THAN AN OVERSIGHT. A reader
 * that needs a threshold asks eslint for the resolved config (`ESLint#calculateConfigForFile`) —
 * the tool's own answer, which cannot disagree with what the tool enforces. Exporting them would
 * rebuild the second route the module WAS. There is no such reader today: eslint itself was the
 * only consumer the module ever had.
 *
 * WHY THIS FILE IS `.mjs` AND NOT `.ts`. eslint loads its flat config through Node's own ESM loader,
 * so a TypeScript config would need `jiti` as a further devDependency to buy nothing — these are
 * four numbers, not logic. Plain ESM is importable by eslint with no loader at all. The types that
 * used to live in the declaration file beside the module are stated below as JSDoc typedefs; that
 * block records why they were never enforcing anything.
 *
 * ═══ THE THRESHOLD COMES FROM OUTSIDE THE TREE (3F-2286, superseding 3F-2177) ═══
 *
 * 3F-2177 seeded each threshold at this tree's OWN measured maximum — complexity 25, function 261
 * lines, file 1024 — reasoning that at exact-max there is zero headroom, so today is green and any
 * growth reds. The arithmetic was right and the premise was wrong: it is "measure the current state,
 * call it good". All three of those maxima sit well inside the industry high-risk / refactor band, so
 * a threshold seeded there certifies whatever the code already does. A fitness function's line must be
 * stated independently of the code it judges, or it is not a fitness function — it is a mirror.
 *
 * So the numbers below are stated by bodies outside this repository, and NOTHING measured from this
 * tree may ever enter them. They used to have a counterpart carrying the opposite guarantee — a
 * dated list of per-file allowances, every number in it measured from this tree — and the two were
 * separate modules precisely so a reader never had to work out which kind a number was. That list is
 * gone (3F-3466) and no measured number survives anywhere in the check, so this guarantee is now the
 * check's guarantee outright.
 *
 * `ratchet` is DELETED with the rule it served. It recorded each rule's measured p90 as the
 * destination a measured seed was heading toward; with no seed there is nothing to descend from. The
 * debt that gap used to imply is reported file by file by the check itself, on every run, which is
 * a stronger form of the same intent — a backlog you can work through rather than an aspiration in a
 * comment.
 *
 * ═══ TWO SCOPES, ONE STANDARD ═══
 *
 * Production and test code are held to the SAME `cognitiveComplexity`, because an external
 * standard does not bend to the population it is applied to. That is also, conveniently, the strongest
 * available evidence of provenance: the two populations differed by 3.5x at the function level when
 * this was written, so two MEASURED thresholds could not possibly coincide. Their coinciding is the
 * proof neither was measured here. (3F-2177's config asserted the opposite — that the scopes must
 * differ in both directions — which was true only while both were measurements.)
 *
 * WHEN THIS REDS ON LEGITIMATE GROWTH. That is the fitness function working, not crying wolf — the red
 * names the rule, the file and the measured value, so its stated cause IS its actual cause (contrast
 * 3F-2201, where a floor blamed a parallel store for an ordinary deletion). The response is to
 * refactor. Never slack added in advance.
 *
 * AND THERE IS NO LONGER A SECOND OPTION, WHICH IS WHY THIS PARAGRAPH CHANGED (3F-3408). It used to
 * read "refactor, OR record a dated exception carrying its measured value" — and nothing can record
 * one any more: the dated exception list and its ratchet went with 3F-2317's and 3F-3408's Deletes.
 * Nothing needs to, either. A red here is now only ever about a file the change TOUCHED, held at the
 * standard; a violation in a file nobody touched is reported at `warn` and exits 0. So the escape
 * hatch is gone and the thing it existed to excuse cannot red you in the first place.
 */

/**
 * ═══ THE TYPES, WHICH USED TO BE A DECLARATION FILE (3F-3607) ═══
 *
 * A `.d.mts` beside the threshold module carried these from 3F-2286. IT ENFORCED NOTHING, and
 * 3F-3607 proved that by plant rather than assuming it: there is no `allowJs`, so tsc never read
 * the `.mjs` beside it — a threshold set to the string `"NOT_A_NUMBER"` left `pnpm typecheck`
 * green — and
 * `tsconfig.json`'s `include`, `["packages/*\/src", "tests"]`, excludes this config outright, so a
 * JSDoc type repointed at a non-existent file left it green too. They were documentation for a
 * reader, which is what they are here. Nothing is re-homed as a declaration file nothing consults.
 *
 * @typedef {number | "off"} RuleThreshold
 *   One rule's threshold: a number, or the literal `"off"` when the rule does not apply to that
 *   scope. `"off"` is EXPLICIT rather than an absent key — an absent key is indistinguishable from
 *   an oversight, and a rule that goes silently unheld is exactly what nothing would notice; an
 *   explicit `"off"` has to be written on purpose.
 *
 * @typedef {{ cognitiveComplexity: RuleThreshold, maxLinesPerFunction: RuleThreshold }} ComplexityThreshold
 *   The rule thresholds a scope holds. `max-lines` left with the file ceiling (3F-2320).
 *
 * @typedef {"sonarjs/cognitive-complexity" | "max-lines-per-function"} EslintRuleId
 *   The eslint rule ids both scopes share.
 *
 * @typedef {"error" | "warn"} EslintSeverity
 *   The two severities a held rule can carry (@SCN-FIT-001, 3F-3462). `error` gates — eslint exits
 *   1; `warn` reports — every finding is printed and eslint exits 0. Both are eslint's own
 *   vocabulary, so neither is a number measured from this tree.
 *
 * @typedef {"off" | readonly [EslintSeverity, number] | readonly [EslintSeverity, { max: number, skipBlankLines: true, skipComments: true }]} RuleEntry
 *   One eslint rule entry: `"off"`, or `[severity, …]` in the shape that rule takes.
 */

/**
 * Production code — `packages/<pkg>/src`, `tests/checks` and `tests/steps`, excluding test files.
 *
 * WHERE EACH NUMBER CAME FROM. The citation is part of the contract, not decoration: a cited number
 * and an uncited one are indistinguishable once shipped, and the whole point of 3F-2286 is that these
 * numbers have provenance.
 *
 *   - `cognitiveComplexity` 15 — SonarSource's published COGNITIVE COMPLEXITY metric and the default
 *     of `sonarjs/cognitive-complexity`, the rule that implements it. It replaced a cyclomatic
 *     `complexity` of 10 (NIST SP 500-235 / McCabe) at 3F-2320, on the portfolio ruling of
 *     2026-09-18: cognitive complexity scores what makes code hard to READ — nesting and broken
 *     flow — where cyclomatic scores a flat `switch` like nested conditionals. The looser NUMBER is
 *     not a relaxation, because it is a number on a different scale: measured on this tree at the
 *     swap, six cyclomatic findings became eight cognitive ones, and only one function was over the
 *     old line and under the new.
 *   - `maxLinesPerFunction` 40 — Google engineering practices — a function past roughly 40 lines
 *     should be considered for breaking up. Robert Martin's Clean Code is stricter again at ~20; 40 is
 *     the more widely published of the two and the less contested.
 *   - `maxLines` 400 — GONE, and its going is the rule above enforced against itself (3F-2320). It was
 *     the one number here that named itself A CHOSEN ceiling with no external source, because no
 *     industry body publishes a hard file-length cap — which makes it exactly the self-chosen
 *     threshold this provenance rule forbids. The portfolio retired the file ceiling outright on
 *     2026-09-18; what a long file costs is taken per FUNCTION by the two rules that remain.
 *
 * @type {ComplexityThreshold}
 */
const PRODUCTION_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: 40,
};

/**
 * Test code — `**\/*.test.ts`. The same standard, with ONE rule switched off.
 *
 * WHY `max-lines-per-function` IS OFF HERE, AND WHY NO NUMBER REPLACES IT (operator-ruled 2026-08-02).
 * The rule measures production-function TRACTABILITY — can a reader hold this function in their head.
 * A `describe` / `it` callback is not that: it is a CONTAINER, and a `describe` holding fifteen tests
 * is not a 200-line function in the sense McCabe or Google's guidance addresses. Applying the
 * production number there generated 110 exceptions recording nothing about code quality, and a list
 * two-thirds noise is a list nobody reads — which defeats the point of visible debt.
 *
 * The important half is what is NOT done: no substitute number is invented. 3F-2177's config conceded
 * the same category error and answered it with 221 — the test tree's own measured maximum — which is
 * precisely the self-certification 3F-2286 removes. There is no external standard for test-container
 * length, so the honest move is to abstain from the rule and say so, not to fake a third number.
 *
 * NOT A CARVE-OUT. Test scope stays held to `cognitiveComplexity` 15 — the metric that genuinely
 * applies, at exactly the production number. Accepted residual, operator-ruled: a straight-line test
 * helper under cognitive 15 escapes. (It used to add "inside a sub-400-line file"; with the file
 * ceiling retired at 3F-2320 the residual is simply wider, which is stated rather than quietly
 * dropped.) Low-risk; revisit only if one actually appears.
 *
 * @type {ComplexityThreshold}
 */
const TEST_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: "off",
};

/**
 * One eslint rule HELD at one ceiling at one severity, in the shape THAT rule takes (3F-2317; the
 * severity added under @SCN-FIT-001, 3F-3462).
 *
 * WHY IT SITS BESIDE NUMBERS THAT ALL COME FROM OUTSIDE. It takes a ceiling and holds none: the
 * SHAPE is a property of eslint's rules, which are as external as the standard itself, so the
 * provenance guarantee above is untouched. THE SEVERITY IS AS EXTERNAL AS THE SHAPE — `"error"` and
 * `"warn"` are eslint's own vocabulary and neither is measured from this tree — so taking it as a
 * parameter does not bend the contract either. That is what lets ONE emitter serve all callers: the
 * scope blocks at `warn` (the report) and the same blocks restated at `error` over what the change
 * touched (the gate). Two emitters would be the agreeing-by-copy this codebase keeps removing: they
 * would agree on the shapes today and drift the first time eslint changed one.
 *
 * THE SHAPE IS NOT UNIFORM, AND GETTING IT WRONG IS SILENT. `sonarjs/cognitive-complexity` takes a
 * bare number (`["error", 15]`); `max-lines-per-function` takes an options object
 * (`["error", { max, … }]`). Hand eslint the wrong one and it does not complain — it mis-reads the
 * option and applies no ceiling at all, which looks exactly like a file that is under its ceiling.
 * AND NOTHING NOTICES IT ANY MORE (3F-3478). The cucumber arm that linted planted sources through the
 * real config and read the severity off the message was withdrawn with its scenario, and nothing
 * replaced it: there was no `.test.ts` beside the module these lines came from either — 3F-3245
 * deleted it, on the rule that a check's subject is its command — and 3F-3607 has since inlined the
 * lot into a config nothing imports. A reader reaching for either to cover a new emitter will find
 * neither — so a wrong shape here is now silent end to end. The arbiter, when one is needed, is the
 * RESOLVED config: `ESLint#calculateConfigForFile` prints the entry eslint actually holds a file at.
 *
 * `skipBlankLines: true, skipComments: true` RIDES ON EVERY EMITTED LINE RULE (3F-2395). The
 * threshold holds the CODE a reader must hold in their head, not the file's bytes. Counting
 * documentation put the cheapest route under a ceiling on DELETING the comment that explains why the
 * code is the shape it is — a fitness function pushing against what it exists to protect, and one
 * this tree has already paid: two of the largest reductions ever banked here were partly comment
 * compactions counted as line count. `fitness-functions.md`, the portfolio standard promoted from
 * an adopter's repository 2026-08-04, rules the counting mode; it is stated here rather than left to eslint's defaults
 * because the mode is part of what 40 and 400 MEAN, and changing it re-measures the whole population
 * at once and in silence.
 *
 * A `"off"` ceiling passes straight through to eslint's own severity vocabulary, so the test scope's
 * `max-lines-per-function` ABSTENTION survives unchanged — and it OUTRANKS the severity, because a
 * rule that does not apply to a scope does not apply at either severity. Inventing a number for it
 * here would reinstate the self-certification 3F-2286 exists to remove. THE BARE STRING IS THE POINT:
 * eslint normalises `"off"` to severity 0 while KEEPING the options the production block already set,
 * so a test file resolves to `[0, { max: 40, … }]`. Writing `[0]`, or omitting the rule, resolves
 * differently.
 *
 * THE SEVERITY IS REQUIRED, WITH NO DEFAULT. A default would be one of the two callers' answers
 * silently applied to the other, and getting it wrong is exactly as quiet as getting the option shape
 * wrong: a gate emitted at `warn` reports every violation in full and exits 0.
 *
 * @param {EslintRuleId} rule
 * @param {RuleThreshold} ceiling
 * @param {EslintSeverity} severity
 * @returns {RuleEntry}
 */
const ruleAtCeiling = (rule, ceiling, severity) => {
  if (ceiling === "off") return "off";
  return rule === "sonarjs/cognitive-complexity"
    ? [severity, ceiling]
    : [severity, { max: ceiling, skipBlankLines: true, skipComments: true }];
};

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
 * @param {EslintSeverity} severity
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
