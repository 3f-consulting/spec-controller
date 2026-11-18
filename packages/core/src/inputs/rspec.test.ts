import { describe, expect, it } from "vitest";
import { breaksFound } from "./reportVariants.test-utils.js";
import rspecVariants from "./rspec.variants.json" with { type: "json" };
import { whereResultsByExampleBreak } from "./rspec.js";

describe("an input that is not valid will stop the run", () => {
  it("[CLM-CLI-157] each RSpec evidence report broken at one entry is not in RSpec's shape, and breaks where it is broken", () => {
    const { found, listed } = breaksFound(rspecVariants["CLM-CLI-157"].variants, whereResultsByExampleBreak);

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
