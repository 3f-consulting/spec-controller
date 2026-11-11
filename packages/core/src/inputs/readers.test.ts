import { describe, expect, it } from "vitest";
import { parseWorkflows } from "./workflows.js";
import { parseVitestEvidenceObservations } from "./vitest.js";

describe("a command validates every input before it does its work", () => {
  it("[CLM-CLI-146] a Vitest file that ran no tests posts nothing", () => {
    expect(parseVitestEvidenceObservations({ testResults: [{ name: "a.test.ts", status: "passed", assertionResults: [] }] })).toEqual([]);
  });

  it("[CLM-CLI-150] a workflow that does not parse is named, with what is wrong", () => {
    const parse = parseWorkflows([{ file: "ci.yml", source: "jobs: [unclosed\n" }]);
    expect(parse).toMatchObject({ kind: "unparseable", faults: [{ file: "ci.yml", message: expect.stringContaining("must be sufficiently indented and end with a ]") }] });
  });
});
