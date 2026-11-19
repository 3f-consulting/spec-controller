import { describe, expect, it } from "vitest";
import { breaksFound } from "./reportVariants.test-utils.js";
import rspecVariants from "./rspec.variants.json" with { type: "json" };
import { whereResultsByExampleBreak } from "./rspec.js";

describe("an input that is not valid will stop the run", () => {
  it(`[${rspecVariants["broken-rspec-reports"].claim}] the RSpec evidence report each of those is edited from is in RSpec's shape`, () => {
    expect(whereResultsByExampleBreak(rspecVariants["broken-rspec-reports"].report)).toBeUndefined();
  });

  it(`[${rspecVariants["broken-rspec-reports"].claim}] each RSpec evidence report with one field its reader reads missing, null or of the wrong kind, or a status RSpec never writes, is not in RSpec's shape, and breaks at that field`, () => {
    const { found, listed } = breaksFound(rspecVariants["broken-rspec-reports"], whereResultsByExampleBreak);

    expect(found).toEqual(listed);
  });

  it("[CLM-CLI-157] an RSpec evidence report with a passing example whose pending message is null, beside a failing one with its exception, is in RSpec's shape", () => {
    const examples = [
      { description: "one", full_description: "one", status: "passed", file_path: "./spec/one_spec.rb", pending_message: null },
      { description: "two", full_description: "two", status: "failed", file_path: "./spec/one_spec.rb", pending_message: null, exception: { message: "expected 1" } },
    ];

    expect(whereResultsByExampleBreak({ examples, summary: {} })).toBeUndefined();
  });
});
