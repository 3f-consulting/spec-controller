import { expect } from "vitest";
import { spawnSync } from "node:child_process";
import { git } from "./repository.test-utils.js";
import { allocateIn } from "./answered.test-utils.js";

export function expectAnsweredWithNoHistoryRead(copy: string): void {
  expect(spawnSync("git", ["rev-parse", "--git-dir"], { cwd: copy }).status).not.toBe(0);

  const answered = allocateIn(copy, ["ONE"]);

  expect(answered.stdout).toBe("SCN-ONE-002\n");
  expect(answered.exitCode).toBeUndefined();
  expect(answered.stderr).toBe(
    "history: not a git repository — none read; a code above SCN-ONE-001 may have been used before\n" +
      "highest seen: SCN-ONE-001, features/one.feature:4\n",
  );
}

export function expectAnsweredWithHistoryUnreadBeforeItsFirstCommit(clone: string): void {
  const edge = git(clone, ["rev-parse", "--short", "HEAD"]).trim();

  const answered = allocateIn(clone, ["ONE"]);

  expect(answered.stdout).toBe("SCN-ONE-002\n");
  expect(answered.exitCode).toBeUndefined();
  expect(answered.stderr.split("\n")[0]).toBe(
    `history: shallow clone — history before ${edge} unread; a code above SCN-ONE-001 may have been used before`,
  );
}
