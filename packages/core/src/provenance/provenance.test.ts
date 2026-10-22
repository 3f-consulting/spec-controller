import { describe, it, expect } from "vitest";
import { provenanceObject } from "./provenance.js";
import { projectProvenance } from "../assemble/composers.js";
import type { RunContext, RunInputs } from "../domain/runProvenance.js";
import { handedInputs } from "../runInputs.test-utils.js";

describe("[SCN-RPT-001] provenance records input paths portably (relative to the run root)", () => {
  const mk = (inputs: RunInputs, root?: string): RunContext => ({
    target: "demo",
    inputs: handedInputs(inputs),
    corpus: "features",
    runStart: new Date("2026-06-27T08:17:53.000Z"),
    sourceSha: "abc123",
    root,
  });

  it("relativizes an absolute input path under the run root", () => {
    const obj = provenanceObject(
      mk({ features: "/repo/features", vitest: "/repo/out/vitest.json" }, "/repo")
    );
    expect(obj.inputs.features).toBe("features");
    expect(obj.inputs.vitest).toBe("out/vitest.json");
  });

  it.each([
    ["leaves a non-absolute input path unchanged", "features"],
    ["leaves an absolute path NOT under the run root verbatim (never a ../ leak)", "/elsewhere/features"],
  ])("%s", (_title, features) => {
    const obj = provenanceObject(mk({ features }, "/repo"));
    expect(obj.inputs.features).toBe(features);
  });

  it("carries the origin's name as the run handed it", () => {
    expect(provenanceObject({ ...mk({}), targetOrigin: "ekino/veggies" }).targetOrigin).toBe("ekino/veggies");
  });

  it.each([undefined, ""])("carries no origin when the run read none (%j)", (targetOrigin) => {
    expect("targetOrigin" in provenanceObject({ ...mk({}), targetOrigin })).toBe(false);
  });

  it("the markdown provenance projection carries the relativized value too (single projection)", () => {
    const facts = projectProvenance(mk({ features: "/repo/features" }, "/repo"));
    expect(facts.inputs).toContainEqual({ flag: "--features", value: "features" });
  });
});

describe("[SCN-RPT-027] the provenance projection names the optional CI step record", () => {
  const handed = (inputs: RunInputs): RunContext => ({
    target: "streams-target",
    inputs: handedInputs(inputs),
    corpus: "features",
    runStart: new Date("2026-09-06T15:00:00.000Z"),
    sourceSha: "abc123",
  });

  it("carries the CI step record the run received onto the provenance object", () => {
    const obj = provenanceObject(handed({ features: "features", ciSteps: "ci-steps.json" }));
    expect(obj.inputs.ciSteps).toBe("ci-steps.json");
  });

  it("renders it APPENDED after --package-json, so no flag that was already listed moves", () => {
    const facts = projectProvenance(
      handed({
        features: "features",
        vitest: "vitest.json",
        cucumber: "cucumber.json",
        ci: ".github/workflows",
        packageJson: "package.json",
        ciSteps: "ci-steps.json",
      })
    );
    expect(facts.inputs.map((i) => i.flag)).toEqual([
      "--features",
      "--vitest",
      "--cucumber",
      "--ci",
      "--package-json",
      "--ci-steps",
    ]);
  });

  it("names an EMPTY or blank stream path no more than it names an absent one — the presence filter is unchanged", () => {
    for (const ciSteps of ["", "  "]) {
      const facts = projectProvenance(handed({ features: "features", ciSteps }));
      expect(facts.inputs.map((i) => i.flag)).toEqual(["--features"]);
    }
  });
});

describe("[SCN-RPT-028] the provenance projection names the canonical inputs the run did not receive", () => {
  const handed = (inputs: RunInputs): RunContext => ({
    target: "partly-handed-target",
    inputs: handedInputs(inputs),
    corpus: "features",
    runStart: new Date("2026-09-06T15:30:00.000Z"),
    sourceSha: "abc123",
  });

  it("names the canonical flags with no value, in canonical order", () => {
    const facts = projectProvenance(handed({ features: "features", ciSteps: "ci-steps.json" }));
    expect(facts.absentInputs).toEqual(["--vitest", "--pytest", "--jest", "--junit", "--rspec", "--cucumber", "--ci", "--package-json"]);
  });

  it("lists a pytest report the run received among its inputs, beside --vitest, and never as absent", () => {
    const facts = projectProvenance(
      handed({ features: "features", vitest: "vitest.json", pytest: "report.xml", cucumber: "cucumber.json" })
    );
    expect(facts.inputs.map((i) => i.flag)).toEqual(["--features", "--vitest", "--pytest", "--cucumber"]);
    expect(facts.inputs).toContainEqual({ flag: "--pytest", value: "report.xml" });
    expect(facts.absentInputs).not.toContain("--pytest");
  });

  it("lists a Jest report the run received among its inputs, after --pytest, and never as absent", () => {
    const facts = projectProvenance(handed({ features: "features", pytest: "report.xml", jest: "jest.json", cucumber: "cucumber.json" }));
    expect(facts.inputs.map((i) => i.flag)).toEqual(["--features", "--pytest", "--jest", "--cucumber"]);
    expect(facts.inputs).toContainEqual({ flag: "--jest", value: "jest.json" });
    expect(facts.absentInputs).not.toContain("--jest");
  });

  it("lists a JUnit XML report the run received among its inputs, after --jest, and never as absent", () => {
    const facts = projectProvenance(handed({ features: "features", jest: "jest.json", junit: "junit.xml", cucumber: "cucumber.json" }));
    expect(facts.inputs.map((i) => i.flag)).toEqual(["--features", "--jest", "--junit", "--cucumber"]);
    expect(facts.inputs).toContainEqual({ flag: "--junit", value: "junit.xml" });
    expect(facts.absentInputs).not.toContain("--junit");
  });

  it("lists an RSpec report the run received among its inputs, after --junit, and never as absent", () => {
    const facts = projectProvenance(handed({ features: "features", junit: "junit.xml", rspec: "rspec.json", cucumber: "cucumber.json" }));
    expect(facts.inputs.map((i) => i.flag)).toEqual(["--features", "--junit", "--rspec", "--cucumber"]);
    expect(facts.inputs).toContainEqual({ flag: "--rspec", value: "rspec.json" });
    expect(facts.absentInputs).not.toContain("--rspec");
  });
});
