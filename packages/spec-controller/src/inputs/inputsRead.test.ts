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

describe("an input left out takes its default", () => {
  it("[CLM-CLI-137] the run named no manifest, and package.json was in the folder: when balance reads its inputs, balance will use package.json", () => {
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

describe("an input left out takes its default", () => {
  it.each([
    ["CLM-CLI-183", "CI workflows", "the .github/workflows folder", "CI workflows", "workflows", ".github/workflows", (inputs: InputsRead) => inputs.workflowSteps],
    ["CLM-CLI-190", "feature corpus", "the features folder", "feature corpus", "features", "features", (inputs: InputsRead) => inputs.features],
    ["CLM-CLI-192", "manifest", "package.json", "manifest", "manifest", "package.json", (inputs: InputsRead) => inputs.manifest],
  ] as const)("[%s] the run named no %s, and %s did not exist: when balance reads its inputs, it will read no %s", (_clm, _input, _default, _none, kind, path, readOf) => {
    const inputs = inputsReadFor([{ kind, path, byDefault: true }], temporaryDirectory("absent-default-"));

    expect("refusals" in inputs ? inputs.refusals : readOf(inputs) ?? []).toEqual([]);
  });
});

describe("balance reads every workflow a CI workflows path names", () => {
  // A folder holding ci.yml and release.yaml beside a README and a folder of templates.
  function workflowsFolder(): string {
    const folder = temporaryDirectory("workflows-");
    mkdirSync(join(folder, "workflows", "templates"), { recursive: true });
    writeFileSync(join(folder, "workflows", "ci.yml"), "jobs:\n  ci:\n    steps:\n      - run: echo ci\n");
    writeFileSync(join(folder, "workflows", "release.yaml"), "jobs:\n  release:\n    steps:\n      - run: echo release\n");
    writeFileSync(join(folder, "workflows", "README.md"), "# Workflows\n\n- `ci.yml`: the checks on every push\n");
    writeFileSync(join(folder, "workflows", "templates", "partial.yml"), "jobs:\n  partial:\n    steps:\n      - run: echo partial\n");
    return folder;
  }

  // The workflows balance reads from the CI workflows path, or the keys of its refusals.
  function workflowsRead(path: string): string[] {
    const inputs = inputsReadFor([{ kind: "workflows", path, byDefault: false }], workflowsFolder());
    return "refusals" in inputs ? inputs.refusals.map(({ key }) => key) : [...new Set(inputs.workflowSteps?.map(({ workflow }) => workflow))];
  }

  it("[CLM-CLI-193] the run named the workflow ci.yml as its CI workflows: when balance reads its inputs, it will read ci.yml alone", () => {
    expect(workflowsRead("workflows/ci.yml")).toEqual(["ci.yml"]);
  });

  it("[CLM-CLI-203] the run named a folder with ci.yml and release.yaml in it as its CI workflows, beside a README and a folder of templates: when balance reads its inputs, it will read both workflows", () => {
    expect(workflowsRead("workflows")).toEqual(["ci.yml", "release.yaml"]);
  });
});
