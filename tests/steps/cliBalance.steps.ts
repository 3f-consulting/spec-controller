import { After, Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { optionFlag } from "./support/balanceOption.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { exitNamedBy, exitOn, RUN_OUTCOME } from "./support/runExit.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
};

const BALANCED = {
  features: "tests/fixtures/balanced/features",
  vitest: "tests/fixtures/balanced/vitest.json",
  packageJson: "tests/fixtures/balanced/package.json",
};

const PENDING_ONLY = {
  features: "tests/fixtures/pending-only/features",
  packageJson: "tests/fixtures/pending-only/package.json",
};

const BROKEN = {
  features: "tests/fixtures/broken/features",
  vitest: "tests/fixtures/broken/vitest.json",
  packageJson: "tests/fixtures/broken/package.json",
};

const SUSPENSE_ONLY = {
  features: "tests/fixtures/suspense-only/features",
  vitest: "tests/fixtures/suspense-only/vitest.json",
  packageJson: "tests/fixtures/suspense-only/package.json",
  ci: "tests/fixtures/suspense-only/ci.yml",
};

const NO_WORKFLOWS = (fixtureDir: string): string[] => ["--ci", fixtureDir];

let invocationArgs: string[] = [];
let missingPath = "";
let invocationCwd: string | undefined;
let cliResult: SpawnSyncReturns<string>;

const temporaryPaths: string[] = [];

After(function () {
  for (const path of temporaryPaths.splice(0)) rmSync(path, { recursive: true, force: true });
});

function spawnBalance(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const cwd = invocationCwd ?? root;
  invocationCwd = undefined;
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, "balance", ...args],
    { cwd, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

Given("a target with scenarios and a Vitest report of what ran", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson, ...NO_WORKFLOWS("tests/fixtures/balanced")];
});

Given("a target, and the {} pointing at a path that does not exist", function (option: string) {
  const flag = optionFlag(option);
  const root = process.cwd();
  missingPath = `tests/fixtures/does-not-exist/${flag.replace(/^--/, "")}.missing`;
  assert.ok(!existsSync(join(root, missingPath)), `fixture invariant: ${missingPath} must not exist`);
  const args: Record<string, string> = {
    "--features": FIXTURE.features,
    "--vitest": FIXTURE.vitest,
  };
  args[flag] = missingPath;
  invocationArgs = Object.entries(args).flatMap(([k, v]) => [k, v]);
});

When("balance is asked to reconcile that target", function () {
  cliResult = spawnBalance(invocationArgs);
});

When("balance is asked to re-render that saved report", function () {
  cliResult = spawnBalance(invocationArgs);
});

Then("it reports the Evidence Reconciliation", function () {
  assert.match(cliResult.stdout, /^# Evidence Reconciliation/m);
});

Then("the reconciliation reports the target's scenarios", function () {
  assert.match(cliResult.stdout, /\| Scenario Reconciliation \| 2 \|/);
});

Then("the run is rejected for the missing path", function () {
  assert.notEqual(cliResult.status, 0, `expected a non-zero exit; got ${cliResult.status}\n${cliResult.stdout}`);
  assert.match(
    cliResult.stderr,
    /path does not exist/,
    `expected the refusal to say the path does not exist, not that the input could not be read; got:\n${cliResult.stderr}`,
  );
});

Then("the rejection names the {} and the missing path", function (option: string) {
  const flag = optionFlag(option);
  assert.ok(
    cliResult.stderr.includes(flag),
    `expected stderr to name the flag ${flag}; got:\n${cliResult.stderr}`,
  );
  assert.ok(
    cliResult.stderr.includes(missingPath),
    `expected stderr to name the missing path ${missingPath}; got:\n${cliResult.stderr}`,
  );
});

Then("nothing is reconciled", function () {
  assert.doesNotMatch(cliResult.stdout, /Evidence Reconciliation/);
});

Given("a target with scenarios and a Vitest report", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson, ...NO_WORKFLOWS("tests/fixtures/balanced")];
});

When("balance is asked to reconcile that target without the Cucumber report option", function () {
  assert.ok(!invocationArgs.includes("--cucumber"), "fixture invariant: --cucumber must be omitted");
  cliResult = spawnBalance(invocationArgs);
});

Then("it reconciles the scenarios against the supplied evidence", function () {
  assert.match(cliResult.stdout, /^# Evidence Reconciliation/m);
  assert.match(cliResult.stdout, /\| Scenario Reconciliation \| 2 \|/);
});

Given("a target that reconciles out-of-balance", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
  invocationArgs = [
    "--features",
    FIXTURE.features,
    "--vitest",
    FIXTURE.vitest,
    ...NO_WORKFLOWS("tests/fixtures/evidence-observation"),
  ];
});

Given("a target that reconciles all-balanced", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson, ...NO_WORKFLOWS("tests/fixtures/balanced")];
});

Given("a target whose vitest report carries a collection-failed suite", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, BROKEN.features)), `missing fixture features: ${BROKEN.features}`);
  assert.ok(existsSync(join(root, BROKEN.vitest)), `missing fixture vitest report: ${BROKEN.vitest}`);
  invocationArgs = [
    "--features",
    BROKEN.features,
    "--vitest",
    BROKEN.vitest,
    "--package-json",
    BROKEN.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/broken"),
  ];
});

Given("a target whose only exception is Pending Items", function () {
  invocationArgs = pendingOnlyArgs();
});

function pendingOnlyArgs(): string[] {
  const root = process.cwd();
  assert.ok(existsSync(join(root, PENDING_ONLY.features)), `missing fixture features: ${PENDING_ONLY.features}`);
  assert.ok(
    existsSync(join(root, PENDING_ONLY.packageJson)),
    `missing fixture package.json: ${PENDING_ONLY.packageJson}`,
  );
  return [
    "--features",
    PENDING_ONLY.features,
    "--package-json",
    PENDING_ONLY.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/pending-only"),
  ];
}

Then("the reconciliation reports a Pending Item", function () {
  assert.match(cliResult.stdout, /Pending Item/);
});

When("balance is asked to reconcile that target under the strict option", function () {
  cliResult = spawnBalance([...invocationArgs, "--strict"]);
});

let controllerResult: SpawnSyncReturns<string>;

function spawnController(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, ...args],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

Given("the spec-controller host", function () {});

const UNKNOWN_COMMAND_REQUESTS: Record<string, { argv: string[]; command: string; stored: boolean }> = {
  "a typo of a command": { argv: ["blance"], command: "blance", stored: false },
  "a name that is no command": { argv: ["nosuchcommand"], command: "nosuchcommand", stored: false },
  "a name that is no command, as a stored run": { argv: ["nosuchcommand"], command: "nosuchcommand", stored: true },
  "a name that is no command, with the report-only option after the command": {
    argv: ["nosuchcommand", "--exit-zero"],
    command: "nosuchcommand",
    stored: false,
  },
};
let unknownCommand = "";

When("it is asked for {}", function (request: string) {
  const known = UNKNOWN_COMMAND_REQUESTS[request];
  assert.ok(known !== undefined, `no request row named "${request}"`);
  unknownCommand = known.command;
  if (!known.stored) {
    controllerResult = spawnController(known.argv);
    return;
  }
  const storeRoot = mkdtempSync(join(tmpdir(), "scn-cli-056-"));
  try {
    controllerResult = spawnController(["--store", storeRoot, ...known.argv]);
  } finally {
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

Then("the invocation is refused as a usage error", function () {
  assert.equal(
    controllerResult.status,
    2,
    `expected the usage status 2; got ${controllerResult.status}\n${controllerResult.stderr}`,
  );
});

Then("it names the command it does not know", function () {
  assert.ok(
    controllerResult.stderr.includes(`"${unknownCommand}"`),
    `expected stderr to name "${unknownCommand}"; got:\n${controllerResult.stderr}`,
  );
});

Then("it produces nothing a pipeline could read as a report", function () {
  assert.equal(controllerResult.stdout, "", `expected nothing on stdout; got:\n${controllerResult.stdout}`);
});

Given("a flag balance has never registered", function () {
  invocationArgs = ["--bogus"];
});

When("balance is asked to run with that unregistered flag", function () {
  cliResult = spawnBalance(invocationArgs);
});

Then("the run is refused as a usage error", function () {
  assert.equal(
    cliResult.status,
    exitOn("a usage error"),
    `expected exit 2; got ${cliResult.status}\nstdout:\n${cliResult.stdout}\nstderr:\n${cliResult.stderr}`,
  );
});

Then("the run is refused as a usage error, naming the unrecognised flag", function () {
  assert.equal(
    cliResult.status,
    2,
    `expected exit 2; got ${cliResult.status}\nstdout:\n${cliResult.stdout}\nstderr:\n${cliResult.stderr}`,
  );
  assert.ok(
    cliResult.stderr.includes("--bogus"),
    `expected stderr to name the unknown flag --bogus; got:\n${cliResult.stderr}`,
  );
});

Then(
  "the refusal names the version that refused it and the bump that cures a pinned skew",
  function () {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "packages", "spec-controller", "package.json"), "utf8"),
    ) as { version?: unknown };
    assert.equal(
      typeof manifest.version,
      "string",
      "the spec-controller package manifest must carry a version for the refusal to name",
    );
    const toolVersion = manifest.version as string;
    assert.notEqual(toolVersion, "", "an empty version would make the version claim vacuous");

    assert.ok(
      cliResult.stderr.includes(toolVersion),
      `expected the refusal to name the version that refused (${toolVersion}); got:\n${cliResult.stderr}`,
    );
    assert.match(
      cliResult.stderr,
      /bump the pin/i,
      `expected the refusal to name the bump as the cure; got:\n${cliResult.stderr}`,
    );
  },
);

let retiredFlagResult: SpawnSyncReturns<string>;

Given("a flag balance has retired", function () {
  invocationArgs = ["--measurements", "x.json"];
});

When("balance is asked to run with that flag", function () {
  retiredFlagResult = spawnBalance(invocationArgs);
});

Then("balance refuses the run as a usage fault and reconciles nothing", function () {
  assert.equal(
    retiredFlagResult.status,
    2,
    `expected exit 2; got ${retiredFlagResult.status}\nstderr:\n${retiredFlagResult.stderr}`,
  );
  assert.doesNotMatch(retiredFlagResult.stdout, /Evidence Reconciliation/);
});

Then("the refusal names the flag as retired, with the version that retired it", function () {
  assert.match(
    retiredFlagResult.stderr,
    /--measurements[^\n]*retired[^\n]*0\.1\.0-alpha\.5/i,
    `expected stderr to name --measurements as retired in 0.1.0-alpha.5; got:\n${retiredFlagResult.stderr}`,
  );
});

Then("the refusal names what replaced it", function () {
  assert.ok(
    retiredFlagResult.stderr.includes("--ci-steps") && /outcome/i.test(retiredFlagResult.stderr),
    `expected stderr to name the step-outcome route through --ci-steps; got:\n${retiredFlagResult.stderr}`,
  );
});

Then("the refusal advises no pin toward a version that still accepts the flag", function () {
  assert.doesNotMatch(retiredFlagResult.stderr, /bump the pin/i);
  assert.doesNotMatch(retiredFlagResult.stderr, /accepts --measurements/);
});

Given("a target whose only out-of-balance row is the suspense reconciliation", function () {
  const root = process.cwd();
  for (const path of Object.values(SUSPENSE_ONLY)) {
    assert.ok(existsSync(join(root, path)), `missing fixture input: ${path}`);
  }
  invocationArgs = [
    "--features",
    SUSPENSE_ONLY.features,
    "--vitest",
    SUSPENSE_ONLY.vitest,
    "--package-json",
    SUSPENSE_ONLY.packageJson,
    "--ci",
    SUSPENSE_ONLY.ci,
  ];
});

function tallyOutOfBalance(stdout: string): number {
  const row = stdout.match(/^\| Scenario Reconciliation \| (\d+) \| (\d+) \| (\d+) \|/m);
  assert.ok(row, `expected a Scenario Reconciliation tally row in stdout; got:\n${stdout}`);
  return Number(row[3]);
}

function verdictHeadline(stdout: string): { word: string; exit: number } {
  const headline = stdout.match(/^\*\*(BALANCED|OUT-OF-BALANCE|UNSOUND|PENDING)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${stdout}`);
  return { word: String(headline[1]), exit: Number(headline[2]) };
}

Then("the trial-balance table counts {int} out-of-balance Scenario Reconciliation", function (count: number) {
  assert.equal(
    tallyOutOfBalance(cliResult.stdout),
    count,
    `expected the tally to count ${count} out-of-balance Scenario Reconciliation; got:\n${cliResult.stdout}`,
  );
});

Then("the verdict headline reads {word} and names the exit it ends with", function (word: string) {
  const exit = exitNamedBy(word);
  const headline = verdictHeadline(cliResult.stdout);
  assert.equal(headline.word, word, `expected the headline to read ${word}; got ${headline.word}`);
  assert.equal(headline.exit, exit, `expected the headline to name exit ${exit}; got exit ${headline.exit}`);
});

Then("the tally, the verdict headline and the run's exit agree", function () {
  const tally = tallyOutOfBalance(cliResult.stdout);
  const headline = verdictHeadline(cliResult.stdout);
  const exitCode = cliResult.status;

  assert.equal(
    exitCode,
    headline.exit,
    `the headline names exit ${headline.exit} but the process exited ${exitCode}`,
  );
  assert.equal(
    tally > 0,
    exitCode !== 0,
    `the tally counts ${tally} out-of-balance but the process exited ${exitCode} — the tally and the exit code disagree`,
  );
  assert.equal(
    headline.word === "BALANCED",
    tally === 0,
    `the headline reads ${headline.word} but the tally counts ${tally} out-of-balance`,
  );
});

Then(new RegExp(`^the run ends on (${RUN_OUTCOME})$`), function (outcome: string) {
  const code = exitOn(outcome);
  assert.equal(
    cliResult.status,
    code,
    `expected exit ${code}; got ${cliResult.status}\nstdout:\n${cliResult.stdout}\nstderr:\n${cliResult.stderr}`,
  );
});

let unparseablePath = "";

Given(
  "a target, and the Vitest report option pointing at a report that exists but is not valid JSON",
  function () {
    const root = process.cwd();
    unparseablePath = join(tmpdir(), `scn-cli-014-${process.pid}.json`);
    temporaryPaths.push(unparseablePath);
    writeFileSync(unparseablePath, "not valid json at all {{{");

    assert.ok(existsSync(unparseablePath), "the fixture report must EXIST — this is not the missing-path case");
    invocationArgs = [
      "--features",
      join(root, BALANCED.features),
      "--vitest",
      unparseablePath,
    ];
  },
);

let unparseableFeature = "";

Given(
  "a feature corpus containing a feature file that is a corrupt tag line",
  function () {
    writeCorruptFeature(
      "@AAA\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n\n" +
        "  @unit @SCN-AAA-002 x\n  Scenario: beta works\n    Given another thing\n",
    );
  },
);

Given(
  "a feature corpus containing a feature file that is a corrupt scenario keyword",
  function () {
    writeCorruptFeature(
      "@AAA\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n\n" +
        "  @unit @SCN-AAA-002\n  Scenari0: beta works\n    Given another thing\n",
    );
  },
);

Given(
  "a feature corpus containing a feature file that is wholly unparseable",
  function () {
    writeCorruptFeature("not gherkin at all {{{\n");
  },
);

function writeCorruptFeature(featureSource: string): void {
  const dir = mkdtempSync(join(tmpdir(), `scn-cli-016-${process.pid}-`));
  temporaryPaths.push(dir);
  mkdirSync(join(dir, "features"), { recursive: true });
  unparseableFeature = join(dir, "features", "target.feature");
  writeFileSync(unparseableFeature, featureSource);

  const vitestReport = join(dir, "vitest.json");
  writeFileSync(
    vitestReport,
    JSON.stringify({
      testResults: [
        {
          name: "/x/a.test.ts",
          status: "passed",
          assertionResults: [
            { fullName: "[SCN-AAA-001] alpha works", title: "alpha works", status: "passed" },
          ],
        },
      ],
    }),
  );
  const packageJson = join(dir, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "fixture", scripts: {} }));

  invocationArgs = [
    "--features",
    join(dir, "features"),
    "--vitest",
    vitestReport,
    "--package-json",
    packageJson,
  ];
}

Then("the refusal names the unparseable feature file and the parse failure", function () {
  assert.ok(
    cliResult.stderr.includes(unparseableFeature),
    `expected stderr to NAME the unparseable feature file ${unparseableFeature}; got:\n${cliResult.stderr}`,
  );
  assert.ok(
    cliResult.stderr.trim().length > unparseableFeature.length,
    `expected stderr to carry the PARSE FAILURE alongside the file name; got:\n${cliResult.stderr}`,
  );
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${cliResult.stderr}`,
  );
});

let unreadableSavedReport = "";

Given(
  "the re-render option pointing at a saved report that is {word}",
  function (defect: string) {
    if (defect === "missing") {
      unreadableSavedReport = join(tmpdir(), `scn-cli-015-missing-${process.pid}.json`);
      assert.ok(
        !existsSync(unreadableSavedReport),
        "the missing-path fixture must NOT exist on disk",
      );
    } else {
      unreadableSavedReport = join(tmpdir(), `scn-cli-015-bad-${process.pid}.json`);
      temporaryPaths.push(unreadableSavedReport);
      writeFileSync(unreadableSavedReport, "not a saved report at all {{{");
      assert.ok(existsSync(unreadableSavedReport), "the unparseable fixture must EXIST");
    }
    invocationArgs = ["--render-from-json", unreadableSavedReport];
  },
);

Then("the refusal names the unreadable saved report", function () {
  assert.ok(
    cliResult.stderr.includes(unreadableSavedReport),
    `expected stderr to NAME the unreadable saved report ${unreadableSavedReport}; got:\n${cliResult.stderr}`,
  );
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${cliResult.stderr}`,
  );
});

Then("nothing is rendered", function () {
  assert.doesNotMatch(cliResult.stdout, /Evidence Reconciliation/);
});

Then("the refusal names the unparseable report and the parse failure", function () {
  assert.ok(
    cliResult.stderr.includes(unparseablePath),
    `expected stderr to NAME the unparseable report ${unparseablePath}; got:\n${cliResult.stderr}`,
  );
  assert.match(
    cliResult.stderr,
    /not valid JSON|JSON/i,
    `expected stderr to name the PARSE failure, not merely the file; got:\n${cliResult.stderr}`,
  );
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${cliResult.stderr}`,
  );
});

const NOTHING_TO_RECONCILE = {
  features: "tests/fixtures/nothing-to-reconcile/features",
  packageJson: "tests/fixtures/nothing-to-reconcile/package.json",
};

Given("a target that carried no scenario and produced no evidence", function () {
  const root = process.cwd();
  for (const path of Object.values(NOTHING_TO_RECONCILE)) {
    assert.ok(existsSync(join(root, path)), `missing fixture input: ${path}`);
  }
  invocationArgs = [
    "--features",
    NOTHING_TO_RECONCILE.features,
    "--package-json",
    NOTHING_TO_RECONCILE.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/nothing-to-reconcile"),
  ];
});

Then("the verdict headline says the run had nothing to reconcile, never that it balanced", function () {
  const headline = cliResult.stdout.match(/^\*\*(.+?)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${cliResult.stdout}`);
  assert.equal(
    headline[1],
    "NOTHING TO RECONCILE",
    `expected the headline word to say the run had nothing to reconcile; got **${headline[1]}**`,
  );
  assert.equal(
    Number(headline[2]),
    5,
    `expected the headline to name exit 5; got exit ${headline[2]}`,
  );
  assert.doesNotMatch(
    cliResult.stdout,
    /\*\*BALANCED\*\*/,
    `a run with no accounts must NEVER read as balanced; got:\n${cliResult.stdout}`,
  );
});

const ENUMERATED_STATUSES = [0, 1, 2, 3, 4, 5];

Given("a target with no Gherkin corpus at all — no features directory on disk", function () {
  const dir = mkdtempSync(join(tmpdir(), `scn-cli-017-${process.pid}-`));
  temporaryPaths.push(dir);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "new-client-target", private: true, scripts: { test: "vitest run" } }),
  );
  assert.ok(
    !existsSync(join(dir, "features")),
    `fixture invariant: ${join(dir, "features")} must NOT exist — this is the ABSENT corpus case`,
  );
  invocationArgs = [];
  invocationCwd = dir;
});

Then("the run ends on the exit its verdict headline names, rather than on a stack trace", function () {
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .+:\d+:\d+\)?$/m,
    `expected no stack trace on stderr; got:\n${cliResult.stderr}`,
  );
  assert.doesNotMatch(
    cliResult.stderr,
    /ENOENT/,
    `the absent corpus escaped as a raw filesystem error; got:\n${cliResult.stderr}`,
  );
  assert.ok(
    ENUMERATED_STATUSES.includes(cliResult.status ?? -1),
    `expected an enumerated status; got ${cliResult.status}\nstderr:\n${cliResult.stderr}`,
  );
  const headline = cliResult.stdout.match(/^\*\*(.+?)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${cliResult.stdout}`);
  assert.equal(
    cliResult.status,
    Number(headline[2]),
    `the report says exit ${headline[2]} (**${headline[1]}**) but the process exited ${cliResult.status} — a status the REPORT did not choose is Node's, not the tool's`,
  );
});

const NEW_CLIENT_UNCITED = "tests/fixtures/new-client-uncited";

Given("a target with no Gherkin corpus whose unit evidence cites no scenario", function () {
  const dir = join(process.cwd(), NEW_CLIENT_UNCITED);
  assert.ok(
    !existsSync(join(dir, "features")),
    `fixture invariant: ${join(dir, "features")} must NOT exist — an EMPTY corpus directory is a
     different shape and would sit green through the very shortcut this scenario guards`,
  );
  invocationArgs = ["--vitest", "vitest.json"];
  invocationCwd = dir;
});

Then("the uncited evidence observations are posted to the suspense reconciliation", function () {
  const volume = cliResult.stdout.match(
    /^(\d+) evidence observations = (\d+) on scenarios \+ (\d+) on phantom scenarios \+ (\d+) on the suspense scenario\.$/m,
  );
  assert.ok(volume, `expected the test-volume sentence in stdout; got:\n${cliResult.stdout}`);
  assert.deepEqual(
    [volume[1], volume[2], volume[3], volume[4]].map(Number),
    [2, 0, 0, 2],
    `expected both uncited evidence observations on the suspense scenario and none anywhere else; got: ${volume[0]}`,
  );
  assert.match(
    cliResult.stdout,
    /^\| ↳ Evidence Observation cites no Scenario \| +\| +\| 2 \|/m,
    `expected the two evidence observations reconciled as cites-no-scenario; got:\n${cliResult.stdout}`,
  );
});

Then("the run is never read as one with nothing to reconcile", function () {
  assert.doesNotMatch(
    cliResult.stdout,
    /NOTHING TO RECONCILE/,
    `a corpus-less run WITH accounts has something to reconcile — its suspense row; got:\n${cliResult.stdout}`,
  );
  assert.notEqual(
    cliResult.status,
    5,
    `expected an ordinary out-of-balance verdict; the run exited 5, so nothing-to-reconcile was keyed on the empty CORPUS rather than the empty LEDGER\nstdout:\n${cliResult.stdout}`,
  );
});

const CORPUS_DIR = "features";

let noCorpusTargets: { shape: string; root: string }[] = [];
let noCorpusRuns: { shape: string; stdout: string }[] = [];

function verdictLineOf(stdout: string, shape: string): string {
  const line = stdout.match(/^\*\*.+\*\* — .*\(exit \d+\)$/m)?.[0];
  assert.ok(line, `expected a run-verdict headline for the target with ${shape}; got:\n${stdout}`);
  return line;
}

function noCorpusRun(index: number): { shape: string; stdout: string } {
  const run = noCorpusRuns[index];
  assert.ok(run, `expected all three shapes to have been run; run ${index} is missing`);
  return run;
}

Given(
  "a target with no corpus directory, a target whose corpus is empty, and a target whose corpus carries no scenario",
  function () {
    const root = mkdtempSync(join(tmpdir(), `scn-cli-018-${process.pid}-`));
    temporaryPaths.push(root);
    const manifest = JSON.stringify({ name: "new-client-target", private: true, scripts: {} });
    const shapes: { shape: string; build: (dir: string) => void }[] = [
      { shape: "no corpus directory", build: () => {} },
      { shape: "an empty corpus", build: (dir) => mkdirSync(join(dir, CORPUS_DIR)) },
      {
        shape: "a corpus carrying no scenario",
        build: (dir) => {
          mkdirSync(join(dir, CORPUS_DIR));
          writeFileSync(
            join(dir, CORPUS_DIR, "target.feature"),
            "Feature: a corpus that carries no scenario\n\n  Prose only. This file carries no scenario.\n",
          );
        },
      },
    ];
    noCorpusTargets = shapes.map(({ shape, build }, i) => {
      const dir = join(root, `shape-${i}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "package.json"), manifest);
      build(dir);
      return { shape, root: dir };
    });
    const [first] = noCorpusTargets;
    assert.ok(first && !existsSync(join(first.root, CORPUS_DIR)),
      `fixture invariant: the first target must have NO ${CORPUS_DIR}/ — that is the shape under test`,
    );
  },
);

When(
  "balance is asked to reconcile each of those targets",
  function () {
    noCorpusRuns = noCorpusTargets.map(({ shape, root }) => {
      invocationCwd = root;
      return { shape, stdout: spawnBalance([]).stdout };
    });
  },
);

Then("every one of them is told the same verdict by the same sentence", function () {
  assert.equal(noCorpusRuns.length, 3, "expected all three shapes to have been run");
  const first = noCorpusRun(0);
  const firstLine = verdictLineOf(first.stdout, first.shape);
  for (const index of [1, 2]) {
    const other = noCorpusRun(index);
    const otherLine = verdictLineOf(other.stdout, other.shape);
    assert.equal(
      otherLine,
      firstLine,
      `absent and empty are ONE answer, not two: the target with ${other.shape} was told something the target with ${first.shape} was not.\n  ${first.shape}: ${firstLine}\n  ${other.shape}: ${otherLine}`,
    );
  }
});

Then("that sentence names the corpus directory it examined", function () {
  const { shape, stdout } = noCorpusRun(0);
  const line = verdictLineOf(stdout, shape);
  assert.ok(
    line.includes(CORPUS_DIR),
    `"I found no record" and "I found no regression" must not wear one word: the verdict never names the corpus directory (${CORPUS_DIR}) it examined.\n  ${line}`,
  );
});

let exitZeroPair: { without: SpawnSyncReturns<string>; with: SpawnSyncReturns<string> } | undefined;

Given("a target that reconciles only-Pending-Items", function () {
  invocationArgs = pendingOnlyArgs();
});

const EXIT_ZERO_FLAGS: Record<string, string[]> = {
  "with no options": [],
  "under the strict option": ["--strict"],
};

When(
  "balance is asked to reconcile that target {}, once without the report-only option and once under it",
  function (flags: string) {
    const extra = EXIT_ZERO_FLAGS[flags];
    assert.ok(extra !== undefined, `unrecognised <flags> cell: ${flags}`);
    const without = spawnBalance([...invocationArgs, ...extra]);
    const withFlag = spawnBalance([...invocationArgs, ...extra, "--exit-zero"]);
    exitZeroPair = { without, with: withFlag };
  },
);

function exitZeroRuns(): { without: SpawnSyncReturns<string>; with: SpawnSyncReturns<string> } {
  assert.ok(exitZeroPair !== undefined, "the with/without --exit-zero pair was never run");
  return exitZeroPair;
}

function statusOf(run: SpawnSyncReturns<string>, label: string, code: number): void {
  assert.equal(
    run.status,
    code,
    `expected ${label} to exit ${code}; got ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );
}

Then(new RegExp(`^without the report-only option the run ends on (${RUN_OUTCOME})$`), function (outcome: string) {
  statusOf(exitZeroRuns().without, "the run without --exit-zero", exitOn(outcome));
});

Then(new RegExp(`^under the report-only option the run ends on (${RUN_OUTCOME})$`), function (outcome: string) {
  statusOf(exitZeroRuns().with, "the run with --exit-zero", exitOn(outcome));
});

const RUN_TIMESTAMP_LINE = /^- Run timestamp \(UTC\): .+$/m;

function maskRunTimestamp(stdout: string, label: string): string {
  assert.match(stdout, RUN_TIMESTAMP_LINE, `${label} printed no run-timestamp line to mask`);
  return stdout.replace(RUN_TIMESTAMP_LINE, "- Run timestamp (UTC): <masked>");
}

Then(
  "the two runs report the same Evidence Reconciliation, byte for byte but for the run timestamp each stamps for itself",
  function () {
    const { without, with: withFlag } = exitZeroRuns();
    assert.match(without.stdout, /^# Evidence Reconciliation/m);
    assert.equal(
      maskRunTimestamp(withFlag.stdout, "the run with --exit-zero"),
      maskRunTimestamp(without.stdout, "the run without --exit-zero"),
      "--exit-zero changed the report: only the exit status may move",
    );
  },
);

When("balance is asked to reconcile that target under the report-only option", function () {
  cliResult = spawnBalance([...invocationArgs, "--exit-zero"]);
});

const CODE_ERROR_OUT_OF_BALANCE = "tests/fixtures/code-error-out-of-balance";

Given(
  "a target whose corpus misfiles a scenario code and whose ledger has an account out of balance",
  function () {
    invocationArgs = [
      "--features", `${CODE_ERROR_OUT_OF_BALANCE}/features`,
      "--vitest", `${CODE_ERROR_OUT_OF_BALANCE}/vitest.json`,
      "--package-json", `${CODE_ERROR_OUT_OF_BALANCE}/package.json`,
      ...NO_WORKFLOWS(CODE_ERROR_OUT_OF_BALANCE),
    ];
  },
);

Then("the report lists the scenario code error", function () {
  assert.match(cliResult.stdout, /^## Scenario code errors$/m);
  assert.match(cliResult.stdout, /^- `foreign-scn-code` — two\.feature .*@SCN-CEA-002/m);
});

Then("the report carries the out-of-balance account", function () {
  assert.match(cliResult.stdout, /\| SCN-CEB-001 \|[^\n]*out-of-balance/);
});

Then("the verdict headline names both the scenario code error and the accounts out of balance", function () {
  const headline = cliResult.stdout.split("\n").find((line) => line.startsWith("**SCENARIO CODE ERRORS**"));
  assert.ok(headline, `expected the SCENARIO CODE ERRORS headline; got:\n${cliResult.stdout}`);
  assert.match(headline, /accounts do not agree/);
  assert.match(headline, /\(exit 1\)$/);
});

const SCENARIO_CODE_ERROR = "tests/fixtures/scenario-code-error";

Given("a target that reconciles balanced-with-scenario-code-errors", function () {
  invocationArgs = [
    "--features", `${SCENARIO_CODE_ERROR}/features`,
    "--vitest", `${SCENARIO_CODE_ERROR}/vitest.json`,
    "--package-json", `${SCENARIO_CODE_ERROR}/package.json`,
    ...NO_WORKFLOWS(SCENARIO_CODE_ERROR),
  ];
});

const UNSOUND_CODE_ERROR = "tests/fixtures/unsound-code-error";

Given("a target whose collection-failed suite sits beside a misfiled scenario code", function () {
  invocationArgs = [
    "--features", `${UNSOUND_CODE_ERROR}/features`,
    "--vitest", `${UNSOUND_CODE_ERROR}/vitest.json`,
    "--package-json", `${UNSOUND_CODE_ERROR}/package.json`,
    ...NO_WORKFLOWS(UNSOUND_CODE_ERROR),
  ];
});

Then("the report still lists the scenario code error", function () {
  assert.match(cliResult.stdout, /^## Scenario code errors$/m);
  assert.match(cliResult.stdout, /^- `foreign-scn-code` — two\.feature .*@SCN-UCA-002/m);
});

function withoutFlag(args: readonly string[], flag: string): string[] {
  const kept: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag) {
      i++;
      continue;
    }
    kept.push(args[i] ?? "");
  }
  return kept;
}

function standBesideAFileNamedTrue(args: readonly string[]): string[] {
  const root = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), "scn-cli-058-"));
  writeFileSync(join(dir, "true"), readFileSync(join(root, FIXTURE.vitest), "utf8"));
  invocationCwd = dir;
  return args.map((arg) => (arg.startsWith("--") ? arg : join(root, arg)));
}

const MISSING_VALUE_SHAPES: Record<string, (args: string[], flag: string) => string[]> = {
  "at the end of the arguments": (args, flag) => [...args, flag],
  "followed by the report-only option": (args, flag) => [...args, flag, "--exit-zero"],
  "with an empty value": (args, flag) => [...args, flag, ""],
  "at the end, with a file named true in the working directory": (args, flag) => [
    ...standBesideAFileNamedTrue(args),
    flag,
  ],
};

When(/^balance is asked to run with (.+) given no value, (.+)$/, function (option: string, shape: string) {
  const flag = optionFlag(option);
  const shapeOf = MISSING_VALUE_SHAPES[shape];
  assert.ok(shapeOf !== undefined, `no missing-value shape named "${shape}"`);
  const args = shapeOf(withoutFlag(invocationArgs, flag), flag);
  const cwd = invocationCwd;
  try {
    cliResult = spawnBalance(args);
  } finally {
    if (cwd !== undefined) rmSync(cwd, { recursive: true, force: true });
  }
});

Then("balance refuses the run as a usage fault, with nothing reconciled", function () {
  assert.equal(cliResult.status, 2, `expected the usage status 2; got ${cliResult.status}\n${cliResult.stderr}`);
  assert.equal(cliResult.stdout, "", `expected nothing on stdout; got:\n${cliResult.stdout}`);
});

Then(/^the refusal names (.+) as a flag missing its value$/, function (option: string) {
  const flag = optionFlag(option);
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => line.includes(flag) && /value/i.test(line)),
    `expected a line of stderr naming ${flag} as missing its value; got:\n${stderr}`,
  );
  assert.doesNotMatch(stderr, /\btrue\b/, `stderr names the word a missing value used to become:\n${stderr}`);
  assert.doesNotMatch(
    stderr,
    /does not exist|could not be read|unknown command|bump the pin/i,
    `stderr names a fault other than the missing value:\n${stderr}`,
  );
});

let storedRunDir = "";
let storedRunRoot = "";

Given("a target that reconciles out-of-balance, and an empty run store", function () {
  storedRunDir = mkdtempSync(join(tmpdir(), "scn-cli-059-"));
  storedRunRoot = join(storedRunDir, "store");
  mkdirSync(storedRunRoot);
  const root = process.cwd();
  invocationArgs = [
    "--features",
    join(root, FIXTURE.features),
    "--vitest",
    join(root, FIXTURE.vitest),
    ...NO_WORKFLOWS(join(root, "tests/fixtures/evidence-observation")),
  ];
});

const MISSING_MODIFIER_VALUE: Record<string, (store: string, target: string[]) => string[]> = {
  "the store modifier alone": () => ["--store"],
  "the store modifier followed by the run-name modifier": (_store, target) => ["--store", "--run-id", "r1", "balance", ...target],
  "the run-name modifier at the end, after the store modifier": (store) => ["--store", store, "--run-id"],
  "the run-name modifier with an empty value": (store, target) => ["--store", store, "--run-id", "", "balance", ...target],
  "the store modifier with an empty value": (_store, target) => ["--store", "", "balance", ...target],
};

When(/^a stored balance run is asked for with (.+) given no value, (.+)$/, function (modifier: string, shape: string) {
  const argvOf = MISSING_MODIFIER_VALUE[`${modifier} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${modifier} ${shape}`);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argvOf(storedRunRoot, invocationArgs)], {
    cwd: storedRunDir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then("nothing is written to the run store or the working directory", function () {
  try {
    assert.deepEqual(readdirSync(storedRunRoot), [], "expected the store root to stay empty");
    assert.deepEqual(readdirSync(storedRunDir), ["store"], "expected nothing beside the store root");
  } finally {
    rmSync(storedRunDir, { recursive: true, force: true });
  }
});

const FLAG_BEFORE_COMMAND: Record<string, { before: string[]; command: string }> = {
  "the report-only option, before balance": { before: ["--exit-zero"], command: "balance" },
  "the format option given md, before balance": { before: ["--format", "md"], command: "balance" },
  "an unknown flag, before balance": { before: ["--bogus"], command: "balance" },
  "the report-only option, before no known command": { before: ["--exit-zero"], command: "nosuchcommand" },
};
let flagOutOfPlace = "";

When("a stored run is asked for with {}", function (row: string) {
  const known = FLAG_BEFORE_COMMAND[row];
  assert.ok(known !== undefined, `no row named "${row}"`);
  flagOutOfPlace = known.before[0] ?? "";
  const argv = ["--store", storedRunRoot, ...known.before, known.command, ...invocationArgs];
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: storedRunDir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then("the refusal names the flag as given before the command, never as an unknown command", function () {
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => line.includes(flagOutOfPlace) && /before the command/i.test(line)),
    `expected a line of stderr naming ${flagOutOfPlace} as given before the command; got:\n${stderr}`,
  );
  assert.doesNotMatch(stderr, /unknown command/i, `stderr calls the flag a command:\n${stderr}`);
});

When("balance is asked to run with the store modifier given after the command", function () {
  const argv = ["balance", ...invocationArgs, "--store", storedRunRoot];
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: storedRunDir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then("the refusal names the store modifier as one that goes before the command", function () {
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => line.includes("--store") && /before the command/i.test(line)),
    `expected a line of stderr naming --store as going before the command; got:\n${stderr}`,
  );
});

Then("the refusal advises no pin", function () {
  assert.doesNotMatch(cliResult.stderr, /\bpin\b/i, `stderr advises a pin:\n${cliResult.stderr}`);
});

const NOT_A_FLAG: Record<string, (store: string, target: string[]) => { argv: string[]; token: string }> = {
  "the target's features directory alone, with no flag before it": (_store, target) => {
    const dir = target[target.indexOf("--features") + 1] ?? "";
    return { argv: ["balance", dir], token: dir };
  },
  "a stray word after the target's flags, under the report-only option": (_store, target) => ({
    argv: ["balance", ...target, "extra", "--exit-zero"],
    token: "extra",
  }),
  "a single-dash token after the target's flags, under the report-only option": (_store, target) => ({
    argv: ["balance", ...target, "-x", "--exit-zero"],
    token: "-x",
  }),
  "the command given twice, in a stored run": (store, target) => ({
    argv: ["--store", store, "--run-id", "r1", "balance", "balance", ...target],
    token: "balance",
  }),
};
let argumentNamed = "";

When("balance is asked to run with an argument that is no flag, {}", function (shape: string) {
  const rowOf = NOT_A_FLAG[shape];
  assert.ok(rowOf !== undefined, `no row named "${shape}"`);
  const { argv, token } = rowOf(storedRunRoot, invocationArgs);
  argumentNamed = token;
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: storedRunDir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then("the refusal names that argument as one balance does not take", function () {
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => line.includes(argumentNamed) && /not a flag/i.test(line)),
    `expected a line of stderr naming ${argumentNamed} as not a flag; got:\n${stderr}`,
  );
  assert.doesNotMatch(stderr, /\bpin\b|unknown/i, `stderr names another fault:\n${stderr}`);
});

Then("the run store holds no record of a run", function () {
  try {
    const manifests = readdirSync(storedRunRoot, { recursive: true }).filter((entry) =>
      String(entry).endsWith("run.yaml"),
    );
    assert.deepEqual(manifests, [], `expected no run.yaml under the store root; found ${manifests.join(", ")}`);
  } finally {
    rmSync(storedRunDir, { recursive: true, force: true });
  }
});

const VALUE_TO_A_FLAG_THAT_TAKES_NONE: Record<string, (store: string, target: string[], given: string[]) => string[]> = {
  "after the target's flags": (_store, target, given) => ["balance", ...target, ...given],
  "after the target's flags, in a stored run": (store, target, given) => [
    "--store",
    store,
    "--run-id",
    "r1",
    "balance",
    ...target,
    ...given,
  ],
};

When(/^balance is asked to run with (.+) given the value (\S+), (.+)$/, function (option: string, value: string, shape: string) {
  const flag = optionFlag(option);
  const argvOf = VALUE_TO_A_FLAG_THAT_TAKES_NONE[shape];
  assert.ok(argvOf !== undefined, `no shape named "${shape}"`);
  const argv = argvOf(storedRunRoot, invocationArgs, [flag, value]);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: storedRunDir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then(
  /^the refusal names (.+) as a flag that takes no value, and (\S+) as the value it was given$/,
  function (option: string, value: string) {
    const flag = optionFlag(option);
    const { stderr } = cliResult;
    assert.ok(
      stderr.split("\n").some((line) => line.includes(flag) && line.includes(value) && /takes no value/i.test(line)),
      `expected a line of stderr naming ${flag} as taking no value and ${value} as given it; got:\n${stderr}`,
    );
  },
);

const GIVEN_TWICE: Record<string, (store: string, target: string[]) => string[]> = {
  "the feature corpus option at a path that does not exist, then at the target, under the report-only option": (_store, target) => [
    "balance",
    ...withoutFlag(target, "--features"),
    "--features",
    join(tmpdir(), "scn-cli-064-no-such-dir"),
    "--features",
    target[target.indexOf("--features") + 1] ?? "",
    "--exit-zero",
  ],
  "the target-name option as two different names": (_store, target) => ["balance", ...target, "--target", "a", "--target", "b"],
  "the strict option with no value either time": (_store, target) => ["balance", ...target, "--strict", "--strict"],
  "the target-name option as two different names, in a stored run": (store, target) => [
    "--store",
    store,
    "--run-id",
    "r1",
    "balance",
    ...target,
    "--target",
    "a",
    "--target",
    "b",
  ],
  "the store modifier before the command, the second time at the run store": (store, target) => [
    "--store",
    join(tmpdir(), "scn-cli-064-other-store"),
    "--store",
    store,
    "balance",
    ...target,
  ],
  "the run-name modifier before the command, as two ids, in a stored run": (store, target) => [
    "--store",
    store,
    "--run-id",
    "r0",
    "--run-id",
    "r1",
    "balance",
    ...target,
  ],
};

When(/^a run is asked for with (.+?) given twice, (.+)$/, function (option: string, shape: string) {
  const argvOf = GIVEN_TWICE[`${option} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${option} ${shape}`);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argvOf(storedRunRoot, invocationArgs)], {
    cwd: storedRunDir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then(/^the refusal names (.+) as given more than once$/, function (option: string) {
  const flag = optionFlag(option);
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => line.includes(flag) && /more than once/i.test(line)),
    `expected a line of stderr naming ${flag} as given more than once; got:\n${stderr}`,
  );
});

const EQUALS_FORM: Record<string, (store: string, target: string[], written: string) => string[]> = {
  "after the target's flags": (_store, target, written) => ["balance", ...target, written],
  "after the target's flags, under the report-only option": (_store, target, written) => ["balance", ...target, written, "--exit-zero"],
  "before the command": (_store, target, written) => [written, "balance", ...target],
  "after the command": (_store, target, written) => ["balance", ...target, written],
  "after the target's flags, in a stored run": (store, target, written) => [
    "--store",
    store,
    "--run-id",
    "r1",
    "balance",
    ...target,
    written,
  ],
};

const WRITTEN_FORM: Record<string, string> = {
  "the format option and json joined by an equals sign": "--format=json",
  "the feature corpus option and nothing joined by an equals sign": "--features=",
  "the store modifier and the run store joined by an equals sign": "--store=<root>",
};

const SPELLING_READ: Record<string, string> = {
  "the format option and json as two arguments": "--format json",
  "the feature corpus option and a directory as two arguments": "--features <dir>",
  "the store modifier and the run store as two arguments": "--store <root>",
};

function argumentsFor(table: Record<string, string>, intent: string): string {
  const literal = table[intent];
  assert.ok(literal !== undefined, `no arguments are named "${intent}"`);
  return literal;
}

function withStoreRoot(cell: string): string {
  return cell.replace("<root>", storedRunRoot);
}

When(/^a run is asked for with (.+? joined by an equals sign), (.+)$/, function (intent: string, shape: string) {
  const written = argumentsFor(WRITTEN_FORM, intent);
  const argvOf = EQUALS_FORM[shape];
  assert.ok(argvOf !== undefined, `no shape named "${shape}"`);
  const argv = argvOf(storedRunRoot, invocationArgs, withStoreRoot(written));
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: storedRunDir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then(/^the refusal names (.+? joined by an equals sign) as a form that is not read, and (.+) as the spelling that is$/, function (writtenIntent: string, spellingIntent: string) {
  const written = argumentsFor(WRITTEN_FORM, writtenIntent);
  const spelling = argumentsFor(SPELLING_READ, spellingIntent);
  const { stderr } = cliResult;
  const given = withStoreRoot(written);
  assert.ok(
    stderr.split("\n").some((line) => line.includes(given) && /not read/i.test(line)),
    `expected a line of stderr naming ${given} as a form that is not read; got:\n${stderr}`,
  );
  assert.ok(stderr.includes(`'${withStoreRoot(spelling)}'`), `expected the spelling '${spelling}' in stderr; got:\n${stderr}`);
});

Then("the refusal advises no pin, and calls the flag neither unknown nor out of place", function () {
  assert.doesNotMatch(cliResult.stderr, /\bpin\b|unknown|before the command/i, `stderr gives other advice:\n${cliResult.stderr}`);
});

const COMMAND_AS_VALUE: Record<string, (store: string, target: string[]) => string[]> = {
  "the store modifier with the target's flags after it": (_store, target) => ["--store", "balance", ...target],
  "the store modifier with nothing after it": () => ["--store", "balance"],
  "the run-name modifier after the store modifier, with the target's flags after it": (store, target) => [
    "--store",
    store,
    "--run-id",
    "balance",
    ...target,
  ],
};

When(/^a stored run is asked for, with the command given as the value of (.+? modifier), (.+)$/, function (modifier: string, shape: string) {
  const argvOf = COMMAND_AS_VALUE[`${modifier} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${modifier} ${shape}`);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argvOf(storedRunRoot, invocationArgs)], {
    cwd: storedRunDir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then(/^the refusal names (.+) as having taken the command as its value$/, function (intent: string) {
  const modifier = optionFlag(intent);
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => line.includes(modifier) && line.includes("balance") && /as its value/i.test(line)),
    `expected a line of stderr naming ${modifier} as having taken balance as its value; got:\n${stderr}`,
  );
  assert.doesNotMatch(stderr, /before the command/i, `stderr blames another token:\n${stderr}`);
});

const MODIFIERS_WITH_NO_COMMAND: Record<string, (store: string) => string[]> = {
  "the store modifier at a run store that is not there": (store) => ["--store", join(store, "absent")],
  "the store modifier at the empty run store": (store) => ["--store", store],
  "the run-name modifier alone": () => ["--run-id", "r1"],
  "the store modifier and the run-name modifier in that order": (store) => ["--store", store, "--run-id", "r1"],
  "the run-name modifier and the store modifier in that order": (store) => ["--run-id", "r1", "--store", store],
};
let modifiersGiven: string[] = [];

When(/^the host is asked for nothing but (.+?), (.+)$/, function (modifiers: string, shape: string) {
  const argvOf = MODIFIERS_WITH_NO_COMMAND[`${modifiers} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${modifiers} ${shape}`);
  modifiersGiven = modifiers.split(" and ").map(optionFlag);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argvOf(storedRunRoot)], {
    cwd: storedRunDir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  controllerResult = result;
  cliResult = result;
});

Then("the refusal names every modifier given, and says no command followed them", function () {
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => modifiersGiven.every((m) => line.includes(m)) && /no command/i.test(line)),
    `expected a line of stderr naming ${modifiersGiven.join(" and ")} and saying no command followed; got:\n${stderr}`,
  );
  assert.doesNotMatch(stderr, /unknown command|before the command|as its value|needs a value/i, `stderr names another fault:\n${stderr}`);
});

const HELP_REQUESTS: Record<string, (store: string) => string[]> = {
  "help by its long name after the store modifier": (store) => ["--store", store, "--help"],
  "the help command after the store modifier": (store) => ["--store", store, "help"],
  "help by its short name after the store modifier": (store) => ["--store", store, "-h"],
  "help by its long name after the run-name modifier": () => ["--run-id", "r1", "--help"],
  "help by its long name after the store modifier and the run-name modifier": (store) => ["--store", store, "--run-id", "r1", "--help"],
  "nothing at all": () => [],
  "help by its long name after the store modifier, given a command as its value": () => ["--store", "balance", "--help"],
  "help by its short name after the store modifier, given a command as its value": () => ["--store", "balance", "-h"],
  "help by its long name after the run-name modifier, given a command as its value": () => ["--run-id", "balance", "--help"],
  "help by its short name after the run-name modifier, given a command as its value": () => ["--run-id", "balance", "-h"],
};

function spawnBesideStore(argv: string[]): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: storedRunDir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

When("spec-controller is asked for {}", function (request: string) {
  const argvOf = HELP_REQUESTS[request];
  assert.ok(argvOf !== undefined, `no request row named "${request}"`);
  controllerResult = spawnBesideStore(argvOf(storedRunRoot));
});

const HELP_AT_HOST_SCOPE: Record<string, (store: string, target: string[]) => string[]> = {
  "help by its long name after a flag out of place": (store) => ["--store", store, "--exit-zero", "--help"],
  "help by its long name after a flag out of place, before a command": () => ["--exit-zero", "balance", "--help"],
  "help by its long name after a modifier that took the command, and the target's flags": (_store, target) => [
    "--store",
    "balance",
    ...target,
    "--help",
  ],
  "help by its short name between a modifier that took the command and the target's flags": (_store, target) => [
    "--store",
    "balance",
    "-h",
    ...target,
  ],
  "help by its long name after a modifier that took the command, and another modifier": () => [
    "--store",
    "balance",
    "--run-id",
    "r1",
    "--help",
  ],
  "help by its long name where a modifier's value goes": () => ["--store", "--help"],
  "help by its long name after a modifier given twice": (store) => ["--store", store, "--store", store, "--help"],
  "help by its long name after a modifier joined to its value by an equals sign": (store) => [`--store=${store}`, "--help"],
  "help by its short name as a modifier's value, before a command": (_store, target) => ["--run-id", "-h", "balance", ...target],
};

When("the host is given {}", function (request: string) {
  const argvOf = HELP_AT_HOST_SCOPE[request];
  assert.ok(argvOf !== undefined, `no request row named "${request}"`);
  controllerResult = spawnBesideStore(argvOf(storedRunRoot, invocationArgs));
});

Then("it answers with the same top-level help as a bare invocation, and succeeds", function () {
  const bare = spawnBesideStore([]);
  const help = spawnBesideStore(["--help"]);
  assert.equal(controllerResult.status, 0, `expected exit 0; got ${controllerResult.status}\n${controllerResult.stderr}`);
  assert.equal(controllerResult.stderr, "", `expected nothing on stderr; got:\n${controllerResult.stderr}`);
  assert.equal(bare.status, 0, `expected the bare run to exit 0; got ${bare.status}`);
  assert.equal(bare.stdout, help.stdout, "expected the bare run's stdout to be --help's");
  assert.ok(help.stdout.length > 0, "expected --help to print the top-level help");
  assert.equal(controllerResult.stdout, bare.stdout, `expected the top-level help; got:\n${controllerResult.stdout}`);
});

const RUN_ID_WITHOUT_STORE: Record<string, (target: string[]) => string[]> = {
  "before a live balance run": (target) => ["--run-id", "r1", "balance", ...target],
  "before a live balance run, under the report-only option": (target) => ["--run-id", "r1", "balance", ...target, "--exit-zero"],
  "before a live balance run, under the strict option": (target) => ["--run-id", "r1", "balance", ...target, "--strict"],
  "before a live balance run that writes its report to a file": (target) => [
    "--run-id",
    "r1",
    "balance",
    ...target,
    "--format",
    "json:report.json",
  ],
  "before a balance re-render of a saved report": (target) => [
    "--run-id",
    "r1",
    "balance",
    "--render-from-json",
    savedReportOf(target),
  ],
};

let savedReportDir: string | undefined;

function savedReportOf(target: string[]): string {
  savedReportDir = mkdtempSync(join(tmpdir(), "scn-cli-083-saved-"));
  const saved = join(savedReportDir, "saved.json");
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...target, "--format", `json:${saved}`], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(saved), `expected the saved report at ${saved}\n${result.stderr}`);
  return saved;
}

When("a run is named with the run-name modifier and given no store modifier, {}", function (shape: string) {
  const argvOf = RUN_ID_WITHOUT_STORE[shape];
  assert.ok(argvOf !== undefined, `no row for ${shape}`);
  try {
    const result = spawnBesideStore(argvOf(invocationArgs));
    controllerResult = result;
    cliResult = result;
  } finally {
    if (savedReportDir !== undefined) rmSync(savedReportDir, { recursive: true, force: true });
    savedReportDir = undefined;
  }
});

Then("the refusal names the run-name modifier as naming a run that is not kept", function () {
  const { stderr } = cliResult;
  assert.ok(
    stderr.split("\n").some((line) => line.includes("--run-id") && /no run is kept|keeps no run|not stored/i.test(line)),
    `expected a line of stderr naming --run-id and saying no run is kept; got:\n${stderr}`,
  );
  assert.doesNotMatch(
    stderr,
    /unknown command|before the command|as its value|needs a value|no command followed|does not exist/i,
    `stderr names another fault:\n${stderr}`,
  );
  assert.doesNotMatch(stderr, /^\s+at /m, `stderr carries a stack trace:\n${stderr}`);
});

const BALANCE_HELP_NAME: Record<string, string> = {
  "by its long name": "--help",
  "by its short name": "-h",
};
let balanceHelpAlone: SpawnSyncReturns<string>;

When("balance's help is asked for {}, after the run-name modifier with no store modifier", function (request: string) {
  const help = BALANCE_HELP_NAME[request];
  assert.ok(help !== undefined, `no request row named "${request}"`);
  balanceHelpAlone = spawnBesideStore(["balance", help]);
  controllerResult = spawnBesideStore(["--run-id", "r1", "balance", help]);
});

Then("it answers with balance's help, exactly as it does with nothing before it, and succeeds", function () {
  assert.equal(balanceHelpAlone.status, 0, `balance's help alone did not answer\n${balanceHelpAlone.stderr}`);
  assert.match(balanceHelpAlone.stdout, /--render-from-json/, "expected balance's help to list its own flags");
  assert.equal(controllerResult.status, 0, `expected exit 0; got ${controllerResult.status}\n${controllerResult.stderr}`);
  assert.equal(controllerResult.stderr, "", `expected nothing on stderr; got:\n${controllerResult.stderr}`);
  assert.equal(controllerResult.stdout, balanceHelpAlone.stdout, `expected balance's help; got:\n${controllerResult.stdout}`);
});
