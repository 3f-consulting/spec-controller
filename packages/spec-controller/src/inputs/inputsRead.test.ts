import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inputsReadFrom, NODE_INPUT_READER } from "./inputsRead.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

describe("a feature corpus read by default that does not exist will count as no feature files, not as a missing input", () => {
  it("[CLM-CLI-190] a feature corpus read by default that does not exist will count as no feature files, not as a missing input", () => {
    const absent = join(temporaryDirectory("inputs-read-"), "features");

    expect(inputsReadFrom({}, [], NODE_INPUT_READER, { features: absent, ci: absent, packageJson: absent })).toEqual([]);
  });
});
