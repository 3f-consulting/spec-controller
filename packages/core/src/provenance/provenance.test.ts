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
