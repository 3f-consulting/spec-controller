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
 *
 * resolveToolIdentity carries two ids. @SCN-RPT-026 (3F-1916) is the original rule — the tool's own
 * dir, never cwd. @SCN-RPT-029 (3F-3418) is the trap that guard could not see: the tool's own dir
 * ITSELF sitting inside the target, which is every ordinary install. Its @integration arm
 * (tests/steps/toolIdentity.steps.ts) stands where a consumer stands; the two arms below hold the
 * DISCRIMINATOR, and they only hold it as a pair — arm 1 alone is satisfied by returning null
 * everywhere, which is the symmetric wrong answer.
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

describe("[SCN-RPT-029] resolveToolIdentity: a tool resolved out of node_modules has no SHA of its own, though the tree it sits in is a git repository", () => {
  /**
   * A git repository a consumer could plausibly be, with a real HEAD and a package.json at its
   * root — so both arms below walk up to the SAME version and neither can pass by finding none.
   */
  function consumerRepo(): { repo: string; head: string; cleanup: () => void } {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt029-")));
    writeFileSync(
      join(repo, "package.json"),
      JSON.stringify({ name: "a-consumer", version: "7.7.7-consumer" }),
    );
    const git = (...args: string[]): string =>
      execFileSync(
        "git",
        ["-C", repo, "-c", "user.email=fixture@example.invalid", "-c", "user.name=Fixture", ...args],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
    git("init", "-q");
    git("commit", "--allow-empty", "-q", "-m", "the consumer's own commit");
    return { repo, head: git("rev-parse", "HEAD"), cleanup: () => rmSync(repo, { recursive: true, force: true }) };
  }

  it("returns a NULL sha for a toolDir under node_modules even though git -C that dir DOES answer with the enclosing repository's HEAD", () => {
    const { repo, head, cleanup } = consumerRepo();
    try {
      const toolDir = join(repo, "node_modules", "spec-controller", "dist");
      mkdirSync(toolDir, { recursive: true });

      // THE ORDERING IS THE WHOLE OF THIS ARM'S TEETH. git really does answer here — it walks up
      // out of node_modules to the consumer's .git and hands back the consumer's commit, and being
      // .gitignored changes nothing. Without this line first, a null below is equally consistent
      // with the guard firing and with git having failed for some unrelated reason, and the arm
      // would keep passing if the guard were deleted on a machine with no git.
      const gitAnswers = execFileSync("git", ["-C", toolDir, "rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
      expect(gitAnswers).toBe(head);

      const identity = resolveToolIdentity({ toolDir });

      expect(identity.toolSha).toBeNull();
      // And a run with no SHA is still attributable by version.
      expect(identity.toolVersion).toBe("7.7.7-consumer");
    } finally {
      cleanup();
    }
  });

  it("still returns the real HEAD for a toolDir in the SAME repository that is not under node_modules", () => {
    const { repo, head, cleanup } = consumerRepo();
    try {
      // The development checkout, and the arm that reds on a fix answering null everywhere. The
      // symmetric failure 3F-3418 names is trading one wrong SHA for another, and nothing on a
      // rendered report would say which — so it is asserted positively rather than left to follow.
      const toolDir = join(repo, "packages", "spec-controller", "src");
      mkdirSync(toolDir, { recursive: true });

      const identity = resolveToolIdentity({ toolDir });

      expect(identity.toolSha).toBe(head);
      expect(identity.toolVersion).toBe("7.7.7-consumer");
    } finally {
      cleanup();
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
