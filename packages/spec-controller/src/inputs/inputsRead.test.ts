import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { inputsReadFor, type InputsRead } from "./inputsRead.js";

const ONE_FEATURE = "@ONE\nFeature: one\n";

const read = (...args: Parameters<typeof inputsReadFor>): InputsRead => {
  const inputs = inputsReadFor(...args);
  if ("ending" in inputs) throw new Error(`the inputs were refused: ${JSON.stringify(inputs.refusals)}`);
  return inputs;
};

describe("an empty evidence report will count as no evidence, not as a broken file", () => {
  it("[CLM-CLI-146] a Vitest evidence report listing no tests posts nothing, and the run does not stop", () => {
    const folder = temporaryDirectory("empty-report-");
    writeFileSync(join(folder, "vitest.json"), JSON.stringify({ testResults: [] }));

    expect(read([{ kind: "vitest", path: "vitest.json", byDefault: false }], folder).vitest).toEqual([]);
  });
});

describe("balance reads a feature file in a subfolder of the feature corpus", () => {
  it.each([
    ["named", "corpus", false],
    ["read by default", "features", true],
  ] as const)("[CLM-CLI-191] a corpus %s: it reads area/deeper/one.feature", (_how, corpus, byDefault) => {
    const folder = temporaryDirectory("corpus-depth-");
    mkdirSync(join(folder, corpus, "area", "deeper"), { recursive: true });
    writeFileSync(join(folder, corpus, "area", "deeper", "one.feature"), ONE_FEATURE);

    expect(read([{ kind: "features", path: corpus, byDefault }], folder).features.map(({ file }) => file)).toEqual(["area/deeper/one.feature"]);
  });
});
