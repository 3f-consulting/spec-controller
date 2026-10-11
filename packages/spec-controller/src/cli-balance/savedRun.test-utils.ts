import { vi } from "vitest";
import { join } from "node:path";
import { runBalanceCaptured } from "../../test-support/runBalance.js";

export function runPinned(argv: readonly string[]): { stdout: string; exitCode: number } {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-27T12:00:00.000Z"));
  try {
    const { stdout, exitCode } = runBalanceCaptured(argv);
    return { stdout, exitCode };
  } finally {
    vi.useRealTimers();
  }
}

// Each test file passes its own scratch directory and removes it in its own hook.
export function liveSaver(scratch: string): (name: string, argv: readonly string[]) => { json: string; md: string; exitCode: number } {
  return function saveLive(name: string, argv: readonly string[]): { json: string; md: string; exitCode: number } {
    const json = join(scratch, `${name}.json`);
    const md = join(scratch, `${name}.md`);
    const live = runPinned([...argv, "--format", `md:${md}`, "--format", `json:${json}`]);
    return { json, md, exitCode: live.exitCode };
  };
}
