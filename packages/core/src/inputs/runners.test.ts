import { describe, expect, it } from "vitest";
import type { ReportLocation } from "../domain/configuration.js";
import { shellAnswers } from "./shell.js";

const NO_SCRIPTS = {};
const NO_ENVIRONMENT = {};

describe("balance reads the evidence report a named runner's CI step writes, in that runner's format", () => {
  it.each<[string, string, Readonly<Record<string, string>>, Readonly<Record<string, string>>, readonly ReportLocation[]]>([
    ["vitest", "vitest run --reporter=json --outputFile=out/vitest.json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/vitest.json", format: "vitest" }]],
    ["vitest", "vitest run --outputFile=out/vitest.json --reporter=json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/vitest.json", format: "vitest" }]],
    ["vitest", "vitest run --reporter=default --reporter=json --outputFile.json=out/vitest.json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/vitest.json", format: "vitest" }]],
    ["vitest", "vitest run --outputFile=out/vitest.json", NO_SCRIPTS, NO_ENVIRONMENT, []],
    ["jest", "jest --json --outputFile=out/jest.json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/jest.json", format: "jest" }]],
    ["jest", "jest --outputFile=out/jest.json", NO_SCRIPTS, NO_ENVIRONMENT, []],
    ["pytest", "pytest --junitxml=out/pytest.xml", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/pytest.xml", format: "pytest" }]],
    ["cucumber-js", "cucumber-js --format progress --format json:out/cucumber.json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/cucumber.json", format: "cucumber" }]],
    ["rspec", "rspec --format json --out out/rspec.json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/rspec.json", format: "rspec" }]],
    [
      "rspec",
      "rspec --format progress --out out/progress.txt --format json --out out/rspec.json",
      NO_SCRIPTS,
      NO_ENVIRONMENT,
      [{ path: "out/rspec.json", format: "rspec" }],
    ],
    ["rspec", "rspec --out out/rspec.json --format json", NO_SCRIPTS, NO_ENVIRONMENT, []],
    ["rspec", "rspec --format json --out out/rspec.json --format progress --out out/progress.txt", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/rspec.json", format: "rspec" }]],
    ["rspec", "pnpm --filter json spec --out out/rspec.json", { spec: "rspec --format progress" }, NO_ENVIRONMENT, []],
    ["playwright", "npx playwright test --reporter=junit", NO_SCRIPTS, { PLAYWRIGHT_JUNIT_OUTPUT_FILE: "out/playwright.xml" }, [{ path: "out/playwright.xml", format: "junit" }]],
    ["playwright", "npx playwright test", NO_SCRIPTS, { PLAYWRIGHT_JUNIT_OUTPUT_FILE: "out/playwright.xml" }, []],
    ["gotestsum", "gotestsum --junitfile out/go.xml -- ./...", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/go.xml", format: "junit" }]],
    ["gotestsum", "gotestsum --junitfile", NO_SCRIPTS, NO_ENVIRONMENT, []],
    ["gotestsum", "gotestsum -- ./...", NO_SCRIPTS, { GOTESTSUM_JUNITFILE: "out/go.xml" }, [{ path: "out/go.xml", format: "junit" }]],
    ["pytest", "pytest --junit-xml=out/pytest.xml", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/pytest.xml", format: "pytest" }]],
    ["cucumber-js", "cucumber-js -f json:out/cucumber.json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "out/cucumber.json", format: "cucumber" }]],
    [
      "playwright",
      "npx playwright test --reporter=junit",
      NO_SCRIPTS,
      { PLAYWRIGHT_JUNIT_OUTPUT_DIR: "out", PLAYWRIGHT_JUNIT_OUTPUT_NAME: "playwright.xml" },
      [{ path: "out/playwright.xml", format: "junit" }],
    ],
    ["playwright", "npx playwright test --reporter=junit", NO_SCRIPTS, { PLAYWRIGHT_JUNIT_OUTPUT_NAME: "playwright.xml" }, [{ path: "playwright.xml", format: "junit" }]],
    ["playwright", "npx playwright test --reporter=junit", NO_SCRIPTS, { PLAYWRIGHT_JUNIT_OUTPUT_DIR: "out" }, []],
    [
      "playwright",
      "npx playwright test --reporter=junit",
      NO_SCRIPTS,
      { PLAYWRIGHT_JUNIT_OUTPUT_FILE: "out/file.xml", PLAYWRIGHT_JUNIT_OUTPUT_DIR: "out", PLAYWRIGHT_JUNIT_OUTPUT_NAME: "name.xml" },
      [{ path: "out/file.xml", format: "junit" }],
    ],
    ["vitest", "pnpm test --reporter=json --outputFile=out/vitest.json", { test: "vitest run" }, NO_ENVIRONMENT, [{ path: "out/vitest.json", format: "vitest" }]],
    ["vitest", "pnpm test", { test: "vitest run --reporter=json --outputFile=out/vitest.json" }, NO_ENVIRONMENT, [{ path: "out/vitest.json", format: "vitest" }]],
    ["cucumber-js", "pnpm cucumber --format json:out/cucumber.json", { cucumber: "pnpm build && cucumber-js" }, NO_ENVIRONMENT, [{ path: "out/cucumber.json", format: "cucumber" }]],
    ["vitest", "pnpm test --outputFile=out/vitest.json", { test: "vitest run --reporter=json && node summary.js" }, NO_ENVIRONMENT, []],
    ["vitest", "vitest run --reporter=json --outputFile=/work/out/vitest.json", NO_SCRIPTS, NO_ENVIRONMENT, [{ path: "/work/out/vitest.json", format: "vitest" }]],
    ["vitest", 'vitest run --reporter=json --outputFile="$OUT/vitest.json"', NO_SCRIPTS, NO_ENVIRONMENT, []],
  ])("[CLM-CLI-214] a step running %s as %j, with the scripts %j and the environment %j, names the reports %j", (runner, command, scripts, environment, reports) => {
    expect(shellAnswers.reportsNamed(command, runner, scripts, environment)).toEqual(reports);
  });
});
