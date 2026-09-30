import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { resolveSourceSha, resolveTargetRoot, resolveToolIdentity } from "./resolveRunInputs.js";

describe("[SCN-RPT-026] resolveToolIdentity: the tool's own checkout, and a non-git install resolves the SHA to null", () => {
  it("reads the TOOL's own repo HEAD (via -C toolDir, never cwd) with the version present, when run from the checkout", () => {
    const toolDir = process.cwd();
    const realHead = execFileSync("git", ["-C", toolDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    const identity = resolveToolIdentity({ toolDir });

    expect(identity.toolSha).toBe(realHead);
    expect(typeof identity.toolVersion).toBe("string");
    expect(identity.toolVersion).not.toBe("");
  });

  it("falls back to a NULL sha with the version still present when the tool is not a git checkout", () => {
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

      const gitAnswers = execFileSync("git", ["-C", toolDir, "rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
      expect(gitAnswers).toBe(head);

      const identity = resolveToolIdentity({ toolDir });

      expect(identity.toolSha).toBeNull();
      expect(identity.toolVersion).toBe("7.7.7-consumer");
    } finally {
      cleanup();
    }
  });

  it("still returns the real HEAD for a toolDir in the SAME repository that is not under node_modules", () => {
    const { repo, head, cleanup } = consumerRepo();
    try {
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
    const gitTargetDir = process.cwd();
    const headOfTarget = execFileSync("git", ["-C", gitTargetDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const override = "905a987c0ffeeba110000000000000000deadbeef";

    expect(override).not.toBe(headOfTarget);
    expect(resolveSourceSha({ sourceSha: override, targetDir: gitTargetDir })).toBe(override);
  });

  it("resolves to null over a non-git target directory with no override", () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), "spec-controller-sha-"));
    try {
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
