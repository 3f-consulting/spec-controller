import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, writeInto } from "./repository.testkit.js";
import { allocateIn } from "./answered.testkit.js";

const made: string[] = [];

function headedOneCarryingThree(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-new-part-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(
    repo,
    "features/one.feature",
    "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n",
  );
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

describe("[SCN-ALC-011] --new admits a part no feature file's header carries, and on a part a header does carry it answers as usual with a note on stderr", () => {
  it("answers SCN-ZZ-001 for ZZ as a new part, saying nothing of the part being carried already", () => {
    const answered = allocateIn(headedOneCarryingThree(), ["ZZ", "--new"]);

    expect(answered.stdout).toBe("SCN-ZZ-001\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe("highest seen: none\n");
  });

  it("answers SCN-ONE-004 for ONE as a new part, noting that a feature file's header already carries ONE", () => {
    const answered = allocateIn(headedOneCarryingThree(), ["ONE", "--new"]);

    expect(answered.stdout).toBe("SCN-ONE-004\n");
    expect(answered.exitCode).toBeUndefined();
    expect(answered.stderr).toBe(
      "highest seen: SCN-ONE-003, features/one.feature:4\n" +
        "note: a feature file's header already carries ONE, so --new was not needed\n",
    );
  });
});
