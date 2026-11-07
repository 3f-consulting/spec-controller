import { afterEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseFeatureCorpus } from "@3f-consulting/spec-controller-core";
import { allocateFrom } from "./answered.test-utils.js";
import { commitAll, freshDirectory, git, writeInto } from "./repository.test-utils.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";

const NOT_GHERKIN = "not gherkin at all {{{\n";

function parserWordsFor(source: string): string {
  const parse = parseFeatureCorpus([{ file: "two.feature", source }]);
  return parse.kind === "unparseable" ? parse.faults[0]!.message : "";
}

afterEach(() => {
  process.exitCode = undefined;
});

describe("[CLM-ALC-024] a feature file the Gherkin parser rejects is refused, naming the file and the parser's words, and no code is given", () => {
  it("refuses ONE at the usage status, naming features/two.feature above the parser's own words, and prints no code", () => {
    const repo = freshDirectory("allocate-not-gherkin-");
    git(repo, ["init", "-q", "-b", "main"]);
    writeInto(repo, "features/one.feature", "@ONE\nFeature: part ONE\n\n  @CLM-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n");
    writeInto(repo, "features/two.feature", NOT_GHERKIN);
    commitAll(repo, "the corpus");

    const answered = allocateFrom(repo);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr).toContain(
      message(AppError.CorpusFileUnparseable, {
        corpus: message(AppMessage.FeatureCorpus),
        file: join(repo, "features", "two.feature"),
        message: parserWordsFor(NOT_GHERKIN),
      }),
    );
  });
});
