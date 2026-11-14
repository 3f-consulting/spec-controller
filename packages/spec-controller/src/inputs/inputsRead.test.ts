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
  it.each([
    ["a Vitest evidence report", "vitest", "vitest.json", '{"testResults":[]}', []],
    ["a Jest evidence report", "jest", "jest.json", '{"testResults":[]}', []],
    ["a pytest evidence report", "pytest", "pytest.xml", '<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"></testsuites>', []],
    ["a JUnit evidence report", "junit", "junit.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="all"></testsuites>\n', []],
    ["an RSpec evidence report", "rspec", "rspec.json", '{"examples":[],"summary":{}}', { examples: [], loadErrors: [] }],
    ["a Cucumber evidence report", "cucumber", "cucumber.json", "[]", []],
    ["a CI step record", "stepRecord", "steps.json", "{}", []],
  ] as const)("[CLM-OBS-149] %s listing nothing posts nothing, and the run does not stop", (_report, kind, file, report, nothing) => {
    const folder = temporaryDirectory("empty-report-");
    writeFileSync(join(folder, file), report);

    expect(read([{ kind, path: file, byDefault: false }], folder)).toEqual({ features: [], [kind]: nothing, filesRead: [join(folder, file)], pathsRead: { [kind]: file } });
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
  it.each([
    ["named", "corpus", false],
    ["read by default", "features", true],
  ] as const)("[CLM-OBL-034] a corpus %s, beside its README: it reads area/deeper/one.feature", (_how, corpus, byDefault) => {
    const folder = temporaryDirectory("corpus-depth-");
    mkdirSync(join(folder, corpus, "area", "deeper"), { recursive: true });
    writeFileSync(join(folder, corpus, "area", "deeper", "one.feature"), ONE_FEATURE);
    writeFileSync(join(folder, corpus, "README.md"), "# The claims\n\nEach feature file states one area's claims.\n");

    expect(read([{ kind: "features", path: corpus, byDefault }], folder).features.map(({ file }) => file)).toEqual(["area/deeper/one.feature"]);
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
  it("[CLM-CLI-193] the workflow ci.yml, then a folder holding ci.yml and release.yaml beside its README and a folder of templates: it reads ci.yml alone, then both", () => {
    const folder = temporaryDirectory("workflows-");
    mkdirSync(join(folder, "workflows", "templates"), { recursive: true });
    writeFileSync(join(folder, "workflows", "ci.yml"), "jobs:\n  ci:\n    steps:\n      - run: echo ci\n");
    writeFileSync(join(folder, "workflows", "release.yaml"), "jobs:\n  release:\n    steps:\n      - run: echo release\n");
    writeFileSync(join(folder, "workflows", "README.md"), "# Workflows\n\n- `ci.yml`: the checks on every push\n");
    writeFileSync(join(folder, "workflows", "templates", "partial.yml"), "jobs:\n  partial:\n    steps:\n      - run: echo partial\n");
    const workflowsRead = (path: string): string[] => {
      const inputs = inputsReadFor([{ kind: "workflows", path, byDefault: false }], folder);
      return "refusals" in inputs ? inputs.refusals.map(({ key }) => key) : [...new Set(inputs.workflowSteps?.map(({ workflow }) => workflow))];
    };

    expect([workflowsRead("workflows/ci.yml"), workflowsRead("workflows")]).toEqual([["ci.yml"], ["ci.yml", "release.yaml"]]);
  });
});
