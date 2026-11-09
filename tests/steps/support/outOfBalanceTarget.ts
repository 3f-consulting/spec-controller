import assert from "node:assert/strict";
import { OUT_OF_BALANCE, specController } from "./specControllerRun.js";

const TARGET = "unwritable";

export const TARGET_ARGS = [
  "--features",
  "tests/fixtures/evidence-observation/features",
  "--vitest",
  "tests/fixtures/evidence-observation/vitest.json",
  "--target",
  TARGET,
];

// A memo across scenarios, not scenario state: the target never changes, so one reconciliation of it serves them all.
const outOfBalanceTarget: { status?: number | null } = {};

export function assertTargetOutOfBalance(): void {
  outOfBalanceTarget.status ??= specController(["balance", ...TARGET_ARGS]).status;
  assert.equal(outOfBalanceTarget.status, OUT_OF_BALANCE, "the target must reconcile out of balance on its own");
}

export const BALANCED_ARGS = [
  "--features",
  "tests/fixtures/balanced/features",
  "--vitest",
  "tests/fixtures/balanced/vitest.json",
  "--package-json",
  "tests/fixtures/balanced/package.json",
  "--ci",
  "tests/fixtures/balanced",
];
