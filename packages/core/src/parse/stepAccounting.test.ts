import { describe, it, expect, beforeEach } from "vitest";
import { stepAccounting } from "./stepAccounting.js";
import { commandRuns } from "./commandRuns.js";
import { qualifiedStepName } from "./stepNames.js";
import {
  isGitHubPlumbingStep,
  notChecksApplied,
  reconcilerSteps,
} from "../domain/fitnessDiscovery.js";
import { ciWorkflowSteps, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";

let CI_YML: string;
beforeEach(() => {
  CI_YML = [
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
});

const SCRIPTS: PackageJsonScripts = {
  scripts: {
    test: "vitest run",
    build: "tsc -b",
    "lint:sweep": "madge --circular",
    "lint:depth": "depcruise src",
    "lint:dump": 'printf "%s" "$STEPS_JSON" > ci-steps.json',
    "lint:reconcile": "spec-controller balance --features features --ci ci.yml",
  },
};

const INVOCATION = "spec-controller balance";

const UNIT_RUNNER: Readonly<Record<string, string | null>> = { unit: "vitest" };
const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

const reconcilerOver = (
  sources: readonly string[],
  names: readonly string[]
): ((step: PipelineStep) => boolean) =>
  reconcilerSteps(
    ciWorkflowSteps(sources),
    (step) => qualifiedStepName(step, names),
    (command) => commandRuns(command, INVOCATION, SCRIPTS.scripts ?? {})
  ).isReconciler;

const notChecksOver = (
  sources: readonly string[],
  names: readonly string[],
  entries: readonly string[]
): ((step: PipelineStep) => boolean) =>
  notChecksApplied(ciWorkflowSteps(sources), (step) => qualifiedStepName(step, names), entries).isExcluded;

const excludedFromDiscoveryBy =
  (
    isReconciler: (step: PipelineStep) => boolean,
    isNamedANonCheck: (step: PipelineStep) => boolean
  ): ((step: PipelineStep) => boolean) =>
  (step) =>
    isReconciler(step) || isNamedANonCheck(step) || isGitHubPlumbingStep(step);

describe("[SCN-USG-018] candidates, runners, the reconciler, the excluded and GitHub's plumbing sum to the steps read", () => {
  it("counts each disposition and adds them back up to the steps it read", () => {
    const isReconciler = reconcilerOver([CI_YML], ["ci.yml"]);
    const isNamedANonCheck = notChecksOver([CI_YML], ["ci.yml"], [
      "ci.yml:ci:actions/checkout@v4",
      "ci.yml:ci:Install",
    ]);
    expect(
      stepAccounting(
        ciWorkflowSteps([CI_YML]),
        SCRIPTS,
        UNIT_RUNNER,
        isReconciler,
        isNamedANonCheck,
        excludedFromDiscoveryBy(isReconciler, isNamedANonCheck)
      )
    ).toEqual({
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
    const sources = [
      [
        "jobs:",
        "  sweep:",
        "    steps:",
        "      - name: Announce",
        "      - uses: 3",
        "      -",
        "      - name: Depth check",
        "        run: pnpm lint:depth",
      ].join("\n"),
    ];
    const isReconciler = reconcilerOver(sources, ["nightly.yml"]);
    const isNamedANonCheck = notChecksOver(sources, ["nightly.yml"], []);
    expect(
      stepAccounting(
        ciWorkflowSteps(sources),
        SCRIPTS,
        NO_RUNNERS,
        isReconciler,
        isNamedANonCheck,
        excludedFromDiscoveryBy(isReconciler, isNamedANonCheck)
      )
    ).toEqual({
      stepsRead: 1,
      candidates: 1,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      plumbing: 0,
      accountedFor: 1,
    });
  });
});
