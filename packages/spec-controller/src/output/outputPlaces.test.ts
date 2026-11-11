import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { allocateIn } from "../commands/answered.test-utils.js";
import { repositoryHeadedOneCarrying003 } from "../repository/repository.test-utils.js";
import { message } from "../messages/appText.js";
import { AppError, AppMessage } from "../messages/messages.js";
import { printedRefusal } from "../messages/shownText.test-utils.js";
import { closedPipe, crashLine, FIRST_LINE } from "../runEnding/crashGuards.test-utils.js";
import { main } from "../commands/main.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

interface Placed {
  stdout: string;
  stderr: string;
}

// Every chunk offered to stdout is kept, even one whose write then fails, so nothing can reach it unseen.
function balanceWhoseStdoutFails(): Placed {
  const target = fileURLToPath(new URL("../../../../tests/fixtures/evidence-observation", import.meta.url));
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    throw closedPipe();
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  main(["balance", "--features", join(target, "features"), "--vitest", join(target, "vitest.json"), "--ci", target]);
  return { stdout: stdout.join(""), stderr: stderr.join("") };
}

describe("an answer will be on standard output, and anything about it on standard error", () => {
  it("[CLM-CLI-162] allocate's answer will be on standard output", () => {
    const answered = allocateIn(repositoryHeadedOneCarrying003("output-places-answer-"), ["ONE"]);

    expect(answered.stdout).toBe("CLM-ONE-004\n");
    expect(answered.stderr).not.toContain("CLM-ONE-004");
  });

  it("[CLM-CLI-163] allocate's note will be on standard error", () => {
    const note = message(AppMessage.HighestSeenInTree, { code: "CLM-ONE-003", path: "features/one.feature", line: 4 });

    const answered = allocateIn(repositoryHeadedOneCarrying003("output-places-note-"), ["ONE"]);

    expect(answered.stderr).toContain(`${note}\n`);
    expect(answered.stdout).not.toContain(note);
  });

  it("[CLM-CLI-164] a validation failure will be on standard error", () => {
    const refusal = printedRefusal(AppError.NotAFeaturePart, message(AppError.NotAFeaturePart, { part: "one" }), "allocate");

    const answered = allocateIn(repositoryHeadedOneCarrying003("output-places-refusal-"), ["one"]);

    expect(answered.stderr).toContain(refusal);
    expect(answered.stdout).toBe("");
  });

  it("[CLM-CLI-165] an unexpected error will be on standard error", () => {
    const complaint = crashLine("Error", FIRST_LINE, false);

    const placed = balanceWhoseStdoutFails();

    expect(placed.stderr).toBe(`${complaint}\n`);
    expect(placed.stdout).not.toContain(complaint);
  });
});
