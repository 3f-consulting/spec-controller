import { vi } from "vitest";
import { runBalance } from "./cli-balance/cli.js";

export interface BalanceRun {
  stdout: string;
  stderr: string;
  exitCode: number;
  wrote: boolean;
}

export function runBalanceCaptured(argv: readonly string[]): BalanceRun {
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  const out: string[] = [];
  const err: string[] = [];
  const capture = (sink: string[]) => (chunk: string | Uint8Array): boolean => {
    sink.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  };
  const outSpy = vi.spyOn(process.stdout, "write").mockImplementation(capture(out));
  const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(capture(err));
  try {
    const wrote = runBalance([...argv]);
    return { stdout: out.join(""), stderr: err.join(""), exitCode: Number(process.exitCode ?? 0), wrote };
  } finally {
    errSpy.mockRestore();
    outSpy.mockRestore();
    process.exitCode = savedExitCode;
  }
}
