import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { writeInto, commitAll, lines } from "./repository.test-utils.js";
import { allocateIn, expectAnsweredEnding } from "./answered.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function git(cwd: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

function newRepository(): string {
  const repo = realpathSync(temporaryDirectory("allocate-deleted-"));
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

const HEAD = ["@ONE", "Feature: part ONE"];
const SCENARIO_1 = ["  @SCN-ONE-001 @unit", "  Scenario: scenario 1", "    Given a step", ""];

describe("[SCN-ALC-001] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("answers one past the deleted code when the history that carries it runs to many kilobytes", () => {
    const longSteps = Array.from({ length: 200 }, (_, n) => `    And step ${n} of the scenario that SCN-ONE-005 once named`);
    const scenario5 = ["  @SCN-ONE-005 @unit", "  Scenario: scenario 5", "    Given a step", ...longSteps];
    const repo = newRepository();
    writeInto(repo, "features/one.feature", lines(...HEAD, ...SCENARIO_1, ...scenario5));
    commitAll(repo, "the corpus");
    writeInto(repo, "features/one.feature", lines(...HEAD, ...SCENARIO_1));
    commitAll(repo, "retire scenario 5");
    expect(git(repo, ["log", "--all", "-p", "-U0", "-G", "SCN-ONE-"]).length).toBeGreaterThan(16 * 1024);

    const answered = allocateIn(repo, ["ONE"]);

    expectAnsweredEnding(answered, "ONE-006");
  });
});
