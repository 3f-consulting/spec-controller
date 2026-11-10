import { expect, vi } from "vitest";
import { runAllocate } from "./cli.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";

export interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

export function allocateIn(cwd: string, argv: string[]): Answered {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process, "cwd").mockImplementation(() => cwd);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  try {
    runAllocate([...argv]);
  } finally {
    vi.restoreAllMocks();
  }
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

export function expectAnsweredEnding(answered: Answered, ending: string): void {
  expect(answered.exitCode).toBeUndefined();
  expect(answered.stderr).not.toContain("usage error");
  expect(answered.stdout).toBe(`CLM-${ending}\n`);
}

const REASON = "\u0000";

// The refusal's one line holds the entry's words for the subject and path, around the reason it returns.
export function refusalReason(answered: Answered, subject: string, path: string): string {
  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  expect(answered.stderr.split("\n")).toHaveLength(2);
  const [before = "", after = ""] = message(AppError.CouldNotBeRead, { subject, path, reason: REASON }).split(REASON);
  const from = answered.stderr.indexOf(before);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(answered.stderr.endsWith(`${after}\n`)).toBe(true);
  return answered.stderr.slice(from + before.length, -after.length - 1);
}

// A git reader's reason opens with git's exit status, and goes on in git's own words.
export function gitExited(command: string, status: number): RegExp {
  const opening = message(AppMessage.GitExited, { command, status: String(status), said: "" });
  return new RegExp(`^${opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\S`);
}
