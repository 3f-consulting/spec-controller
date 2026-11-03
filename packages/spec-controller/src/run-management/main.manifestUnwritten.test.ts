import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { main } from "../main.js";
import { RUN_MANIFEST } from "./keptRun.js";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote } from "../programOutput.test-utils.js";

const TARGET = "every-outcome";
const RUN_ID = "r1";

interface Answered {
  stderr: string;
  exitCode: typeof process.exitCode;
  runDir: string;
}

let scratch: string;

recordWhatTheProgramWrites();

beforeEach(() => {
  scratch = temporaryDirectory("spec-controller-manifest-unwritten-");
});

function keptRunWithManifestAsDirectory(): Answered {
  const corpus = fileURLToPath(new URL("../../../../tests/fixtures/every-outcome-corpus", import.meta.url));
  const storeRoot = join(scratch, "store");
  const runDir = join(storeRoot, TARGET, RUN_ID);
  mkdirSync(join(runDir, RUN_MANIFEST), { recursive: true });
  main([
    "--store", storeRoot, "--run-id", RUN_ID, "balance",
    "--features", join(corpus, "features"),
    "--vitest", join(corpus, "vitest.json"),
    "--cucumber", join(corpus, "cucumber.json"),
    "--ci", corpus,
    "--target", TARGET,
  ]);
  return { stderr: whatTheProgramWrote().stderr, exitCode: process.exitCode, runDir };
}

describe("[SCN-CLI-109] a kept run whose manifest cannot be written did not finish, and ends at 6", () => {
  it("exits 6, not the usage code", () => {
    expect(keptRunWithManifestAsDirectory().exitCode).toBe(6);
  });

  it("writes one line to stderr, the no-verdict line naming the write's EISDIR", () => {
    const { stderr: said } = keptRunWithManifestAsDirectory();
    expect(said.split("\n")).toHaveLength(2);
    expect(said.startsWith(APP_MESSAGES[AppMessage.UnexpectedError]("Error", ""))).toBe(true);
    expect(said).toContain("EISDIR");
  });

  it("leaves the two reports it wrote in the run directory", () => {
    const { runDir } = keptRunWithManifestAsDirectory();
    expect(existsSync(join(runDir, "spec-reconciliation.md"))).toBe(true);
    expect(existsSync(join(runDir, "spec-reconciliation.json"))).toBe(true);
  });
});
