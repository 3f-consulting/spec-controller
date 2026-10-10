import { describe, it, expect, beforeEach } from "vitest";
import { stepAccounting } from "./stepAccounting.js";
import { reconcilerSteps } from "./reconcilerSteps.js";
import { stepExclusions } from "./stepExclusions.js";
import type { CiWorkflowStep, PackageJsonScripts } from "./checkScriptsRunInCI.js";

let CI_YML: string;
beforeEach(() => {
  CI_YML = [
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
});
