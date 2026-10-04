import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cliRegistry, renderCommandHelp } from "../cli-registry.js";
import { runAllocate } from "./cli.js";

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

const made: string[] = [];

function headedOneCarryingThree(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-help-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features/one.feature"), "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

function allocateIn(cwd: string, argv: string[]): Answered {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  runAllocate(argv);
  const exitCode = process.exitCode;
  vi.restoreAllMocks();
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const HELP_REQUEST: Record<string, string[]> = {
  alone: ["--help"],
  "by its short name, alone": ["-h"],
  "after a part": ["ONE", "--help"],
  "after a part not in canon's form": ["fit", "--help"],
  "beside a flag the command does not take": ["--bogus", "--help"],
};

describe("[SCN-ALC-013] allocate --help answers first, listing <FFF> and --new, and exits 0 whatever else is given", () => {
  it.each(Object.keys(HELP_REQUEST))("answers with allocate's help and gives no code, asked %s", (request) => {
    const answered = allocateIn(headedOneCarryingThree(), HELP_REQUEST[request] as string[]);

    expect(answered.stdout).toBe(renderCommandHelp(cliRegistry, "allocate") + "\n");
    expect(answered.stdout).toContain("<FFF>");
    expect(answered.stdout).toContain("--new");
    expect(answered.stdout).not.toMatch(/^SCN-/m);
    expect(answered.stderr).toBe("");
    expect(answered.exitCode).toBeUndefined();
  });
});
