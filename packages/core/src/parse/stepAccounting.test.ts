import { describe, it, expect } from "vitest";
import { stepAccounting } from "./stepAccounting.js";
import { reconcilerSteps } from "./reconcilerSteps.js";
import { stepExclusions } from "./stepExclusions.js";
import { runningStaticChecks } from "./runningStaticChecks.js";
import type { CiWorkflowStep, PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { RELEASE_YML } from "./releaseWorkflow.testkit.js";

const CI_YML = [
  "jobs:",
  "  ci:",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "      - name: Install",
  "        run: pnpm install --frozen-lockfile",
  "      - name: Unit tests",
  "        run: pnpm test",
  "      - name: Sweep check",
  "        run: pnpm lint:sweep",
  "      - uses: github/codeql-action/analyze@v3",
  "      - name: Dump this run's step record",
  "        env:",
  "          STEPS_JSON: ${{ toJSON(steps) }}",
  "        run: pnpm lint:dump",
  "      - name: Self-reconciliation balance",
  "        run: pnpm lint:reconcile",
].join("\n");

const NIGHTLY_YML = [
  "jobs:",
  "  sweep:",
  "    steps:",
  "      - name: Depth check",
  "        run: pnpm lint:depth",
  "      - name: Audit",
  "        run: pnpm audit --audit-level=high",
].join("\n");

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
): ((step: CiWorkflowStep) => boolean) =>
  reconcilerSteps(sources, names, INVOCATION, SCRIPTS).isReconciler;

const notChecksOver = (
  sources: readonly string[],
  names: readonly string[],
  entries: readonly string[]
): ((step: CiWorkflowStep) => boolean) => stepExclusions(sources, names, entries).isExcluded;

describe("[SCN-USG-018] stepAccounting — every step read, accounted for as exactly one thing", () => {
  it("counts each disposition and adds them back up to the steps it read", () => {
    expect(
      stepAccounting(
        [CI_YML],
        SCRIPTS,
        UNIT_RUNNER,
        reconcilerOver([CI_YML], ["ci.yml"]),
        notChecksOver([CI_YML], ["ci.yml"], [
          "ci.yml:ci:actions/checkout@v4",
          "ci.yml:ci:Install",
        ])
      )
    ).toEqual({
      stepsRead: 7,
      candidates: 2,
      runners: 1,
      reconciler: 2,
      excluded: 2,
      accountedFor: 7,
    });
  });

  it("reads every workflow it was given, not the first of them", () => {
    const account = stepAccounting(
      [CI_YML, NIGHTLY_YML],
      SCRIPTS,
      UNIT_RUNNER,
      reconcilerOver([CI_YML, NIGHTLY_YML], ["ci.yml", "nightly.yml"]),
      notChecksOver([CI_YML, NIGHTLY_YML], ["ci.yml", "nightly.yml"], ["ci.yml:ci:Install"])
    );
    expect(account).toEqual({
      stepsRead: 9,
      candidates: 5,
      runners: 1,
      reconciler: 2,
      excluded: 1,
      accountedFor: 9,
    });
  });

  it("counts a step that is both a runner and a named non-check once, never twice", () => {
    const account = stepAccounting(
      [CI_YML],
      SCRIPTS,
      UNIT_RUNNER,
      reconcilerOver([CI_YML], ["ci.yml"]),
      notChecksOver([CI_YML], ["ci.yml"], ["ci.yml:ci:Unit tests", "ci.yml:ci:Install"])
    );
    expect(account).toEqual({
      stepsRead: 7,
      candidates: 3,
      runners: 0,
      reconciler: 2,
      excluded: 2,
      accountedFor: 7,
    });
  });

  it("counts a step that is both the reconciler and a named non-check once, as the reconciler", () => {
    const account = stepAccounting(
      [CI_YML],
      SCRIPTS,
      UNIT_RUNNER,
      reconcilerOver([CI_YML], ["ci.yml"]),
      notChecksOver([CI_YML], ["ci.yml"], ["ci.yml:ci:Self-reconciliation balance"])
    );
    expect(account).toEqual({
      stepsRead: 7,
      candidates: 4,
      runners: 1,
      reconciler: 2,
      excluded: 0,
      accountedFor: 7,
    });
  });

  it("takes the candidate figure from the observer rather than re-deriving the rule", () => {
    const notChecks = notChecksOver([CI_YML], ["ci.yml"], ["ci.yml:ci:Install"]);
    const isReconciler = reconcilerOver([CI_YML], ["ci.yml"]);
    const account = stepAccounting([CI_YML], SCRIPTS, UNIT_RUNNER, isReconciler, notChecks);
    expect(account.candidates).toBe(
      runningStaticChecks(
        [CI_YML],
        SCRIPTS,
        UNIT_RUNNER,
        () => null,
        (step) => isReconciler(step) || notChecks(step)
      ).length
    );
  });

  it("accounts for a job every step of which something took out", () => {
    expect(
      stepAccounting(
        [RELEASE_YML],
        SCRIPTS,
        NO_RUNNERS,
        reconcilerOver([RELEASE_YML], ["release.yml"]),
        notChecksOver([RELEASE_YML], ["release.yml"], [
          "release.yml:publish:Build",
          "release.yml:publish:Publish",
        ])
      )
    ).toEqual({
      stepsRead: 2,
      candidates: 0,
      runners: 0,
      reconciler: 0,
      excluded: 2,
      accountedFor: 2,
    });
  });

  it("accounts for every step of a pipeline whose manifest has named nothing", () => {
    expect(
      stepAccounting(
        [NIGHTLY_YML],
        SCRIPTS,
        NO_RUNNERS,
        reconcilerOver([NIGHTLY_YML], ["nightly.yml"]),
        notChecksOver([NIGHTLY_YML], ["nightly.yml"], [])
      )
    ).toEqual({
      stepsRead: 2,
      candidates: 2,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      accountedFor: 2,
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
    expect(
      stepAccounting(
        sources,
        SCRIPTS,
        NO_RUNNERS,
        reconcilerOver(sources, ["nightly.yml"]),
        notChecksOver(sources, ["nightly.yml"], [])
      )
    ).toEqual({
      stepsRead: 1,
      candidates: 1,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      accountedFor: 1,
    });
  });

  it("accounts for nothing where the run read no CI configuration", () => {
    expect(
      stepAccounting([], SCRIPTS, UNIT_RUNNER, reconcilerOver([], []), notChecksOver([], [], []))
    ).toEqual({
      stepsRead: 0,
      candidates: 0,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      accountedFor: 0,
    });
  });
});
