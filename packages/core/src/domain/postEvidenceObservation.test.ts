import { describe, expect, it } from "vitest";
import { commandRuns, shellReading } from "../inputs/shell.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../inputs/cucumber.js";
import { parseJunitEvidenceObservations, parsePytestEvidenceObservations } from "../inputs/junit.js";
import { workflowSteps } from "../inputs/parsedWorkflows.test-utils.js";
import { parseRspecEvidenceObservations } from "../inputs/rspec.js";
import { targetConfigurationFrom } from "../inputs/manifest.js";
import { parseVitestEvidenceObservations } from "../inputs/vitest.js";
import type { ClaimCode } from "./claimCodes.js";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { provenanceOf } from "./provenance.js";
import type { ExecutableClaim } from "./postEvidenceObligation.js";
import {
  claimPostedTo,
  fitnessObservationsOf,
  stepDispositionOf,
  type EvidenceObservation,
  type PipelineStep,
  type PipelineStepAction,
  type RecordedCheckStep,
  type StepDisposition,
  type StepReadings,
} from "./postEvidenceObservation.js";

const ONE: ClaimCode = { featureCode: "ONE", number: "001" };
const TWO: ClaimCode = { featureCode: "ONE", number: "002" };
const PHANTOM: ClaimCode = { featureCode: "ONE", number: "999" };

type Posted = () => readonly EvidenceObservation[];

const vitest = (status: string, title = "[CLM-ONE-001] a test", fullName = title): EvidenceObservation[] =>
  parseVitestEvidenceObservations({ testResults: [{ name: "a.test.ts", status: "passed", assertionResults: [{ title, fullName, status }] }] });

const vitestFile = (message: string): EvidenceObservation[] =>
  parseVitestEvidenceObservations({ testResults: [{ name: "a.test.ts", status: "failed", message, assertionResults: [] }] });

type Testcase = Parameters<typeof parseJunitEvidenceObservations>[0] extends infer R
  ? R extends { testsuites?: { testsuite?: ReadonlyArray<{ testcase?: ReadonlyArray<infer T> }> } }
    ? T
    : never
  : never;

const junit = (testcase: Testcase, suite = "a.suite"): EvidenceObservation[] =>
  parseJunitEvidenceObservations({ testsuites: { testsuite: [{ name: suite, testcase: [testcase] }] } });

const pytest = (testcase: Testcase): EvidenceObservation[] =>
  parsePytestEvidenceObservations({ testsuites: { testsuite: [{ name: "pytest", testcase: [testcase] }] } });

const clmProperty = (...codes: readonly string[]) => ({ property: codes.map((value) => ({ name: "clm", value })) });

const rspec = (status: string, description = "[CLM-ONE-001] a spec", fullDescription = description): EvidenceObservation[] =>
  parseRspecEvidenceObservations({ examples: [{ description, full_description: fullDescription, status, file_path: "./spec/a_spec.rb" }] });

const rspecLoadError = (message: string): EvidenceObservation[] =>
  parseRspecEvidenceObservations({ examples: [], summary: { errors_outside_of_examples_count: 1 }, messages: [message] });

const scenario = (tags: readonly string[], statuses: readonly string[], name = "one adds one"): CucumberJsonReport => [
  {
    uri: "one.feature",
    elements: [{ name, tags: tags.map((tag) => ({ name: tag })), steps: statuses.map((status) => ({ keyword: "Given ", name: "one adds one", result: { status } })) }],
  },
];

const cucumber = (tags: readonly string[], statuses: readonly string[]): EvidenceObservation[] =>
  parseCucumberEvidenceObservations(scenario(tags, statuses), undefined, () => []);

const workflow = (step: string, jobExtra = ""): string =>
  `jobs:\n  build:\n    runs-on: ubuntu-latest\n${jobExtra}    steps:\n${step}`;

const stepsOf = (step: string, jobExtra = ""): PipelineStep[] => workflowSteps([workflow(step, jobExtra)], ["ci.yml"]);

const readingsOf = (overrides: Partial<StepReadings>): StepReadings => ({
  runsTheReconciler: (command) => commandRuns(command, "spec-controller balance", overrides.scripts ?? {}),
  nonChecks: [],
  runners: {},
  scripts: {},
  shell: shellReading,
  ...overrides,
});

type StepAsWritten = {
  readonly name?: string;
  readonly id?: string;
  readonly continueOnError?: unknown;
  readonly jobContinueOnError?: unknown;
} & PipelineStepAction;

// A step of the job build in ci.yml, as the workflow wrote it, that neither writes out the step record nor only sets the job up.
const stepOf = (written: StepAsWritten): PipelineStep => ({ workflow: "ci.yml", job: "build", writesStepRecord: false, plumbing: false, ...written });

const fitness = (steps: readonly StepAsWritten[], recorded?: readonly RecordedCheckStep[]): EvidenceObservation[] =>
  fitnessObservationsOf(steps.map(stepOf), () => "candidate", recorded);

const CITING_STEP: StepAsWritten = { id: "CLM-ONE-001", name: "Lint", command: "pnpm lint" };

const claim = (claimCode?: ClaimCode): ExecutableClaim => ({ ...(claimCode === undefined ? {} : { claimCode }), file: "one.feature", title: "t", obligations: [{ kind: "unit" }] });

describe("balance posts only the steps that prove something", () => {
  it.each<[string, { step: string; readings: Partial<StepReadings>; countedAs: StepDisposition; posted: number }]>([
    ["CLM-OBS-002", { step: "      - uses: actions/dependency-review-action@v4\n", readings: {}, countedAs: "candidate", posted: 1 }],
    ["CLM-OBS-003", { step: "      - uses: someone/checkout@v1\n", readings: {}, countedAs: "candidate", posted: 1 }],
    ["CLM-OBS-004", { step: "      - run: pnpm audit-the-tree\n", readings: {}, countedAs: "candidate", posted: 1 }],
    ["CLM-OBS-005", { step: "      - run: gradle lint\n", readings: { runners: { unit: "gradle test" } }, countedAs: "candidate", posted: 1 }],
    ["CLM-OBS-006", { step: "      - run: eslint vitest.config.ts\n", readings: { runners: { unit: "vitest" } }, countedAs: "candidate", posted: 1 }],
    ["CLM-OBS-007", { step: "      - run: vitest run | tee out.txt\n", readings: { runners: { unit: "vitest" } }, countedAs: "candidate", posted: 1 }],
    ["CLM-OBS-008", { step: "      - run: pnpm test\n", readings: { runners: { unit: null }, scripts: { test: "vitest run" } }, countedAs: "candidate", posted: 1 }],
    ["CLM-OBS-009", { step: "      - run: pnpm test\n", readings: { runners: { unit: "vitest" }, scripts: { test: "vitest run" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-009", { step: "      - run: npm test\n", readings: { runners: { unit: "vitest" }, scripts: { test: "vitest run" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-009", { step: "      - run: yarn test\n", readings: { runners: { unit: "vitest" }, scripts: { test: "vitest run" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-009", { step: "      - run: cross-env CI=1 pnpm test\n", readings: { runners: { unit: "vitest" }, scripts: { test: "vitest run" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-009", { step: "      - run: xvfb-run pnpm test\n", readings: { runners: { unit: "vitest" }, scripts: { test: "vitest run" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-009", { step: "      - run: npm run test:unit\n", readings: { runners: { unit: "vitest" }, scripts: { "test:unit": "vitest run" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: CI=1 npx vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: npx -p x vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: timeout -k 5 600 vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: uv run --with x pytest\n", readings: { runners: { unit: "pytest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: yarn exec vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: nohup vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: nice vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: env -S 'pnpm test'\n", readings: { runners: { unit: "vitest" }, scripts: { test: "vitest run" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: timeout 600 vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: bundle exec rspec\n", readings: { runners: { unit: "rspec" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: python -m pytest\n", readings: { runners: { unit: "pytest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-010", { step: "      - run: uv run pytest\n", readings: { runners: { unit: "pytest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-011", { step: "      - run: pnpm lint && vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 }],
    ["CLM-OBS-012", { step: "      - run: spec-controller balance --features features\n", readings: {}, countedAs: "reconciler", posted: 0 }],
    ["CLM-OBS-013", { step: "      - name: Record\n        env:\n          STEPS: ${{ toJSON(steps) }}\n        run: echo done\n", readings: {}, countedAs: "reconciler", posted: 0 }],
    ["CLM-OBS-014", { step: "      - name: Install\n        run: pnpm install\n", readings: { nonChecks: ["ci.yml:build:Install"] }, countedAs: "nonCheck", posted: 0 }],
    ["CLM-OBS-015", { step: "      - uses: actions/checkout@v4\n", readings: {}, countedAs: "plumbing", posted: 0 }],
    ["CLM-OBS-015", { step: "      - uses: actions/setup-node@v4\n", readings: {}, countedAs: "plumbing", posted: 0 }],
    ["CLM-OBS-015", { step: "      - uses: actions/setup-python@v5\n", readings: {}, countedAs: "plumbing", posted: 0 }],
    ["CLM-OBS-015", { step: "      - uses: actions/cache@v4\n", readings: {}, countedAs: "plumbing", posted: 0 }],
    ["CLM-OBS-015", { step: "      - uses: actions/upload-artifact@v4\n", readings: {}, countedAs: "plumbing", posted: 0 }],
    ["CLM-OBS-015", { step: "      - uses: actions/download-artifact@v4\n", readings: {}, countedAs: "plumbing", posted: 0 }],
    ["CLM-OBS-016", { step: "      - name: Get the code\n        uses: actions/checkout@v4\n", readings: { nonChecks: ["ci.yml:build:Get the code"] }, countedAs: "nonCheck", posted: 0 }],
  ])("[%s] balance posts a fitness Evidence Observation only for a step that is a fitness function", (_clm, { step, readings, countedAs, posted }) => {
    const steps = stepsOf(step);
    const dispositionOf = (each: PipelineStep): StepDisposition => stepDispositionOf(each, readingsOf(readings));
    expect(steps.map(dispositionOf)).toEqual([countedAs]);
    const observations = fitnessObservationsOf(steps, dispositionOf, undefined);
    expect(observations).toHaveLength(posted);
    expect(observations.every(({ kind }) => kind === "fitness")).toBe(true);
  });

  it.each<[string, StepAsWritten, string]>([
    ["CLM-OBS-014", { name: "  Install  ", command: "pnpm install" }, "ci.yml:build:Install"],
    ["CLM-OBS-014", { name: " ", action: { name: "actions/checkout@v4" } }, "ci.yml:build:actions/checkout@v4"],
    ["CLM-OBS-014", { command: "\n  pnpm install --frozen-lockfile  \n  pnpm build\n" }, "ci.yml:build:pnpm install --frozen-lockfile"],
  ])("[%s] a step in notChecks by its name, else its uses, else its first command line, is a non-check and posts nothing", (_clm, written, named) => {
    const step = stepOf(written);
    const dispositionOf = (each: PipelineStep): StepDisposition => stepDispositionOf(each, readingsOf({ nonChecks: [named] }));
    expect(dispositionOf(step)).toBe("nonCheck");
    expect(fitnessObservationsOf([step], dispositionOf, undefined)).toEqual([]);
  });

  it("[CLM-OBS-014] a step named Install, with that step in notChecks as balance reads it, is a non-check and posts nothing", () => {
    const steps = stepsOf("      - name: Install\n        run: pnpm install\n");
    const { stepAccount, totals } = evidenceReconciliationOf({
      features: [],
      testObservations: [],
      steps,
      readings: { runsTheReconciler: () => false, scripts: {}, shell: shellReading },
      configuration: targetConfigurationFrom({ specController: { notChecks: ["ci.yml:build:Install"] } }, steps),
      strict: false,
      provenance: provenanceOf({ toolVersion: "0.1.256" }, []),
    });
    expect({ nonChecks: stepAccount?.total.nonChecks, posted: totals.evidenceObservations.total }).toEqual({ nonChecks: 1, posted: 0 });
  });
});

const VITEST_RUNNER: Partial<StepReadings> = { runners: { unit: "vitest" } };

const PYTEST_RUNNER: Partial<StepReadings> = { runners: { unit: "pytest" } };

const TEST_SCRIPTS: Partial<StepReadings> = {
  runners: { unit: "vitest" },
  scripts: { lint: "eslint .", test: "vitest run", "test:unit": "vitest run" },
};

describe("balance posts only the steps that prove something", () => {
  it.each<[string, string, StepDisposition, Partial<StepReadings>]>([
    ["CLM-OBS-010", "npm exec vitest run", "runner", VITEST_RUNNER],
    ["CLM-OBS-010", "pnpm exec vitest run", "runner", VITEST_RUNNER],
    ["CLM-OBS-010", "pnpm dlx vitest run", "runner", VITEST_RUNNER],
    ["CLM-OBS-010", "pnpm vitest run", "runner", VITEST_RUNNER],
    ["CLM-OBS-010", "yarn vitest run", "runner", VITEST_RUNNER],
    ["CLM-OBS-010", "bunx vitest run", "runner", VITEST_RUNNER],
    ["CLM-OBS-010", "python3 -m pytest", "runner", PYTEST_RUNNER],
    ["CLM-OBS-010", "poetry run pytest", "runner", PYTEST_RUNNER],
    ["CLM-OBS-010", "pipenv run pytest", "runner", PYTEST_RUNNER],
    ["CLM-OBS-010", "hatch run pytest", "runner", PYTEST_RUNNER],
    ["CLM-OBS-010", "pdm run pytest", "runner", PYTEST_RUNNER],
    ["CLM-OBS-010", "coverage run -m pytest", "runner", PYTEST_RUNNER],
    ["CLM-OBS-010", "vitest run", "runner", { runners: { unit: "vitest " } }],
    ["CLM-OBS-010", "npx vitest run", "runner", { runners: { unit: "vitest  run" } }],
    ["CLM-OBS-011", "echo y | npx vitest run", "runner", VITEST_RUNNER],
    ["CLM-OBS-007", "coproc vitest run", "candidate", VITEST_RUNNER],
    ["CLM-OBS-007", 'for file in $(vitest list); do echo "$file"; done', "candidate", VITEST_RUNNER],
    ["CLM-OBS-004", "npm test:unit", "candidate", TEST_SCRIPTS],
    ["CLM-OBS-004", "yarn", "candidate", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm run-script test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm rum test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm urn test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm t", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm tst", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm t", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm tst", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm --filter app test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm --filter=app test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm -F app test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm -r test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm --recursive test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn workspace app test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn workspaces foreach -A run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn workspaces foreach -A --from app run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn workspaces foreach -A --include app run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn workspaces foreach -A --exclude root run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn workspaces foreach -A -j 4 run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn workspaces foreach -A --jobs 4 run test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn 2>&1 test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "cross-env NODE_ENV=test pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "timeout -k 10 600 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "timeout --kill-after 10 600 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "timeout -s KILL 600 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "timeout --signal KILL 600 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm exec --package pnpm@9 -- pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm exec -w app -- npm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npm exec --workspace app -- npm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm exec --resume-from app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm dlx --package pnpm@9 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "pnpm dlx --allow-build esbuild cross-env CI=1 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npx --package pnpm@9 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npx -p pnpm@9 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npx -w app npm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "npx --workspace app npm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn exec npm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn dlx -p pnpm@9 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "yarn dlx --package pnpm@9 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "bunx -p pnpm@9 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "bunx --package pnpm@9 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --with httpx pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --with-editable ./tools pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --with-requirements requirements.txt pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --python 3.12 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run -p 3.12 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --directory app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --project app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --package app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --extra test pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --group dev pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "uv run --env-file .env pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "env -u HOME pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "env --unset HOME pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "env -C app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "env --chdir app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nice -n 10 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nice --adjustment 10 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nohup pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "command time -f %e pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "command time --format %e pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "command time -o timing.txt pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "command time --output timing.txt pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "exec -a tests pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -a files.txt pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs --arg-file files.txt pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -d , pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs --delimiter , pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -E END pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -I {} pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -L 1 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -n 1 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs --max-args 1 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -P 4 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs --max-procs 4 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs -s 2048 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs --max-chars 2048 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xargs --process-slot-var SLOT pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "stdbuf -i 0 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "stdbuf --input 0 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "stdbuf -o L pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "stdbuf --output L pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "stdbuf -e L pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "stdbuf --error L pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -u runner pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --user runner pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -g docker pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --group docker pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -C 3 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --close-from 3 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -D app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --chdir app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --host ci pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -p Password pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --prompt Password pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -r tester pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --role tester pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -t tester_t pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --type tester_t pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -T 600 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --command-timeout 600 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -U runner pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --other-user runner pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo -R /srv/ci pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "sudo --chroot /srv/ci pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "dotenv -e .env.test -- pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run -a pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run -e xvfb.log pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run --error-file xvfb.log pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run -f .Xauthority pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run --auth-file .Xauthority pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run -n 99 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run --server-num 99 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run -p MIT-MAGIC-COOKIE-1 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run --xauth-protocol MIT-MAGIC-COOKIE-1 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", 'xvfb-run -s "+extension GLX" pnpm test', "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", 'xvfb-run --server-args "+extension GLX" pnpm test', "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run -w 5 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "xvfb-run --wait 5 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc -r lcov pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --reporter lcov pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --report-dir coverage pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc -t .nyc_output pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --temp-dir .nyc_output pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc -n src pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --include src pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc -x dist pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --exclude dist pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc -e .ts pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --extension .ts pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc -i ts-node/register pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --require ts-node/register pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --cwd app pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "nyc --nycrc-path .nycrc.json pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 -r lcov pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --reporter lcov pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 -o coverage pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --reports-dir coverage pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --report-dir coverage pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 -n src pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --include src pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 -x dist pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --exclude dist pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 -e .ts pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --extension .ts pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --temp-directory .c8 pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "c8 --src src pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "flock ci.lock pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "flock -E 0 ci.lock pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "flock --conflict-exit-code 0 ci.lock pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "flock -w 60 ci.lock pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "flock --wait 60 ci.lock pnpm test", "runner", TEST_SCRIPTS],
    ["CLM-OBS-009", "flock --timeout 60 ci.lock pnpm test", "runner", TEST_SCRIPTS],
  ])("[%s] balance counts a step running %s as %s, and posts a fitness Evidence Observation only for a fitness function", (_clm, run, countedAs, readings) => {
    const steps = stepsOf(`      - run: ${run}\n`);
    const dispositionOf = (each: PipelineStep): StepDisposition => stepDispositionOf(each, readingsOf(readings));
    expect(steps.map(dispositionOf)).toEqual([countedAs]);
    expect(fitnessObservationsOf(steps, dispositionOf, undefined)).toHaveLength(countedAs === "candidate" ? 1 : 0);
  });

  it("[CLM-OBS-012] a step whose script runs spec-controller balance on one of its lines is counted as the reconciler, and posts nothing", () => {
    const steps = stepsOf("      - run: |\n          pnpm build\n          spec-controller balance --features features\n");
    const dispositionOf = (each: PipelineStep): StepDisposition => stepDispositionOf(each, readingsOf({}));
    expect(steps.map(dispositionOf)).toEqual(["reconciler"]);
    expect(fitnessObservationsOf(steps, dispositionOf, undefined)).toHaveLength(0);
  });
});

describe("balance posts each result with how it went", () => {
  it.each<[string, { result: EvidenceObservation["result"]; posted: Posted }]>([
    ["CLM-OBS-017", { result: "passed", posted: () => vitest("passed") }],
    ["CLM-OBS-018", { result: "failed", posted: () => vitest("failed") }],
    ["CLM-OBS-019", { result: "passed", posted: () => vitest("passed") }],
    ["CLM-OBS-020", { result: "failed", posted: () => vitest("failed") }],
    ["CLM-OBS-021", { result: "passed", posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001") }) }],
    ["CLM-OBS-022", { result: "failed", posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001"), failure: "boom" }) }],
    ["CLM-OBS-023", { result: "passed", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001]_a" }) }],
    ["CLM-OBS-024", { result: "failed", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001]_a", failure: "boom" }) }],
    ["CLM-OBS-025", { result: "passed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test" }) }],
    ["CLM-OBS-026", { result: "failed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", failure: { message: "boom" } }) }],
    ["CLM-OBS-027", { result: "passed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test" }) }],
    ["CLM-OBS-028", { result: "failed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", failure: { message: "boom" } }) }],
    ["CLM-OBS-029", { result: "passed", posted: () => rspec("passed") }],
    ["CLM-OBS-030", { result: "failed", posted: () => rspec("failed") }],
    ["CLM-OBS-031", { result: "passed", posted: () => cucumber(["@CLM-ONE-001"], ["passed", "passed"]) }],
    ["CLM-OBS-032", { result: "failed", posted: () => cucumber(["@CLM-ONE-001"], ["failed", "skipped"]) }],
    ["CLM-OBS-033", { result: "passed", posted: () => fitness([CITING_STEP], [{ key: "CLM-ONE-001", outcome: "success" }]) }],
    ["CLM-OBS-034", { result: "failed", posted: () => fitness([CITING_STEP], [{ key: "CLM-ONE-001", outcome: "failure" }]) }],
    ["CLM-OBS-035", { result: "failed", posted: () => fitness([{ ...CITING_STEP, continueOnError: true }], [{ key: "CLM-ONE-001", outcome: "failure", conclusion: "success" }]) }],
  ])("[%s] balance posts a result as passed or failed, citing its claim code", (_clm, { result, posted }) => {
    expect(posted()).toMatchObject([{ result, cites: [ONE] }]);
  });

  it.each<[string, { posted: Posted }]>([
    ["CLM-OBS-036", { posted: () => [...vitest("skipped"), ...vitest("todo")] }],
    ["CLM-OBS-037", { posted: () => [...vitest("skipped"), ...vitest("pending")] }],
    ["CLM-OBS-038", { posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001"), skipped: "" }) }],
    ["CLM-OBS-039", { posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001]_a", skipped: { message: "skip" } }) }],
    ["CLM-OBS-040", { posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", skipped: "" }) }],
    ["CLM-OBS-041", { posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", skipped: "" }) }],
    ["CLM-OBS-042", { posted: () => [...rspec("pending"), ...rspec("skipped")] }],
    ["CLM-OBS-043", { posted: () => cucumber(["@CLM-ONE-001"], ["passed", "skipped"]) }],
  ])("[%s] balance posts nothing for a test that was skipped", (_clm, { posted }) => {
    expect(posted()).toEqual([]);
  });

  it.each<[string, { posted: Posted; cites: readonly ClaimCode[]; named: Partial<EvidenceObservation> }]>([
    ["CLM-OBS-044", { posted: () => vitestFile("no such module"), cites: [], named: { place: "a.test.ts", message: "no such module" } }],
    ["CLM-OBS-045", { posted: () => vitestFile("cannot be parsed"), cites: [], named: { place: "a.test.ts", message: "cannot be parsed" } }],
    ["CLM-OBS-046", { posted: () => pytest({ classname: "", name: "tests.test_broken", error: { message: "collection failure", "#text": "ImportError" } }), cites: [], named: { place: "tests.test_broken", message: "ImportError" } }],
    ["CLM-OBS-047", { posted: () => junit({ classname: "", name: "TestMain", failure: "FAIL\texample.com/a [build failed]\n" }, "example.com/a"), cites: [], named: { place: "example.com/a", message: "FAIL\texample.com/a [build failed]\n" } }],
    ["CLM-OBS-100", { posted: () => junit({ classname: "", name: "TestMain", failure: { "#text": "setup failed: no database\nFAIL\texample.com/a\t0.004s\n" } }, "example.com/a"), cites: [], named: { place: "example.com/a", message: "setup failed: no database\nFAIL\texample.com/a\t0.004s\n" } }],
    ["CLM-OBS-048", { posted: () => junit({ classname: "example.BeforeAllFailsTest", name: "", error: { message: "could not set up", "#text": "IllegalStateException" } }), cites: [], named: { place: "example.BeforeAllFailsTest", message: "IllegalStateException" } }],
    ["CLM-OBS-049", { posted: () => rspecLoadError("An error occurred while loading ./spec/a_spec.rb.\n"), cites: [], named: { place: "spec/a_spec.rb", message: "An error occurred while loading ./spec/a_spec.rb.\n" } }],
    ["CLM-OBS-099", { posted: () => rspecLoadError("NameError: uninitialized constant Widget\n"), cites: [], named: { message: "NameError: uninitialized constant Widget\n" } }],
    ["CLM-OBS-050", { posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001"), error: { "#text": "fixture failed" } }), cites: [ONE], named: { place: "tests.a", name: "test_a" } }],
    ["CLM-OBS-051", { posted: () => cucumber(["@CLM-ONE-001"], ["ambiguous"]), cites: [ONE], named: { notes: ["Given one adds one"] } }],
    ["CLM-OBS-052", { posted: () => cucumber(["@CLM-ONE-001"], ["undefined"]), cites: [ONE], named: { notes: ["Given one adds one"] } }],
    ["CLM-OBS-053", { posted: () => fitness([CITING_STEP], [{ key: "CLM-ONE-001", outcome: "skipped" }]), cites: [ONE], named: { place: "ci.yml:build:Lint" } }],
    ["CLM-OBS-054", { posted: () => fitness([CITING_STEP], [{ key: "CLM-ONE-001", outcome: "neutral" }]), cites: [ONE], named: { place: "ci.yml:build:Lint" } }],
  ])("[%s] balance posts what could not run as never ran", (_clm, { posted, cites, named }) => {
    expect(posted()).toMatchObject([{ result: "never-ran", cites, ...named }]);
  });

  it("[CLM-OBS-044] balance posts what could not run as never ran, naming the file and its error and nothing else", () => {
    expect(vitestFile("no such module")).toEqual([{ cites: [], result: "never-ran", kind: "unit", place: "a.test.ts", message: "no such module", notes: [] }]);
  });

  it("[CLM-OBS-055] a Kotlin class whose setup failed will be posted as one failing result citing no claim code", () => {
    const posted = junit({ classname: "example.BeforeAllFailsTest", name: "initializationError", failure: { message: "could not set up" } });
    expect(posted).toMatchObject([{ result: "failed", cites: [] }]);
  });

  it.each<[string, { step: StepAsWritten; result: EvidenceObservation["result"] }]>([
    ["CLM-OBS-056", { step: CITING_STEP, result: "passed" }],
    ["CLM-OBS-056", { step: { ...CITING_STEP, continueOnError: false }, result: "passed" }],
    ["CLM-OBS-056", { step: { ...CITING_STEP, jobContinueOnError: "false" }, result: "passed" }],
    ["CLM-OBS-057", { step: { ...CITING_STEP, continueOnError: true }, result: "passed-on-error" }],
    ["CLM-OBS-058", { step: { ...CITING_STEP, jobContinueOnError: true }, result: "passed-on-error" }],
    ["CLM-OBS-058", { step: { ...CITING_STEP, jobContinueOnError: "${{ matrix.experimental }}" }, result: "passed-on-error" }],
  ])("[%s] balance posts a fitness function known only from its workflow as passed, or as passed-on-error when its failure is allowed", (_clm, { step, result }) => {
    expect(fitness([step])).toEqual([{ cites: [ONE], result, kind: "fitness", place: "ci.yml:build:Lint", notes: [] }]);
  });
});

describe("balance posts each result at the kind of quality check its source and tags give", () => {
  it.each<[string, { posted: Posted; kinds: readonly string[] }]>([
    ["CLM-OBS-059", { posted: () => vitest("passed", "[CLM-ONE-001] @e2e @integration a test"), kinds: ["unit"] }],
    ["CLM-OBS-060", { posted: () => pytest({ classname: "tests.a", name: "test_e2e", properties: clmProperty("CLM-ONE-001") }), kinds: ["unit"] }],
    ["CLM-OBS-061", { posted: () => cucumber(["@CLM-ONE-001"], ["passed"]), kinds: ["integration"] }],
    ["CLM-OBS-062", { posted: () => cucumber(["@CLM-ONE-001", "@e2e"], ["passed"]), kinds: ["e2e"] }],
    ["CLM-OBS-063", { posted: () => cucumber(["@CLM-ONE-001", "@performance"], ["passed"]), kinds: ["performance"] }],
    ["CLM-OBS-064", { posted: () => cucumber(["@CLM-ONE-001", "@integration", "@e2e"], ["passed"]), kinds: ["integration", "e2e"] }],
  ])("[%s] a test report's result will be unit evidence, and a Cucumber result will take the kind its tags name", (_clm, { posted, kinds }) => {
    expect(posted().map(({ kind }) => kind)).toEqual(kinds);
  });
});

describe("balance posts each result citing the nearest code it has", () => {
  const DESCRIBE = "[CLM-ONE-002] a group";
  it.each<[string, { posted: Posted; cites: readonly ClaimCode[] }]>([
    ["CLM-OBS-065", { posted: () => vitest("passed", "[CLM-ONE-001] a test", `${DESCRIBE} [CLM-ONE-001] a test`), cites: [ONE] }],
    ["CLM-OBS-066", { posted: () => vitest("passed", "a test", `${DESCRIBE} a test`), cites: [TWO] }],
    ["CLM-OBS-067", { posted: () => vitest("passed", "CLM-ONE-001 a test", `${DESCRIBE} CLM-ONE-001 a test`), cites: [TWO] }],
    ["CLM-OBS-068", { posted: () => vitest("passed", "[CLM-ONE-001] a test", `${DESCRIBE} [CLM-ONE-001] a test`), cites: [ONE] }],
    ["CLM-OBS-069", { posted: () => vitest("passed", "a test", `${DESCRIBE} a test`), cites: [TWO] }],
    ["CLM-OBS-070", { posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-002]_group/[CLM-ONE-001]_a" }), cites: [ONE] }],
    ["CLM-OBS-071", { posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-002]_group/a" }), cites: [TWO] }],
    ["CLM-OBS-072", { posted: () => junit({ classname: "[CLM-ONE-002] a class", name: "[CLM-ONE-001] a test" }), cites: [ONE] }],
    ["CLM-OBS-073", { posted: () => junit({ classname: "[CLM-ONE-002] a class", name: "a test" }), cites: [TWO] }],
    ["CLM-OBS-074", { posted: () => junit({ classname: "example.ClassCitesTest", name: "a test whose own display name cites nothing" }), cites: [] }],
    ["CLM-OBS-075", { posted: () => rspec("passed", "[CLM-ONE-001] a spec", `${DESCRIBE} [CLM-ONE-001] a spec`), cites: [ONE] }],
    ["CLM-OBS-076", { posted: () => rspec("passed", "a spec", `${DESCRIBE} a spec`), cites: [TWO] }],
  ])("[%s] balance posts a nested test citing its own code, or its parent's code when the report gives one", (_clm, { posted, cites }) => {
    expect(posted()).toMatchObject([{ cites }]);
  });
});

describe("an Evidence Observation says where to look", () => {
  it.each<[string, { posted: Posted; where: Partial<EvidenceObservation> }]>([
    ["CLM-OBS-078", { posted: () => parseVitestEvidenceObservations({ testResults: [{ name: "a.test.ts", assertionResults: [{ title: "adds two numbers", fullName: "adds two numbers", status: "passed" }] }] }), where: { place: "a.test.ts", name: "adds two numbers" } }],
    ["CLM-OBS-079", { posted: () => parseVitestEvidenceObservations({ testResults: [{ name: "/work/acme/a.test.ts", assertionResults: [{ title: "adds two numbers", fullName: "adds two numbers", status: "passed" }] }] }, "/work/acme"), where: { place: "a.test.ts", name: "adds two numbers" } }],
    ["CLM-OBS-080", { posted: () => parseCucumberEvidenceObservations(scenario(["@CLM-ONE-001"], ["passed"]), undefined, () => []), where: { place: "one.feature", name: "one adds one" } }],
    ["CLM-OBS-081", { posted: () => fitness([{ id: "CLM-ONE-002", name: "Build", command: "pnpm build" }, CITING_STEP], [{ key: "CLM-ONE-001", outcome: "success" }]), where: { place: "ci.yml:build:Lint" } }],
  ])("[%s] balance posts an Evidence Observation saying where to look", (_clm, { posted, where }) => {
    expect(posted()).toMatchObject([where]);
  });
});

describe("balance files each Evidence Observation under the claim it cites, or else on a phantom claim or the unnamed claim", () => {
  it("[CLM-OBS-082] balance posts an Evidence Observation to the executable claim whose code it cites", () => {
    const first = claim(ONE);
    const second = claim(TWO);
    const [observation] = vitest("passed");
    expect(claimPostedTo(observation!, [first, second])).toBe(first);
  });

  it("[CLM-OBS-083] balance posts an Evidence Observation citing a code no executable claim has to its phantom claim", () => {
    const [observation] = vitest("passed", "[CLM-ONE-999] a test");
    const claims = [claim(ONE), claim({ featureCode: "TWO", number: "999" }), claim()];
    expect(claimPostedTo(observation!, claims)).toEqual({ claimCode: PHANTOM });
  });

  it.each<[string, { posted: Posted; claims: () => readonly ExecutableClaim[]; named: readonly ClaimCode[] }]>([
    ["CLM-OBS-084", { posted: () => vitest("passed", "a test"), claims: () => [claim(ONE)], named: [] }],
    ["CLM-OBS-085", { posted: () => vitest("passed", "[CLM-ABCDEF-001] a test"), claims: () => [claim(ONE)], named: [] }],
    ["CLM-OBS-086", { posted: () => vitest("passed", "CLM-ONE-999 a test"), claims: () => [claim(ONE)], named: [] }],
    ["CLM-OBS-087", { posted: () => fitness([{ name: "Lint", command: "pnpm lint" }], []), claims: () => [claim(ONE)], named: [] }],
    ["CLM-OBS-088", { posted: () => vitest("passed"), claims: () => [claim(ONE), claim(ONE)], named: [ONE] }],
    ["CLM-OBS-089", { posted: () => vitest("passed", "[CLM-ONE-001] [CLM-ONE-002] a test"), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] }],
    ["CLM-OBS-090", { posted: () => vitest("passed", "[CLM-ONE-001] [CLM-ONE-002] a test"), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] }],
    ["CLM-OBS-091", { posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001", "CLM-ONE-002") }), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] }],
    ["CLM-OBS-092", { posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001][CLM-ONE-002]_a" }), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] }],
    ["CLM-OBS-093", { posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] [CLM-ONE-002] a test" }), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] }],
    ["CLM-OBS-094", { posted: () => rspec("passed", "[CLM-ONE-001] [CLM-ONE-002] a spec"), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] }],
    ["CLM-OBS-095", { posted: () => cucumber(["@CLM-ONE-001", "@CLM-ONE-002"], ["passed"]), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] }],
  ])("[%s] balance posts an Evidence Observation no single executable claim can take to the unnamed claim", (_clm, { posted, claims, named }) => {
    const [observation] = posted();
    expect(claimPostedTo(observation!, claims())).toEqual({});
    expect(observation!.cites).toEqual(named);
  });
});

describe("a fitness function whose id is not a claim code will be posted once, citing no claim code", () => {
  it("[CLM-OBS-097] a fitness function whose id is not a claim code will be posted once, citing no claim code", () => {
    const posted = fitness([{ id: "audit", name: "Audit", command: "pnpm audit-the-tree" }], [{ key: "audit", outcome: "success" }]);
    expect(posted.map(({ kind, cites }) => ({ kind, cites }))).toEqual([{ kind: "fitness", cites: [] }]);
  });
});

describe("balance posts a recorded step that no workflow holds at its claim code, as never ran, with the note the record gave", () => {
  it("[CLM-OBS-096] balance posts a recorded step that no workflow holds at its claim code, as never ran, with the note the record gave", () => {
    const posted = fitness([{ id: "CLM-ONE-002", name: "Build", command: "pnpm build" }], [{ key: "CLM-ONE-001", outcome: "skipped" }]);
    expect(posted.filter(({ cites }) => cites.length > 0)).toEqual([
      { cites: [{ featureCode: "ONE", number: "001" }], result: "never-ran", kind: "fitness", place: "CLM-ONE-001", notes: ["skipped"] },
    ]);
  });
});

describe("a test file outside the target's folder will be placed at the absolute path its evidence report recorded", () => {
  it("[CLM-OBS-098] a test file outside the target's folder will be placed at the absolute path its evidence report recorded", () => {
    const file = "/home/runner/work/app/src/a.test.ts";
    const report = { testResults: [{ name: file, assertionResults: [{ title: "adds two numbers", fullName: "adds two numbers", status: "passed" }] }] };
    expect(parseVitestEvidenceObservations(report, "/work/app").map(({ place }) => place)).toEqual([file]);
  });
});
