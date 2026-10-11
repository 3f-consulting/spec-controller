import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, writeInto, commitAll } from "./repository.test-utils.js";
import { allocateIn } from "./answered.test-utils.js";

function featureFile(part: string, codes: readonly string[]): string {
  const scenarios = codes.map((code, i) => `  @${code} @unit\n  Scenario: scenario ${i + 1}\n    Given a step\n`);
  return `@${part}\nFeature: part ${part}\n\n${scenarios.join("\n")}`;
}

const made: string[] = [];

// Beside the two headed files: a feature file with no header code, and a file
// that is not a feature file but reads like one headed SIX. Neither may add a
// part to the refusal's list.
function headedOneAndTwo(): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "allocate-unknown-part-")));
  made.push(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  writeInto(repo, "features/one.feature", featureFile("ONE", ["SCN-ONE-001"]));
  writeInto(repo, "features/two.feature", featureFile("TWO", ["SCN-TWO-001"]));
  writeInto(repo, "features/unheaded.feature", "Feature: no part\n\n  Scenario: scenario 1\n    Given a step\n");
  writeInto(repo, "features/six.feature.md", featureFile("SIX", ["SCN-SIX-001"]));
  commitAll(repo, "the corpus");
  return repo;
}

function mentionNothing(): void {}

function addAFixtureHeadedZzz(repo: string): void {
  writeInto(repo, "tests/fixtures/sample/features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-004"]));
  commitAll(repo, "a test fixture");
}

function addThenDeleteAFeatureHeadedZzz(repo: string): void {
  writeInto(repo, "features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-009"]));
  commitAll(repo, "a feature that did not last");
  git(repo, ["rm", "-q", "features/zzz.feature"]);
  git(repo, ["commit", "-q", "-m", "retire the feature"]);
}

const WHERE: readonly (readonly [where: string, arrange: (repo: string) => void])[] = [
  ["no file mentions ZZZ", mentionNothing],
  ["a test fixture's feature file is headed ZZZ and carries SCN-ZZZ-004", addAFixtureHeadedZzz],
  ["a feature file headed ZZZ was deleted by a later commit", addThenDeleteAFeatureHeadedZzz],
];

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-010] a part no feature file's header carries is refused as an unknown part, listing the header codes and nothing else", () => {
  it.each(WHERE)("refuses ZZZ at the usage status, listing ONE and TWO alone, where %s", (_where, arrange) => {
    const repo = headedOneAndTwo();
    arrange(repo);

    const answered = allocateIn(repo, ["ZZZ"]);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr).toBe(
      "spec-controller allocate: unknown part — no feature file's header carries ZZZ.\n" +
        "The parts this corpus's feature files carry: ONE, TWO.\n",
    );
  });
});
