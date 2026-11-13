import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

export interface TestFolder {
  readonly top: string;
  readonly write: (path: string, text: string) => void;
}

export interface TestRepository extends TestFolder {
  readonly git: (...args: string[]) => string;
  // Commits everything not ignored, and gives the new commit's SHA.
  readonly commit: (message: string) => string;
}

// A folder removed when the test that made it finishes.
export function folderForTest(): TestFolder {
  const top = temporaryDirectory("allocate-");
  return {
    top,
    write: (path, text) => {
      mkdirSync(dirname(join(top, path)), { recursive: true });
      writeFileSync(join(top, path), text);
    },
  };
}

export function repositoryForTest(): TestRepository {
  const folder = folderForTest();
  const git = (...args: string[]): string => execFileSync("git", args, { cwd: folder.top, encoding: "utf8" }).trim();
  git("init", "--quiet");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  git("config", "commit.gpgsign", "false");
  return {
    ...folder,
    git,
    commit: (message) => {
      git("add", "--all");
      git("commit", "--quiet", "--allow-empty", "--message", message);
      return git("rev-parse", "HEAD");
    },
  };
}

// A feature file tagged with its feature code, holding one scenario tagged with the given code, which sits on line 4.
export const featureFile = (featureCode: string, code: string): string => `@${featureCode}\nFeature: one\n\n  @${code}\n  Scenario: s\n    Given x\n`;

// A shallow clone of the repository, one commit deep, and the commit it starts from.
export function shallowCloneOf(repository: TestRepository): { readonly top: string; readonly firstCommit: string } {
  const clone = folderForTest();
  execFileSync("git", ["clone", "--quiet", "--depth", "1", `file://${repository.top}`, clone.top]);
  return { top: clone.top, firstCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: clone.top, encoding: "utf8" }).trim() };
}

// A checkout of its own inside the repository, as a submodule's is.
export function nestedCheckoutIn(repository: TestRepository, path: string): void {
  execFileSync("git", ["init", "--quiet", join(repository.top, path)]);
}
