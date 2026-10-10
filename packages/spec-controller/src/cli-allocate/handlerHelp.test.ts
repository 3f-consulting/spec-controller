import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allocateCommand, renderCommandHelp } from "../cli-registry.js";
import { gitInRepository as git } from "./repository.testkit.js";
import { allocateIn } from "./answered.testkit.js";

const made: string[] = [];

function headedOneCarryingThree(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-help-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features/one.feature"), "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const HELP_REQUEST: readonly (readonly [request: string, argv: string[]])[] = [
  ["alone", ["--help"]],
  ["by its short name, alone", ["-h"]],
  ["after a part", ["ONE", "--help"]],
  ["after a part not in canon's form", ["fit", "--help"]],
  ["beside a flag the command does not take", ["--bogus", "--help"]],
];

describe("[SCN-ALC-013] allocate --help answers first, listing <FFF> and --new, and exits 0 whatever else is given", () => {
  it.each(HELP_REQUEST)("answers with allocate's help and gives no code, asked %s", (_request, argv) => {
    const answered = allocateIn(headedOneCarryingThree(), argv);

    expect(answered.stdout).toBe(renderCommandHelp(allocateCommand) + "\n");
    expect(answered.stdout).toContain("<FFF>");
    expect(answered.stdout).toContain("--new");
    expect(answered.stdout).not.toMatch(/^SCN-/m);
    expect(answered.stderr).toBe("");
    expect(answered.exitCode).toBeUndefined();
  });
});
