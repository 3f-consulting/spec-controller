import { afterEach, describe, it, vi } from "vitest";
import { commitAll, freshDirectory, git, writeInto } from "./repository.test-utils.js";
import { allocateIn, expectAnsweredEnding } from "./answered.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("[SCN-ALC-023] a part headed only by a feature file in a subdirectory of features, at any depth, is a known part and is offered its next code", () => {
  it("answers a claim code ending NEST-005 for NEST, headed two subdirectories down, without --new", () => {
    const repo = freshDirectory("allocate-nested-part-");
    git(repo, ["init", "-q", "-b", "main"]);
    writeInto(repo, "features/outer/inner/nest.feature", "@NEST\nFeature: part NEST\n\n  @SCN-NEST-004 @unit\n  Scenario: scenario 1\n    Given a step\n");
    commitAll(repo, "the corpus");

    const answered = allocateIn(repo, ["NEST"]);

    expectAnsweredEnding(answered, "NEST-005");
  });
});
