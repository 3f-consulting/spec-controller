import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repositoryForTest } from "../repository/repository.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

interface ProvenanceRead {
  readonly target: string;
  readonly sourceSha: string;
  readonly inputs: readonly { readonly name: string; readonly path?: string }[];
}

interface ReportRead {
  readonly runVerdict: { readonly verdict: string };
  readonly provenance: ProvenanceRead & { readonly countedOnlyExecutableClaims: boolean };
}

// The JSON report balance writes, run in the folder with nothing named but the format and what is given.
function reportIn(folder: string, ...args: string[]): ReportRead {
  let report = "";
  main(["balance", "--format", "json", ...args], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
  return JSON.parse(report) as ReportRead;
}

const provenanceIn = (folder: string, ...args: string[]): ProvenanceRead => reportIn(folder, ...args).provenance;

// The path the provenance shows for the input of that name.
const inputPath = ({ inputs }: ProvenanceRead, name: string): string | undefined => inputs.find((input) => input.name === name)?.path;

describe("balance will use the default when an input is not named", () => {
  it("[CLM-CLI-139] no target name named: balance uses unknown-target", () => {
    expect(provenanceIn(temporaryDirectory("no-target-")).target).toBe("unknown-target");
  });

  it("[CLM-CLI-140] no source commit named: balance uses the target's HEAD", () => {
    const repository = repositoryForTest();
    const head = repository.commit("one");

    expect(provenanceIn(repository.top).sourceSha).toBe(head);
  });

  it("[CLM-CLI-141] no source commit named, in no git repository: balance uses unknown", () => {
    expect(provenanceIn(temporaryDirectory("no-git-")).sourceSha).toBe("unknown");
  });
});

describe("a flag the command takes will take effect", () => {
  it("[CLM-CLI-121] balance given --target and --source-sha, each with its value as the next argument: the report's provenance has each value", () => {
    const { target, sourceSha } = provenanceIn(temporaryDirectory("named-"), "--target", "acme/web", "--source-sha", "abc1234");

    expect({ target, sourceSha }).toEqual({ target: "acme/web", sourceSha: "abc1234" });
  });

  it.each([
    ["--written-claims-only given", ["--written-claims-only"], { verdict: "balanced", countedOnlyExecutableClaims: true }],
    ["no --written-claims-only", [], { verdict: "out-of-balance", countedOnlyExecutableClaims: false }],
  ] as const)("[CLM-CLI-122] balance with %s, over one claim whose passing test cites it and a failing test citing no code: the run verdict and the provenance follow the flag", (_given, flags, expected) => {
    const folder = temporaryDirectory("written-claims-only-");
    mkdirSync(join(folder, "features"));
    writeFileSync(join(folder, "features", "one.feature"), ONE_UNIT_CLAIM);
    writeFileSync(join(folder, "vitest.json"), ONE_CITING_AND_ONE_FAILING_CITING_NONE);

    const { runVerdict, provenance } = reportIn(folder, "--unit", "vitest:vitest:vitest.json", ...flags);

    expect({ verdict: runVerdict.verdict, countedOnlyExecutableClaims: provenance.countedOnlyExecutableClaims }).toEqual(expected);
  });
});

describe("the target's folder will be the git repository the corpus is in, or else the corpus's parent folder", () => {
  it("[CLM-CLI-184] a corpus named in a git repository's subfolder, reached by its own path, run from elsewhere: the target is that repository", () => {
    const repository = repositoryForTest();
    repository.write("docs/features/one.feature", "@ONE\nFeature: one\n");
    repository.commit("one");

    expect(inputPath(provenanceIn(temporaryDirectory("elsewhere-"), "--features", `${repository.top}/docs/features`), "features")).toBe("docs/features");
  });

  it("[CLM-CLI-144] a corpus named in no git repository, run from elsewhere: the target is the corpus's folder", () => {
    const folder = temporaryDirectory("no-git-");
    mkdirSync(join(folder, "features"));

    expect(inputPath(provenanceIn(temporaryDirectory("elsewhere-"), "--features", join(folder, "features")), "features")).toBe("features");
  });

  it("[CLM-CLI-142] no feature corpus named, run from a folder: the target is that folder", () => {
    const folder = temporaryDirectory("no-corpus-");
    mkdirSync(join(folder, "reports"));
    writeFileSync(join(folder, "reports", "vitest.json"), '{"testResults":[]}');

    expect(inputPath(provenanceIn(folder, "--unit", `vitest:vitest:${join(folder, "reports", "vitest.json")}`), "vitest")).toBe("reports/vitest.json");
  });
});

describe("balance reads every input the command line names or leaves to its default", () => {
  it.each([
    ["features: specs", "ci/specs", "features", { "ci/specs/one.feature": "@ONE\nFeature: one\n" }],
    ["ci: workflows", "ci/workflows", "workflows", { "ci/workflows/ci.yml": "jobs:\n  ci:\n    steps:\n      - run: echo\n" }],
    ["ci-steps: [steps.json]", "ci/steps.json", "stepRecord", { "ci/steps.json": "{}" }],
    ["package-json: package.json", "ci/package.json", "manifest", { "ci/package.json": "{}" }],
    ["unit: [vitest:vitest:out/vitest.json]", "ci/out/vitest.json", "vitest", { "ci/out/vitest.json": '{"testResults":[]}' }],
  ])("[CLM-CLI-218] the run named ci/spec-controller.yml as its settings file, and that file had %s: balance reads it from %s", (entry, expected, input, files) => {
    const repository = repositoryForTest();
    repository.write("ci/spec-controller.yml", `${entry}\n`);
    Object.entries(files).forEach(([path, text]) => repository.write(path, text));
    repository.commit("one");

    expect(inputPath(provenanceIn(repository.top, "--config", "ci/spec-controller.yml"), input)).toBe(expected);
  });

  it("[CLM-CLI-218] the run named ci/spec-controller.yml as its settings file, and that file had format: [json:out/report.json]: balance writes its report to ci/out/report.json", () => {
    const repository = repositoryForTest();
    repository.write("ci/spec-controller.yml", "format: [json:out/report.json]\n");
    repository.write("ci/out/.keep", "");
    repository.commit("one");

    main(["balance", "--config", "ci/spec-controller.yml", "--target", "acme/web"], repository.top, { output: { fd: 1, write: () => {} }, error: { fd: 2, write: () => {} } });

    const written = join(repository.top, "ci", "out", "report.json");

    expect(existsSync(written) && (JSON.parse(readFileSync(written, "utf8")) as ReportRead).provenance.target).toBe("acme/web");
  });
});

const ONE_UNIT_CLAIM = "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n";

// A Vitest evidence report with a passing test citing the one claim and a failing test citing no code.
const ONE_CITING_AND_ONE_FAILING_CITING_NONE =
  '{"testResults":[{"name":"/work/one.test.ts","status":"failed","message":"","assertionResults":[' +
  '{"title":"[CLM-ONE-001] one","fullName":"[CLM-ONE-001] one","status":"passed","ancestorTitles":[],"failureMessages":[]},' +
  '{"title":"cites no code","fullName":"cites no code","status":"failed","ancestorTitles":[],"failureMessages":["expected 1 to be 2"]}]}]}';
