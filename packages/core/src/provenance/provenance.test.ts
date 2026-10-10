import { describe, it, expect } from "vitest";
import {
  provenanceObject,
  projectProvenance,
  type RunContext,
  type RunInputs,
} from "./provenance.js";

describe("[SCN-RPT-001] provenance records input paths portably (relative to the run root)", () => {
  const mk = (inputs: RunInputs, root?: string): RunContext => ({
    target: "demo",
    inputs,
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

  it("the markdown provenance projection carries the relativized value too (single projection)", () => {
    const facts = projectProvenance(mk({ features: "/repo/features" }, "/repo"));
    expect(facts.inputs).toContainEqual({ flag: "--features", value: "features" });
  });
});

describe("[SCN-RPT-027] the provenance projection names the optional CI step record", () => {
  const handed = (inputs: RunInputs): RunContext => ({
    target: "streams-target",
    inputs,
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
    inputs,
    runStart: new Date("2026-09-06T15:30:00.000Z"),
    sourceSha: "abc123",
  });

  it("names the canonical flags with no value, in canonical order", () => {
    const facts = projectProvenance(handed({ features: "features", ciSteps: "ci-steps.json" }));
    expect(facts.absentInputs).toEqual(["--vitest", "--cucumber", "--ci", "--package-json"]);
  });
});
