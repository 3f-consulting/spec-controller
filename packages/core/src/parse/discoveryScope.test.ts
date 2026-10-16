import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import { describe, it, expect, beforeEach } from "vitest";
import { discoveryScope } from "./discoveryScope.js";
import type { PipelineStep } from "../domain/pipelineStep.js";

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
    "      - name: Rule check",
    "        run: pnpm lint:rules",
  ].join("\n");
});

let NIGHTLY_YML: string;
beforeEach(() => {
  NIGHTLY_YML = [
    "jobs:",
    "  sweep:",
    "    steps:",
    "      - name: Sweep check",
    "        run: pnpm lint:sweep",
    "      - name: Depth check",
    "        run: pnpm lint:depth",
    "  audit:",
    "    steps:",
    "      - name: Audit",
    "        run: pnpm audit --audit-level=high",
  ].join("\n");
});

const SCRIPTS = {
  scripts: {
    test: "vitest run",
    "lint:rules": "eslint .",
    "lint:sweep": "madge --circular",
    "lint:depth": "depcruise src",
    build: "tsc -b",
  },
};

const UNIT_RUNNER: Readonly<Record<string, string | null>> = { unit: "vitest" };

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

const excluding =
  (...identities: readonly string[]) =>
  (step: PipelineStep): boolean =>
    identities.includes(step.identity);

const excludingNothing = (): boolean => false;

describe("[SCN-USG-020] discoveryScope — the workflows and the jobs a run read", () => {
  it("names every workflow and every job, with the steps it read from each", () => {
    expect(
      discoveryScope(
        ciWorkflowSteps([CI_YML, NIGHTLY_YML]),
        ["ci.yml", "nightly.yml"],
        SCRIPTS,
        UNIT_RUNNER,
        excluding("Install")
      )
    ).toEqual([
      { source: "ci.yml", job: "ci", steps: 4, candidates: 1 },
      { source: "nightly.yml", job: "audit", steps: 1, candidates: 1 },
      { source: "nightly.yml", job: "sweep", steps: 2, candidates: 2 },
    ]);
  });

  it("adds no steps for a job that calls a reusable workflow, or for a job with no body", () => {
    const withStepless = [
      CI_YML,
      "  reuse:",
      "    uses: ./.github/workflows/x.yml",
      "  empty:",
    ].join("\n");
    expect(discoveryScope(ciWorkflowSteps([withStepless]), ["ci.yml"], SCRIPTS, NO_RUNNERS, excludingNothing)).toEqual([
      { source: "ci.yml", job: "ci", steps: 4, candidates: 3 },
    ]);
  });

  it("reads nothing from a document that parses to no jobs", () => {
    expect(discoveryScope(ciWorkflowSteps(["name: CI\non: [push]\n"]), ["ci.yml"], SCRIPTS, NO_RUNNERS, excludingNothing)).toEqual([]);
  });
});
