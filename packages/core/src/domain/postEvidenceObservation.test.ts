import { describe, expect, it } from "vitest";
import { commandRuns, shellReading } from "../parse/commandRuns.js";
import { recordedCheckStepsOf, type StepRecord } from "../parse/ciStepRecord.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";
import { parseJunitEvidenceObservations, parsePytestEvidenceObservations } from "../parse/junit.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";
import { parseRspecEvidenceObservations } from "../parse/rspec.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import type { ClaimCode } from "./claimCodes.js";
import type { ExecutableClaim } from "./postEvidenceObligation.js";
import {
  claimPostedTo,
  fitnessObservationsOf,
  stepDispositionOf,
  type EvidenceObservation,
  type PipelineStep,
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

const fitness = (step: string, record?: StepRecord, jobExtra = ""): EvidenceObservation[] => {
  const steps = stepsOf(step, jobExtra);
  return fitnessObservationsOf(steps, () => "candidate", recordedCheckStepsOf(record));
};

const CITING_STEP = "      - id: CLM-ONE-001\n        name: Lint\n        run: pnpm lint\n";

const claim = (claimCode?: ClaimCode): ExecutableClaim => ({ ...(claimCode === undefined ? {} : { claimCode }), file: "one.feature", title: "t", obligations: [{ kind: "unit" }] });

describe("balance posts only the steps that prove something", () => {
  it.each<{ clm: string; step: string; readings: Partial<StepReadings>; countedAs: StepDisposition; posted: number }>([
    { clm: "CLM-OBS-002", step: "      - uses: actions/dependency-review-action@v4\n", readings: {}, countedAs: "candidate", posted: 1 },
    { clm: "CLM-OBS-003", step: "      - uses: someone/checkout@v1\n", readings: {}, countedAs: "candidate", posted: 1 },
    { clm: "CLM-OBS-004", step: "      - run: pnpm audit-the-tree\n", readings: {}, countedAs: "candidate", posted: 1 },
    { clm: "CLM-OBS-005", step: "      - run: gradle lint\n", readings: { runners: { unit: "gradle test" } }, countedAs: "candidate", posted: 1 },
    { clm: "CLM-OBS-006", step: "      - run: eslint vitest.config.ts\n", readings: { runners: { unit: "vitest" } }, countedAs: "candidate", posted: 1 },
    { clm: "CLM-OBS-007", step: "      - run: vitest run | tee out.txt\n", readings: { runners: { unit: "vitest" } }, countedAs: "candidate", posted: 1 },
    { clm: "CLM-OBS-008", step: "      - run: pnpm test\n", readings: { runners: { unit: null }, scripts: { test: "vitest run" } }, countedAs: "candidate", posted: 1 },
    { clm: "CLM-OBS-009", step: "      - run: pnpm test\n", readings: { runners: { unit: "vitest" }, scripts: { test: "vitest run" } }, countedAs: "runner", posted: 0 },
    { clm: "CLM-OBS-010", step: "      - run: CI=1 npx vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 },
    { clm: "CLM-OBS-011", step: "      - run: pnpm lint && vitest run\n", readings: { runners: { unit: "vitest" } }, countedAs: "runner", posted: 0 },
    { clm: "CLM-OBS-012", step: "      - run: spec-controller balance --features features\n", readings: {}, countedAs: "reconciler", posted: 0 },
    { clm: "CLM-OBS-013", step: "      - name: Record\n        env:\n          STEPS: ${{ toJSON(steps) }}\n        run: echo done\n", readings: {}, countedAs: "reconciler", posted: 0 },
    { clm: "CLM-OBS-014", step: "      - name: Install\n        run: pnpm install\n", readings: { nonChecks: ["ci.yml:build:Install"] }, countedAs: "nonCheck", posted: 0 },
    { clm: "CLM-OBS-015", step: "      - uses: actions/checkout@v4\n", readings: {}, countedAs: "plumbing", posted: 0 },
    { clm: "CLM-OBS-016", step: "      - name: Get the code\n        uses: actions/checkout@v4\n", readings: { nonChecks: ["ci.yml:build:Get the code"] }, countedAs: "nonCheck", posted: 0 },
  ])("[$clm] balance posts a fitness Evidence Observation only for a step that is a fitness function", ({ step, readings, countedAs, posted }) => {
    const steps = stepsOf(step);
    const dispositionOf = (each: PipelineStep): StepDisposition => stepDispositionOf(each, readingsOf(readings));
    expect(steps.map(dispositionOf)).toEqual([countedAs]);
    const observations = fitnessObservationsOf(steps, dispositionOf, undefined);
    expect(observations).toHaveLength(posted);
    expect(observations.every(({ kind }) => kind === "fitness")).toBe(true);
  });
});

describe("balance posts each result with how it went", () => {
  it.each<{ clm: string; result: EvidenceObservation["result"]; posted: Posted }>([
    { clm: "CLM-OBS-017", result: "passed", posted: () => vitest("passed") },
    { clm: "CLM-OBS-018", result: "failed", posted: () => vitest("failed") },
    { clm: "CLM-OBS-019", result: "passed", posted: () => vitest("passed") },
    { clm: "CLM-OBS-020", result: "failed", posted: () => vitest("failed") },
    { clm: "CLM-OBS-021", result: "passed", posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001") }) },
    { clm: "CLM-OBS-022", result: "failed", posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001"), failure: "boom" }) },
    { clm: "CLM-OBS-023", result: "passed", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001]_a" }) },
    { clm: "CLM-OBS-024", result: "failed", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001]_a", failure: "boom" }) },
    { clm: "CLM-OBS-025", result: "passed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test" }) },
    { clm: "CLM-OBS-026", result: "failed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", failure: { message: "boom" } }) },
    { clm: "CLM-OBS-027", result: "passed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test" }) },
    { clm: "CLM-OBS-028", result: "failed", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", failure: { message: "boom" } }) },
    { clm: "CLM-OBS-029", result: "passed", posted: () => rspec("passed") },
    { clm: "CLM-OBS-030", result: "failed", posted: () => rspec("failed") },
    { clm: "CLM-OBS-031", result: "passed", posted: () => cucumber(["@CLM-ONE-001"], ["passed", "passed"]) },
    { clm: "CLM-OBS-032", result: "failed", posted: () => cucumber(["@CLM-ONE-001"], ["failed", "skipped"]) },
    { clm: "CLM-OBS-033", result: "passed", posted: () => fitness(CITING_STEP, { "CLM-ONE-001": { outcome: "success" } }) },
    { clm: "CLM-OBS-034", result: "failed", posted: () => fitness(CITING_STEP, { "CLM-ONE-001": { outcome: "failure" } }) },
    { clm: "CLM-OBS-035", result: "failed", posted: () => fitness(`${CITING_STEP}        continue-on-error: true\n`, { "CLM-ONE-001": { outcome: "failure", conclusion: "success" } }) },
  ])("[$clm] balance posts a result as passed or failed, citing its claim code", ({ result, posted }) => {
    expect(posted()).toMatchObject([{ result, cites: [ONE] }]);
  });

  it.each<{ clm: string; posted: Posted }>([
    { clm: "CLM-OBS-036", posted: () => [...vitest("skipped"), ...vitest("todo")] },
    { clm: "CLM-OBS-037", posted: () => [...vitest("skipped"), ...vitest("pending")] },
    { clm: "CLM-OBS-038", posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001"), skipped: "" }) },
    { clm: "CLM-OBS-039", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001]_a", skipped: { message: "skip" } }) },
    { clm: "CLM-OBS-040", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", skipped: "" }) },
    { clm: "CLM-OBS-041", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] a test", skipped: "" }) },
    { clm: "CLM-OBS-042", posted: () => [...rspec("pending"), ...rspec("skipped")] },
    { clm: "CLM-OBS-043", posted: () => cucumber(["@CLM-ONE-001"], ["passed", "skipped"]) },
  ])("[$clm] balance posts nothing for a test that was skipped", ({ posted }) => {
    expect(posted()).toEqual([]);
  });

  it.each<{ clm: string; posted: Posted; cites: readonly ClaimCode[]; named: Partial<EvidenceObservation> }>([
    { clm: "CLM-OBS-044", posted: () => vitestFile("no such module"), cites: [], named: { place: "a.test.ts", message: "no such module" } },
    { clm: "CLM-OBS-045", posted: () => vitestFile("cannot be parsed"), cites: [], named: { place: "a.test.ts", message: "cannot be parsed" } },
    { clm: "CLM-OBS-046", posted: () => pytest({ classname: "", name: "tests.test_broken", error: { message: "collection failure", "#text": "ImportError" } }), cites: [], named: { place: "tests.test_broken", message: "ImportError" } },
    { clm: "CLM-OBS-047", posted: () => junit({ classname: "", name: "TestMain", failure: "FAIL\texample.com/a [build failed]\n" }, "example.com/a"), cites: [], named: { place: "example.com/a", message: "FAIL\texample.com/a [build failed]\n" } },
    { clm: "CLM-OBS-048", posted: () => junit({ classname: "example.BeforeAllFailsTest", name: "", error: { message: "could not set up", "#text": "IllegalStateException" } }), cites: [], named: { place: "example.BeforeAllFailsTest", message: "IllegalStateException" } },
    { clm: "CLM-OBS-049", posted: () => rspecLoadError("An error occurred while loading ./spec/a_spec.rb.\n"), cites: [], named: { place: "spec/a_spec.rb", message: "An error occurred while loading ./spec/a_spec.rb.\n" } },
    { clm: "CLM-OBS-050", posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001"), error: { "#text": "fixture failed" } }), cites: [ONE], named: { place: "tests.a", name: "test_a" } },
    { clm: "CLM-OBS-051", posted: () => cucumber(["@CLM-ONE-001"], ["ambiguous"]), cites: [ONE], named: { notes: ["Given one adds one"] } },
    { clm: "CLM-OBS-052", posted: () => cucumber(["@CLM-ONE-001"], ["undefined"]), cites: [ONE], named: { notes: ["Given one adds one"] } },
    { clm: "CLM-OBS-053", posted: () => fitness(CITING_STEP, { "CLM-ONE-001": { outcome: "skipped" } }), cites: [ONE], named: { place: "ci.yml:build:Lint" } },
    { clm: "CLM-OBS-054", posted: () => fitness(CITING_STEP, { "CLM-ONE-001": { outcome: "neutral" } }), cites: [ONE], named: { place: "ci.yml:build:Lint" } },
  ])("[$clm] balance posts what could not run as never ran", ({ posted, cites, named }) => {
    expect(posted()).toMatchObject([{ result: "never-ran", cites, ...named }]);
  });

  it("[CLM-OBS-055] a Kotlin class whose setup failed will be posted as one failing result citing no claim code", () => {
    const posted = junit({ classname: "example.BeforeAllFailsTest", name: "initializationError", failure: { message: "could not set up" } });
    expect(posted).toMatchObject([{ result: "failed", cites: [] }]);
  });

  it.each<{ clm: string; jobExtra: string; step: string; result: EvidenceObservation["result"] }>([
    { clm: "CLM-OBS-056", jobExtra: "", step: CITING_STEP, result: "passed" },
    { clm: "CLM-OBS-057", jobExtra: "", step: `${CITING_STEP}        continue-on-error: true\n`, result: "passed-on-error" },
    { clm: "CLM-OBS-058", jobExtra: "    continue-on-error: true\n", step: CITING_STEP, result: "passed-on-error" },
  ])("[$clm] balance posts a fitness function known only from its workflow as passed, or as passed-on-error when its failure is allowed", ({ jobExtra, step, result }) => {
    expect(fitness(step, undefined, jobExtra)).toMatchObject([{ result, cites: [ONE] }]);
  });
});

describe("balance posts each result at the kind of quality check its source and tags give", () => {
  it.each<{ clm: string; posted: Posted; kinds: readonly string[] }>([
    { clm: "CLM-OBS-059", posted: () => vitest("passed", "[CLM-ONE-001] @e2e @integration a test"), kinds: ["unit"] },
    { clm: "CLM-OBS-060", posted: () => pytest({ classname: "tests.a", name: "test_e2e", properties: clmProperty("CLM-ONE-001") }), kinds: ["unit"] },
    { clm: "CLM-OBS-061", posted: () => cucumber(["@CLM-ONE-001"], ["passed"]), kinds: ["integration"] },
    { clm: "CLM-OBS-062", posted: () => cucumber(["@CLM-ONE-001", "@e2e"], ["passed"]), kinds: ["e2e"] },
    { clm: "CLM-OBS-063", posted: () => cucumber(["@CLM-ONE-001", "@performance"], ["passed"]), kinds: ["performance"] },
    { clm: "CLM-OBS-064", posted: () => cucumber(["@CLM-ONE-001", "@integration", "@e2e"], ["passed"]), kinds: ["integration", "e2e"] },
  ])("[$clm] a test report's result will be unit evidence, and a Cucumber result will take the kind its tags name", ({ posted, kinds }) => {
    expect(posted().map(({ kind }) => kind)).toEqual(kinds);
  });
});

describe("balance posts each result citing the nearest code it has", () => {
  const DESCRIBE = "[CLM-ONE-002] a group";
  it.each<{ clm: string; posted: Posted; cites: readonly ClaimCode[] }>([
    { clm: "CLM-OBS-065", posted: () => vitest("passed", "[CLM-ONE-001] a test", `${DESCRIBE} [CLM-ONE-001] a test`), cites: [ONE] },
    { clm: "CLM-OBS-066", posted: () => vitest("passed", "a test", `${DESCRIBE} a test`), cites: [TWO] },
    { clm: "CLM-OBS-067", posted: () => vitest("passed", "CLM-ONE-001 a test", `${DESCRIBE} CLM-ONE-001 a test`), cites: [TWO] },
    { clm: "CLM-OBS-068", posted: () => vitest("passed", "[CLM-ONE-001] a test", `${DESCRIBE} [CLM-ONE-001] a test`), cites: [ONE] },
    { clm: "CLM-OBS-069", posted: () => vitest("passed", "a test", `${DESCRIBE} a test`), cites: [TWO] },
    { clm: "CLM-OBS-070", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-002]_group/[CLM-ONE-001]_a" }), cites: [ONE] },
    { clm: "CLM-OBS-071", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-002]_group/a" }), cites: [TWO] },
    { clm: "CLM-OBS-072", posted: () => junit({ classname: "[CLM-ONE-002] a class", name: "[CLM-ONE-001] a test" }), cites: [ONE] },
    { clm: "CLM-OBS-073", posted: () => junit({ classname: "[CLM-ONE-002] a class", name: "a test" }), cites: [TWO] },
    { clm: "CLM-OBS-074", posted: () => junit({ classname: "example.ClassCitesTest", name: "a test whose own display name cites nothing" }), cites: [] },
    { clm: "CLM-OBS-075", posted: () => rspec("passed", "[CLM-ONE-001] a spec", `${DESCRIBE} [CLM-ONE-001] a spec`), cites: [ONE] },
    { clm: "CLM-OBS-076", posted: () => rspec("passed", "a spec", `${DESCRIBE} a spec`), cites: [TWO] },
  ])("[$clm] balance posts a nested test citing its own code, or its parent's code when the report gives one", ({ posted, cites }) => {
    expect(posted()).toMatchObject([{ cites }]);
  });
});

describe("an Evidence Observation says where to look", () => {
  it.each<{ clm: string; posted: Posted; where: Partial<EvidenceObservation> }>([
    { clm: "CLM-OBS-078", posted: () => parseVitestEvidenceObservations({ testResults: [{ name: "a.test.ts", assertionResults: [{ title: "adds two numbers", fullName: "adds two numbers", status: "passed" }] }] }), where: { place: "a.test.ts", name: "adds two numbers" } },
    { clm: "CLM-OBS-079", posted: () => parseVitestEvidenceObservations({ testResults: [{ name: "/work/acme/a.test.ts", assertionResults: [{ title: "adds two numbers", fullName: "adds two numbers", status: "passed" }] }] }, "/work/acme"), where: { place: "a.test.ts", name: "adds two numbers" } },
    { clm: "CLM-OBS-080", posted: () => parseCucumberEvidenceObservations(scenario(["@CLM-ONE-001"], ["passed"]), undefined, () => []), where: { place: "one.feature", name: "one adds one" } },
    { clm: "CLM-OBS-081", posted: () => fitness(CITING_STEP, { "CLM-ONE-001": { outcome: "success" } }), where: { place: "ci.yml:build:Lint" } },
  ])("[$clm] balance posts an Evidence Observation saying where to look", ({ posted, where }) => {
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
    expect(claimPostedTo(observation!, [claim(ONE)])).toEqual({ claimCode: PHANTOM });
  });

  it.each<{ clm: string; posted: Posted; claims: () => readonly ExecutableClaim[]; named: readonly ClaimCode[] }>([
    { clm: "CLM-OBS-084", posted: () => vitest("passed", "a test"), claims: () => [claim(ONE)], named: [] },
    { clm: "CLM-OBS-085", posted: () => vitest("passed", "[CLM-ABCDEF-001] a test"), claims: () => [claim(ONE)], named: [] },
    { clm: "CLM-OBS-086", posted: () => vitest("passed", "CLM-ONE-999 a test"), claims: () => [claim(ONE)], named: [] },
    { clm: "CLM-OBS-087", posted: () => fitness("      - name: Lint\n        run: pnpm lint\n", {}), claims: () => [claim(ONE)], named: [] },
    { clm: "CLM-OBS-088", posted: () => vitest("passed"), claims: () => [claim(ONE), claim(ONE)], named: [ONE] },
    { clm: "CLM-OBS-089", posted: () => vitest("passed", "[CLM-ONE-001] [CLM-ONE-002] a test"), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] },
    { clm: "CLM-OBS-090", posted: () => vitest("passed", "[CLM-ONE-001] [CLM-ONE-002] a test"), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] },
    { clm: "CLM-OBS-091", posted: () => pytest({ classname: "tests.a", name: "test_a", properties: clmProperty("CLM-ONE-001", "CLM-ONE-002") }), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] },
    { clm: "CLM-OBS-092", posted: () => junit({ classname: "example.com/a", name: "TestA/[CLM-ONE-001][CLM-ONE-002]_a" }), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] },
    { clm: "CLM-OBS-093", posted: () => junit({ classname: "example.ATest", name: "[CLM-ONE-001] [CLM-ONE-002] a test" }), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] },
    { clm: "CLM-OBS-094", posted: () => rspec("passed", "[CLM-ONE-001] [CLM-ONE-002] a spec"), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] },
    { clm: "CLM-OBS-095", posted: () => cucumber(["@CLM-ONE-001", "@CLM-ONE-002"], ["passed"]), claims: () => [claim(ONE), claim(TWO)], named: [ONE, TWO] },
  ])("[$clm] balance posts an Evidence Observation no single executable claim can take to the unnamed claim", ({ posted, claims, named }) => {
    const [observation] = posted();
    expect(claimPostedTo(observation!, claims())).toEqual({});
    expect(observation!.cites).toEqual(named);
  });
});
