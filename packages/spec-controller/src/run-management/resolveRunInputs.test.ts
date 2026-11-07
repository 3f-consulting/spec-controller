import { beforeEach, describe, it, expect, vi } from "vitest";
import { CoreMessage, observationsOf, coreMessage } from "@3f-consulting/spec-controller-core/internal";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { runReconcile } from "../ingest/corpusReading.test-utils.js";
import { runReconcile as reconcileReadInputs } from "../ingest/ingestQualityChecks.js";
import { runBalance, runContextOf } from "../cli-balance/cli.js";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { renderJson, renderMarkdown, type EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { inputPathsOf } from "../cli-balance/evidenceInputs.js";
import { reportedExitCodeOf } from "../cli-balance/exitStatus.js";
import { reRender } from "../cli-balance/reRender.js";
import { resolveSourceSha, resolveTargetOrigin, resolveTargetRoot, resolveToolIdentity } from "./resolveRunInputs.js";
import { temporaryDirectory, test } from "../temporaryDirectory.test-utils.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

function committedRepo(prefix: string, message: string): { repo: string; head: string } {
  const repo = realpathSync(temporaryDirectory(prefix));
  const git = (...args: string[]): string =>
    execFileSync(
      "git",
      ["-C", repo, "-c", "user.email=fixture@example.invalid", "-c", "user.name=Fixture", ...args],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  git("init", "-q");
  git("commit", "--allow-empty", "-q", "-m", message);
  return { repo, head: git("rev-parse", "HEAD") };
}

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
    const nonGitDir = temporaryDirectory("spec-controller-tool-nogit-");
    const pkgPath = join(nonGitDir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({ name: "spec-controller", version: "9.9.9-fixture" }));
    const identity = resolveToolIdentity({ toolDir: nonGitDir, packageJsonPath: pkgPath });

    expect(identity.toolSha).toBeNull();
    expect(identity.toolVersion).toBe("9.9.9-fixture");
  });

  it("resolves the version to \"unknown\" when no package.json can be found (never crashes)", () => {
    const bareDir = temporaryDirectory("spec-controller-tool-bare-");
    const identity = resolveToolIdentity({ toolDir: bareDir, packageJsonPath: join(bareDir, "does-not-exist.json") });

    expect(identity.toolSha).toBeNull();
    expect(identity.toolVersion).toBe("unknown");
  });

  it("takes the version from the nearest package.json above the tool's directory when no path is given", () => {
    const root = realpathSync(temporaryDirectory("spec-controller-tool-walk-"));
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "spec-controller", version: "4.5.6-above" }));
    const toolDir = join(root, "dist", "run-management");
    mkdirSync(toolDir, { recursive: true });

    const identity = resolveToolIdentity({ toolDir });

    expect(identity.toolSha).toBeNull();
    expect(identity.toolVersion).toBe("4.5.6-above");
  });

  it.each([
    ["blank", { name: "spec-controller", version: "" }],
    ["absent", { name: "spec-controller" }],
  ])("resolves the version to \"unknown\" when the package.json version is %s", (_, pkg) => {
    const toolDir = realpathSync(temporaryDirectory("spec-controller-tool-badver-"));
    writeFileSync(join(toolDir, "package.json"), JSON.stringify(pkg));

    const identity = resolveToolIdentity({ toolDir });

    expect(identity.toolSha).toBeNull();
    expect(identity.toolVersion).toBe("unknown");
  });

  it("resolves the version to \"unknown\" when no package.json exists anywhere up to the filesystem root", () => {
    const toolDir = realpathSync(temporaryDirectory("spec-controller-tool-rootward-"));
    for (let dir = toolDir; ; dir = dirname(dir)) {
      expect(existsSync(join(dir, "package.json")), `fixture needs no package.json at ${dir}`).toBe(false);
      if (dirname(dir) === dir) break;
    }

    const identity = resolveToolIdentity({ toolDir });

    expect(identity.toolSha).toBeNull();
    expect(identity.toolVersion).toBe("unknown");
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
  function consumerRepo(): { repo: string; head: string } {
    const committed = committedRepo("spec-controller-rpt029-", "the consumer's own commit");
    writeFileSync(
      join(committed.repo, "package.json"),
      JSON.stringify({ name: "a-consumer", version: "7.7.7-consumer" }),
    );
    return committed;
  }

  it("returns a NULL sha for a toolDir under node_modules even though git -C that dir DOES answer with the enclosing repository's HEAD", () => {
    const { repo, head } = consumerRepo();
    const toolDir = join(repo, "node_modules", "spec-controller", "dist");
    mkdirSync(toolDir, { recursive: true });

    const gitAnswers = execFileSync("git", ["-C", toolDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    expect(gitAnswers).toBe(head);

    const identity = resolveToolIdentity({ toolDir });

    expect(identity.toolSha).toBeNull();
    expect(identity.toolVersion).toBe("7.7.7-consumer");
  });
});

describe("[SCN-RPT-003] resolveSourceSha: an explicit override wins, a non-git target resolves to unknown", () => {
  function targetRepo(message = "the target's own commit"): { repo: string; head: string } {
    return committedRepo("spec-controller-rpt003-", message);
  }

  it("resolves a git target with no override to that target's own HEAD", () => {
    const { repo, head } = targetRepo();
    expect(head).toMatch(/^[0-9a-f]{40}$/);
    expect(resolveSourceSha({ targetDir: repo })).toBe(head);
  });

  it("trims whitespace from an explicit override", () => {
    const { repo } = targetRepo();
    const sha = "905a987c0ffeeba110000000000000000deadbeef";
    expect(resolveSourceSha({ sourceSha: `  ${sha}\n`, targetDir: repo })).toBe(sha);
  });

  it("treats a blank override as no override and reads the target's HEAD", () => {
    const { repo, head } = targetRepo();
    expect(resolveSourceSha({ sourceSha: "   ", targetDir: repo })).toBe(head);
  });

  it.each([
    ["blank", { targetDir: "  " }],
    ["absent", {}],
  ])("reads the working directory's HEAD when the target directory is %s", (_, opts) => {
    const { repo, head } = targetRepo();
    const realHead = execFileSync("git", ["-C", process.cwd(), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(repo);
    try {
      expect(head).not.toBe(realHead);
      expect(resolveSourceSha(opts)).toBe(head);
    } finally {
      cwd.mockRestore();
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

    function plainDir(): { dir: string } {
      const dir = realpathSync(temporaryDirectory("spec-controller-rpt003-plain-"));
      return { dir };
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
      expect(target.head).not.toBe(cwd.head);
      expect(writtenSourceSha(target.repo, cwd.repo, withFeatures(target.repo))).toBe(target.head);
    });

    it("records an explicit --source-sha over the target's own commit", () => {
      const target = targetRepo();
      const cwd = targetRepo("the working directory's commit");
      expect(
        writtenSourceSha(target.repo, cwd.repo, [...withFeatures(target.repo), "--source-sha", "abc123"]),
      ).toBe("abc123");
    });

    it("records unknown for a --features target that is not a repository, given no override", () => {
      const target = plainDir();
      const cwd = targetRepo("the working directory's commit");
      expect(writtenSourceSha(target.dir, cwd.repo, withFeatures(target.dir))).toBeNull();
    });

    it("records the working directory's commit when no --features is given", () => {
      const target = plainDir();
      const cwd = targetRepo("the working directory's commit");
      expect(writtenSourceSha(target.dir, cwd.repo, [])).toBe(cwd.head);
    });
  });
});

describe("[SCN-RPT-016] resolveTargetRoot derives the target repo root from --features, independent of the run cwd", () => {
  it("derives a non-git target's root as dirname(--features), NOT the run cwd", () => {
    const targetRepo = realpathSync(temporaryDirectory("spec-controller-tgtroot-"));
    const features = join(targetRepo, "features");
    const root = resolveTargetRoot({ features });
    expect(root).toBe(targetRepo);
    expect(root).not.toBe(process.cwd());
  });

  it("derives a git target's root as the git top-level of dirname(--features)", () => {
    const targetRepo = realpathSync(temporaryDirectory("spec-controller-tgtroot-git-"));
    execFileSync("git", ["-C", targetRepo, "init", "-q"], { stdio: "ignore" });
    mkdirSync(join(targetRepo, "spec", "features"), { recursive: true });
    const features = join(targetRepo, "spec", "features");
    const root = resolveTargetRoot({ features });
    expect(realpathSync(root)).toBe(targetRepo);
    expect(root).not.toBe(dirname(features));
  });

  it("resolves a blank --features to the working directory, not a root derived from the blank path", () => {
    const workDir = realpathSync(temporaryDirectory("spec-controller-tgtroot-blank-"));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(workDir);
    try {
      expect(resolveTargetRoot({ features: "   " })).toBe(workDir);
    } finally {
      cwd.mockRestore();
    }
  });

  it("reconciles a Vitest report's test files relative to the target's repository, not the working directory", () => {
    const target = realpathSync(temporaryDirectory("spec-controller-tgtroot-reconcile-"));
    const foreign = realpathSync(temporaryDirectory("spec-controller-tgtroot-foreign-"));
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
      const scenario = balance.ledger.claimReconciliations.find((s) => s.claim === "SCN-WGT-001");

      expect(observationsOf(scenario!).map(postedOf)).toEqual([
        { qualityCheckKind: "unit", claimCode: "SCN-WGT-001", status: "passed", locator: "src/widget.test.ts", testName: "[SCN-WGT-001] the widget is proven works" },
      ]);
      expect(JSON.stringify(balance)).not.toContain(target);
    } finally {
      cwd.mockRestore();
    }
  });

  it.each([
    ["a directory under it by its relative path", (target: string) => join(target, "workflows"), "workflows"],
    ["the target root itself as \".\"", (target: string) => target, "."],
  ])("runBalance names a cross-repo run's inputs relative to the target's repository on both surfaces, never by the target's absolute path — an input naming %s", (_title, ciInput, ciRecorded) => {
    const target = realpathSync(temporaryDirectory("spec-controller-tgtroot-balance-"));
    const foreign = realpathSync(temporaryDirectory("spec-controller-tgtroot-balance-foreign-"));
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
      const reports = realpathSync(temporaryDirectory("spec-controller-tgtroot-balance-out-"));
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
      cwd.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});

describe("[SCN-RPT-001] a run with no --target names the target's git origin beside unknown-target", () => {
  function targetRepo(md: string): string | undefined {
    return md.split("\n").find((line) => line.startsWith("- Target repo:"));
  }

  // A whole balance run under the mutation runner's per-test coverage takes longer than Vitest's default limit.
  const wholeRun = { timeout: 30_000 };

  function withCheckout(origin: string | null, use: (dir: string) => void): void {
    const dir = temporaryDirectory("scn-rpt-001-unit-");
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "widget.feature"), "Feature: widget\n\n  Scenario: a widget\n    Given a widget\n");
    execFileSync("git", ["init", "-q", dir]);
    if (origin !== null) execFileSync("git", ["-C", dir, "remote", "add", "origin", origin]);
    use(dir);
  }

  function report(dir: string, extra: readonly string[] = []): { md: string; json: Record<string, unknown>; saved: string } {
    const saved = join(dir, "report.json");
    const md = runBalanceCaptured(["--features", join(dir, "features"), ...extra, "--format", "md", "--format", `json:${saved}`]).stdout;
    return { md, json: JSON.parse(readFileSync(saved, "utf8")).runProvenance, saved };
  }

  // One checkout serves every row, each row setting its origin's URL: a checkout per row costs more than a unit test may take.
  // The origin's name is the only text a remote puts into the report, so most rows read the name from the reader, and a few
  // run the context balance assembles through the report's renderers. The header is all those rows read, so the report
  // renders an empty reconciliation.
  function checkoutIn(dir: string): string {
    if (!existsSync(join(dir, ".git"))) execFileSync("git", ["init", "-q", dir]);
    return dir;
  }

  function withOrigin(sharedDirectory: string, origin: string, use: (dir: string, root: string, balance: EvidenceReconciliation) => void): void {
    const dir = checkoutIn(sharedDirectory);
    execFileSync("git", ["-C", dir, "config", "remote.origin.url", origin]);
    use(dir, resolveTargetRoot({ features: join(dir, "features") }), reconcileReadInputs([], dir, [], []));
  }

  // The run's context as balance assembles it with no --target, rendered by the report's own renderers. The root is the
  // checkout's.
  // The checkout's path, as created and as resolved, and the tool's own commit are run facts the remote does not supply, so a
  // leak is read with them removed.
  function reportOf(dir: string, root: string, balance: EvidenceReconciliation): { md: string; json: string; rerendered: string; leaked: (secret: string) => string | undefined } {
    const args = { features: join(dir, "features") };
    const ctx = runContextOf(args, inputPathsOf(args), new Date("2026-10-22T09:00:00.000Z"), root);
    const json = renderJson(balance, ctx);
    const md = renderMarkdown(balance, ctx, reportedExitCodeOf);
    const rerendered = reRender(JSON.parse(json), false).markdown;
    const runFacts = [realpathSync(dir), dir, ctx.toolSha].filter((fact): fact is string => typeof fact === "string" && fact !== "");
    const surfaces = { markdown: md, JSON: json, "re-render": rerendered };
    const leaked = (secret: string): string | undefined =>
      Object.entries(surfaces).find(([, text]) => runFacts.reduce((t, fact) => t.replaceAll(fact, ""), text).includes(secret))?.[0];
    return { md, json, rerendered, leaked };
  }

  function nameOf(sharedDirectory: string, origin: string): string | null {
    const dir = checkoutIn(sharedDirectory);
    execFileSync("git", ["-C", dir, "config", "remote.origin.url", origin]);
    return resolveTargetOrigin(dir);
  }

  function namedOrigin(json: string): unknown {
    return (JSON.parse(json) as { runProvenance: { targetOrigin?: unknown } }).runProvenance.targetOrigin;
  }

  test.for<[string, string, string[]]>([
    ["https://github.com/ekino/veggies.git", "ekino/veggies", []],
    ["https://github.com/ekino/veggies", "ekino/veggies", []],
    ["ssh://git@github.com/ekino/veggies.git", "ekino/veggies", ["git@"]],
    ["ssh://git@github.com:22/ekino/veggies", "ekino/veggies", ["git@"]],
    ["git@github.com:ekino/veggies.git", "ekino/veggies", ["git@"]],
    ["git@github.com:ekino/veggies", "ekino/veggies", ["git@"]],
    ["/srv/git/veggies.git", "/srv/git/veggies.git", []],
    ["file:///srv/git/veggies.git", "file:///srv/git/veggies.git", []],
    ["https://github.com/veggies.git", "https://github.com/veggies.git", []],
    ["http://deploy:s3cret@git.example.com/ekino/veggies", "http://git.example.com/ekino/veggies", ["deploy", "s3cret"]],
    ["https://x-token:s3cret@github.com/veggies.git", "https://github.com/veggies.git", ["x-token", "s3cret"]],
    ["https://gitlab.com/ekino/greens/veggies.git", "greens/veggies", []],
    ["git+ssh://git@github.com/ekino/veggies.git", "git+ssh://github.com/ekino/veggies.git", ["git@"]],
    ["http://deploy@git.example.com:8080/ekino/veggies", "http://git.example.com:8080/ekino/veggies", ["deploy"]],
    ["https://x-token:s3cret@github.com/ekino/veggies.git", "ekino/veggies", ["x-token", "s3cret"]],
    ["https://deploy@github.com/ekino/veggies.git", "ekino/veggies", ["deploy"]],
    ["https://deploy:p@ss@github.com/ekino/veggies.git", "ekino/veggies", ["deploy", "p@ss", "ss@"]],
    ["https://host/ekino/veggies.git?private_token=abc", "ekino/veggies", ["private_token", "abc"]],
    ["https://github.com/ekino/veggies.git#s3cret", "ekino/veggies", ["s3cret"]],
    ["https://deploy:p@ss@github.com/ekino/veggies.git?private_token=abc#s3cret", "ekino/veggies", ["deploy", "p@ss", "ss@", "private_token", "abc", "s3cret"]],
    ["ssh://deploy:s3cret@host/ekino/veggies.git", "ekino/veggies", ["deploy", "s3cret"]],
    ["ssh://deploy:p@ss@host/ekino/veggies.git", "ekino/veggies", ["deploy", "p@ss", "ss@"]],
    ["ssh://host/ekino/veggies.git?private_token=abc", "ekino/veggies", ["private_token", "abc"]],
    ["ssh://host/ekino/veggies.git#s3cret", "ekino/veggies", ["s3cret"]],
    ["deploy:s3cret@host:ekino/veggies.git", "ekino/veggies", ["deploy", "s3cret"]],
    ["deploy:p@ss@host:ekino/veggies.git", "ekino/veggies", ["deploy", "p@ss", "ss@"]],
    ["deploy@host:ekino/veggies.git?private_token=abc", "ekino/veggies", ["deploy", "private_token", "abc"]],
    ["deploy@host:ekino/veggies.git#s3cret", "ekino/veggies", ["deploy", "s3cret"]],
    ["deploy@host:veggies.git", "host:veggies.git", ["deploy"]],
    ["deploy:s3cret@host:veggies.git", "host:veggies.git", ["deploy", "s3cret"]],
    ["https://deploy@github.com/veggies.git", "https://github.com/veggies.git", ["deploy"]],
    ["https://deploy:p@ss@github.com/veggies.git", "https://github.com/veggies.git", ["deploy", "p@ss", "ss@"]],
    ["https://github.com/veggies.git?private_token=abc", "https://github.com/veggies.git", ["private_token", "abc"]],
    ["https://github.com/veggies.git#s3cret", "https://github.com/veggies.git", ["s3cret"]],
    ["http://deploy:p@ss@git.example.com/ekino/veggies", "http://git.example.com/ekino/veggies", ["deploy", "p@ss", "ss@"]],
    ["http://git.example.com/ekino/veggies?private_token=abc", "http://git.example.com/ekino/veggies", ["private_token", "abc"]],
    ["git+ssh://deploy:p@ss@host/ekino/veggies.git?private_token=abc#s3cret", "git+ssh://host/ekino/veggies.git", ["deploy", "p@ss", "ss@", "private_token", "abc", "s3cret"]],
    ["host:ekino/veggies.git?private_token=abc", "host:ekino/veggies.git", ["private_token", "abc"]],
    ["persistent-https::https://deploy:s3cret@host/ekino/veggies.git", "persistent-https::https://host/ekino/veggies.git", ["deploy", "s3cret"]],
    ["persistent-https::https://deploy:p@ss@host/ekino/veggies.git?private_token=abc#s3cret", "persistent-https::https://host/ekino/veggies.git", ["deploy", "p@ss", "ss@", "private_token", "abc", "s3cret"]],
    ["/srv/git/veggies@2024:archive.git", "/srv/git/veggies@2024:archive.git", []],
  ])("names the target's origin %s as %s, and none of %j reaches the name", ([origin, shown, secrets], { sharedDirectory }) => {
    const named = nameOf(sharedDirectory, origin);
    for (const secret of secrets) expect(named, `${secret} reached the name`).not.toContain(secret);
    expect(named).not.toMatch(/[?#]/);
    expect(named).toBe(shown);
  });

  const everyDelimiter = ["@", ":", "/", "?", "#", "%40", " ", "&", "="];
  describe.each([
    ["https://usrK7:{password}@github.com/ekino/veggies.git", "ekino/veggies", ["/", "?", "#"]],
    ["https://usrK7:{password}@github.com/veggies.git", "https://github.com/veggies.git", ["/", "?", "#"]],
    ["http://usrK7:{password}@git.example.com:8080/ekino/veggies", "http://git.example.com:8080/ekino/veggies", ["/", "?", "#"]],
    ["ssh://usrK7:{password}@host/ekino/veggies.git", "ekino/veggies", ["/", "?", "#"]],
    ["git+ssh://usrK7:{password}@host/ekino/veggies.git", "git+ssh://host/ekino/veggies.git", ["/", "?", "#"]],
    ["persistent-https::https://usrK7:{password}@host/ekino/veggies.git", "persistent-https::https://host/ekino/veggies.git", ["/", "?", "#"]],
    ["usrK7:{password}@host:ekino/veggies.git", "ekino/veggies", []],
    ["usrK7:{password}@host:veggies.git", "host:veggies.git", []],
    ["https://usrK7:{password}@github.com/ekino/veggies.git?private_token=Tk3#Fr4", "ekino/veggies", ["/", "?", "#"]],
  ])("a remote of the form %s, named %s unless its password holds one of %j", (form, shown, unread) => {
    test.for(everyDelimiter)("with %j in its password, names what it reads and puts no part of its user, password or token in the name", (delimiter, { sharedDirectory }) => {
      const named = nameOf(sharedDirectory, form.replace("{password}", `Zq1${delimiter}Xw9`));
      for (const secret of ["usrK7", "Zq1", "Xw9", "Tk3", "Fr4"]) expect(named ?? "", `${secret} reached the name`).not.toContain(secret);
      expect(named).toBe(unread.includes(delimiter) ? null : shown);
    });
  });

  describe.each([
    ["file://usrK7:{password}@host/srv/x"],
    ["usrK7::{password}@host:veggies.git"],
  ])("a remote of the form %s", (form) => {
    test.for(everyDelimiter)("with %j in its password, names no origin and puts no part of its user or password in the name", (delimiter, { sharedDirectory }) => {
      const named = nameOf(sharedDirectory, form.replace("{password}", `Zq1${delimiter}Xw9`));
      for (const secret of ["usrK7", "Zq1", "Xw9"]) expect(named ?? "", `${secret} reached the name`).not.toContain(secret);
      expect(named).toBeNull();
    });
  });

  test.for<[string]>([
    ["https://usrK7:Zq1/Xw9@github.com/ekino/veggies.git"],
    ["https://usrK7:Zq1?Xw9@github.com/veggies.git"],
    ["https://usrK7:Zq1#Xw9@github.com/veggies.git"],
    ["ssh://usrK7:Zq1/Xw9@host/ekino/veggies.git"],
    ["https://host/ekino/veggies.git?e=a@b.example"],
    ["https://usrK7:Zq1Xw9@/ekino/veggies.git"],
    ["git@host:repo@v2.git"],
    ["file://usrK7@localhost/srv/x"],
    ["ext::sshpass -p Zq1Xw9 ssh usrK7@host %S repo"],
    ["ext::ssh -l usrK7 host %S /srv/repo"],
  ])("names no origin for %s, which is not read as a URL, an scp remote or a local path without guessing", ([origin], { sharedDirectory }) => {
    const named = nameOf(sharedDirectory, origin);
    for (const secret of ["usrK7", "Zq1", "Xw9", "a@b"]) expect(named ?? "", `${secret} reached the name`).not.toContain(secret);
    expect(named).toBeNull();
  });

  test.for<[string]>([
    ["file:///srv/git/veg#gies.git"],
    ["file:///srv/git/veg?gies.git"],
    ["/srv/git/veg#gies.git"],
    ["/srv/git/veg?gies.git"],
    ["veggies.git"],
  ])("names the local origin %s as given, since git sends it to no server", ([origin], { sharedDirectory }) => {
    expect(nameOf(sharedDirectory, origin)).toBe(origin);
  });

  test.for<[string, string | null, string[]]>([
    ["https://deploy:p@ss@github.com/ekino/veggies.git?private_token=abc#s3cret", "ekino/veggies", ["deploy", "p@ss", "ss@", "private_token", "abc", "s3cret"]],
    ["https://usrK7:Zq1/Xw9@github.com/ekino/veggies.git", null, ["usrK7", "Zq1", "Xw9"]],
    ["file:///srv/git/veg#gies.git", "file:///srv/git/veg#gies.git", []],
  ])("in the run balance assembles, carries the origin %s's name, %s, into the markdown, the JSON and a re-render, with none of %j in any of them", ([origin, shown, secrets], { sharedDirectory }) => {
    withOrigin(sharedDirectory, origin, (dir, root, balance) => {
      const { md, json, rerendered, leaked } = reportOf(dir, root, balance);
      for (const secret of secrets) expect(leaked(secret), `${secret} reached a surface`).toBeUndefined();
      expect(namedOrigin(json)).toBe(shown ?? undefined);
      expect(targetRepo(md)).toBe(
        `- ${shown === null ? coreMessage(CoreMessage.ProvenanceTargetRepo, { target: "unknown-target" }) : coreMessage(CoreMessage.ProvenanceTargetRepoUntargeted, { target: "unknown-target", origin: shown })}`,
      );
      expect(targetRepo(rerendered)).toBe(targetRepo(md));
    });
  });

  it("names the origin in the markdown and in the JSON, and a report rendered from that JSON reads the same, with none of the remote's credentials in any of them", wholeRun, () => {
    withCheckout("https://deploy:p@ss@github.com/ekino/veggies.git?private_token=qwz#s3cret", (dir) => {
      const { md, json, saved } = report(dir);
      const rerendered = runBalanceCaptured(["--render-from-json", saved]).stdout;
      for (const text of [md, readFileSync(saved, "utf8"), rerendered]) {
        for (const secret of ["deploy", "p@ss", "private_token", "qwz", "s3cret"]) expect(text.replaceAll(dir, "")).not.toContain(secret);
      }
      expect(targetRepo(md)).toBe(`- ${coreMessage(CoreMessage.ProvenanceTargetRepoUntargeted, { target: "unknown-target", origin: "ekino/veggies" })}`);
      expect({ target: json["target"], targetOrigin: json["targetOrigin"] }).toEqual({ target: "unknown-target", targetOrigin: "ekino/veggies" });
      expect(targetRepo(rerendered)).toBe(targetRepo(md));
    });
  });

  it("reads unknown-target alone, with no origin in the JSON, when the target has no origin remote", wholeRun, () => {
    withCheckout(null, (dir) => {
      const { md, json } = report(dir);
      expect(targetRepo(md)).toBe("- Target repo: unknown-target");
      expect("targetOrigin" in json).toBe(false);
    });
  });

  it("reads the --target value alone, with no origin in the JSON, when --target is given", wholeRun, () => {
    withCheckout("git@github.com:ekino/veggies.git", (dir) => {
      const { md, json } = report(dir, ["--target", "veggies"]);
      expect(targetRepo(md)).toBe("- Target repo: veggies");
      expect("targetOrigin" in json).toBe(false);
    });
  });
});
