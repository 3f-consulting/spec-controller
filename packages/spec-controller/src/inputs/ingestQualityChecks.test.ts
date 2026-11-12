import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCorpus } from "./ingestQualityChecks.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

describe("a feature corpus read by default that does not exist will count as no feature files, not as a missing input", () => {
  it("[CLM-CLI-190] a feature corpus read by default that does not exist will count as no feature files, not as a missing input", () => {
    const absent = join(temporaryDirectory("ingest-quality-checks-"), "features");

    expect(readCorpus(absent)).toEqual({ kind: "read", corpus: [] });
  });
});
