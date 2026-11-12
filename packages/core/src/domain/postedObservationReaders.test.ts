import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runBalanceCaptured } from "../../../spec-controller/src/commands/runBalance.test-utils.js";
import { temporaryDirectory } from "../../../spec-controller/src/temporaryDirectory.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

interface Reconciled {
  readonly claimReconciliations: readonly { readonly qualityCheckReconciliations: readonly { readonly observation?: unknown }[] }[];
  readonly totals: { readonly evidenceObservations: { readonly total: number } };
}

const CLAIM_ONE = "@ONE\nFeature: one\n\n  Rule: r\n    @unit @CLM-ONE-001\n    Scenario: a claim\n      Given a step\n";

const FITNESS_CLAIM_ONE = "@ONE\nFeature: one\n\n  Rule: r\n    @fitness @CLM-ONE-001\n    Scenario: a claim\n      Given a step\n";

// Balance run over a target holding the one feature file and the one workflow, given each named input's file.
function balanced(feature: string, workflow: string, inputs: Readonly<Record<string, string>>): Reconciled {
  const dir = temporaryDirectory("observation-reader-");
  const features = join(dir, "features");
  mkdirSync(features);
  writeFileSync(join(features, "one.feature"), feature);
  const ci = join(dir, "ci.yml");
  writeFileSync(ci, workflow);
  const named = Object.entries({ "package-json": '{"scripts":{}}', ...inputs }).flatMap(([flag, content]) => {
    const path = join(dir, `${flag}.input`);
    writeFileSync(path, content);
    return [`--${flag}`, path];
  });

  const run = runBalanceCaptured(["--features", features, "--ci", ci, ...named, "--format", "json"]);

  expect(run.stderr).toBe("");
  return JSON.parse(run.stdout) as Reconciled;
}

function postedOn({ claimReconciliations }: Reconciled): unknown[] {
  return claimReconciliations.flatMap(({ qualityCheckReconciliations }) => qualityCheckReconciliations.flatMap(({ observation }) => observation ?? []));
}

const NO_STEPS = "jobs: {}\n";

const ONE_STEP = (step: string): string => `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n${step}`;

const JEST_PASSED =
  '{"testResults":[{"name":"/t/a.test.js","status":"passed","message":"","assertionResults":[{"fullName":"[CLM-ONE-001] a test","title":"[CLM-ONE-001] a test","status":"passed"}]}]}';
const JEST_FAILED =
  '{"testResults":[{"name":"/t/a.test.js","status":"failed","message":"boom","assertionResults":[{"fullName":"[CLM-ONE-001] a test","title":"[CLM-ONE-001] a test","status":"failed"}]}]}';
const PYTEST_PASSED =
  '<testsuites><testsuite name="pytest"><testcase classname="tests.a" name="test_a"><properties><property name="clm" value="CLM-ONE-001"/></properties></testcase></testsuite></testsuites>';
const PYTEST_FAILED =
  '<testsuites><testsuite name="pytest"><testcase classname="tests.a" name="test_a"><properties><property name="clm" value="CLM-ONE-001"/></properties><failure>boom</failure></testcase></testsuite></testsuites>';
const GO_PASSED = '<testsuites><testsuite name="example.com/a"><testcase classname="example.com/a" name="TestA/[CLM-ONE-001]_a"/></testsuite></testsuites>';
const GO_FAILED =
  '<testsuites><testsuite name="example.com/a"><testcase classname="example.com/a" name="TestA/[CLM-ONE-001]_a"><failure>boom</failure></testcase></testsuite></testsuites>';
const JUNIT5_PASSED = '<testsuites><testsuite name="example.ATest"><testcase classname="example.ATest" name="[CLM-ONE-001] a test"/></testsuite></testsuites>';
const JUNIT5_FAILED =
  '<testsuites><testsuite name="example.ATest"><testcase classname="example.ATest" name="[CLM-ONE-001] a test"><failure>boom</failure></testcase></testsuite></testsuites>';
const RSPEC_PASSED =
  '{"examples":[{"description":"[CLM-ONE-001] a spec","full_description":"[CLM-ONE-001] a spec","status":"passed","file_path":"./spec/a_spec.rb"}],"summary":{"errors_outside_of_examples_count":0},"messages":[]}';
const RSPEC_FAILED =
  '{"examples":[{"description":"[CLM-ONE-001] a spec","full_description":"[CLM-ONE-001] a spec","status":"failed","file_path":"./spec/a_spec.rb"}],"summary":{"errors_outside_of_examples_count":0},"messages":[]}';
const CUCUMBER_PASSED =
  '[{"uri":"features/one.feature","name":"one","elements":[{"name":"a claim","tags":[{"name":"@CLM-ONE-001"}],"steps":[{"keyword":"Given ","name":"a step","result":{"status":"passed"}},{"keyword":"Then ","name":"a step","result":{"status":"passed"}}]}]}]';
const CUCUMBER_FAILED =
  '[{"uri":"features/one.feature","name":"one","elements":[{"name":"a claim","tags":[{"name":"@CLM-ONE-001"}],"steps":[{"keyword":"Given ","name":"a step","result":{"status":"failed"}},{"keyword":"Then ","name":"a step","result":{"status":"skipped"}}]}]}]';
const CITING_STEP = "      - id: CLM-ONE-001\n        name: Lint\n        run: pnpm lint\n";

describe("balance posts a result as passed or failed, citing its claim code", () => {
  it.each([
    ["CLM-OBS-019", "jest", JEST_PASSED, "passed"],
    ["CLM-OBS-020", "jest", JEST_FAILED, "failed"],
    ["CLM-OBS-021", "pytest", PYTEST_PASSED, "passed"],
    ["CLM-OBS-022", "pytest", PYTEST_FAILED, "failed"],
    ["CLM-OBS-023", "junit", GO_PASSED, "passed"],
    ["CLM-OBS-024", "junit", GO_FAILED, "failed"],
    ["CLM-OBS-025", "junit", JUNIT5_PASSED, "passed"],
    ["CLM-OBS-026", "junit", JUNIT5_FAILED, "failed"],
    ["CLM-OBS-027", "junit", JUNIT5_PASSED, "passed"],
    ["CLM-OBS-028", "junit", JUNIT5_FAILED, "failed"],
    ["CLM-OBS-029", "rspec", RSPEC_PASSED, "passed"],
    ["CLM-OBS-030", "rspec", RSPEC_FAILED, "failed"],
    ["CLM-OBS-031", "cucumber", CUCUMBER_PASSED, "passed"],
    ["CLM-OBS-032", "cucumber", CUCUMBER_FAILED, "failed"],
  ])("[%s] balance reads the --%s report, and posts what it holds", (_clm, flag, content, result) => {
    expect(postedOn(balanced(CLAIM_ONE, NO_STEPS, { [flag]: content }))).toMatchObject([{ result, cites: [{ featureCode: "ONE", number: "001" }] }]);
  });

  it.each([
    ["CLM-OBS-033", "success", "passed"],
    ["CLM-OBS-034", "failure", "failed"],
  ])("[%s] balance reads the step record, where the step's outcome was %s, and posts it", (_clm, outcome, result) => {
    const reconciled = balanced(FITNESS_CLAIM_ONE, ONE_STEP(CITING_STEP), { "ci-steps": `{"CLM-ONE-001":{"outcome":"${outcome}"}}` });

    expect(postedOn(reconciled)).toMatchObject([{ result, kind: "fitness", cites: [{ featureCode: "ONE", number: "001" }] }]);
  });

  it("[CLM-OBS-025] balance reads the folder of reports Maven Surefire writes, a summary beside each", () => {
    const dir = temporaryDirectory("surefire-reports-");
    writeFileSync(join(dir, "TEST-example.ATest.xml"), JUNIT5_PASSED);
    writeFileSync(join(dir, "example.ATest.txt"), "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0\n");
    const features = join(dir, "features");
    mkdirSync(features);
    writeFileSync(join(features, "one.feature"), CLAIM_ONE);
    const ci = join(dir, "ci.yml");
    writeFileSync(ci, NO_STEPS);

    const run = runBalanceCaptured(["--features", features, "--ci", ci, "--junit", dir, "--format", "json"]);

    expect(run.stderr).toBe("");
    expect(postedOn(JSON.parse(run.stdout) as Reconciled)).toMatchObject([{ result: "passed", cites: [{ featureCode: "ONE", number: "001" }] }]);
  });
});

describe("balance posts a fitness Evidence Observation only for a step that is a fitness function, unless its id is a claim code", () => {
  it("[CLM-OBS-012] a step running spec-controller balance posts nothing", () => {
    const reconciled = balanced(CLAIM_ONE, ONE_STEP("      - run: spec-controller balance --features features\n"), {});

    expect(reconciled.totals.evidenceObservations.total).toBe(0);
  });

  it("[CLM-OBS-004] a step running pnpm audit-the-tree posts a fitness Evidence Observation", () => {
    const reconciled = balanced(CLAIM_ONE, ONE_STEP("      - run: pnpm audit-the-tree\n"), {});

    expect(reconciled.totals.evidenceObservations.total).toBe(1);
  });
});
