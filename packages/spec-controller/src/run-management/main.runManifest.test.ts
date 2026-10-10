import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { main } from "../main.js";
import { resolveToolIdentity } from "./resolveRunInputs.js";

let made: string[];
let outOfBalance: string;
let vitest: string;

beforeEach(() => {
  made = [];
  outOfBalance = fileURLToPath(new URL("../../../../tests/fixtures/evidence-observation", import.meta.url));
  vitest = join(outOfBalance, "vitest.json");
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(PINNED);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  process.exitCode = undefined;
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const PINNED = new Date("2026-03-04T05:06:07.890Z");
const RUN_ID = "r1";

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}

function featuresCopiedInto(dir: string): string {
  const features = join(dir, "features");
  cpSync(join(outOfBalance, "features"), features, { recursive: true });
  return features;
}

function gitRepoHoldingFeatures(): { features: string; head: string } {
  const repo = tempDir("main-run-manifest-repo-");
  const features = featuresCopiedInto(repo);
  const git = (...args: string[]): string =>
    execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  git("init", "-q");
  git("add", ".");
  git("commit", "-q", "-m", "one");
  return { features, head: git("rev-parse", "HEAD") };
}

function storedManifest(target: string, commandArgs: string[]): Record<string, unknown> {
  const cwd = tempDir("main-run-manifest-cwd-");
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  const storeRoot = join(cwd, "store");
  main(["--store", storeRoot, "--run-id", RUN_ID, "balance", ...commandArgs]);
  return parse(readFileSync(join(storeRoot, target, RUN_ID, "run.yaml"), "utf8")) as Record<string, unknown>;
}

function expectToolIdentityAndDate(manifest: Record<string, unknown>): void {
  const tool = resolveToolIdentity();
  expect(manifest["tool_version"]).toBe(tool.toolVersion);
  expect(manifest["tool_sha"]).toBe(tool.toolSha ?? "unknown");
  expect(manifest["date"]).toBe(PINNED.toISOString());
}

describe("[SCN-RMG-002] a kept run stamps run.yaml with schema_version, run_id, target, sha, tool identity, mode, date, an empty purpose list, links, and artefacts", () => {
  it("names the target and source SHA the operator gave, in balance mode", () => {
    const manifest = storedManifest("t", [
      "--features", join(outOfBalance, "features"),
      "--vitest", vitest,
      "--target", "t",
      "--source-sha", "s",
    ]);

    expect(manifest["target"]).toBe("t");
    expect(manifest["source_sha"]).toBe("s");
    expect(manifest["mode"]).toBe("balance");
    expectToolIdentityAndDate(manifest);
  });

  it("with no target and no source SHA, names an unknown target and the HEAD of the repository holding the features", () => {
    const { features, head } = gitRepoHoldingFeatures();
    const manifest = storedManifest("unknown-target", ["--features", features, "--vitest", vitest]);

    expect(manifest["target"]).toBe("unknown-target");
    expect(manifest["source_sha"]).toBe(head);
    expect(manifest["mode"]).toBe("balance");
    expectToolIdentityAndDate(manifest);
  });

  it("with the features outside any repository, names the source SHA unknown", () => {
    const features = featuresCopiedInto(tempDir("main-run-manifest-plain-"));
    const manifest = storedManifest("unknown-target", ["--features", features, "--vitest", vitest]);

    expect(manifest["source_sha"]).toBe("unknown");
    expectToolIdentityAndDate(manifest);
  });
});
