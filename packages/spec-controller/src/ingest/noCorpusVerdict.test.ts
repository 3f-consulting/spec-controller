import { afterAll, describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMarkdown, type RunContext } from "@3f-consulting/spec-controller-core";

import { runReconcile } from "./ingestQualityChecks.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const CORPUS_DIR = "features";

interface Shape {
  shape: string;
  build: (root: string) => void;
}

const NO_CORPUS_DIRECTORY: Shape = { shape: "no corpus directory", build: () => {} };

const EMPTY_CORPUS: Shape = {
  shape: "an empty corpus",
  build: (root) => mkdirSync(join(root, CORPUS_DIR)),
};

const CORPUS_DECLARING_NOTHING: Shape = {
  shape: "a corpus declaring no scenario",
  build: (root) => {
    mkdirSync(join(root, CORPUS_DIR));
    writeFileSync(
      join(root, CORPUS_DIR, "target.feature"),
      "Feature: a corpus that declares nothing\n\n  Prose only. No scenario is declared in this file.\n"
    );
  },
};

function targetFor({ build }: Shape): string {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-018-${process.pid}-`));
  made.push(root);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "new-client-target", scripts: {} })
  );
  build(root);
  return root;
}

function verdictFor(target: Shape): string {
  const root = targetFor(target);
  const balance = runReconcile({
    features: join(root, CORPUS_DIR),
    packageJson: join(root, "package.json"),
    ci: root,
  });
  const ctx: RunContext = {
    target: root,
    inputs: {},
    runStart: new Date("2026-09-12T09:00:00.000Z"),
    sourceSha: null,
  };
  const line = renderMarkdown(balance, ctx).match(/^\*\*.+\*\* — .*\(exit \d+\)$/m)?.[0];
  expect(line, `expected a run-verdict headline for the target with ${target.shape}`).toBeTypeOf(
    "string"
  );
  return line ?? "";
}

describe("[SCN-CLI-018] absent, empty and scenario-less corpora are one answer, told by one sentence", () => {
  const absent = () => verdictFor(NO_CORPUS_DIRECTORY);

  it("has genuinely built the absent shape rather than an empty one", () => {
    expect(existsSync(join(targetFor(NO_CORPUS_DIRECTORY), CORPUS_DIR))).toBe(false);
  });

  it("tells a target whose corpus is empty exactly what it tells one with no corpus directory", () => {
    expect(verdictFor(EMPTY_CORPUS)).toBe(absent());
  });

  it("tells a target whose corpus declares no scenario the same thing again", () => {
    expect(verdictFor(CORPUS_DECLARING_NOTHING)).toBe(absent());
  });

  it("names the corpus directory it examined", () => {
    expect(absent()).toContain(CORPUS_DIR);
  });
});
