import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { renderMarkdown, type RunContext } from "@3f-consulting/spec-controller-core";

import { CORPUS_DIR, EMPTY_CORPUS, targetIn, type Shape } from "./corpusFixtures.test-utils.js";
import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { DEFAULT_FEATURES_DIR } from "../defaultCorpus.js";
import { runInputsOf } from "../cli-balance/evidenceInputs.js";
import { reportedExitCodeOf } from "../cli-balance/exitStatus.js";

const NO_CORPUS_DIRECTORY: Shape = { shape: "no corpus directory", build: () => {} };

function verdictFor(target: Shape): string {
  const root = targetIn(target);
  const balance = runReconcile({
    features: join(root, CORPUS_DIR),
    packageJson: join(root, "package.json"),
    ci: root,
  }, resolveTargetRoot({ features: join(root, CORPUS_DIR) }));
  const ctx: RunContext = {
    target: root,
    inputs: runInputsOf({}),
    corpus: DEFAULT_FEATURES_DIR,
    runStart: new Date("2026-09-12T09:00:00.000Z"),
    sourceSha: null,
  };
  const line = renderMarkdown(balance, ctx, reportedExitCodeOf).match(/^\*\*.+\*\* — .*\(exit \d+\)$/m)?.[0];
  expect(line, `expected a run-verdict headline for the target with ${target.shape}`).toBeTypeOf(
    "string"
  );
  return line ?? "";
}

describe("[SCN-CLI-018] absent, empty and scenario-less corpora are one answer, told by one sentence", () => {
  const absent = () => verdictFor(NO_CORPUS_DIRECTORY);

  it("tells a target whose corpus is empty exactly what it tells one with no corpus directory", () => {
    expect(verdictFor(EMPTY_CORPUS)).toBe(absent());
  });

  it("names the corpus directory it examined", () => {
    expect(absent()).toContain(CORPUS_DIR);
  });
});
