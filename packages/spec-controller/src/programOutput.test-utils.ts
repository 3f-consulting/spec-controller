import { afterEach, beforeEach, vi } from "vitest";

export interface Written {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

let stdout: string[] = [];
let stderr: string[] = [];

// Registers its hooks on the file that calls it: each test starts with nothing written and ends with no exit code set.
export function recordWhatTheProgramWrites(): void {
  beforeEach(() => {
    stdout = [];
    stderr = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
      stderr.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });
}

export function whatTheProgramWrote(): Written {
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

export function stderrWrites(): string[] {
  return stderr;
}

export function forgetWhatTheProgramWrote(): void {
  stdout.length = 0;
  stderr.length = 0;
}
