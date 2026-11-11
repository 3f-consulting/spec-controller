import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { committedRepository } from "./gitRepository.test-utils.js";
import { resolveTargetRoot } from "./resolveRunInputs.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

interface Report {
  readonly claimReconciliations: readonly { readonly claim: { readonly file?: string; readonly title?: string } }[];
  readonly stepAccount: unknown;
  readonly provenance: { readonly target: string; readonly sourceSha: string; readonly inputs: readonly { readonly name: string; readonly path?: string }[] };
}

function reportOf(argv: readonly string[]): Report {
  const { stdout, stderr, exitCode } = runBalanceCaptured([...argv, "--format", "json"]);
  expect(stderr).toBe("");
  expect(exitCode).not.toBe(2);
  return JSON.parse(stdout) as Report;
}

function corpusIn(dir: string): string {
  const features = join(dir, "features");
  mkdirSync(features);
  writeFileSync(join(features, "a.feature"), "Feature: a\n\n  Rule: r\n    @unit @CLM-ABC-001\n    Scenario: the claim read\n      Given a step\n");
  return features;
}

function workflowsIn(dir: string): string {
  const ci = join(dir, "ci.yml");
  writeFileSync(ci, "jobs: {}\n");
  return ci;
}

describe("balance will use the default when an input is not named", () => {
  it("[CLM-CLI-136] input feature corpus, default the features folder", () => {
    const dir = realpathSync(temporaryDirectory("default-corpus-"));
    const features = corpusIn(dir);
    const ci = workflowsIn(dir);
    vi.spyOn(process, "cwd").mockReturnValue(dir);

    const unnamed = reportOf(["--ci", ci]);
    const named = reportOf(["--features", features, "--ci", ci]);

    expect(unnamed.claimReconciliations.map(({ claim }) => claim.title)).toContain("the claim read");
    expect(unnamed.claimReconciliations).toEqual(named.claimReconciliations);
  });

  it("[CLM-CLI-137] input manifest, default package.json", () => {
    const dir = temporaryDirectory("default-manifest-");
    const features = corpusIn(dir);
    const emptyManifest = join(dir, "manifest.json");
    writeFileSync(emptyManifest, "{}\n");

    const unnamed = reportOf(["--features", features]);
    const named = reportOf(["--features", features, "--package-json", "package.json"]);
    const another = reportOf(["--features", features, "--package-json", emptyManifest]);

    expect(unnamed.stepAccount).toEqual(named.stepAccount);
    expect(unnamed.stepAccount).not.toEqual(another.stepAccount);
  });

  it("[CLM-CLI-138] input CI workflows, default .github/workflows", () => {
    const dir = temporaryDirectory("default-workflows-");
    const features = corpusIn(dir);

    const unnamed = reportOf(["--features", features]);
    const named = reportOf(["--features", features, "--ci", ".github/workflows"]);
    const another = reportOf(["--features", features, "--ci", workflowsIn(dir)]);

    expect(unnamed.stepAccount).toEqual(named.stepAccount);
    expect(unnamed.stepAccount).not.toEqual(another.stepAccount);
  });

  it("[CLM-CLI-139] input target name, default unknown-target", () => {
    const { repo } = committedRepository("default-target-");
    const features = corpusIn(repo);

    expect(reportOf(["--features", features, "--ci", workflowsIn(repo)]).provenance.target).toBe("unknown-target");
  });

  it("[CLM-CLI-140] input source commit, default the target's HEAD", () => {
    const { repo, head } = committedRepository("default-source-commit-");
    const features = corpusIn(repo);

    expect(reportOf(["--features", features, "--ci", workflowsIn(repo)]).provenance.sourceSha).toBe(head);
  });

  it("[CLM-CLI-141] input source commit, in no git repository, default unknown", () => {
    const dir = temporaryDirectory("default-source-commit-no-git-");
    const features = corpusIn(dir);

    expect(reportOf(["--features", features, "--ci", workflowsIn(dir)]).provenance.sourceSha).toBe("unknown");
  });
});

describe("balance works out the target's folder", () => {
  it("[CLM-CLI-142] no feature corpus, run from the folder", () => {
    const folder = realpathSync(temporaryDirectory("target-run-from-"));
    vi.spyOn(process, "cwd").mockReturnValue(folder);

    expect(resolveTargetRoot({})).toBe(folder);
  });

  it("[CLM-CLI-143] the corpus in a git repository at the folder", () => {
    const { repo } = committedRepository("target-in-git-");
    const features = corpusIn(repo);

    expect(resolveTargetRoot({ features })).toBe(repo);
  });

  it("[CLM-CLI-143] the corpus in a git repository at the folder, as balance names its inputs", () => {
    const { repo } = committedRepository("target-in-git-inputs-");
    const features = corpusIn(repo);
    const vitest = join(repo, "vitest.json");
    writeFileSync(vitest, '{"testResults":[]}\n');

    const { inputs } = reportOf(["--features", features, "--ci", workflowsIn(repo), "--vitest", vitest]).provenance;

    expect(inputs.find(({ name }) => name === "vitest")).toEqual({ name: "vitest", path: "vitest.json" });
  });

  it("[CLM-CLI-184] the corpus in a folder below the top of a git repository", () => {
    const { repo } = committedRepository("target-below-git-top-");
    const docs = join(repo, "docs");
    mkdirSync(docs);
    const features = corpusIn(docs);

    expect(resolveTargetRoot({ features })).toBe(repo);
  });

  it("[CLM-CLI-144] the corpus in no git repository", () => {
    const x = join(realpathSync(temporaryDirectory("target-no-git-")), "x");
    mkdirSync(x);
    const features = corpusIn(x);

    expect(resolveTargetRoot({ features })).toBe(x);
  });
});
