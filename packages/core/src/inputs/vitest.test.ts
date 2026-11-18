import { describe, expect, it } from "vitest";
import { breaksFound } from "./reportVariants.test-utils.js";
import vitestVariants from "./vitest.variants.json" with { type: "json" };
import { whereResultsByFileBreak } from "./vitest.js";

// A report of one file whose one assertion result has the status given.
const reportWithStatus = (status: string) => ({
  testResults: [{ name: "/repo/one.test.js", message: "", assertionResults: [{ ancestorTitles: [], title: "one", status, failureMessages: [] }] }],
});

describe("an input that is not valid will stop the run", () => {
  it("[CLM-CLI-151] each Vitest evidence report broken at one entry is not in Vitest's shape, and breaks where it is broken", () => {
    const { found, listed } = breaksFound(vitestVariants["CLM-CLI-151"].variants, whereResultsByFileBreak);

    expect(found).toEqual(listed);
  });

  it("[CLM-CLI-153] each Jest evidence report broken at one entry is not in Jest's shape, and breaks where it is broken", () => {
    const { found, listed } = breaksFound(vitestVariants["CLM-CLI-153"].variants, whereResultsByFileBreak);

    expect(found).toEqual(listed);
  });

  it("[CLM-CLI-151] a Vitest evidence report with a file that could not run, which has a message and no assertion results, is in Vitest's shape", () => {
    expect(whereResultsByFileBreak({ testResults: [{ name: "/repo/one.test.ts", message: "Failed to load", assertionResults: [] }] })).toBeUndefined();
  });

  it.each(["passed", "failed", "skipped", "pending", "todo", "disabled", "focused"])("[CLM-CLI-153] a Jest evidence report with an assertion result whose status is %s is in Jest's shape", (status) => {
    expect(whereResultsByFileBreak(reportWithStatus(status))).toBeUndefined();
  });
});
