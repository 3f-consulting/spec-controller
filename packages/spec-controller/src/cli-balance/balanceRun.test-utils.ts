import { expect } from "vitest";
import { runBalanceCaptured } from "../runBalance.test-utils.js";

export function captured(argv: string[]): { report: string; stderr: string; exitCode: unknown } {
  const { stdout, stderr, exitCode } = runBalanceCaptured(argv);
  return { report: stdout, stderr, exitCode };
}

// A refused run reports nothing and exits with the usage status. Its standard error is the refusals' lines in
// order, each holding the words it is expected to hold, and nothing else.
export function expectRefused(run: { report: string; stderr: string; exitCode: unknown }, ...refusals: string[]): void {
  expect(run.report).toBe("");
  expect(run.exitCode).toBe(2);
  const lines = refusals.flatMap((refusal) => refusal.split("\n"));
  const shown = run.stderr.split("\n");
  expect(shown).toHaveLength(lines.length + 1);
  lines.forEach((line, at) => expect(shown[at]).toContain(line));
}

export function headlineExit(stdout: string): number | undefined {
  const after = stdout.split("### Run verdict")[1] ?? "";
  const line = after.split("\n").find((l) => l.trim() !== "") ?? "";
  const match = /\(exit (\d)\)$/.exec(line);
  return match ? Number(match[1]) : undefined;
}
