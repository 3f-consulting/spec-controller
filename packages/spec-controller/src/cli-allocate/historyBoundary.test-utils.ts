import { expect } from "vitest";
import { spawnSync } from "node:child_process";
import { git } from "./repository.test-utils.js";
import { allocateIn, expectAnsweredEnding } from "./answered.test-utils.js";
import { AppMessage } from "../messages.js";
import { message } from "../appText.js";

export function expectAnsweredWithNoHistoryRead(copy: string): void {
  expect(spawnSync("git", ["rev-parse", "--git-dir"], { cwd: copy }).status).not.toBe(0);

  const answered = allocateIn(copy, ["ONE"]);

  expectAnsweredEnding(answered, "ONE-002");
  expect(answered.stderr).toBe(
    `${message(AppMessage.NoRepositoryRisksCodeAbove, { code: "CLM-ONE-001" })}\n` +
      `${message(AppMessage.HighestSeenInTree, { code: "CLM-ONE-001", path: "features/one.feature", line: 4 })}\n`,
  );
}

export function expectAnsweredWithHistoryUnreadBeforeItsFirstCommit(clone: string): void {
  const edge = git(clone, ["rev-parse", "--short", "HEAD"]).trim();

  const answered = allocateIn(clone, ["ONE"]);

  expectAnsweredEnding(answered, "ONE-002");
  expect(answered.stderr.split("\n")[0]).toBe(
    message(AppMessage.ShallowHistoryRisksCodeAbove, { before: edge, code: "CLM-ONE-001" }),
  );
}
