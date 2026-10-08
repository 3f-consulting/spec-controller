import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitInRepository as git } from "./repository.testkit.js";
import { allocateIn } from "./answered.testkit.js";

const made: string[] = [];

function repositoryHeaded(part: string, code: string): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-answer-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features", `${part.toLowerCase()}.feature`), `@${part}\nFeature: part ${part}\n\n  @${code} @unit\n  Scenario: scenario 1\n    Given a step\n`);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-008] The code is printed alone on stdout, zero-padded to three digits", () => {
  let repo = "";

  beforeAll(() => {
    repo = repositoryHeaded("ONE", "SCN-ONE-7");
  });

  it("answers SCN-ONE-008 alone on stdout and succeeds", () => {
    const answered = allocateIn(repo, ["ONE"]);
    expect(answered.stdout).toBe("SCN-ONE-008\n");
    expect(answered.exitCode).toBeUndefined();
  });

  it("names on stderr where the highest code was seen, and nothing more", () => {
    const answered = allocateIn(repo, ["ONE"]);
    expect(answered.stderr).toBe("highest seen: SCN-ONE-7, features/one.feature:4\n");
  });
});
