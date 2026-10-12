import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./main.js";

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function answer(argv: string[]): Answered {
  main(argv);
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

function inTemporaryStore(run: (storeRoot: string) => Answered): Answered {
  const storeRoot = mkdtempSync(join(tmpdir(), "main-unknown-command-"));
  try {
    return run(storeRoot);
  } finally {
    rmSync(storeRoot, { recursive: true, force: true });
  }
}

const askTypo = (): Answered => answer(["blance"]);
const askNoCommand = (): Answered => answer(["nosuchcommand"]);
const askNoCommandStored = (): Answered => inTemporaryStore((storeRoot) => answer(["--store", storeRoot, "nosuchcommand"]));

const REQUESTS: { request: string; command: string; ask: () => Answered }[] = [
  { request: "a typo of a command", command: "blance", ask: askTypo },
  { request: "a name that is no command", command: "nosuchcommand", ask: askNoCommand },
  {
    request: "a name that is no command, as a stored run",
    command: "nosuchcommand",
    ask: askNoCommandStored,
  },
];

describe("[SCN-CLI-056] an unknown command is a usage fault", () => {
  describe.each(REQUESTS)("$request", ({ ask }) => {
    it("writes nothing to stdout", () => {
      expect(ask().stdout).toBe("");
    });
  });
});
