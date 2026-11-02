import { runBalanceCaptured } from "../runBalance.test-utils.js";

export function captured(argv: string[]): { report: string; stderr: string; exitCode: unknown } {
  const { stdout, stderr, exitCode } = runBalanceCaptured(argv);
  return { report: stdout, stderr, exitCode };
}

export function headlineExit(stdout: string): number | undefined {
  const after = stdout.split("### Run verdict")[1] ?? "";
  const line = after.split("\n").find((l) => l.trim() !== "") ?? "";
  const match = /\(exit (\d)\)$/.exec(line);
  return match ? Number(match[1]) : undefined;
}
