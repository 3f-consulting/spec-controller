/**
 * Unit tests for the provenance INPUT-PATH portability (@SCN-RPT-001 Update).
 *
 * Bidirectional evidence (Evidence Manifesto §9 / the discipline): the describe
 * carries the @SCN-RPT-001 id matching features/report.feature, so a grep of the id
 * returns both halves of the pair. The exact parallel of the evidenceObservations
 * locators for the provenance inputs: when RunContext carries a run root, the projection
 * relativizes each input path so a committed artefact never leaks an absolute
 * local/worktree path. Opt-in — no root means verbatim, so the existing RPT-001 ctx
 * fixtures stay unchanged.
 *
 * The impure resolveSourceSha / resolveTargetRoot arms (@SCN-RPT-003 / @SCN-RPT-016) moved
 * to run-management/resolveRunInputs.test.ts with their functions.
 *
 * Parent: (@SCN-RPT-001).
 */

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

  it("leaves a non-absolute input path unchanged", () => {
    const obj = provenanceObject(mk({ features: "features" }, "/repo"));
    expect(obj.inputs.features).toBe("features");
  });

  it("leaves an absolute path NOT under the run root verbatim (never a ../ leak)", () => {
    const obj = provenanceObject(mk({ features: "/elsewhere/features" }, "/repo"));
    expect(obj.inputs.features).toBe("/elsewhere/features");
  });

  it("records inputs verbatim when no run root is given (the opt-in default — existing fixtures unchanged)", () => {
    const obj = provenanceObject(mk({ features: "/repo/features" }));
    expect(obj.inputs.features).toBe("/repo/features");
  });

  it("the markdown provenance projection carries the relativized value too (single projection)", () => {
    const facts = projectProvenance(mk({ features: "/repo/features" }, "/repo"));
    expect(facts.inputs).toContainEqual({ flag: "--features", value: "features" });
  });
});

/**
 * The optional fitness stream — the CI step record — on the canonical input list (@SCN-RPT-027,
 * 3F-3155). The isolation half of the pair: the @integration arm in
 * tests/steps/report.steps.ts runs the REAL CLI and reads the persisted block back, while
 * these arms pin the projection's ORDER and its additive JSON shape, which a rendered line
 * cannot show.
 */
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

  it("is ADDITIVE on the JSON surface — a run not handed it serialises byte-identically", () => {
    const obj = provenanceObject(
      handed({
        features: "features",
        vitest: "vitest.json",
        cucumber: "cucumber.json",
        ci: ".github/workflows",
        packageJson: "package.json",
      })
    );
    expect(JSON.stringify(obj.inputs)).toBe(
      '{"features":"features","vitest":"vitest.json","cucumber":"cucumber.json","ci":".github/workflows","packageJson":"package.json"}'
    );
  });

  it("names an EMPTY or blank stream path no more than it names an absent one — the presence filter is unchanged", () => {
    for (const ciSteps of ["", "  "]) {
      const facts = projectProvenance(handed({ features: "features", ciSteps }));
      expect(facts.inputs.map((i) => i.flag)).toEqual(["--features"]);
    }
  });
});

/**
 * The canonical inputs a run did NOT receive (@SCN-RPT-028, 3F-3155). @SCN-RPT-027 named
 * every stream a run was handed, which killed the "handed it and the block does not say so"
 * reading; it left the other one alive, because absence from a list only informs a reader who
 * already holds the list. These arms pin the derivation — the flags with no value, taken from
 * the SAME canonical list the Inputs line renders, so a flag can never be listed on one line
 * and missing from both. The rendering is @SCN-RPT-028's markdown.test.ts arms; the persisted
 * line is its @integration arm.
 */
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

  it("counts an EMPTY value as absent — the same presence rule the Inputs list already applies", () => {
    const facts = projectProvenance(handed({ features: "features", ciSteps: "   ", packageJson: "" }));
    expect(facts.inputs.map((i) => i.flag)).toEqual(["--features"]);
    expect(facts.absentInputs).toContain("--ci-steps");
    expect(facts.absentInputs).toContain("--package-json");
  });

  it("is empty when the run was handed every canonical stream — there is nothing to report absent", () => {
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
    expect(facts.absentInputs).toEqual([]);
  });

  it("names every canonical flag when the run was handed nothing, so the empty-Inputs reading keeps its meaning", () => {
    const facts = projectProvenance(handed({}));
    expect(facts.inputs).toEqual([]);
    expect(facts.absentInputs).toEqual([
      "--features",
      "--vitest",
      "--cucumber",
      "--ci",
      "--package-json",
      "--ci-steps",
    ]);
  });

  it("adds NOTHING to the JSON provenance object — absence is derivable, so it is not persisted", () => {
    // GREEN BY DESIGN, and it is the pin for the half that must NOT move. provenance.ts's own
    // rule is persist a fact on JSON iff it is not derivable; `inputs` plus the canonical flag
    // list already fixes absence, so a second copy would agree with the first only until one of
    // them was edited. This arm reds the moment someone persists it.
    const obj = provenanceObject(handed({ features: "features" }));
    expect(Object.keys(obj)).toEqual([
      "target",
      "sourceSha",
      "toolSha",
      "toolVersion",
      "runTimestamp",
      "inputs",
    ]);
    expect(obj).not.toHaveProperty("absentInputs");
    expect(JSON.stringify(obj)).not.toContain("absent");
  });
});
