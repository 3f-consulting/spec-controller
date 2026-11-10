import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

export interface Repository {
  readonly repo: string;
  readonly head: string;
}

export function committedRepository(prefix: string, origin?: string): Repository {
  const repo = realpathSync(temporaryDirectory(prefix));
  const git = (...args: string[]): string =>
    execFileSync("git", ["-C", repo, "-c", "user.email=fixture@example.invalid", "-c", "user.name=Fixture", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  git("init", "-q");
  git("commit", "--allow-empty", "-q", "-m", "a commit");
  if (origin !== undefined) git("remote", "add", "origin", origin);
  return { repo, head: git("rev-parse", "HEAD") };
}
