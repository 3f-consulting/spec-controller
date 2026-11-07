import { describe, it, expect, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

describe("[SCN-RMD-006] the summary's out-of-balance view groups each out-of-balance scenario under its feature, named by its code and feature file", () => {
  it("names each coded feature by its code and its file's path under the corpus, the coded scenario in a file with no code by its code alone, and that file's scenario with no @SCN by the file", () => {
    const dir = temporaryDirectory("scn-rmd-006-unit-");
    mkdirSync(join(dir, "features", "billing"), { recursive: true });
    writeFileSync(
      join(dir, "features", "config-vocabulary-lint.feature"),
      "@CVL\nFeature: config vocabulary lint\n\n  @unit @SCN-CVL-001\n  Scenario: coded\n"
    );
    writeFileSync(join(dir, "features", "billing", "checkout.feature"), "@CHK\nFeature: checkout\n\n  @unit @SCN-CHK-001\n  Scenario: nested\n");
    writeFileSync(join(dir, "features", "no-feature-code.feature"), "Feature: a feature file carrying no-feature-code\n\n  @unit @SCN-XYZ-001\n  Scenario: coded, in a file carrying no-feature-code\n\n  @unit\n  Scenario: carrying no @SCN\n");
    const { stdout } = runBalanceCaptured(["--features", join(dir, "features"), "--format", "json"]);
    const report = JSON.parse(stdout);
    expect(report.summary.outOfBalanceByFeature).toEqual([
      { feature: "CHK", featureFile: "billing/checkout.feature", count: 1, claims: ["SCN-CHK-001"] },
      { feature: "CVL", featureFile: "config-vocabulary-lint.feature", count: 1, claims: ["SCN-CVL-001"] },
      { feature: "XYZ", count: 1, claims: ["SCN-XYZ-001"] },
      { feature: "no-feature-code.feature", count: 1, claims: [], scenariosWithNoClaimCode: 1 },
    ]);
  });

  it("names each feature by the header code and its file however the header's tags are laid out, and takes no code from a comment", () => {
    const dir = temporaryDirectory("scn-rmd-006-header-");
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
    const named = (feature: string, featureFile?: string) => ({
      feature,
      ...(featureFile ? { featureFile } : {}),
      count: 1,
      claims: [],
      scenariosWithNoClaimCode: 1,
    });
    expect(JSON.parse(stdout).summary.outOfBalanceByFeature).toEqual(
      expect.arrayContaining([
        named("IND", "indented-feature.feature"),
        named("BLK", "blank-before-feature.feature"),
        named("TWO", "two-tag-lines.feature"),
        named("ITG", "indented-tags.feature"),
        named("comment-above-tags.feature"),
        named("trailing-comment.feature"),
      ])
    );
    expect(JSON.parse(stdout).summary.outOfBalanceByFeature).toHaveLength(6);
  });

  it("names each feature by its file read from the working directory's features/ when no directory is given", () => {
    const dir = temporaryDirectory("scn-rmd-006-cwd-");
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "default-corpus.feature"), "@DEF\nFeature: the default corpus\n\n  @unit\n  Scenario: one\n");
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
    try {
      const { stdout } = runBalanceCaptured(["--format", "json"]);
      expect(JSON.parse(stdout).summary.outOfBalanceByFeature).toEqual([
        { feature: "DEF", featureFile: "default-corpus.feature", count: 1, claims: [], scenariosWithNoClaimCode: 1 },
      ]);
    } finally {
      cwdSpy.mockRestore();
    }
  });
});
