import { describe, it, expect } from "vitest";
import { projectProvenance, renderJson, type RunContext } from "@3f-consulting/spec-controller-core";
import { runInputsOf, type InputPaths } from "./evidenceInputs.js";
import { reRender } from "./reRender.js";
import { runReconcile } from "../ingest/corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

const handed = (paths: InputPaths): RunContext => ({
  target: "partly-handed-target",
  inputs: runInputsOf(paths),
  corpus: "features",
  runStart: new Date("2026-09-06T15:30:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
});

describe("[CLM-RPT-028] a run names the canonical inputs it did not receive, in the canonical order", () => {
  it("names the canonical flags with no value, in canonical order", () => {
    const facts = projectProvenance(handed({ features: "features", ciSteps: "ci-steps.json" }));

    expect(facts.absentInputs).toEqual(["--vitest", "--pytest", "--jest", "--junit", "--rspec", "--cucumber", "--ci", "--package-json"]);
  });

  it("names them on the same line when the report is rendered again from its saved JSON", () => {
    const features = "tests/fixtures/balanced/features";
    const saved = renderJson(
      runReconcile({ features }, resolveTargetRoot({ features })),
      handed({ features: "features", ciSteps: "ci-steps.json" }),
    );

    expect(reRender(JSON.parse(saved), false).markdown.split("\n").filter((line) => line.startsWith("- Not supplied:"))).toEqual([
      "- Not supplied: `--vitest`, `--pytest`, `--jest`, `--junit`, `--rspec`, `--cucumber`, `--ci`, `--package-json`",
    ]);
  });
});
