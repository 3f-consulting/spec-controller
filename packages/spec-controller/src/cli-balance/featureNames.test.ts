import { afterAll, describe, it, expect, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFeatureNames } from "../ingest/ingestQualityChecks.js";
import { runBalanceCaptured } from "../../test-support/runBalance.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-RMD-006] the published spec-reconciliation.json carries the feature titles under metadata, keyed by feature code", () => {
  it("names each coded feature file by its slug under metadata, omits the feature file with no code, and keeps no top-level featureNames", () => {
    const dir = mkdtempSync(join(tmpdir(), "scn-rmd-006-unit-"));
    made.push(dir);
    mkdirSync(join(dir, "features"));
    writeFileSync(
      join(dir, "features", "config-vocabulary-lint.feature"),
      "@CVL\nFeature: config vocabulary lint\n\n  @unit @SCN-CVL-001\n  Scenario: coded\n"
    );
    writeFileSync(join(dir, "features", "no-feature-code.feature"), "Feature: a feature file carrying no-feature-code\n\n  @unit @SCN-XYZ-001\n  Scenario: coded, in a file carrying no-feature-code\n");
    const { stdout } = runBalanceCaptured(["--features", join(dir, "features"), "--format", "json"]);
    const report = JSON.parse(stdout);
    expect([report.metadata?.featureNames, "featureNames" in report]).toEqual([{ CVL: "config-vocabulary-lint" }, false]);
  });

  it("keys each feature title by the header code however the header's tags are laid out, and takes no code from a comment", () => {
    const dir = mkdtempSync(join(tmpdir(), "scn-rmd-006-header-"));
    made.push(dir);
    const features = join(dir, "features");
    mkdirSync(features);
    const headers: Record<string, string> = {
      "indented-feature": "@IND\n  Feature: an indented Feature line\n",
      "blank-before-feature": "@BLK\n\nFeature: a blank line under the tags\n",
      "two-tag-lines": "@TWO\n@wip\nFeature: tags over two lines\n",
      "indented-tags": "  @ITG\nFeature: an indented tag line\n",
      "comment-above-tags": "# @OLD\n@wip\nFeature: a comment ends the header\n",
      "trailing-comment": "@wip # TODO\nFeature: a trailing comment on the tag line\n",
    };
    for (const [slug, header] of Object.entries(headers)) {
      writeFileSync(join(features, `${slug}.feature`), `${header}\n  @unit\n  Scenario: one\n`);
    }
    const { stdout } = runBalanceCaptured(["--features", features, "--format", "json"]);
    expect(JSON.parse(stdout).metadata?.featureNames).toEqual({
      IND: "indented-feature",
      BLK: "blank-before-feature",
      TWO: "two-tag-lines",
      ITG: "indented-tags",
    });
  });

  it("reads the feature titles from the working directory's features/ when no directory is given", () => {
    const dir = mkdtempSync(join(tmpdir(), "scn-rmd-006-cwd-"));
    made.push(dir);
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "default-corpus.feature"), "@DEF\nFeature: the default corpus\n");
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
    try {
      expect(Object.fromEntries(readFeatureNames())).toEqual({ DEF: "default-corpus" });
    } finally {
      cwdSpy.mockRestore();
    }
  });
});
