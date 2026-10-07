import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../main.js";

function git(repo: string, args: readonly string[]): void {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

function repositoryHeaded(part: string, code: string): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "main-allocate-")));
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features", `${part.toLowerCase()}.feature`), `@${part}\nFeature: part ${part}\n\n  @${code} @unit\n  Scenario: scenario 1\n    Given a step\n`);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function answerIn(cwd: string, argv: string[]): Answered {
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  main(argv);
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

describe("[SCN-ALC-008] The code is printed alone on stdout, zero-padded to three digits", () => {
  let repo = "";

  beforeAll(() => {
    repo = repositoryHeaded("ONE", "SCN-ONE-7");
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("answers SCN-ONE-008 alone on stdout", () => {
    expect(answerIn(repo, ["allocate", "ONE"]).stdout).toBe("SCN-ONE-008\n");
  });

  it("adds nothing to stderr beyond where the highest code was seen", () => {
    expect(answerIn(repo, ["allocate", "ONE"]).stderr).toBe("highest seen: SCN-ONE-7, features/one.feature:4\n");
  });

  it("succeeds", () => {
    expect(answerIn(repo, ["allocate", "ONE"]).exitCode ?? 0).toBe(0);
  });
});
