import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { textFor } from "@3f-consulting/spec-controller-core";
import { describe, expect, it } from "vitest";
import catalogue from "../messages/messages.en.json" with { type: "json" };
import { helpText } from "../runRequest/help.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

interface Ran {
  readonly exitCode: number;
  readonly output: string;
  readonly error: string;
}

// The command line run in a folder of its own, outside git, with what it wrote to each stream.
function ran(args: readonly string[], folder = temporaryDirectory("command-line-")): Ran {
  const written = { output: "", error: "" };
  const exitCode = main(args, folder, {
    output: { fd: 1, write: (text) => (written.output += text) },
    error: { fd: 2, write: (text) => (written.error += text) },
  });
  return { exitCode, ...written };
}

const BALANCE_FLAGS = [
  "--features <dir>",
  "--unit <runner>[:<format>:<report>]",
  "--integration <runner>[:<format>:<report>]",
  "--e2e <runner>[:<format>:<report>]",
  "--performance <runner>[:<format>:<report>]",
  "--not-check <workflow>:<job>:<step>",
  "--deferral-tag <tag>",
  "--ci <workflow.yml|dir>",
  "--ci-steps <record.json>",
  "--package-json <path>",
  "--target <name>",
  "--source-sha <sha>",
  "--format <fmt>[:<path>]",
  "--strict",
  "--exit-zero",
  "--written-claims-only",
  "-h, --help",
];

// A line holding the flag, then at least two spaces, then its description.
const FLAG_BESIDE_ITS_DESCRIPTION = { "--strict": /^\s+--strict\s{2,}\S/, "--exit-zero": /^\s+--exit-zero\s{2,}\S/ };

// The flags help lists, each at the start of a line of its own with what its value is.
const flagsListed = (help: string): string[] => help.split("\n").flatMap((line) => /^\s+((?:-h, )?--[a-z0-9-]+(?: \S+)?)/.exec(line)?.[1] ?? []);

describe("help will list what you can ask for", () => {
  it.each([
    ["CLM-CLI-115", ["balance", "--help"]],
    ["CLM-CLI-116", ["balance", "-h"]],
  ] as const)("[%s] %j lists balance's flags, and the run succeeds", (_clm, args) => {
    const { exitCode, output } = ran(args);

    expect({ exitCode, flags: flagsListed(output) }).toEqual({ exitCode: 0, flags: BALANCE_FLAGS });
  });

  it("[CLM-CLI-117] allocate --help lists the feature code it takes and its flags, and the run succeeds", () => {
    const { exitCode, output } = ran(["allocate", "--help"]);

    expect({ exitCode, takesAFeatureCode: output.includes("allocate <feature code>"), flags: flagsListed(output) }).toEqual({
      exitCode: 0,
      takesAFeatureCode: true,
      flags: ["--features <dir>", "--new", "-h, --help"],
    });
  });

  it.each([
    ["CLM-CLI-118", ["--help"]],
    ["CLM-CLI-118", ["-h"]],
    ["CLM-CLI-119", ["help"]],
    ["CLM-CLI-120", []],
  ] as const)("[%s] %j lists the commands, each with what it does, and the run succeeds", (_clm, args) => {
    const { exitCode, output } = ran(args);

    expect({ exitCode, commands: output.split("\n").flatMap((line) => /^\s+(balance|allocate)\s{2,}(\S.*)$/.exec(line)?.slice(1) ?? []) }).toEqual({
      exitCode: 0,
      commands: ["balance", catalogue["command-balance"], "allocate", catalogue["command-allocate"]],
    });
  });
});

describe("a command's help gives each flag it takes beside what the flag does", () => {
  it("[CLM-CLI-189] --strict and --exit-zero are each on a line of their own, followed by its description", () => {
    const lines = ran(["balance", "--help"]).output.split("\n");

    expect(Object.values(FLAG_BESIDE_ITS_DESCRIPTION).map((flagLine) => lines.filter((line) => flagLine.test(line)).length)).toEqual([1, 1]);
  });
});

describe("an argument the tool does not accept will stop the run", () => {
  it.each([
    ["CLM-CLI-125", "a command the tool does not have", ["frobnicate"], ["frobnicate", "[unknown-command]"]],
    ["CLM-CLI-126", "a flag the command does not take", ["balance", "--bogus"], ["--bogus", "[unknown-flag]"]],
    ["CLM-CLI-127", "a flag that takes a value, given none", ["balance", "--features"], ["--features", "[missing-value]"]],
    ["CLM-CLI-128", "a value given to a flag that takes none", ["balance", "--strict", "yes"], ["--strict", "yes", "[unwanted-value]"]],
    ["CLM-CLI-129", "an argument that is no flag and no value", ["balance", "stray"], ["stray", "[stray-argument]"]],
    ["CLM-CLI-130", "a flag that does not repeat, given twice", ["balance", "--target", "a", "--target", "b"], ["--target", "[repeated-flag]"]],
    ["CLM-CLI-131", "a flag and its value joined by an equals sign", ["balance", "--features=specs"], ["--features=specs", "--features specs", "[equals-form]"]],
    ["CLM-CLI-132", "a flag before the command", ["--features", "specs", "balance"], ["--features", "[flag-before-command]"]],
    ["CLM-CLI-133", "a report format the tool does not have", ["balance", "--format", "html"], ["html", "md", "json", "[unknown-format]"]],
    ["CLM-CLI-134", "no feature code given to allocate", ["allocate"], ["[no-feature-code]"]],
    ["CLM-CLI-135", "two feature codes given to allocate", ["allocate", "ABC", "DEF"], ["DEF", "[extra-argument]"]],
    ["CLM-CLI-208", "something given to allocate that is not a feature code", ["allocate", "one"], ["one", "[not-a-feature-code]"]],
  ] as const)("[%s] %s: the run stops, no verdict, exit 2, and a complaint with its facts", (_clm, _given, args, facts) => {
    const { exitCode, output, error } = ran(args);

    expect({ exitCode, output, facts: facts.filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("a usage error shows the help for what was asked for", () => {
  it.each([
    ["CLM-CLI-187", "a flag balance does not take", "balance's help", ["balance", "--bogus"], "balance"],
    ["CLM-CLI-188", "a flag before the command", "the commands", ["--features", "specs", "balance"], undefined],
    ["CLM-CLI-114", "a command the tool does not have, and a request for help after it", "the commands", ["frobnicate", "--help"], undefined],
    ["CLM-CLI-112", "a request for balance's help beside an argument that fails validation", "balance's help", ["balance", "--features", "absent", "--bogus", "--help"], "balance"],
    ["CLM-CLI-113", "allocate's help beside a flag allocate does not take", "allocate's help", ["allocate", "ABC", "--vitest", "--help"], "allocate"],
    ["CLM-CLI-113", "allocate's help beside something that is not a feature code", "allocate's help", ["allocate", "abc", "--help"], "allocate"],
  ] as const)("[%s] %s: the run stops, no verdict, exit 2, and the complaint is followed by %s", (_clm, _given, _help, args, about) => {
    const { exitCode, output, error } = ran(args);

    expect({ exitCode, output, followedByHelp: error.endsWith(helpText(about)) }).toEqual({ exitCode: 2, output: "", followedByHelp: true });
  });
});

describe("an error will be shown with its error code", () => {
  it("[CLM-ERC-001] a flag the command does not take is shown with the error code unknown-flag, once", () => {
    expect(ran(["balance", "--bogus"]).error.split("[unknown-flag]").length - 1).toBe(1);
  });
});

// A folder holding the files each input names, outside git.
function folderWith(files: Readonly<Record<string, string>>): string {
  const folder = temporaryDirectory("inputs-");
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true });
    writeFileSync(join(folder, path), contents);
  }
  return folder;
}

const VITEST_SHAPED = '{"testResults":[]}';

// A fact as the complaint shows it, each {code} in it the catalogue's text for that code.
const CATALOGUE_CODE = /\{([a-z-]+)\}/g;
const shown = (fact: string): string => fact.replace(CATALOGUE_CODE, (_code: string, code: string) => textFor(catalogue, code));

const surefireSuite = (name: string, test: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="example.${name}" tests="1" errors="0" skipped="0" failures="0">\n  <testcase name="${test}" classname="example.${name}" time="0.001"/>\n</testsuite>\n`;

// Maven Surefire's reports in a folder: a suite to a file, each beside its text summary.
const surefireReportsIn = (folder: string): Record<string, string> => ({
  [`${folder}/TEST-example.AddsTest.xml`]: surefireSuite("AddsTest", "[CLM-ONE-001] adds one"),
  [`${folder}/TEST-example.SubtractsTest.xml`]: surefireSuite("SubtractsTest", "[CLM-ONE-002] subtracts one"),
  [`${folder}/example.AddsTest.txt`]: "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0\n",
});

describe("a well-formed JUnit evidence report will be read, not refused", () => {
  it.each([
    [
      "one suite, as Maven Surefire writes it",
      '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="example.AddsTest" tests="1" errors="0" skipped="0" failures="0">\n  <testcase name="[CLM-ONE-001] adds one" classname="example.AddsTest" time="0.001"/>\n</testsuite>\n',
    ],
    [
      "a suites element holding a suite, as pytest writes it",
      '<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"><testsuite name="pytest" errors="0" failures="0" skipped="0" tests="1"><testcase classname="test_adds" name="[CLM-ONE-001] adds one" time="0.001"><properties><property name="clm" value="CLM-ONE-001" /></properties></testcase></testsuite></testsuites>',
    ],
  ] as const)("[CLM-CLI-194] a JUnit evidence report written well formed, as %s: its result is posted, and the run does not stop", (_written, report) => {
    const { exitCode, output } = ran(["balance", "--unit", "junit:junit:junit.xml", "--format", "json"], folderWith({ "junit.xml": report }));

    expect({ stopped: exitCode === 2, posted: output.includes("adds one") }).toEqual({ stopped: false, posted: true });
  });

  it("[CLM-CLI-194] JUnit evidence reports written well formed, as Maven Surefire writes them, a suite to a file beside its text summary: each result is posted, and the run does not stop", () => {
    const { exitCode, output } = ran(["balance", "--unit", "junit:junit:surefire-reports", "--format", "json"], folderWith(surefireReportsIn("surefire-reports")));

    expect({ stopped: exitCode === 2, posted: ["adds one", "subtracts one"].filter((test) => output.includes(test)) }).toEqual({ stopped: false, posted: ["adds one", "subtracts one"] });
  });
});

// One passing result citing the corpus's one claim, as each runner writes it.
const BY_FILE_PASSING = '{"testResults":[{"name":"/work/one.test.ts","status":"passed","message":"","assertionResults":[{"title":"[CLM-ONE-001] one","fullName":"[CLM-ONE-001] one","status":"passed","ancestorTitles":[],"failureMessages":[]}]}]}';

const JUNIT_PASSING = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="one" tests="1" errors="0" skipped="0" failures="0">\n  <testcase name="[CLM-ONE-001] one" classname="one" time="0.001"/>\n</testsuite>\n';

interface ResultsByClaimReported {
  readonly claimReconciliations: readonly {
    readonly claim: { readonly claimCode?: { readonly number: string } };
    readonly qualityCheckReconciliations: readonly { readonly observation?: { readonly result: string } }[];
  }[];
}

const TWO_CLAIMS = "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n\n  @unit @CLM-ONE-002\n  Scenario: two\n";

const TWO_STEPS_WRITING_VITEST = "jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=out/a.json\n      - run: vitest run --reporter=json --outputFile=out/b.json\n";

describe("balance posts the results of every evidence report a runner's steps write", () => {
  it("[CLM-CLI-210] --unit vitest, a workflow with two steps running vitest, one writing out/a.json citing CLM-ONE-001 and one writing out/b.json citing CLM-ONE-002: both results are posted", () => {
    const folder = folderWith({
      "features/one.feature": TWO_CLAIMS,
      "workflows/ci.yml": TWO_STEPS_WRITING_VITEST,
      "out/a.json": BY_FILE_PASSING,
      "out/b.json": BY_FILE_PASSING.replaceAll("CLM-ONE-001", "CLM-ONE-002"),
    });

    const { output, error } = ran(["balance", "--unit", "vitest", "--ci", "workflows", "--format", "json"], folder);

    const { claimReconciliations } = (output === "" ? { claimReconciliations: [] } : JSON.parse(output)) as ResultsByClaimReported;
    const posted = claimReconciliations.map(({ claim, qualityCheckReconciliations }) => [claim.claimCode?.number, qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [observation.result] : []))]);
    expect({ error, posted }).toEqual({
      error: "",
      posted: [
        ["001", ["passed"]],
        ["002", ["passed"]],
      ],
    });
  });
});

interface ResultsByLayerReported {
  readonly claimReconciliations: readonly {
    readonly claim: { readonly claimCode?: { readonly number: string } };
    readonly qualityCheckReconciliations: readonly { readonly observation?: { readonly kind: string; readonly result: string } }[];
  }[];
}

const ONE_E2E_CLAIM = "@ONE\nFeature: one\n\n  @e2e @CLM-ONE-001\n  Scenario: one\n";
const ONE_UNIT_AND_E2E_CLAIM = "@ONE\nFeature: one\n\n  @unit @e2e @CLM-ONE-001\n  Scenario: one\n";
// An Outline whose one row cites its claim in the feature file alone, so its result names no claim code.
const ONE_E2E_ROW = "@ONE\nFeature: one\n\n  @e2e\n  Scenario Outline: one <n>\n    Given one <n>\n\n    Examples:\n      | clm         | n |\n      | CLM-ONE-001 | 1 |\n";
const ROW_PASSING =
  '[{"uri":"features/one.feature","name":"one","elements":[{"keyword":"Scenario Outline","name":"one 1","type":"scenario","line":10,"tags":[{"name":"@e2e"}],"steps":[{"keyword":"Given ","name":"one 1","result":{"status":"passed"}}]}]}]';
const JUNIT_FAILING_TWO = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="two" tests="1" errors="0" skipped="0" failures="1">\n  <testcase name="[CLM-ONE-001] two" classname="two" time="0.001"><failure/></testcase>\n</testsuite>\n';
const WRITES_ANOTHER_PATH = "jobs:\n  e2e:\n    steps:\n      - run: npx playwright test --reporter=junit\n        env:\n          PLAYWRIGHT_JUNIT_OUTPUT_FILE: out/other.xml\n";

describe("balance reads the evidence report the run names for a runner, at that path, as that runner's layer's evidence", () => {
  it.each([
    ["--e2e playwright:junit:out/playwright.xml", ["--e2e", "playwright:junit:out/playwright.xml"], "out/playwright.xml", JUNIT_PASSING, ONE_E2E_CLAIM],
    ["--e2e playwright:junit:out/playwright.xml beside the short form --e2e cypress", ["--e2e", "playwright:junit:out/playwright.xml", "--e2e", "cypress"], "out/playwright.xml", JUNIT_PASSING, ONE_E2E_CLAIM],
    ["--e2e playwright:junit:out/playwright.xml beside a runner it cannot use, --e2e cypress:html:out/other.xml", ["--e2e", "playwright:junit:out/playwright.xml", "--e2e", "cypress:html:out/other.xml"], "out/playwright.xml", JUNIT_PASSING, ONE_E2E_CLAIM],
    ["--e2e cucumber-js:cucumber:out/cucumber.json, its result an Outline row citing its claim through the feature file", ["--e2e", "cucumber-js:cucumber:out/cucumber.json"], "out/cucumber.json", ROW_PASSING, ONE_E2E_ROW],
    ["--e2e playwright:junit:out/playwright.xml, a workflow step writing out/other.xml", ["--e2e", "playwright:junit:out/playwright.xml", "--ci", "workflows"], "out/playwright.xml", JUNIT_PASSING, ONE_E2E_CLAIM],
    [
      "--e2e playwright:junit:out/playwright.xml beside --unit junit:junit:out/unit.xml, which also cites CLM-ONE-001",
      ["--e2e", "playwright:junit:out/playwright.xml", "--unit", "junit:junit:out/unit.xml"],
      "out/playwright.xml",
      JUNIT_PASSING,
      ONE_UNIT_AND_E2E_CLAIM,
      [["unit", "passed"], ["e2e", "passed"]],
    ],
  ] as const)("[CLM-CLI-212] %s, the report there one passing result citing CLM-ONE-001: the result is posted as e2e evidence for CLM-ONE-001", (_given, args, path, report, feature, posts: readonly (readonly string[])[] = [["e2e", "passed"]]) => {
    const folder = folderWith({ "features/one.feature": feature, [path]: report, "out/unit.xml": JUNIT_PASSING, "out/other.xml": JUNIT_FAILING_TWO, "workflows/ci.yml": WRITES_ANOTHER_PATH });

    const { output } = ran(["balance", ...args, "--format", "json"], folder);

    const { claimReconciliations } = (output === "" ? { claimReconciliations: [] } : JSON.parse(output)) as ResultsByLayerReported;
    const posted = claimReconciliations.map(({ claim, qualityCheckReconciliations }) => [claim.claimCode?.number, qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [[observation.kind, observation.result]] : []))]);
    expect(posted).toEqual([["001", posts]]);
  });
});

interface VerdictReported {
  readonly runVerdict: { readonly verdict: string };
}

describe("an evidence report the run names for a runner, with no file at its path, will not stop the run", () => {
  it("[CLM-CLI-213] --e2e playwright:junit:out/playwright.xml, with no file at out/playwright.xml: the run reaches its verdict with nothing on standard error", () => {
    const folder = folderWith({ "features/one.feature": ONE_E2E_CLAIM });

    const { exitCode, output, error } = ran(["balance", "--e2e", "playwright:junit:out/playwright.xml", "--format", "json"], folder);

    const reported = (output === "" ? undefined : JSON.parse(output)) as VerdictReported | undefined;
    expect({ exitCode, error, verdict: reported?.runVerdict.verdict }).toEqual({
      exitCode: 1,
      error: "",
      verdict: "out-of-balance",
    });
  });
});

const ONE_UNIT_CLAIM = "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n";
// A JUnit evidence report whose one result cites a claim no feature file holds.
const JUNIT_CITING_NONE = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="none" tests="1" errors="0" skipped="0" failures="0">\n  <testcase name="[CLM-ONE-009] none" classname="none" time="0.001"/>\n</testsuite>\n';

interface ProvenanceReported {
  readonly provenance: { readonly inputs: readonly { readonly path?: string }[] };
}

const STEP_WRITING_VITEST = "vitest run --reporter=json --outputFile=out/vitest.json";

// The report at its path read in its runner's format: its one result posted as unit evidence for the feature file's one
// claim, and its path in the provenance.
function readFromTheStep(runner: string, workflow: string, path: string, args: readonly string[], report: string) {
  const folder = folderWith({ "features/one.feature": ONE_UNIT_CLAIM, "workflows/ci.yml": workflow, [path]: report, "out/e2e.xml": JUNIT_CITING_NONE });

  const { output, error } = ran(["balance", "--unit", runner, "--ci", "workflows", ...args, "--format", "json"], folder);

  const { claimReconciliations, provenance } = (output === "" ? { claimReconciliations: [], provenance: { inputs: [] } } : JSON.parse(output)) as ResultsByLayerReported & ProvenanceReported;
  return {
    error,
    posted: claimReconciliations
      .filter(({ claim }) => claim.claimCode?.number === "001")
      .map(({ claim, qualityCheckReconciliations }) => [claim.claimCode?.number, qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [[observation.kind, observation.result]] : []))]),
    provenance: provenance.inputs.some((input) => input.path?.endsWith(path) === true),
  };
}

const READ_AS_UNIT_EVIDENCE = { error: "", posted: [["001", [["unit", "passed"]]]], provenance: true };
const PLAYWRIGHT_STEP = "jobs:\n  ci:\n    steps:\n      - run: npx playwright test --reporter=junit\n        env:\n";

describe("balance reads the evidence report a named runner's CI step writes, in that runner's format", () => {
  it.each([
    ["vitest", `jobs:\n  ci:\n    steps:\n      - run: ${STEP_WRITING_VITEST}\n`, "out/vitest.json", [], BY_FILE_PASSING],
    ["vitest", `jobs:\n  ci:\n    steps:\n      - run: ${STEP_WRITING_VITEST}\n`, "out/vitest.json", ["--e2e", "playwright:junit:out/e2e.xml"], BY_FILE_PASSING],
    ["playwright", `${PLAYWRIGHT_STEP}          PLAYWRIGHT_JUNIT_OUTPUT_FILE: out/playwright.xml\n`, "out/playwright.xml", [], JUNIT_PASSING],
    ["playwright", `${PLAYWRIGHT_STEP}          PLAYWRIGHT_JUNIT_OUTPUT_FILE:\n          PLAYWRIGHT_JUNIT_OUTPUT_NAME: out/playwright.xml\n`, "out/playwright.xml", [], JUNIT_PASSING],
    ["playwright", `${PLAYWRIGHT_STEP}          PLAYWRIGHT_JUNIT_OUTPUT_FILE: ""\n          PLAYWRIGHT_JUNIT_OUTPUT_NAME: out/playwright.xml\n`, "out/playwright.xml", [], JUNIT_PASSING],
  ] as const)("[CLM-CLI-214] --unit %s, a workflow step writing %j in the target's folder: the report at %s is read in its runner's format, beside %j", (runner, workflow, path, args, report) => {
    expect(readFromTheStep(runner, workflow, path, args, report)).toEqual(READ_AS_UNIT_EVIDENCE);
  });

  it.each([
    ["the step's", `jobs:\n  ci:\n    steps:\n      - run: ${STEP_WRITING_VITEST}\n        working-directory: web\n`],
    ["its job's", `jobs:\n  ci:\n    defaults:\n      run:\n        working-directory: web\n    steps:\n      - run: ${STEP_WRITING_VITEST}\n`],
  ] as const)("[CLM-CLI-215] --unit vitest, a workflow step writing out/vitest.json with web as %s working directory: the report at web/out/vitest.json is read in Vitest's format", (_set, workflow) => {
    expect(readFromTheStep("vitest", workflow, "web/out/vitest.json", [], BY_FILE_PASSING)).toEqual(READ_AS_UNIT_EVIDENCE);
  });
});

describe("balance reads a named runner's evidence reports from where the runner writes them by default, when its step names none", () => {
  it("[CLM-CLI-216] --unit mvn test, a workflow step running mvn test, and Maven Surefire's reports in target/surefire-reports: each result is posted", () => {
    const folder = folderWith({ "features/one.feature": TWO_CLAIMS, "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: mvn test\n", ...surefireReportsIn("target/surefire-reports") });

    const { output, error } = ran(["balance", "--unit", "mvn test", "--ci", "workflows", "--format", "json"], folder);

    expect({ error, posted: ["adds one", "subtracts one"].filter((test) => output.includes(test)) }).toEqual({ error: "", posted: ["adds one", "subtracts one"] });
  });
});

describe("the run refuses to write a report over a file it reads", () => {
  it("[CLM-FMT-013] --format json:out/vitest.json, where a step writes Vitest's report to out/vitest.json: the run stops with exit 2, and the report is as it was", () => {
    const folder = folderWith({ "features/one.feature": ONE_UNIT_CLAIM, "workflows/ci.yml": `jobs:\n  ci:\n    steps:\n      - run: ${STEP_WRITING_VITEST}\n`, "out/vitest.json": BY_FILE_PASSING });

    const { exitCode } = ran(["balance", "--unit", "vitest", "--ci", "workflows", "--format", `json:${join(folder, "out/vitest.json")}`], folder);

    expect({ exitCode, report: readFileSync(join(folder, "out/vitest.json"), "utf8") }).toEqual({ exitCode: 2, report: BY_FILE_PASSING });
  });
});

const TWO_FITNESS_CLAIMS = "@ONE\nFeature: one\n\n  @fitness @CLM-ONE-001\n  Scenario: one\n\n  @fitness @CLM-ONE-002\n  Scenario: two\n";
const TWO_JOBS = "jobs:\n  first:\n    steps:\n      - id: CLM-ONE-001\n        run: pnpm one\n  second:\n    steps:\n      - id: CLM-ONE-002\n        run: pnpm two\n";

describe("balance posts the steps of every step record the run names", () => {
  it("[CLM-CLI-211] --ci-steps given twice, naming one job's record in which CLM-ONE-001 succeeded and another job's in which CLM-ONE-002 succeeded: both steps are posted, each citing its own code", () => {
    const folder = folderWith({
      "features/one.feature": TWO_FITNESS_CLAIMS,
      "workflows/ci.yml": TWO_JOBS,
      "first/steps.json": '{"CLM-ONE-001":{"outcome":"success","conclusion":"success"}}',
      "second/steps.json": '{"CLM-ONE-002":{"outcome":"success","conclusion":"success"}}',
    });

    const { output, error } = ran(["balance", "--ci", "workflows", "--ci-steps", "first/steps.json", "--ci-steps", "second/steps.json", "--format", "json"], folder);

    const { claimReconciliations } = (output === "" ? { claimReconciliations: [] } : JSON.parse(output)) as ResultsByClaimReported;
    const posted = claimReconciliations.map(({ claim, qualityCheckReconciliations }) => [claim.claimCode?.number, qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [observation.result] : []))]);
    expect({ error, posted }).toEqual({
      error: "",
      posted: [
        ["001", ["passed"]],
        ["002", ["passed"]],
      ],
    });
  });
});

describe("the provenance shows each input the run read on its own line", () => {
  it.each([
    ["CLM-RPT-172", "--unit vitest:vitest:<report>", ["--unit", "vitest:vitest:"], "a/vitest.json", "b/vitest.json", BY_FILE_PASSING],
    ["CLM-RPT-173", "--ci-steps", ["--ci-steps", ""], "a/steps.json", "b/steps.json", '{"CLM-ONE-001":{"outcome":"success","conclusion":"success"}}'],
  ] as const)("[%s] %s given twice, naming %s and %s: the Markdown report's provenance has a line for each", (_code, _flag, [flag, before], first, second, citingOne) => {
    const folder = folderWith({ "features/one.feature": TWO_CLAIMS, [first]: citingOne, [second]: citingOne.replaceAll("CLM-ONE-001", "CLM-ONE-002") });

    const { output } = ran(["balance", flag, `${before}${first}`, flag, `${before}${second}`, "--format", "md"], folder);

    const provenance = output.slice(output.indexOf("## Run provenance")).split("\n\n## ")[0]!.split("\n");
    expect(provenance.filter((line) => line.includes(first.slice(2))).map((line) => line.replace(/^ {2}- .+: /, ""))).toEqual([`\`${first}\``, `\`${second}\``]);
  });
});

describe("an input that is not valid will stop the run", () => {
  it.each([
    ["CLM-CLI-147", "a named input that does not exist", {}, ["--ci-steps", "absent.json"], ["absent.json", "CI step record", "[input-absent]"]],
    ["CLM-CLI-160", "a named path that is not the kind of path its flag reads", { "one.feature": "@ONE\nFeature: one\n" }, ["--features", "one.feature"], ["{input-features} one.feature is not {path-folder}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-160", "a folder named as the Vitest evidence report", { "vitest/a.json": VITEST_SHAPED }, ["--unit", "vitest:vitest:vitest"], ["{input-vitest} vitest is not {path-file}", "[input-wrong-kind-of-path]"]],
    ["CLM-CLI-148", "a JSON evidence report that does not parse", { "vitest.json": "{" }, ["--unit", "vitest:vitest:vitest.json"], ["vitest.json", "JSON", "[input-does-not-parse]"]],
    [
      "CLM-CLI-148",
      "a JSON evidence report a step writes that does not parse",
      { "out/vitest.json": "{", "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: vitest run --reporter=json --outputFile=out/vitest.json\n" },
      ["--unit", "vitest", "--ci", "workflows"],
      ["out/vitest.json", "JSON", "[input-does-not-parse]"],
    ],
    ["CLM-CLI-186", "a JUnit evidence report that does not parse", { "junit.xml": "<testsuite" }, ["--unit", "junit:junit:junit.xml"], ["junit.xml", "JUnit evidence report", "[input-does-not-parse]"]],
    [
      "CLM-CLI-186",
      "a JUnit evidence report its parser refuses, declaring an external entity",
      { "junit.xml": '<?xml version="1.0"?>\n<!DOCTYPE testsuite [<!ENTITY x SYSTEM "file:///etc/passwd">]>\n<testsuite name="s"><testcase name="t"/></testsuite>\n' },
      ["--unit", "junit:junit:junit.xml"],
      ["junit.xml", "JUnit evidence report", "External entities are not supported", "[input-does-not-parse]"],
    ],
    ["CLM-CLI-149", "a feature file that does not parse", { "features/bad.feature": "not Gherkin\n" }, ["--features", "features"], ["bad.feature", "feature file", "[input-does-not-parse]"]],
    ["CLM-CLI-150", "a workflow that does not parse", { "workflows/ci.yml": "jobs: [\n" }, ["--ci", "workflows"], ["{input-workflow} workflows/ci.yml", "at line 2, column 1: jobs: [ ^\n", "[input-does-not-parse]"]],
    [
      "CLM-CLI-150",
      "a workflow with a step with only an id",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - id: x\n      - run: pnpm lint\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[0]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a step written as nothing",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: pnpm lint\n      -\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "jobs.ci.steps[1]", "neither an action nor a command", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with an alias to an anchor it does not set",
      { "workflows/ci.yml": "jobs:\n  ci:\n    steps: *missing\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "Unresolved alias", "missing", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a job written with nothing",
      { "workflows/ci.yml": "jobs:\n  ci:\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "the job at jobs.ci holds no settings", "[input-does-not-parse]"],
    ],
    [
      "CLM-CLI-150",
      "a workflow with a job written as a list",
      { "workflows/ci.yml": "jobs:\n  ci: [lint]\n" },
      ["--ci", "workflows"],
      ["ci.yml", "workflow", "the job at jobs.ci holds no settings", "[input-does-not-parse]"],
    ],
    ["CLM-CLI-151", "a Vitest evidence report not in Vitest's shape", { "vitest.json": '{"testResults":"none"}' }, ["--unit", "vitest:vitest:vitest.json"], ["vitest.json", "$.testResults", "[input-not-in-its-shape]"]],
    ["CLM-CLI-152", "a Cucumber evidence report not in Cucumber's shape", { "cucumber.json": '{"features":[]}' }, ["--integration", "cucumber-js:cucumber:cucumber.json"], ["cucumber.json", "Cucumber", "[input-not-in-its-shape]"]],
    ["CLM-CLI-153", "a Jest evidence report not in Jest's shape", { "jest.json": "{}" }, ["--unit", "jest:jest:jest.json"], ["jest.json", "testResults", "[input-not-in-its-shape]"]],
    ["CLM-CLI-154", "a pytest evidence report not in pytest's shape", { "pytest.xml": "<html/>" }, ["--unit", "pytest:pytest:pytest.xml"], ["pytest.xml", "pytest", "[input-not-in-its-shape]"]],
    ["CLM-CLI-155", "a JUnit evidence report not in JUnit's shape", { "junit.xml": "<html/>" }, ["--unit", "junit:junit:junit.xml"], ["junit.xml", "JUnit", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-155",
      "a JUnit evidence report with a test case that has no name",
      { "junit.xml": '<testsuite name="s"><testcase classname="pkg.Foo"><failure/></testcase></testsuite>' },
      ["--unit", "junit:junit:junit.xml"],
      ["junit.xml", "JUnit", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-156", "a file in a JUnit directory not in JUnit's shape", { "junit/one.xml": "<testsuite/>", "junit/two.xml": "<html/>" }, ["--unit", "junit:junit:junit"], ["{input-junit-folder-file} junit/two.xml", "JUnit", "[input-not-in-its-shape]"]],
    ["CLM-CLI-157", "an RSpec evidence report not in RSpec's shape", { "rspec.json": '{"examples":3}' }, ["--unit", "rspec:rspec:rspec.json"], ["rspec.json", "examples", "[input-not-in-its-shape]"]],
    ["CLM-CLI-158", "a step record not in the shape of a record of step outcomes", { "steps.json": '{"test":"passed"}' }, ["--ci-steps", "steps.json"], ["steps.json", "step outcomes", "$.test", "[input-not-in-its-shape]"]],
    [
      "CLM-CLI-158",
      "a step record with one step's outcomes, and one step not in their shape",
      { "steps.json": '{"lint":{"outcome":"success","conclusion":"success"},"test":"passed"}' },
      ["--ci-steps", "steps.json"],
      ["steps.json", "step outcomes", "$.test", "[input-not-in-its-shape]"],
    ],
    ["CLM-CLI-159", "a manifest not in a manifest's shape", { "package.json": "[]" }, ["--package-json", "package.json"], ["package.json", "manifest", "[input-not-in-its-shape]"]],
  ] as const)("[%s] %s: the run stops, no verdict, exit 2, and a complaint with its facts", (_clm, _given, files, args, facts) => {
    const { exitCode, output, error } = ran(["balance", ...args], folderWith(files));

    expect({ exitCode, output, complaints: error.trimEnd().split("\n").length, facts: facts.map(shown).filter((fact) => !error.includes(fact)) }).toEqual({
      exitCode: 2,
      output: "",
      complaints: 1,
      facts: [],
    });
  });

  it("[CLM-CLI-161] a named input that the tool is not permitted to read: the run stops, no verdict, exit 2, and a complaint with its facts", () => {
    const folder = folderWith({ "vitest.json": VITEST_SHAPED });
    chmodSync(join(folder, "vitest.json"), 0o000);

    const { exitCode, output, error } = ran(["balance", "--unit", "vitest:vitest:vitest.json"], folder);

    expect({ exitCode, output, facts: ["vitest.json", "[input-not-permitted]"].filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("an input read by default that the tool is not permitted to read will stop the run, not count as none", () => {
  it("[CLM-CLI-198] no CI workflows named, and the tool not permitted to read the folder .github/workflows: the run stops, no verdict, exit 2, and a complaint that it is not permitted to read .github/workflows", () => {
    const folder = folderWith({ ".github/workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: echo ci\n" });
    chmodSync(join(folder, ".github/workflows"), 0o000);

    const { exitCode, output, error } = ran(["balance"], folder);

    expect({ exitCode, output, facts: [shown("{input-workflows} .github/workflows"), "[input-not-permitted]"].filter((fact) => !error.includes(fact)) }).toEqual({ exitCode: 2, output: "", facts: [] });
  });
});

describe("balance refuses a corpus with several feature files that do not parse, naming each", () => {
  it("[CLM-CLI-185] two feature files that do not parse: the run stops, no verdict, exit 2, and a complaint about each, with what is wrong in each", () => {
    const folder = folderWith({ "features/one.feature": "not Gherkin\n", "features/two.feature": "@TWO\nFeature: two\n  Scenario: a\n    Given a table\n      | a | b |\n      | c |\n" });

    const { exitCode, output, error } = ran(["balance", "--features", "features"], folder);
    const complaints = error.split("\n").filter((line) => line.includes("[input-does-not-parse]"));

    expect({ exitCode, output, named: ["one.feature", "two.feature"].map((file) => complaints.filter((line) => line.includes(file) && /\(\d+:\d+\)/.test(line)).length) }).toEqual({
      exitCode: 2,
      output: "",
      named: [1, 1],
    });
  });
});
