import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../main.js";
import { runGit as git } from "./repository.testkit.js";

function repositoryHeaded(part: string, code: string): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "main-allocate-")));
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features", `${part.toLowerCase()}.feature`), `@${part}\nFeature: part ${part}\n\n  @${code} @unit\n  Scenario: scenario 1\n    Given a step\n`);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

let stdout: string[];
let stderr: string[];

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

function answerIn(cwd: string, argv: string[]): Answered {
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  main(argv);
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

describe("[SCN-ALC-008] The code is printed alone on stdout, zero-padded to three digits", () => {
  let repo = "";

  beforeEach(() => {
    repo = repositoryHeaded("ONE", "SCN-ONE-7");
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("answers SCN-ONE-008 alone on stdout", () => {
    expect(answerIn(repo, ["allocate", "ONE"]).stdout).toBe("SCN-ONE-008\n");
  });
});
