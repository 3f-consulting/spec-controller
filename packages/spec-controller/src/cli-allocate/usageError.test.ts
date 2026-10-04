import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { runAllocate } from "./cli.js";

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

const made: string[] = [];

function headedOneCarryingThree(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-usage-error-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features/one.feature"), "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

function allocateIn(cwd: string, argv: string[]): Answered {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  runAllocate(argv);
  const exitCode = process.exitCode;
  vi.restoreAllMocks();
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const USAGE_ERROR = "spec-controller allocate: usage error — ";
const version = resolveToolIdentity().toolVersion;

interface Malformed {
  argv: string[];
  why: string;
}

const MALFORMED_REQUEST: Record<string, Malformed> = {
  "no part": {
    argv: [],
    why: "no feature part was given: 'spec-controller allocate <FFF>' takes one, a feature file's header code.",
  },
  "the part fit, in lower case": {
    argv: ["fit"],
    why: "'fit' is not a feature part in canon's form: two to five characters, each A-Z or 0-9.",
  },
  "the part F, one character long": {
    argv: ["F"],
    why: "'F' is not a feature part in canon's form: two to five characters, each A-Z or 0-9.",
  },
  "the part TOOLONG, seven characters long": {
    argv: ["TOOLONG"],
    why: "'TOOLONG' is not a feature part in canon's form: two to five characters, each A-Z or 0-9.",
  },
  "two parts, ONE and TWO": {
    argv: ["ONE", "TWO"],
    why:
      "The argument 'TWO' is more than 'spec-controller allocate' takes: it takes <FFF> once, and its flags.\n" +
      "Run 'spec-controller allocate --help' to see what this version accepts.",
  },
  "the part ONE and a flag it does not take": {
    argv: ["ONE", "--bogus"],
    why:
      `Unknown flag --bogus for 'spec-controller allocate' — this is spec-controller ${version}, and that flag is not in its allocate scope.\n` +
      "If this version is pinned, the pin and the tree it is reading have drifted apart: bump the pin to a version whose 'allocate' accepts --bogus.\n" +
      "Otherwise run 'spec-controller allocate --help' to see the flags this version accepts.",
  },
  "the part ONE and a host modifier given after the command": {
    argv: ["ONE", "--store", "runs"],
    why:
      "The --store flag is a host modifier: it goes before the command, as in 'spec-controller --store <value> allocate …', never after it.\n" +
      "Run 'spec-controller --help' to see the host modifiers this version accepts.",
  },
};

describe("[SCN-ALC-012] A request not in canon's form is refused as a usage error, never as an unknown part", () => {
  it.each(Object.keys(MALFORMED_REQUEST))("refuses %s at the usage status, giving no code", (request) => {
    const { argv, why } = MALFORMED_REQUEST[request] as Malformed;

    const answered = allocateIn(headedOneCarryingThree(), argv);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr.startsWith(USAGE_ERROR)).toBe(true);
    expect(answered.stderr).not.toMatch(/unknown part/);
    expect(answered.stderr).toBe(`${USAGE_ERROR}${why}\n`);
  });
});
