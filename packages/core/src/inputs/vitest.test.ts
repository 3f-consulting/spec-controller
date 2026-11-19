import { describe, expect, it } from "vitest";
import { breaksFound } from "./reportVariants.test-utils.js";
import vitestVariants from "./vitest.variants.json" with { type: "json" };
import { whereResultsByFileBreak } from "./vitest.js";

// A report of one file whose one assertion result has the status given.
const reportWithStatus = (status: string) => ({
  testResults: [{ name: "/repo/one.test.js", message: "", assertionResults: [{ ancestorTitles: [], title: "one", status, failureMessages: [] }] }],
});

describe("an input that is not valid will stop the run", () => {
  it(`[${vitestVariants["broken-vitest-reports"].claim}] the Vitest evidence report each of those is edited from is in Vitest's shape`, () => {
    expect(whereResultsByFileBreak(vitestVariants["broken-vitest-reports"].report)).toBeUndefined();
  });

  it(`[${vitestVariants["broken-vitest-reports"].claim}] each Vitest evidence report with one field its reader reads missing, null or of the wrong kind, or a status Vitest never writes, is not in Vitest's shape, and breaks at that field`, () => {
    const { found, listed } = breaksFound(vitestVariants["broken-vitest-reports"], whereResultsByFileBreak);

    expect(found).toEqual(listed);
  });

  it(`[${vitestVariants["broken-jest-reports"].claim}] the Jest evidence report each of those is edited from is in Jest's shape`, () => {
    expect(whereResultsByFileBreak(vitestVariants["broken-jest-reports"].report)).toBeUndefined();
  });

  it(`[${vitestVariants["broken-jest-reports"].claim}] each Jest evidence report with one field its reader reads missing, null or of the wrong kind, or a status Jest never writes, is not in Jest's shape, and breaks at that field`, () => {
    const { found, listed } = breaksFound(vitestVariants["broken-jest-reports"], whereResultsByFileBreak);

    expect(found).toEqual(listed);
  });

  it("[CLM-CLI-151] a Vitest evidence report with a file that could not run, which has a message and no assertion results, is in Vitest's shape", () => {
    expect(whereResultsByFileBreak({ testResults: [{ name: "/repo/one.test.ts", message: "Failed to load", assertionResults: [] }] })).toBeUndefined();
  });

  it.each(["passed", "failed", "skipped", "pending", "todo", "disabled", "focused"])("[CLM-CLI-153] a Jest evidence report with an assertion result whose status is %s is in Jest's shape", (status) => {
    expect(whereResultsByFileBreak(reportWithStatus(status))).toBeUndefined();
  });
});
