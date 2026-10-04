import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runAllocate } from "./cli.js";

function git(cwd: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

function writeInto(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function commitAll(repo: string, message: string): void {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
}

function featureFile(part: string, codes: readonly string[]): string {
  const scenarios = codes.map((code, i) => `  @${code} @unit\n  Scenario: scenario ${i + 1}\n    Given a step\n`);
  return `@${part}\nFeature: part ${part}\n\n${scenarios.join("\n")}`;
}

const made: string[] = [];

// Beside the two headed files: a feature file with no header code, and a file
// that is not a feature file but reads like one headed SIX. Neither may add a
// part to the refusal's list.
function headedOneAndTwo(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-unknown-part-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", featureFile("ONE", ["SCN-ONE-001"]));
  writeInto(repo, "features/two.feature", featureFile("TWO", ["SCN-TWO-001"]));
  writeInto(repo, "features/unheaded.feature", "Feature: no part\n\n  Scenario: scenario 1\n    Given a step\n");
  writeInto(repo, "features/six.feature.md", featureFile("SIX", ["SCN-SIX-001"]));
  commitAll(repo, "the corpus");
  return repo;
}

const WHERE: Record<string, (repo: string) => void> = {
  "no file mentions ZZZ": () => undefined,
  "a test fixture's feature file is headed ZZZ and carries SCN-ZZZ-004": (repo) => {
    writeInto(repo, "tests/fixtures/sample/features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-004"]));
    commitAll(repo, "a test fixture");
  },
  "a feature file headed ZZZ was deleted by a later commit": (repo) => {
    writeInto(repo, "features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-009"]));
    commitAll(repo, "a feature that did not last");
    git(repo, ["rm", "-q", "features/zzz.feature"]);
    git(repo, ["commit", "-q", "-m", "retire the feature"]);
  },
};

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

describe("[SCN-ALC-010] a part no feature file's header carries is refused as an unknown part, listing the header codes and nothing else", () => {
  it.each(Object.keys(WHERE))("refuses ZZZ at the usage status, listing ONE and TWO alone, where %s", (where) => {
    const repo = headedOneAndTwo();
    WHERE[where]?.(repo);

    const answered = allocateIn(repo, ["ZZZ"]);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr).toBe(
      "spec-controller allocate: unknown part — no feature file's header carries ZZZ.\n" +
        "The parts this corpus's feature files carry: ONE, TWO.\n",
    );
  });
});
