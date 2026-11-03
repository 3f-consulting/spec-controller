import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { runBalanceCaptured, type BalanceRun } from "../runBalance.test-utils.js";
import { removedWorkingDirectory } from "../vanishedWorkingDirectory.test-utils.js";

function balanceWhereCwdThrows(thrown: Error): BalanceRun {
  vi.spyOn(process, "cwd").mockImplementation(() => {
    throw thrown;
  });
  return runBalanceCaptured([]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("[SCN-CLI-100] a run from a working directory that no longer exists is refused as unreadable, naming the feature corpus read by default", () => {
  it("refuses with the usage status, naming the default corpus and the working directory's read failure", () => {
    const thrown = removedWorkingDirectory();
    let answered: BalanceRun | undefined;

    expect(() => {
      answered = balanceWhereCwdThrows(thrown);
    }).not.toThrow();

    expect(answered?.stdout).toBe("");
    expect(answered?.exitCode).toBe(2);
    expect(answered?.stderr).toBe(`${APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.DefaultFeatureCorpus](), "features", thrown.message)}\n`);
  });
});
