import { beforeEach, describe, it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { runReconcile } from "../ingest/corpusReading.test-utils.js";
import { runBalance } from "../cli-balance/cli.js";
import { runBalanceCaptured } from "../../test-support/runBalance.js";
import { resolveSourceSha, resolveTargetRoot, resolveToolIdentity } from "./resolveRunInputs.js";

describe("[SCN-RPT-026] the tool names its own checkout's commit, and where it is not a git checkout names no commit and still names its version", () => {
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

  it("takes the version from the nearest package.json above the tool's directory when no path is given", () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tool-walk-")));
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "spec-controller", version: "4.5.6-above" }));
      const toolDir = join(root, "dist", "run-management");
      mkdirSync(toolDir, { recursive: true });

      const identity = resolveToolIdentity({ toolDir });

      expect(identity.toolSha).toBeNull();
      expect(identity.toolVersion).toBe("4.5.6-above");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    ["blank", { name: "spec-controller", version: "" }],
    ["a number", { name: "spec-controller", version: 7 }],
    ["absent", { name: "spec-controller" }],
  ])("resolves the version to \"unknown\" when the package.json version is %s", (_, pkg) => {
    const toolDir = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tool-badver-")));
    try {
      writeFileSync(join(toolDir, "package.json"), JSON.stringify(pkg));

      const identity = resolveToolIdentity({ toolDir });

      expect(identity.toolSha).toBeNull();
      expect(identity.toolVersion).toBe("unknown");
    } finally {
      rmSync(toolDir, { recursive: true, force: true });
    }
  });

  it("resolves the version to \"unknown\" when no package.json exists anywhere up to the filesystem root", () => {
    const toolDir = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tool-rootward-")));
    try {
      for (let dir = toolDir; ; dir = dirname(dir)) {
        expect(existsSync(join(dir, "package.json")), `fixture needs no package.json at ${dir}`).toBe(false);
        if (dirname(dir) === dir) break;
      }

      const identity = resolveToolIdentity({ toolDir });

      expect(identity.toolSha).toBeNull();
      expect(identity.toolVersion).toBe("unknown");
    } finally {
      rmSync(toolDir, { recursive: true, force: true });
    }
  });

  it("resolves a blank toolDir from the module's own location: this checkout's HEAD and its package's version", () => {
    const realHead = execFileSync("git", ["-C", process.cwd(), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const ownPackage = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
      version: string;
    };

    const identity = resolveToolIdentity({ toolDir: "  " });

    expect(identity.toolSha).toBe(realHead);
    expect(identity.toolVersion).toBe(ownPackage.version);
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
});

describe("[SCN-RPT-003] resolveSourceSha: an explicit override wins, a non-git target resolves to unknown", () => {
  function targetRepo(message = "the target's own commit"): { repo: string; head: string; cleanup: () => void } {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt003-")));
    const git = (...args: string[]): string =>
      execFileSync(
        "git",
        ["-C", repo, "-c", "user.email=fixture@example.invalid", "-c", "user.name=Fixture", ...args],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
    git("init", "-q");
    git("commit", "--allow-empty", "-q", "-m", message);
    return { repo, head: git("rev-parse", "HEAD"), cleanup: () => rmSync(repo, { recursive: true, force: true }) };
  }

  it("resolves a git target with no override to that target's own HEAD", () => {
    const { repo, head, cleanup } = targetRepo();
    try {
      expect(head).toMatch(/^[0-9a-f]{40}$/);
      expect(resolveSourceSha({ targetDir: repo })).toBe(head);
    } finally {
      cleanup();
    }
  });

  it("trims whitespace from an explicit override", () => {
    const { repo, cleanup } = targetRepo();
    try {
      const sha = "905a987c0ffeeba110000000000000000deadbeef";
      expect(resolveSourceSha({ sourceSha: `  ${sha}\n`, targetDir: repo })).toBe(sha);
    } finally {
      cleanup();
    }
  });

  it("treats a blank override as no override and reads the target's HEAD", () => {
    const { repo, head, cleanup } = targetRepo();
    try {
      expect(resolveSourceSha({ sourceSha: "   ", targetDir: repo })).toBe(head);
    } finally {
      cleanup();
    }
  });

  it.each([
    ["blank", { targetDir: "  " }],
    ["absent", {}],
  ])("reads the working directory's HEAD when the target directory is %s", (_, opts) => {
    const { repo, head, cleanup } = targetRepo();
    const realHead = execFileSync("git", ["-C", process.cwd(), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(repo);
    try {
      expect(head).not.toBe(realHead);
      expect(resolveSourceSha(opts)).toBe(head);
    } finally {
      cwd.mockRestore();
      cleanup();
    }
  });

  describe("runBalance's written JSON provenance", () => {
    let fixtureVitest: string;
    let fixturePackageJson: string;
    let fixtureFeatures: string;

    beforeEach(() => {
      fixtureVitest = resolve("tests/fixtures/balanced/vitest.json");
      fixturePackageJson = resolve("tests/fixtures/balanced/package.json");
      fixtureFeatures = resolve("tests/fixtures/balanced/features");
    });

    function plainDir(): { dir: string; cleanup: () => void } {
      const dir = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt003-plain-")));
      return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
    }

    function writtenSourceSha(target: string, cwd: string, extra: string[]): unknown {
      mkdirSync(join(target, "workflows"), { recursive: true });
      writeFileSync(join(target, "workflows", "ci.yml"), "jobs: {}\n");
      const reportPath = join(target, "spec-reconciliation.json");
      const savedExitCode = process.exitCode;
      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(cwd);
      try {
        runBalance([
          ...extra,
          "--vitest", fixtureVitest,
          "--package-json", fixturePackageJson,
          "--ci", join(target, "workflows"),
          "--format", `json:${reportPath}`,
        ]);
      } finally {
        cwdSpy.mockRestore();
        process.exitCode = savedExitCode;
      }
      return JSON.parse(readFileSync(reportPath, "utf8")).runProvenance.sourceSha;
    }

    function withFeatures(target: string): string[] {
      cpSync(fixtureFeatures, join(target, "features"), { recursive: true });
      return ["--features", join(target, "features")];
    }

    it("records the --features target's own commit, not the working directory's", () => {
      const target = targetRepo();
      const cwd = targetRepo("the working directory's commit");
      try {
        expect(target.head).not.toBe(cwd.head);
        expect(writtenSourceSha(target.repo, cwd.repo, withFeatures(target.repo))).toBe(target.head);
      } finally {
        cwd.cleanup();
        target.cleanup();
      }
    });

    it("records an explicit --source-sha over the target's own commit", () => {
      const target = targetRepo();
      const cwd = targetRepo("the working directory's commit");
      try {
        expect(
          writtenSourceSha(target.repo, cwd.repo, [...withFeatures(target.repo), "--source-sha", "abc123"]),
        ).toBe("abc123");
      } finally {
        cwd.cleanup();
        target.cleanup();
      }
    });

    it("records unknown for a --features target that is not a repository, given no override", () => {
      const target = plainDir();
      const cwd = targetRepo("the working directory's commit");
      try {
        expect(writtenSourceSha(target.dir, cwd.repo, withFeatures(target.dir))).toBeNull();
      } finally {
        cwd.cleanup();
        target.cleanup();
      }
    });

    it("records the working directory's commit when no --features is given", () => {
      const target = plainDir();
      const cwd = targetRepo("the working directory's commit");
      try {
        expect(writtenSourceSha(target.dir, cwd.repo, [])).toBe(cwd.head);
      } finally {
        cwd.cleanup();
        target.cleanup();
      }
    });
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

  it("resolves a blank --features to the working directory, not a root derived from the blank path", () => {
    const workDir = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-blank-")));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(workDir);
    try {
      expect(resolveTargetRoot({ features: "   " })).toBe(workDir);
    } finally {
      cwd.mockRestore();
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  it("reconciles a Vitest report's test files relative to the target's repository, not the working directory", () => {
    const target = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-reconcile-")));
    const foreign = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-foreign-")));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(foreign);
    try {
      execFileSync("git", ["-C", target, "init", "-q"], { stdio: "ignore" });
      writeFileSync(join(target, "package.json"), JSON.stringify({ name: "cross-repo-target", scripts: {} }));
      mkdirSync(join(target, "features"));
      writeFileSync(
        join(target, "features", "widget.feature"),
        "@WGT\nFeature: widget\n\n  @unit @SCN-WGT-001\n  Scenario: the widget is proven\n"
      );
      writeFileSync(
        join(target, "vitest.json"),
        JSON.stringify({
          testResults: [
            {
              name: join(target, "src", "widget.test.ts"),
              status: "passed",
              assertionResults: [
                {
                  ancestorTitles: ["[SCN-WGT-001] the widget is proven"],
                  fullName: "[SCN-WGT-001] the widget is proven works",
                  status: "passed",
                  title: "works",
                },
              ],
            },
          ],
        })
      );

      const balance = runReconcile({
        features: join(target, "features"),
        packageJson: join(target, "package.json"),
        ci: target,
        vitest: join(target, "vitest.json"),
      }, resolveTargetRoot({ features: join(target, "features") }));
      const scenario = balance.ledger.claimReconciliations.find((s) => s.scnId === "SCN-WGT-001");

      expect(scenario?.evidenceObservations).toEqual([
        { qualityCheck: "unit", scnId: "SCN-WGT-001", status: "passed", locator: "src/widget.test.ts", testName: "[SCN-WGT-001] the widget is proven works" },
      ]);
      expect(JSON.stringify(balance)).not.toContain(target);
    } finally {
      cwd.mockRestore();
      rmSync(target, { recursive: true, force: true });
      rmSync(foreign, { recursive: true, force: true });
    }
  });

  it.each([
    ["a directory under it by its relative path", (target: string) => join(target, "workflows"), "workflows"],
    ["the target root itself as \".\"", (target: string) => target, "."],
  ])("runBalance names a cross-repo run's inputs relative to the target's repository on both surfaces, never by the target's absolute path — an input naming %s", (_title, ciInput, ciRecorded) => {
    const target = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-balance-")));
    const foreign = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-balance-foreign-")));
    const fixture = resolve("tests/fixtures/balanced");
    const savedExitCode = process.exitCode;
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(foreign);
    try {
      execFileSync("git", ["-C", target, "init", "-q"], { stdio: "ignore" });
      cpSync(join(fixture, "features"), join(target, "features"), { recursive: true });
      cpSync(join(fixture, "vitest.json"), join(target, "vitest.json"));
      cpSync(join(fixture, "package.json"), join(target, "package.json"));
      mkdirSync(join(target, "workflows"));
      writeFileSync(join(target, "workflows", "ci.yml"), "jobs: {}\n");
      const reports = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-tgtroot-balance-out-")));
      try {
        const jsonPath = join(reports, "spec-reconciliation.json");
        const mdPath = join(reports, "spec-reconciliation.md");

        runBalance([
          "--features", join(target, "features"),
          "--vitest", join(target, "vitest.json"),
          "--package-json", join(target, "package.json"),
          "--ci", ciInput(target),
          "--format", `json:${jsonPath}`,
          "--format", `md:${mdPath}`,
        ]);

        const json = readFileSync(jsonPath, "utf8");
        const md = readFileSync(mdPath, "utf8");
        expect(JSON.parse(json).runProvenance.inputs).toEqual({
          features: "features",
          vitest: "vitest.json",
          packageJson: "package.json",
          ci: ciRecorded,
        });
        expect(json).not.toContain(target);
        expect(md).not.toContain(target);
      } finally {
        rmSync(reports, { recursive: true, force: true });
      }
    } finally {
      cwd.mockRestore();
      process.exitCode = savedExitCode;
      rmSync(target, { recursive: true, force: true });
      rmSync(foreign, { recursive: true, force: true });
    }
  });
});

describe("[SCN-RPT-001] a run with no --target names the target's git origin beside unknown-target", () => {
  function targetRepo(md: string): string | undefined {
    return md.split("\n").find((line) => line.startsWith("- Target repo:"));
  }

  function withCheckout(origin: string | null, use: (dir: string) => void): void {
    const dir = mkdtempSync(join(tmpdir(), "scn-rpt-001-unit-"));
    try {
      mkdirSync(join(dir, "features"));
      writeFileSync(join(dir, "features", "widget.feature"), "Feature: widget\n\n  Scenario: a widget\n    Given a widget\n");
      execFileSync("git", ["init", "-q", dir]);
      if (origin !== null) execFileSync("git", ["-C", dir, "remote", "add", "origin", origin]);
      use(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  function report(dir: string, extra: readonly string[] = []): { md: string; json: Record<string, unknown>; saved: string } {
    const saved = join(dir, "report.json");
    const md = runBalanceCaptured(["--features", join(dir, "features"), ...extra, "--format", "md", "--format", `json:${saved}`]).stdout;
    return { md, json: JSON.parse(readFileSync(saved, "utf8")).runProvenance, saved };
  }

  it("names the origin in the markdown and in the JSON, and a report rendered from that JSON reads the same", () => {
    withCheckout("https://github.com/ekino/veggies.git", (dir) => {
      const { md, json, saved } = report(dir);
      expect(targetRepo(md)).toBe("- Target repo: unknown-target (no --target given; origin is ekino/veggies)");
      expect({ target: json["target"], targetOrigin: json["targetOrigin"] }).toEqual({ target: "unknown-target", targetOrigin: "ekino/veggies" });
      expect(targetRepo(runBalanceCaptured(["--render-from-json", saved]).stdout)).toBe(targetRepo(md));
    });
  });

  it("reads unknown-target alone, with no origin in the JSON, when the target has no origin remote", () => {
    withCheckout(null, (dir) => {
      const { md, json } = report(dir);
      expect(targetRepo(md)).toBe("- Target repo: unknown-target");
      expect("targetOrigin" in json).toBe(false);
    });
  });

  it("reads the --target value alone, with no origin in the JSON, when --target is given", () => {
    withCheckout("git@github.com:ekino/veggies.git", (dir) => {
      const { md, json } = report(dir, ["--target", "veggies"]);
      expect(targetRepo(md)).toBe("- Target repo: veggies");
      expect("targetOrigin" in json).toBe(false);
    });
  });
});
