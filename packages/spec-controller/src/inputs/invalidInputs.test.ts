import { chmodSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it, vi } from "vitest";
import { parse } from "yaml";
import { message } from "../messages/appText.js";
import { AppError, AppMessage } from "../messages/messages.js";
import { parseJunitXml } from "./junitXml.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { captured, expectRefused } from "./balanceRun.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

interface Target {
  readonly dir: string;
  readonly features: string;
  readonly ci: string;
}

interface Met {
  readonly argv: readonly string[];
  readonly complaint: string;
}

function target(): Target {
  const dir = temporaryDirectory("invalid-input-");
  const features = join(dir, "features");
  mkdirSync(features);
  writeFileSync(join(features, "a.feature"), "Feature: a\n");
  const ci = join(dir, "ci.yml");
  writeFileSync(ci, "jobs: {}\n");
  return { dir, features, ci };
}

function written(dir: string, name: string, content: string): string {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

function thrownBy(act: () => unknown): string {
  try {
    act();
  } catch (err) {
    return (err as Error).message;
  }
  throw new Error("expected the act to throw");
}

const report = (flag: string): string => message(AppMessage.FlaggedReport, { flag });

const missing = (path: string): string => message(AppMessage.ShapeFieldMissing, { path });

const wrongKind = (where: string, found: string, expected: string): string => message(AppMessage.ShapeWrongKind, { where, found, expected });

function misshapen(t: Target, flag: string, name: string, content: string, subject: string, shape: AppMessage, fault: () => string): Met {
  const path = written(t.dir, name, content);
  return {
    argv: ["--features", t.features, "--ci", t.ci, flag, path],
    complaint: message(AppError.NotInShape, { subject, shape: message(shape), path, fault: fault() }),
  };
}

const NOT_GHERKIN = "this line is no Gherkin";

const NOT_YAML = "jobs:\n  ci: [\n";

describe("an input that is not valid will stop the run", () => {
  it.for([
    [
      "CLM-CLI-147",
      "a named input that does not exist",
      (t: Target): Met => {
        const path = join(t.dir, "absent.json");
        return { argv: ["--features", t.features, "--ci", t.ci, "--vitest", path], complaint: message(AppError.InputPathMissing, { flag: "--vitest", path }) };
      },
    ],
    [
      "CLM-CLI-148",
      "a JSON evidence report that does not parse",
      (t: Target): Met => {
        const path = written(t.dir, "vitest.json", "{not json");
        const reason = thrownBy(() => JSON.parse("{not json"));
        return { argv: ["--features", t.features, "--ci", t.ci, "--vitest", path], complaint: message(AppError.NotValidJson, { subject: report("--vitest"), path, reason }) };
      },
    ],
    [
      "CLM-CLI-148",
      "a Jest evidence report that does not parse",
      (t: Target): Met => {
        const path = written(t.dir, "jest.json", "{not json");
        const reason = thrownBy(() => JSON.parse("{not json"));
        return { argv: ["--features", t.features, "--ci", t.ci, "--jest", path], complaint: message(AppError.NotValidJson, { subject: report("--jest"), path, reason }) };
      },
    ],
    [
      "CLM-CLI-148",
      "an RSpec evidence report that does not parse",
      (t: Target): Met => {
        const path = written(t.dir, "rspec.json", "{not json");
        const reason = thrownBy(() => JSON.parse("{not json"));
        return { argv: ["--features", t.features, "--ci", t.ci, "--rspec", path], complaint: message(AppError.NotValidJson, { subject: report("--rspec"), path, reason }) };
      },
    ],
    [
      "CLM-CLI-186",
      "a JUnit evidence report that does not parse",
      (t: Target): Met => {
        const content = '<testsuites><testsuite name="s"><testcase classname="a" name="t"/></testsuite></testsuite>';
        const path = written(t.dir, "report.xml", content);
        const reason = thrownBy(() => parseJunitXml(content));
        const complaint = message(AppError.NotValidXml, { subject: report("--junit"), shape: message(AppMessage.JunitXmlReportShape), path, reason });
        return { argv: ["--features", t.features, "--ci", t.ci, "--junit", path], complaint };
      },
    ],
    [
      "CLM-CLI-186",
      "a pytest evidence report, in JUnit XML, that does not parse",
      (t: Target): Met => {
        const content = '<testsuites><testsuite name="s"><testcase classname="a" name="t"/></testsuite></testsuite>';
        const path = written(t.dir, "report.xml", content);
        const reason = thrownBy(() => parseJunitXml(content));
        const complaint = message(AppError.NotValidXml, { subject: report("--pytest"), shape: message(AppMessage.JunitReportShape), path, reason });
        return { argv: ["--features", t.features, "--ci", t.ci, "--pytest", path], complaint };
      },
    ],
    [
      "CLM-CLI-149",
      "a feature file that does not parse",
      (t: Target): Met => {
        const file = written(t.features, "b.feature", `Feature: b\n\n  Scenario: s\n    Given a step\n  ${NOT_GHERKIN}\n`);
        const corpus = message(AppMessage.FlaggedCorpus, { flag: "--features" });
        // The parser's words take two lines, the line it rejected on the second.
        const words = `\n${NOT_GHERKIN}`;
        return { argv: ["--features", t.features, "--ci", t.ci], complaint: message(AppError.CorpusFileUnparseable, { corpus, file, message: words }) };
      },
    ],
    [
      "CLM-CLI-150",
      "a workflow that does not parse",
      (t: Target): Met => {
        const file = written(t.dir, "broken.yml", NOT_YAML);
        const workflows = message(AppMessage.FlaggedWorkflows, { flag: "--ci" });
        return {
          argv: ["--features", t.features, "--ci", file],
          complaint: message(AppError.WorkflowNotYaml, { workflows, file, message: thrownBy(() => parse(NOT_YAML)) }),
        };
      },
    ],
    [
      "CLM-CLI-151",
      "a Vitest evidence report that is not in the shape Vitest writes",
      (t: Target): Met =>
        misshapen(t, "--vitest", "vitest.json", '{"testResults":"x"}', report("--vitest"), AppMessage.VitestReportShape, () =>
          wrongKind("testResults", message(AppMessage.ShapeKindOfType, { type: "string" }), message(AppMessage.ShapeKindList)),
        ),
    ],
    [
      "CLM-CLI-152",
      "a Cucumber evidence report that is not in the shape Cucumber writes",
      (t: Target): Met =>
        misshapen(t, "--cucumber", "cucumber.json", "{}", report("--cucumber"), AppMessage.CucumberReportShape, () =>
          wrongKind(message(AppMessage.ShapeTopLevel), message(AppMessage.ShapeKindObject), message(AppMessage.ShapeKindList)),
        ),
    ],
    [
      "CLM-CLI-153",
      "a Jest evidence report that is not in the shape Jest writes",
      (t: Target): Met => misshapen(t, "--jest", "jest.json", '{"numTotalTests":0}', report("--jest"), AppMessage.JestReportShape, () => missing("testResults")),
    ],
    [
      "CLM-CLI-154",
      "a pytest evidence report that is not in the shape pytest writes",
      (t: Target): Met => misshapen(t, "--pytest", "report.xml", "<html><body/></html>", report("--pytest"), AppMessage.JunitReportShape, () => missing("testsuites")),
    ],
    [
      "CLM-CLI-155",
      "a JUnit evidence report that is not in the shape JUnit writes",
      (t: Target): Met => misshapen(t, "--junit", "report.xml", "<html><body/></html>", report("--junit"), AppMessage.JunitXmlReportShape, () => missing("testsuites")),
    ],
    [
      "CLM-CLI-156",
      "a file in a JUnit directory that is not in the shape JUnit writes",
      (t: Target): Met => {
        const reports = join(t.dir, "surefire-reports");
        mkdirSync(reports);
        written(reports, "TEST-example.GoodTest.xml", '<testsuite name="example.GoodTest" tests="0" />');
        const path = written(reports, "TEST-example.NotAReport.xml", "<html><body/></html>");
        const shape = message(AppMessage.JunitXmlReportShape);
        return {
          argv: ["--features", t.features, "--ci", t.ci, "--junit", reports],
          complaint: message(AppError.NotInShape, { subject: report("--junit"), shape, path, fault: missing("testsuites") }),
        };
      },
    ],
    [
      "CLM-CLI-157",
      "an RSpec evidence report that is not in the shape RSpec writes",
      (t: Target): Met => misshapen(t, "--rspec", "rspec.json", '{"examples":[]}', report("--rspec"), AppMessage.RspecReportShape, () => missing("summary")),
    ],
    [
      "CLM-CLI-158",
      "a step record that is not in the shape of a record of step outcomes",
      (t: Target): Met =>
        misshapen(t, "--ci-steps", "ci-steps.json", '{"CLM-ABC-001":{"outcome":1}}', message(AppMessage.FlaggedRecord, { flag: "--ci-steps" }), AppMessage.CiStepRecordShape, () =>
          wrongKind("CLM-ABC-001.outcome", message(AppMessage.ShapeKindOfType, { type: "number" }), message(AppMessage.ShapeKindOfType, { type: "string" })),
        ),
    ],
    [
      "CLM-CLI-159",
      "a manifest that is not in a manifest's shape",
      (t: Target): Met =>
        misshapen(t, "--package-json", "package.json", '{"scripts":"x"}', message(AppMessage.FlaggedManifest, { flag: "--package-json" }), AppMessage.PackageManifestShape, () =>
          wrongKind("scripts", message(AppMessage.ShapeKindOfType, { type: "string" }), message(AppMessage.ShapeKindObject)),
        ),
    ],
    [
      "CLM-CLI-160",
      "a named path that is not the kind of path its flag reads",
      (t: Target): Met => {
        const path = written(t.dir, "notes.txt", "notes\n");
        const reason = thrownBy(() => readdirSync(path));
        const subject = message(AppMessage.FlaggedCorpus, { flag: "--features" });
        return { argv: ["--features", path, "--ci", t.ci], complaint: message(AppError.CouldNotBeRead, { subject, path, reason }) };
      },
    ],
    [
      "CLM-CLI-160",
      "a folder named where a report file goes",
      (t: Target): Met => {
        const path = join(t.dir, "vitest-results");
        mkdirSync(path);
        const reason = thrownBy(() => readFileSync(path, "utf8"));
        return { argv: ["--features", t.features, "--ci", t.ci, "--vitest", path], complaint: message(AppError.CouldNotBeRead, { subject: report("--vitest"), path, reason }) };
      },
    ],
    [
      "CLM-CLI-161",
      "a named input that the tool is not permitted to read",
      (t: Target): Met => {
        const path = written(t.dir, "vitest.json", '{"testResults":[]}');
        chmodSync(path, 0o000);
        const reason = thrownBy(() => readFileSync(path, "utf8"));
        return { argv: ["--features", t.features, "--ci", t.ci, "--vitest", path], complaint: message(AppError.CouldNotBeRead, { subject: report("--vitest"), path, reason }) };
      },
    ],
    [
      "CLM-CLI-161",
      "a named workflow that the tool is not permitted to read",
      (t: Target): Met => {
        chmodSync(t.ci, 0o000);
        const reason = thrownBy(() => readFileSync(t.ci, "utf8"));
        const subject = message(AppMessage.FlaggedWorkflows, { flag: "--ci" });
        return { argv: ["--features", t.features, "--ci", t.ci], complaint: message(AppError.CouldNotBeRead, { subject, path: t.ci, reason }) };
      },
    ],
    [
      "CLM-CLI-161",
      "a named JUnit folder that the tool is not permitted to list",
      (t: Target): Met => {
        const path = join(t.dir, "surefire-reports");
        mkdirSync(path);
        chmodSync(path, 0o000);
        const reason = thrownBy(() => readFileSync(path, "utf8"));
        return { argv: ["--features", t.features, "--ci", t.ci, "--junit", path], complaint: message(AppError.CouldNotBeRead, { subject: report("--junit"), path, reason }) };
      },
    ],
  ] as const)("[%s] the run met %s", ([clm, , met], { skip }) => {
    skip(clm === "CLM-CLI-161" && process.getuid?.() === 0);
    const { argv, complaint } = met(target());

    expectRefused(captured([...argv]), complaint);
  });
});

describe("balance will use the default when an input is not named", () => {
  it("[CLM-CLI-136] input feature corpus, default the features folder, even one the tool is not permitted to read", ({ skip }) => {
    skip(process.getuid?.() === 0);
    const t = target();
    vi.spyOn(process, "cwd").mockReturnValue(t.dir);
    const features = t.features;
    chmodSync(features, 0o000);
    const complaint = message(AppError.CouldNotBeRead, { subject: message(AppMessage.DefaultFeatureCorpus), path: features, reason: thrownBy(() => readdirSync(features)) });

    expectRefused(captured(["--ci", t.ci]), complaint);
  });
});

describe("a corpus with several feature files that do not parse will be refused, naming each of them", () => {
  it("[CLM-CLI-185] a corpus with several feature files that do not parse will be refused, naming each of them", () => {
    const t = target();
    const corpus = message(AppMessage.FlaggedCorpus, { flag: "--features" });
    const broken = (name: string, line: string): string => {
      const file = written(t.features, name, `Feature: x\n\n  Scenario: s\n    Given a step\n  ${line}\n`);
      return message(AppError.CorpusFileUnparseable, { corpus, file, message: `\n${line}` });
    };
    const refusals = [broken("b.feature", NOT_GHERKIN), broken("c.feature", "nor is this one")];

    expectRefused(captured(["--features", t.features, "--ci", t.ci]), ...refusals);
  });
});
