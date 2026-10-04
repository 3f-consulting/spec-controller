import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runAllocate } from "./cli.js";
import { readHistory } from "./readHistory.js";
import { proveRefsReadable } from "./refStore.js";

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

const made: string[] = [];

function temporaryDirectory(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "allocate-unreadable-history-")));
  made.push(dir);
  return dir;
}

function scenarioBlock(code: string): string {
  return `  @${code} @unit\n  Scenario: scenario ${code}\n    Given a step\n`;
}

function repositoryWithADeletedCode(): string {
  const repo = temporaryDirectory();
  git(repo, ["init", "-q", "-b", "main"]);
  const path = "features/one.feature";
  writeInto(repo, path, `@ONE\nFeature: part ONE\n\n${scenarioBlock("SCN-ONE-001")}\n${scenarioBlock("SCN-ONE-005")}`);
  commitAll(repo, "the corpus");
  writeInto(repo, path, `@ONE\nFeature: part ONE\n\n${scenarioBlock("SCN-ONE-001")}`);
  commitAll(repo, "retire a scenario");
  return repo;
}

const taken: Array<() => void> = [];

function withhold(path: string, mode: number): void {
  const before = statSync(path).mode & 0o7777;
  chmodSync(path, mode);
  taken.push(() => chmodSync(path, before));
}

function looseObjectDirectories(repo: string): string[] {
  const objects = join(repo, ".git", "objects");
  const loose = readdirSync(objects).filter((name) => /^[0-9a-f]{2}$/.test(name));
  expect(loose.length).toBeGreaterThan(0);
  return loose.map((name) => join(objects, name));
}

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

function allocateFrom(cwd: string): Answered {
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
  try {
    runAllocate(["ONE"]);
  } finally {
    vi.restoreAllMocks();
  }
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
  while (made.length > 0) rmSync(made.pop() ?? "", { recursive: true, force: true });
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function historyRefusalReason(answered: Answered, path: string): string {
  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  const opening = `spec-controller allocate: usage error — the repository's history could not be read: ${path} (`;
  expect(answered.stderr.startsWith(opening)).toBe(true);
  expect(answered.stderr.endsWith(")\n")).toBe(true);
  expect(answered.stderr.split("\n")).toHaveLength(2);
  return answered.stderr.slice(opening.length, -2);
}

const NOT_PERMITTED = /^(EACCES|EPERM): /;
const GIT_LOG_FAILED = /^git log exited 128: \S/;

const asRoot = process.getuid?.() === 0;

describe("[SCN-ALC-021] history git cannot read is refused, never answered below a code it carries", () => {
  it.skipIf(asRoot)("refuses ONE when its loose objects are not permitted to be read, in git's own words", () => {
    const repo = repositoryWithADeletedCode();
    for (const dir of looseObjectDirectories(repo)) withhold(dir, 0o000);

    expect(historyRefusalReason(allocateFrom(repo), repo)).toMatch(GIT_LOG_FAILED);
  });

  it.skipIf(asRoot)("refuses ONE when its objects are packed, and the pack is not permitted to be read, in git's own words", () => {
    const repo = repositoryWithADeletedCode();
    git(repo, ["gc", "-q"]);
    const pack = join(repo, ".git", "objects", "pack");
    const files = readdirSync(pack);
    expect(files.some((name) => name.endsWith(".pack"))).toBe(true);
    for (const name of files) withhold(join(pack, name), 0o000);

    expect(historyRefusalReason(allocateFrom(repo), repo)).toMatch(GIT_LOG_FAILED);
  });

  it.skipIf(asRoot)("refuses ONE when its branch refs are not permitted to be read, naming them", () => {
    const repo = repositoryWithADeletedCode();
    const heads = join(repo, ".git", "refs", "heads");
    withhold(heads, 0o000);

    expect(historyRefusalReason(allocateFrom(repo), heads)).toMatch(NOT_PERMITTED);
  });

  it.skipIf(asRoot)("refuses ONE when a branch ref nested below refs/heads is not permitted to be read, naming it", () => {
    const repo = repositoryWithADeletedCode();
    git(repo, ["branch", "topic/later"]);
    const ref = join(repo, ".git", "refs", "heads", "topic", "later");
    withhold(ref, 0o000);

    expect(historyRefusalReason(allocateFrom(repo), ref)).toMatch(NOT_PERMITTED);
  });

  it.skipIf(asRoot)("refuses ONE when its packed refs are not permitted to be read, naming them", () => {
    const repo = repositoryWithADeletedCode();
    git(repo, ["pack-refs", "--all"]);
    const packed = join(repo, ".git", "packed-refs");
    withhold(packed, 0o000);

    expect(historyRefusalReason(allocateFrom(repo), packed)).toMatch(NOT_PERMITTED);
  });

  it.skipIf(asRoot)("refuses ONE when it is cloned one commit deep, and the clone's shallow record is not permitted to be read", () => {
    const origin = repositoryWithADeletedCode();
    const clone = join(temporaryDirectory(), "clone");
    git(origin, ["clone", "-q", "--depth", "1", `file://${origin}`, clone]);
    expect(git(clone, ["rev-parse", "--is-shallow-repository"]).trim()).toBe("true");
    const shallow = join(clone, ".git", "shallow");
    withhold(shallow, 0o000);

    expect(historyRefusalReason(allocateFrom(clone), clone)).toMatch(GIT_LOG_FAILED);
  });

  it("refuses ONE when an object of its history is corrupt, in git's own words", () => {
    const repo = repositoryWithADeletedCode();
    for (const dir of looseObjectDirectories(repo)) {
      for (const name of readdirSync(dir)) {
        const object = join(dir, name);
        chmodSync(object, 0o644);
        writeFileSync(object, "not a zlib stream\n");
      }
    }

    expect(historyRefusalReason(allocateFrom(repo), repo)).toMatch(GIT_LOG_FAILED);
  });

  it("answers ONE past the deleted code when a ref store holds a link to nowhere, which git passes over", () => {
    const repo = repositoryWithADeletedCode();
    symlinkSync("nowhere", join(repo, ".git", "refs", "heads", "dangling"));

    const answered = allocateFrom(repo);

    expect(answered.exitCode).toBeUndefined();
    expect(answered.stdout).toBe("SCN-ONE-006\n");
  });

  it("refuses the history, naming git, when there is no git to ask", () => {
    const repo = repositoryWithADeletedCode();
    const path = process.env.PATH;
    process.env.PATH = "";
    let thrown: unknown;
    try {
      readHistory(repo, "ONE");
    } catch (err) {
      thrown = err;
    } finally {
      process.env.PATH = path;
    }

    expect(thrown).toMatchObject({ name: "UnreadableInput", subject: "the repository's history", path: "git" });
  });

  it("finds every ref store readable from a working directory that is not there", () => {
    const gone = join(temporaryDirectory(), "gone");

    expect(() => proveRefsReadable(gone)).not.toThrow();
  });
});
