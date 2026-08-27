/**
 * @unit for @SCN-ACT-002 — the step-command rule, over planted actions, in both directions.
 *
 * BOTH DIRECTIONS, BECAUSE ONE OF THEM IS THE ASSERTION. A rule that reds the offender proves
 * nothing on its own: a rule redding everything reds that too. The clean action drawing NOTHING is
 * what says the red was about the command rather than about the file having been read at all.
 *
 * AND THE CLEAN ACTION SAYS THE FORBIDDEN WORDS OUT LOUD. Its `run:` block argues in comments about
 * the `npx` route it used to take and names the bin it used to reach for — because this
 * repository's own three actions do exactly that, at length, and must go on being able to. A rule
 * matching the block's text rather than its commands would red that prose, and the check would be
 * a spell-checker.
 *
 * The @integration arm is tests/steps/selfContainedActions.steps.ts, which plants these same
 * actions as real directories and reaches them through the discovery the CLI uses.
 */

import { describe, expect, it } from "vitest";

import {
  PLANTED_BINS,
  PLANTED_ACTIONS,
  REACHES_FOR_A_BIN,
  RUNS_A_FILE_FROM_ELSEWHERE,
  RUNS_WHAT_TRAVELS_WITH_IT,
} from "../../../tests/fixtures/action-bundles/plantedActions.js";
import { stepCommandFaultsIn } from "./actionSteps.js";

/** Every fault the rule finds across the planted set. */
function faultsAcrossThePlantedSet() {
  return stepCommandFaultsIn(PLANTED_ACTIONS, PLANTED_BINS);
}

describe("[SCN-ACT-002] a step reaching for a workspace bin instead of the file beside it reds the check", () => {
  it("reds the step that reaches for a bin, naming the action, the step and the command", () => {
    const fault = faultsAcrossThePlantedSet().find(
      (found) => found.action === REACHES_FOR_A_BIN.action,
    );

    expect(fault).toBeDefined();
    expect(fault?.step).toBe("Do the work");
    // The command as the step spells it, so a reader can find the line rather than hunt for it.
    expect(fault?.command).toContain("widget-persist-measurements");
    expect(fault?.why).toContain("widget-persist-measurements");
    // AND IT SAYS WHERE THAT RESOLVES FROM. "This is not allowed" sends its reader to the rule;
    // naming the caller's node_modules sends them to the fix.
    expect(fault?.why).toContain("node_modules");
  });

  it("reds a step running a file that does not travel with the action, though it names no bin", () => {
    const fault = faultsAcrossThePlantedSet().find(
      (found) => found.action === RUNS_A_FILE_FROM_ELSEWHERE.action,
    );

    expect(fault).toBeDefined();
    expect(fault?.why).toContain("persistCli.js");
    expect(fault?.why).toContain("github.action_path");
  });

  it("says nothing about the action running the file committed beside it", () => {
    expect(
      faultsAcrossThePlantedSet().filter(
        (found) => found.action === RUNS_WHAT_TRAVELS_WITH_IT.action,
      ),
    ).toEqual([]);
  });

  it("reads a step's commands and not its prose, so an action may argue about the route it dropped", () => {
    // The clean action's `run:` block names the bin and the npx route in its comments. Held against
    // the raw text this reds; held against the commands it does not, and that difference is the
    // whole reason the rule parses.
    expect(RUNS_WHAT_TRAVELS_WITH_IT.yaml).toContain("widget-persist-measurements");
    expect(RUNS_WHAT_TRAVELS_WITH_IT.yaml).toContain("npx --no");
    expect(stepCommandFaultsIn([RUNS_WHAT_TRAVELS_WITH_IT], PLANTED_BINS)).toEqual([]);
  });

  it("finds every offender, so one red does not hide the next", () => {
    expect(faultsAcrossThePlantedSet().map((found) => found.action).sort()).toEqual(
      [REACHES_FOR_A_BIN.action, RUNS_A_FILE_FROM_ELSEWHERE.action].sort(),
    );
  });

  it("says nothing about a step that hands off to another action rather than running a command", () => {
    // The clean action's second step is a `uses:`, which names no command of its own — a step with
    // nothing to read must not be read as a step reaching nowhere.
    expect(RUNS_WHAT_TRAVELS_WITH_IT.yaml).toContain("uses: actions/upload-artifact");
    expect(stepCommandFaultsIn([RUNS_WHAT_TRAVELS_WITH_IT], PLANTED_BINS)).toEqual([]);
  });
});
