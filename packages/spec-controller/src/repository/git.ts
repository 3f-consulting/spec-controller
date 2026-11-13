import { spawnSync } from "node:child_process";

export interface GitAnswer {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

// git speaks English, so what it says can be read; paths come back as written, not quoted. A git that cannot start says why.
export function gitIn(folder: string, args: readonly string[]): GitAnswer {
  const answer = spawnSync("git", ["-c", "core.quotepath=off", ...args], {
    cwd: folder,
    encoding: "utf8",
    maxBuffer: 1 << 30,
    env: { ...process.env, LC_ALL: "C" },
  });
  return { status: answer.status, stdout: answer.stdout, stderr: answer.error?.message ?? answer.stderr };
}
