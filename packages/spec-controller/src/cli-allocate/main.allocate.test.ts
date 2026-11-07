import { beforeEach, describe, it, vi } from "vitest";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { main } from "../main.js";
import { runGit as git } from "./repository.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { expectAnsweredEnding } from "./answered.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "../programOutput.test-utils.js";

function repositoryHeaded(part: string, code: string): string {
  const repo = realpathSync(temporaryDirectory("main-allocate-"));
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features", `${part.toLowerCase()}.feature`), `@${part}\nFeature: part ${part}\n\n  @${code} @unit\n  Scenario: scenario 1\n    Given a step\n`);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

recordWhatTheProgramWrites();

function answerIn(cwd: string, argv: string[]): Written {
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  main(argv);
  return whatTheProgramWrote();
}

describe("[CLM-ALC-008] The code is printed alone on stdout, zero-padded to three digits", () => {
  let repo = "";

  beforeEach(() => {
    repo = repositoryHeaded("ONE", "CLM-ONE-7");
  });

  it("answers a claim code ending ONE-008 alone on stdout", () => {
    expectAnsweredEnding(answerIn(repo, ["allocate", "ONE"]), "ONE-008");
  });
});
