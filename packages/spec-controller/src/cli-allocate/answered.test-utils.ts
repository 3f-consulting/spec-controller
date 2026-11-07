import { expect, vi } from "vitest";
import { runAllocate } from "./cli.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";

export interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

export interface AnsweredOrThrown extends Answered {
  threw: boolean;
  thrown: unknown;
}

export function allocateRecording(cwd: () => string, argv: readonly string[]): AnsweredOrThrown {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process, "cwd").mockImplementation(cwd);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  let threw = false;
  let thrown: unknown;
  try {
    runAllocate([...argv]);
  } catch (err) {
    threw = true;
    thrown = err;
  } finally {
    vi.restoreAllMocks();
  }
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode, threw, thrown };
}

export function allocateWhere(cwd: () => string, argv: readonly string[]): Answered {
  const { threw, thrown, ...answered } = allocateRecording(cwd, argv);
  if (threw) throw thrown;
  return answered;
}

export function allocateFrom(cwd: string): Answered {
  return allocateWhere(() => cwd, ["ONE"]);
}

export function allocateIn(cwd: string, argv: string[]): Answered {
  return allocateWhere(() => cwd, argv);
}

export function expectAnsweredEnding(answered: Answered, ending: string): void {
  expect(answered.exitCode).toBeUndefined();
  expect(answered.stderr).not.toContain("usage error");
  expect(["CLM", "SCN"].map((prefix) => `${prefix}-${ending}\n`)).toContain(answered.stdout);
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

export function thrownBy(read: () => unknown): unknown {
  try {
    read();
  } catch (err) {
    return err;
  }
  throw new Error("expected the read to be refused, and it read");
}
