/**
 * Unit tests for resolveSourceSha (@SCN-RPT-003) and resolveTargetRoot
 * (@SCN-RPT-016) — the impure git-derived run-input resolution split out of
 * runContext.ts.
 *
 * Bidirectional evidence (Evidence Manifesto §9 / the discipline): the
 * describe/it strings carry the @SCN-RPT-003 / @SCN-RPT-016 ids matching
 * features/report.feature, so a grep of an id returns both halves of the pair.
 *
 * resolveSourceSha (project design §4), proven in isolation — @unit-only, no integration
 * arm: the CLI-flag → ctx → rendered-header thread is already proven by RPT-001's
 * integration arm:
 *   (a) an explicit non-empty source SHA wins over the git read — returned verbatim even
 *       when targetDir IS a git repository;
 *   (b) over a non-git target directory with no override, `git rev-parse HEAD` cannot
 *       answer, so the SHA resolves to a recorded null ("unknown") rather than crashing.
 *
 * resolveTargetRoot (@SCN-RPT-016) derives the portable-path root from the TARGET —
 * INDEPENDENT of the run cwd: a non-git target → dirname(--features); a git target → the
 * git top-level of dirname(--features); no --features → process.cwd() (the fallback).
 */

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { resolveSourceSha, resolveTargetRoot, resolveToolIdentity } from "./resolveRunInputs.js";

describe("[SCN-RPT-026] resolveToolIdentity: the tool's own checkout, and a non-git install resolves the SHA to null", () => {
  it("reads the TOOL's own repo HEAD (via -C toolDir, never cwd) with the version present, when run from the checkout", () => {
    // The dogfood case (3F-1916). process.cwd() is spec-controller's own checkout — a real
    // git repo. The resolver reads its HEAD via `git -C toolDir`, so pointing toolDir at
    // the repo yields the repo's real HEAD. The `-C toolDir` is load-bearing: at run time
    // cwd is the TARGET, and reading cwd would re-record the target's SHA — the very bug.
    const toolDir = process.cwd();
    const realHead = execFileSync("git", ["-C", toolDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    const identity = resolveToolIdentity({ toolDir });

    expect(identity.toolSha).toBe(realHead);
    // The version is read from the tool's own package.json (walked up from toolDir) — always
    // a non-empty string when the tool is a real package.
    expect(typeof identity.toolVersion).toBe("string");
    expect(identity.toolVersion).not.toBe("");
  });

  it("falls back to a NULL sha with the version still present when the tool is not a git checkout", () => {
    // The released-install case: a directory with no .git. The git read throws, so the SHA
    // resolves to null (not a crash) — and the version, read from a package.json, is STILL
    // present, so a run stays attributable by version even with no SHA.
    const nonGitDir = mkdtempSync(join(tmpdir(), "spec-controller-tool-nogit-"));
    const pkgPath = join(nonGitDir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({ name: "spec-controller", version: "9.9.9-fixture" }));
    try {
      const identity = resolveToolIdentity({ toolDir: nonGitDir, packageJsonPath: pkgPath });

      expect(identity.toolSha).toBeNull();
      expect(identity.toolVersion).toBe("9.9.9-fixture");
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true });
    }
  });

  it("resolves the version to \"unknown\" when no package.json can be found (never crashes)", () => {
    // The degenerate case: no git AND no readable package.json. Both facts fail soft — a
    // null SHA and an "unknown" version — rather than throwing mid-run.
    const bareDir = mkdtempSync(join(tmpdir(), "spec-controller-tool-bare-"));
    try {
      const identity = resolveToolIdentity({ toolDir: bareDir, packageJsonPath: join(bareDir, "does-not-exist.json") });

      expect(identity.toolSha).toBeNull();
      expect(identity.toolVersion).toBe("unknown");
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });
});

describe("[SCN-RPT-003] resolveSourceSha: an explicit override wins, a non-git target resolves to unknown", () => {
  it("returns an explicit source SHA verbatim, overriding the git HEAD of a real git target", () => {
    // process.cwd() is the tool's own checkout — itself a real git repository with
    // a real HEAD. The override must win regardless: the git read is not consulted.
    const gitTargetDir = process.cwd();
    const headOfTarget = execFileSync("git", ["-C", gitTargetDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const override = "905a987c0ffeeba110000000000000000deadbeef";

    // The override differs from the target's real HEAD, so returning it proves the
    // override branch fired — not the git read.
    expect(override).not.toBe(headOfTarget);
    expect(resolveSourceSha({ sourceSha: override, targetDir: gitTargetDir })).toBe(override);
  });

  it("resolves to null over a non-git target directory with no override", () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), "spec-controller-sha-"));
    try {
      // No sourceSha override; the directory has no .git, so `git rev-parse HEAD`
      // throws and the rule records the SHA as null ("unknown") rather than crashing.
      expect(resolveSourceSha({ targetDir: nonGitDir })).toBeNull();
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true });
    }
  });
});

describe("[SCN-RPT-016] resolveTargetRoot derives the target repo root from --features, independent of the run cwd", () => {
  it("derives a non-git target's root as dirname(--features), NOT the run cwd", () => {
    const targetRepo = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-")));
    try {
      const features = join(targetRepo, "features");
      const root = resolveTargetRoot({ features });
      // The load-bearing assertion: the root is the TARGET's dir, not the tool's cwd.
      expect(root).toBe(targetRepo);
      expect(root).not.toBe(process.cwd());
    } finally {
      rmSync(targetRepo, { recursive: true, force: true });
    }
  });

  it("derives a git target's root as the git top-level of dirname(--features)", () => {
    const targetRepo = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-git-")));
    try {
      execFileSync("git", ["-C", targetRepo, "init", "-q"], { stdio: "ignore" });
      // --features sits in a NESTED dir; the git top-level must still be the repo root.
      mkdirSync(join(targetRepo, "spec", "features"), { recursive: true });
      const features = join(targetRepo, "spec", "features");
      const root = resolveTargetRoot({ features });
      expect(realpathSync(root)).toBe(targetRepo);
      expect(root).not.toBe(dirname(features));
    } finally {
      rmSync(targetRepo, { recursive: true, force: true });
    }
  });

  it("falls back to process.cwd() for a self-reconcile with no --features", () => {
    expect(resolveTargetRoot({})).toBe(process.cwd());
  });
});
