import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { inputsReadFor, type InputsRead } from "./inputsRead.js";

const ONE_FEATURE = "@ONE\nFeature: one\n";

const read = (...args: Parameters<typeof inputsReadFor>): InputsRead => {
  const inputs = inputsReadFor(...args);
  if ("refusals" in inputs) throw new Error(`the inputs were refused: ${JSON.stringify(inputs.refusals)}`);
  return inputs;
};

describe("an empty evidence report will count as no evidence, not as a broken file", () => {
  it("[CLM-CLI-146] a Vitest evidence report listing nothing posts nothing, and the run does not stop", () => {
    const folder = temporaryDirectory("empty-report-");
    writeFileSync(join(folder, "vitest.json"), '{"testResults":[]}');
    const { features, vitest, pathsRead } = read([{ kind: "vitest", path: "vitest.json", byDefault: false }], folder);

    expect({ features, vitest, pathsRead }).toEqual({ features: [], vitest: [{ report: "vitest.json", path: "vitest.json", results: [] }], pathsRead: { vitest: ["vitest.json"] } });
  });

  it("[CLM-CLI-146] a CI step record listing nothing posts nothing, and the run does not stop", () => {
    const folder = temporaryDirectory("empty-report-");
    writeFileSync(join(folder, "steps.json"), "{}");

    expect(read([{ kind: "stepRecord", path: "steps.json", byDefault: false }], folder)).toEqual({ features: [], stepRecord: [], filesRead: [join(folder, "steps.json")], pathsRead: { stepRecord: ["steps.json"] } });
  });
});

describe("balance will use the default when an input is not named", () => {
  it("[CLM-CLI-137] no manifest named, and package.json in the folder: balance reads package.json", () => {
    const folder = temporaryDirectory("default-manifest-");
    writeFileSync(join(folder, "package.json"), JSON.stringify({ name: "acme", scripts: { test: "vitest run" } }));

    expect(read([{ kind: "manifest", path: "package.json", byDefault: true }], folder).manifest).toEqual({ name: "acme", scripts: { test: "vitest run" } });
  });
});

describe("balance reads a feature file in a subfolder of the feature corpus", () => {
  it("[CLM-CLI-191] a corpus named, beside its README: it reads area/deeper/one.feature", () => {
    const folder = temporaryDirectory("corpus-depth-");
    mkdirSync(join(folder, "corpus", "area", "deeper"), { recursive: true });
    writeFileSync(join(folder, "corpus", "area", "deeper", "one.feature"), ONE_FEATURE);
    writeFileSync(join(folder, "corpus", "README.md"), "# The claims\n\nEach feature file states one area's claims.\n");

    expect(read([{ kind: "features", path: "corpus", byDefault: false }], folder).features.map(({ file }) => file)).toEqual(["area/deeper/one.feature"]);
  });
});

describe("an input read by default that does not exist will count as none, not as a missing input", () => {
  it.each([
    ["CLM-CLI-183", "a workflows folder", "workflows", ".github/workflows", (inputs: InputsRead) => inputs.workflowSteps],
    ["CLM-CLI-190", "a feature corpus", "features", "features", (inputs: InputsRead) => inputs.features],
    ["CLM-CLI-192", "a manifest", "manifest", "package.json", (inputs: InputsRead) => inputs.manifest],
  ] as const)("[%s] %s read by default that does not exist: none is read, and the run does not stop", (_clm, _input, kind, path, readOf) => {
    const inputs = inputsReadFor([{ kind, path, byDefault: true }], temporaryDirectory("absent-default-"));

    expect("refusals" in inputs ? inputs.refusals : readOf(inputs) ?? []).toEqual([]);
  });
});

describe("balance reads the one workflow a CI workflows path names, or every workflow in the folder it names", () => {
  it.each([
    ["CLM-CLI-193", "the workflow ci.yml", "workflows/ci.yml", ["ci.yml"]],
    ["CLM-CLI-193", "the workflow env.yml, a step in it with a number and true as its env: values", "other/env.yml", ["env.yml"]],
    ["CLM-CLI-207", "a folder with ci.yml and release.yaml in it, beside its README and a folder of templates", "workflows", ["ci.yml", "release.yaml"]],
  ] as const)("[%s] the run named %s as its CI workflows, at %s: it reads %j", (_clm, _named, path, read) => {
    const folder = temporaryDirectory("workflows-");
    mkdirSync(join(folder, "workflows", "templates"), { recursive: true });
    mkdirSync(join(folder, "other"));
    writeFileSync(join(folder, "other", "env.yml"), "jobs:\n  ci:\n    steps:\n      - run: echo env\n        env:\n          RETRIES: 3\n          CI: true\n");
    writeFileSync(join(folder, "workflows", "ci.yml"), "jobs:\n  ci:\n    steps:\n      - run: echo ci\n");
    writeFileSync(join(folder, "workflows", "release.yaml"), "jobs:\n  release:\n    steps:\n      - run: echo release\n");
    writeFileSync(join(folder, "workflows", "README.md"), "# Workflows\n\n- `ci.yml`: the checks on every push\n");
    writeFileSync(join(folder, "workflows", "templates", "partial.yml"), "jobs:\n  partial:\n    steps:\n      - run: echo partial\n");
    const inputs = inputsReadFor([{ kind: "workflows", path, byDefault: false }], folder);

    expect("refusals" in inputs ? inputs.refusals.map(({ key }) => key) : [...new Set(inputs.workflowSteps?.map(({ workflow }) => workflow))]).toEqual(read);
  });
});

describe("balance reads the feature corpus in path order", () => {
  it("[CLM-CLI-197] a corpus with b.feature and a/x.feature: balance reads a/x.feature before b.feature", () => {
    const folder = temporaryDirectory("corpus-order-");
    mkdirSync(join(folder, "features", "a"), { recursive: true });
    writeFileSync(join(folder, "features", "b.feature"), "@BBB\nFeature: b\n\n  @unit @CLM-BBB-001\n  Scenario: b\n");
    writeFileSync(join(folder, "features", "a", "x.feature"), "@AAA\nFeature: x\n\n  @unit @CLM-AAA-001\n  Scenario: x\n");
    const inputs = inputsReadFor([{ kind: "features", path: "features", byDefault: false }], folder);

    expect("refusals" in inputs ? inputs.refusals.map(({ key }) => key) : inputs.features.map(({ file }) => file)).toEqual(["a/x.feature", "b.feature"]);
  });
});

describe("an input that is not valid will stop the run", () => {
  it("[CLM-CLI-157] an RSpec evidence report whose messages are a number is refused as not in RSpec's shape, naming the report and where it breaks", () => {
    const folder = temporaryDirectory("reader-throws-");
    writeFileSync(join(folder, "rspec.json"), '{"examples":[],"summary":{"errors_outside_of_examples_count":1},"messages":5}');
    const inputs = inputsReadFor([{ kind: "rspec", path: "rspec.json", byDefault: false }], folder);

    expect("refusals" in inputs ? inputs.refusals.map(({ key, values: { path, detail } }) => ({ key, path, detail })) : inputs.rspec).toEqual([{ key: "input-not-in-its-shape", path: "rspec.json", detail: "$.messages" }]);
  });
});
