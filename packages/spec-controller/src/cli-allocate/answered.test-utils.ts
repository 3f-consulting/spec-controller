import { expect, vi } from "vitest";
import { runAllocate } from "./cli.js";

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

export function expectAnsweredWith(answered: Answered, code: string): void {
  expect(answered.exitCode).toBeUndefined();
  expect(answered.stderr).not.toContain("usage error");
  expect(answered.stdout).toBe(`${code}\n`);
}

export function refusalReason(answered: Answered, subject: string, path: string): string {
  expect(answered.stdout).toBe("");
  expect(answered.exitCode).toBe(2);
  const opening = `spec-controller allocate: usage error — ${subject} could not be read: ${path} (`;
  expect(answered.stderr.startsWith(opening)).toBe(true);
  expect(answered.stderr.endsWith(")\n")).toBe(true);
  expect(answered.stderr.split("\n")).toHaveLength(2);
  return answered.stderr.slice(opening.length, -2);
}

export function thrownBy(read: () => unknown): unknown {
  try {
    read();
  } catch (err) {
    return err;
  }
  throw new Error("expected the read to be refused, and it read");
}
