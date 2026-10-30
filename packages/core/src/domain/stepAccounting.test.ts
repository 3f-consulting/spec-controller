import { describe, it, expect } from "vitest";
import { accountedForOf, stepAccountOf, stepDispositions, type StepTest } from "./uncitedFitnessFunctions.js";
import type { JobStepAccount } from "./evidenceReconciliation.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";
import { qualifiedStepName } from "../parse/stepNames.js";

const noRole = (): undefined => undefined;

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
    "      - name: Reconciliation",
    "        run: pnpm lint:reconcile",
  ].join("\n");

const nightlyYml = (): string =>
  [
    "jobs:",
    "  sweep:",
    "    steps:",
    "      - name: Depth check",
    "        run: pnpm lint:depth",
    "      - uses: actions/cache@v4",
    "  audit:",
    "    steps:",
    "      - name: Unit tests",
    "        run: pnpm test",
  ].join("\n");

const named =
  (...identities: readonly string[]): StepTest =>
  (step) =>
    identities.includes(step.identity);

const NONE: StepTest = () => false;

const COUNTS = ["stepsRead", "candidates", "runners", "reconciler", "excluded", "plumbing"] as const;

const summedOver = (rows: readonly JobStepAccount[], count: (typeof COUNTS)[number]): number =>
  rows.reduce((sum, row) => sum + row[count], 0);

describe("[SCN-USG-018] the step account's total sums each count over its rows, and the steps its dispositions account for equal the steps read", () => {
  it("sums each count over the rows of every workflow and job, and adds the dispositions back up to the steps read", () => {
    const dispositionOf = stepDispositions({
      isReconciler: named("Dump this run's step record", "Reconciliation"),
      isNamedANonCheck: named("actions/checkout@v4", "Install"),
      runsARunner: named("Unit tests"),
    });
    const account = stepAccountOf(workflowSteps([ciYml(), nightlyYml()], ["ci.yml", "nightly.yml"]), dispositionOf, qualifiedStepName, noRole);
    expect(account.total).toEqual({
      stepsRead: 13,
      candidates: 3,
      runners: 2,
      reconciler: 2,
      excluded: 2,
      plumbing: 4,
    });
    expect(COUNTS.map((count) => account.total[count])).toEqual(COUNTS.map((count) => summedOver(account.byJob, count)));
    expect(account.byJob).toHaveLength(3);
    expect(accountedForOf(account.total)).toBe(account.total.stepsRead);
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
    expect(stepAccountOf(workflowSteps([source], ["ci.yml"]), dispositionOf, qualifiedStepName, noRole).total).toEqual({
      stepsRead: 1,
      candidates: 1,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      plumbing: 0,
    });
  });
});
