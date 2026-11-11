import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it, vi } from "vitest";
import { message } from "../messages/appText.js";
import { captured, expectRefused } from "./balanceRun.test-utils.js";
import { AppError, AppMessage } from "../messages/messages.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

// A kind as a complaint words it: a list or an object by its own words, a plain value by its type, and null as itself.
type Kind = AppMessage.ShapeKindList | AppMessage.ShapeKindObject | { readonly type: string } | null;

const LIST: Kind = AppMessage.ShapeKindList;
const OBJECT: Kind = AppMessage.ShapeKindObject;
const STRING: Kind = { type: "string" };
const NUMBER: Kind = { type: "number" };

function worded(kind: Kind): string {
  if (kind === null) return "null";
  return typeof kind === "object" ? message(AppMessage.ShapeKindOfType, kind) : message(kind);
}

const SHAPE_OF = {
  vitest: AppMessage.VitestReportShape,
  cucumber: AppMessage.CucumberReportShape,
  jest: AppMessage.JestReportShape,
  pytest: AppMessage.JunitReportShape,
  junit: AppMessage.JunitXmlReportShape,
  rspec: AppMessage.RspecReportShape,
} as const;

function expectNotInShape(flag: keyof typeof SHAPE_OF, name: string, content: string, fault: string): void {
  const dir = temporaryDirectory("report-shape-");
  const features = join(dir, "features");
  mkdirSync(features);
  writeFileSync(join(features, "a.feature"), "Feature: a\n");
  const ci = join(dir, "ci.yml");
  writeFileSync(ci, "jobs: {}\n");
  const path = join(dir, name);
  writeFileSync(path, content);
  const subject = message(AppMessage.FlaggedReport, { flag: `--${flag}` });

  const run = captured(["--features", features, "--ci", ci, `--${flag}`, path]);

  expectRefused(run, message(AppError.NotInShape, { subject, shape: message(SHAPE_OF[flag]), path, fault }));
}

describe("an input that is not valid will stop the run", () => {
  it.each([
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[null]}', "testResults[0]", null, OBJECT],
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[{"name":"a.test.ts"},{"name":1}]}', "testResults[1].name", NUMBER, STRING],
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[{"status":1}]}', "testResults[0].status", NUMBER, STRING],
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[{"message":1}]}', "testResults[0].message", NUMBER, STRING],
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[{"assertionResults":{}}]}', "testResults[0].assertionResults", OBJECT, LIST],
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[{"assertionResults":[{"fullName":1}]}]}', "testResults[0].assertionResults[0].fullName", NUMBER, STRING],
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[{"assertionResults":[{"title":1}]}]}', "testResults[0].assertionResults[0].title", NUMBER, STRING],
    ["CLM-CLI-151", "vitest", "vitest.json", '{"testResults":[{"assertionResults":[{"status":1}]}]}', "testResults[0].assertionResults[0].status", NUMBER, STRING],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"uri":1}]', "[0].uri", NUMBER, STRING],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"name":1}]', "[0].name", NUMBER, STRING],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":{}}]', "[0].elements", OBJECT, LIST],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":[{"tags":{}}]}]', "[0].elements[0].tags", OBJECT, LIST],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":[{"tags":[{"name":1}]}]}]', "[0].elements[0].tags[0].name", NUMBER, STRING],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":[{"steps":{}}]}]', "[0].elements[0].steps", OBJECT, LIST],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":[{"steps":[{"keyword":1}]}]}]', "[0].elements[0].steps[0].keyword", NUMBER, STRING],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":[{"steps":[{"name":1}]}]}]', "[0].elements[0].steps[0].name", NUMBER, STRING],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":[{"steps":[{"result":"passed"}]}]}]', "[0].elements[0].steps[0].result", STRING, OBJECT],
    ["CLM-CLI-152", "cucumber", "cucumber.json", '[{"elements":[{"steps":[{"result":{"status":1}}]}]}]', "[0].elements[0].steps[0].result.status", NUMBER, STRING],
    ["CLM-CLI-153", "jest", "jest.json", '{"testResults":[{"assertionResults":[{"status":1}]}]}', "testResults[0].assertionResults[0].status", NUMBER, STRING],
    ["CLM-CLI-154", "pytest", "report.xml", "<testsuites>x</testsuites>", "testsuites", STRING, OBJECT],
    ["CLM-CLI-154", "pytest", "report.xml", "<testsuites><testsuite>x</testsuite></testsuites>", "testsuites.testsuite[0]", STRING, OBJECT],
    ["CLM-CLI-154", "pytest", "report.xml", "<testsuites><testsuite><testcase>x</testcase></testsuite></testsuites>", "testsuites.testsuite[0].testcase[0]", STRING, OBJECT],
    [
      "CLM-CLI-154",
      "pytest",
      "report.xml",
      "<testsuites><testsuite><testcase><classname><a/></classname></testcase></testsuite></testsuites>",
      "testsuites.testsuite[0].testcase[0].classname",
      OBJECT,
      STRING,
    ],
    [
      "CLM-CLI-155",
      "junit",
      "report.xml",
      "<testsuites><testsuite><testcase><name><a/></name></testcase></testsuite></testsuites>",
      "testsuites.testsuite[0].testcase[0].name",
      OBJECT,
      STRING,
    ],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":{},"summary":{}}', "examples", OBJECT, LIST],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[{"description":1}],"summary":{}}', "examples[0].description", NUMBER, STRING],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[{"full_description":1}],"summary":{}}', "examples[0].full_description", NUMBER, STRING],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[{"status":1}],"summary":{}}', "examples[0].status", NUMBER, STRING],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[{"file_path":1}],"summary":{}}', "examples[0].file_path", NUMBER, STRING],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[],"summary":[]}', "summary", LIST, OBJECT],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[],"summary":{"errors_outside_of_examples_count":"1"}}', "summary.errors_outside_of_examples_count", STRING, NUMBER],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[],"summary":{},"messages":{}}', "messages", OBJECT, LIST],
    ["CLM-CLI-157", "rspec", "rspec.json", '{"examples":[],"summary":{},"messages":[1]}', "messages[0]", NUMBER, STRING],
  ] as const)("[%s] the --%s report holds a value in the wrong shape: %s", (_clm, flag, name, content, where, found, expected) => {
    expectNotInShape(flag, name, content, message(AppMessage.ShapeWrongKind, { where, found: worded(found), expected: worded(expected) }));
  });

  it("[CLM-CLI-157] the --rspec report has no examples", () => {
    expectNotInShape("rspec", "rspec.json", '{"summary":{"errors_outside_of_examples_count":0}}', message(AppMessage.ShapeFieldMissing, { path: "examples" }));
  });

  it("[CLM-CLI-158] the step record's second step is not in the shape of a step's outcome", () => {
    const dir = temporaryDirectory("step-record-shape-");
    const features = join(dir, "features");
    mkdirSync(features);
    writeFileSync(join(features, "a.feature"), "Feature: a\n");
    const ci = join(dir, "ci.yml");
    writeFileSync(ci, "jobs: {}\n");
    const path = join(dir, "ci-steps.json");
    writeFileSync(path, '{"CLM-ABC-001":{"outcome":"success"},"CLM-ABC-002":{"outcome":1}}');
    const fault = message(AppMessage.ShapeWrongKind, { where: "CLM-ABC-002.outcome", found: worded(NUMBER), expected: worded(STRING) });

    const run = captured(["--features", features, "--ci", ci, "--ci-steps", path]);

    const subject = message(AppMessage.FlaggedRecord, { flag: "--ci-steps" });
    expectRefused(run, message(AppError.NotInShape, { subject, shape: message(AppMessage.CiStepRecordShape), path, fault }));
  });
});
