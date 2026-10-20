import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../main.js";
import { RUN_MANIFEST } from "./keptRun.js";

const TARGET = "every-outcome";
const RUN_ID = "r1";
const NO_VERDICT_LINE = "spec-controller stopped on an unexpected error, and gives no verdict: ";

interface Answered {
  threw: unknown;
  stderr: string;
  exitCode: typeof process.exitCode;
  runDir: string;
}

let scratch: string;
let stderr: string[];

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-manifest-unwritten-"));
  stderr = [];
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  rmSync(scratch, { recursive: true, force: true });
});

function keptRunWithManifestAsDirectory(): Answered {
  const corpus = fileURLToPath(new URL("../../../../tests/fixtures/every-outcome-corpus", import.meta.url));
  const storeRoot = join(scratch, "store");
  const runDir = join(storeRoot, TARGET, RUN_ID);
  mkdirSync(join(runDir, RUN_MANIFEST), { recursive: true });
  let threw: unknown;
  try {
    main([
      "--store", storeRoot, "--run-id", RUN_ID, "balance",
      "--features", join(corpus, "features"),
      "--vitest", join(corpus, "vitest.json"),
      "--cucumber", join(corpus, "cucumber.json"),
      "--ci", corpus,
      "--target", TARGET,
    ]);
  } catch (err) {
    threw = err;
  }
  return { threw, stderr: stderr.join(""), exitCode: process.exitCode, runDir };
}

describe("[SCN-CLI-109] a kept run whose manifest cannot be written did not finish, and ends at 6", () => {
  it("returns from main rather than throwing", () => {
    expect(keptRunWithManifestAsDirectory().threw).toBeUndefined();
  });

  it("exits 6, not the usage code", () => {
    expect(keptRunWithManifestAsDirectory().exitCode).toBe(6);
  });

  it("writes one line to stderr, the no-verdict line naming the write's EISDIR", () => {
    const { stderr: said } = keptRunWithManifestAsDirectory();
    expect(said.split("\n")).toHaveLength(2);
    expect(said.slice(0, NO_VERDICT_LINE.length)).toBe(NO_VERDICT_LINE);
    expect(said).toContain("EISDIR");
  });

  it("leaves the two reports it wrote in the run directory", () => {
    const { runDir } = keptRunWithManifestAsDirectory();
    expect(existsSync(join(runDir, "spec-reconciliation.md"))).toBe(true);
    expect(existsSync(join(runDir, "spec-reconciliation.json"))).toBe(true);
  });
});
