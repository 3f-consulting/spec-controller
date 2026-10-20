import { describe, it, expect } from "vitest";
import { everyStepAccountedFor, stepAccounting, stepDispositions, type StepTest } from "./uncitedFitnessFunctions.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";

const ciYml = (): string =>
  [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "      - uses: actions/cache@v4",
    "      - name: Install",
    "        run: pnpm install --frozen-lockfile",
    "      - name: Unit tests",
    "        run: pnpm test",
    "      - name: Sweep check",
    "        run: pnpm lint:sweep",
    "      - uses: github/codeql-action/analyze@v3",
    "      - uses: actions/upload-artifact@v4",
    "      - name: Dump this run's step record",
    "        env:",
    "          STEPS_JSON: ${{ toJSON(steps) }}",
    "        run: pnpm lint:dump",
    "      - name: Self-reconciliation balance",
    "        run: pnpm lint:reconcile",
  ].join("\n");

const named =
  (...identities: readonly string[]): StepTest =>
  (step) =>
    identities.includes(step.identity);

const NONE: StepTest = () => false;

describe("[SCN-USG-018] candidates, runners, the reconciler, the excluded and GitHub's plumbing sum to the steps read", () => {
  it("counts each disposition and adds them back up to the steps it read", () => {
    const dispositionOf = stepDispositions({
      isReconciler: named("Dump this run's step record", "Self-reconciliation balance"),
      isNamedANonCheck: named("actions/checkout@v4", "Install"),
      runsARunner: named("Unit tests"),
    });
    expect(stepAccounting(workflowSteps([ciYml()]), dispositionOf)).toEqual({
      stepsRead: 10,
      candidates: 2,
      runners: 1,
      reconciler: 2,
      excluded: 2,
      plumbing: 3,
      accountedFor: 10,
    });
  });

  it("reads no step from a list item that neither runs a command nor uses an action", () => {
    const source = [
      "jobs:",
      "  sweep:",
      "    steps:",
      "      - name: Announce",
      "      - uses: 3",
      "      -",
      "      - name: Depth check",
      "        run: pnpm lint:depth",
    ].join("\n");
    const dispositionOf = stepDispositions({ isReconciler: NONE, isNamedANonCheck: NONE, runsARunner: NONE });
    expect(stepAccounting(workflowSteps([source]), dispositionOf)).toEqual({
      stepsRead: 1,
      candidates: 1,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      plumbing: 0,
      accountedFor: 1,
    });
  });

  it("finds the account balanced when the dispositions add up to the steps read, and unbalanced otherwise", () => {
    const account = { stepsRead: 10, candidates: 4, runners: 1, reconciler: 2, excluded: 3 };
    expect(everyStepAccountedFor({ ...account, accountedFor: 10 })).toBe(true);
    expect(everyStepAccountedFor({ ...account, accountedFor: 9 })).toBe(false);
    expect(everyStepAccountedFor({ ...account, accountedFor: 11 })).toBe(false);
  });
});
