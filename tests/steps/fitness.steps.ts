/**
 * The ONE step-definition file the `fitness` cucumber profile loads (3F-3146, under 3F-3138).
 *
 * A converted fitness check is a scenario whose configured row — `specController.fitnessChecks`
 * — carries its characteristic and the command that returns a violation. Every such scenario
 * shares the same abstract Given/When/Then, so the step-definition COUNT is a constant
 * rather than a function of how many checks convert: one shape for the static case, one more
 * for the measured case, and no more however many rows the manifest grows.
 *
 * IT IS THE WHOLE OF WHAT THE FITNESS PASS LOADS, WHICH IS WHY IT IS NAMED RATHER THAN
 * GLOBBED. `cucumber.js`'s `fitness` profile requires this path and nothing else — no
 * behavioural step definitions, no `support/world.ts`, no hooks. That coupling is the one
 * 3F-3114 warns a consumer about, and a profile that loaded the behavioural tree would
 * reintroduce it the moment somebody added a `BeforeAll` over there.
 *
 * ═══ TWO STEP DEFINITIONS, AND EXACTLY TWO HOWEVER MANY CHECKS CONVERT ═══
 *
 * The static case asserts an EXIT CODE; the measured case asserts that a NUMBER arrived and posts
 * it. Different assertions over different evidence, so they are two sentences rather than one with
 * a branch in it — and the corpus says which a scenario is, because a generated scenario is emitted
 * from its row and the row's shape already says whether it carries a bar. Neither sentence names a
 * characteristic or a command, which is what holds the count at two: a step text mentioning either
 * would need a third registration for the next check that converted.
 *
 * ═══ THE STATIC RUNNER (@SCN-LNT-023, 3F-3147) ═══
 *
 * ONE SENTENCE, AND IT NAMES NEITHER THE CHARACTERISTIC NOR THE COMMAND. Every converted static
 * check in every target matches the same step below, because everything that varies between two
 * such checks is in the configured row rather than in the corpus. That is what holds the count at
 * one: a step text mentioning `complexity`, or a command, would need a second registration for the
 * next check to convert, and the fifteenth target would have fifteen.
 *
 * IT IS WIRING AND NOTHING ELSE. The verdict, the row resolution and the message all live in
 * `static-checks/fitnessRunner.ts` with the process injected, so they are proved by a @unit arm
 * that spawns nothing. What is here is the part no unit test can reach: reading the running
 * scenario's tag line, and turning a fault into a thrown assertion.
 *
 * THE `@SCN` COMES OFF THE TAG LINE, NEVER OFF THE SCENARIO'S NAME. Cucumber hands the hook the
 * running pickle's tags; a title is prose a person edits, and recovering an identifier from one is
 * the name-match posting @SCN-LNT-002 retired. `SCN_TAG` is the reader that already answers "which
 * tag on a scenario is its @SCN" for the fitness pass's own report — one spelling, so the runner
 * and the credit reader cannot come to disagree about a corpus neither of them wrote.
 *
 * THE HOOK IS TAG-SCOPED BECAUSE THIS FILE IS LOADED TWICE. The `fitness` profile names it, and
 * the default profile's `tests/steps/**` glob picks it up as well. `{ tags: "@fitness" }` keeps the
 * hook off every behavioural scenario in the other pass rather than relying on that pass's tag
 * filter to keep the two apart.
 *
 * Parent: 3F-3138 — the general shape of a converted fitness check.
 */

import { Before, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

import { SCN_TAG } from "../../packages/core/src/parse/cucumber.js";
import {
  fitnessCheckFault,
  fitnessChecksAt,
  fitnessCommandsAt,
  fitnessMeasurement,
  postFitnessMeasurement,
  spawnFitnessCommand,
} from "../../packages/spec-controller/static-checks/fitnessRunner.js";
import { FITNESS_AXIS_TAG } from "../../packages/core/src/parse/scenarios.js";

// @SCN-LNT-023 — the static half of the fitness pass: the row's command is run and its exit code
// is the scenario's verdict. The @unit pins are in
// packages/spec-controller/static-checks/fitnessRunner.test.ts and the @integration arm in
// tests/steps/fitnessRunner.steps.ts.

/** The `@SCN` of the scenario the pass is currently running, or null before it has started one. */
let runningScn: string | null = null;

// @SCN-LNT-023
Before({ tags: `@${FITNESS_AXIS_TAG}` }, function (scenario) {
  runningScn = null;
  for (const tag of scenario.pickle.tags) {
    const match = SCN_TAG.exec(tag.name);
    if (match) runningScn = match[1]!;
  }
});

// @SCN-LNT-023
Then("the check this scenario names finds no violations", function () {
  // A scenario on the axis carrying no @SCN cites nothing, so there is no row to look it up by.
  // `lint:scn-tags` holds the corpus to carrying one; this is what the RUNNER does if it ever
  // meets one anyway, rather than resolving `null` against the registry and reporting a missing
  // row for a scenario whose fault is that it named no scenario.
  assert.ok(
    runningScn !== null,
    "this fitness scenario carries no @SCN, so no configured row can name it"
  );
  const fault = fitnessCheckFault(runningScn, fitnessCommandsAt(process.cwd()), spawnFitnessCommand);
  assert.equal(fault, null, fault ?? "");
});

/* ═══ THE MEASURED RUNNER (@SCN-LNT-024, 3F-3148) ═══════════════════════════════════════════════
 *
 * THE NUMBER IS THE EVIDENCE, WHICH IS WHY THIS SENTENCE EXISTS BESIDE THE ONE ABOVE. It runs the
 * row's command, reads the number off what the command printed, and posts it as this run's credit
 * for the characteristic the row names, citing the `@SCN` the hook above already took off the
 * running scenario's tag line. No registry hop, no corpus lookup: both terms of the citation are in
 * hand before the command starts.
 *
 * IT IS WIRING AND NOTHING ELSE, exactly as the static sentence is. Which row a scenario resolves
 * to, what counts as a number, what a fault says and which rows survive in the artefact all live in
 * `static-checks/fitnessRunner.ts` with the process injected. What is here is the order: post what
 * was measured, then fail on the fault — and `postFitnessMeasurement` writing nothing for a `null`
 * is what makes that order safe to state without a branch. A step definition holding an `if` about
 * whether to post would be holding half the ruling.
 *
 * THE BAR IS NOT HERE AND MUST NEVER BE. One bar per characteristic and it belongs to the ledger
 * (3F-2509); a scenario that compared its own number would be grading its own homework, and the
 * ledger would transcribe a verdict rather than reconcile one. So this scenario passes whenever its
 * command yielded a number — whether that number clears its bar is the ledger's sentence.
 */

// @SCN-LNT-024
Then("the check this scenario names reports its measurement", function () {
  assert.ok(
    runningScn !== null,
    "this fitness scenario carries no @SCN, so no configured row can name it"
  );
  const root = process.cwd();
  const outcome = fitnessMeasurement(
    runningScn,
    fitnessChecksAt(root),
    fitnessCommandsAt(root),
    spawnFitnessCommand
  );
  postFitnessMeasurement(root, outcome.measurement);
  assert.equal(outcome.fault, null, outcome.fault ?? "");
});
