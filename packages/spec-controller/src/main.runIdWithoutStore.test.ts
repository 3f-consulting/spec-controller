import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runBalance } from "./cli-balance/cli.js";
import { modifiersNotTakenRefusal, parseHostInvocation } from "./host.js";
import { main } from "./main.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";
import { storedReRenderRefusal, unstoredRunIdRefusal } from "./storedRun.js";

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
  expectedStderr: string | undefined;
  workingEntries: string[];
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

type Refusal = (argv: string[]) => string | undefined;

const refusedAsUnstored: Refusal = (argv) => unstoredRunIdRefusal(parseHostInvocation(argv));
const refusedAsReRender: Refusal = (argv) => storedReRenderRefusal(parseHostInvocation(argv));
const refusedAsModifiersNotTaken: Refusal = (argv) => modifiersNotTakenRefusal(parseHostInvocation(argv));

function inTemporaryWorkingDirectory(argvAt: (cwd: string) => string[], refusal: Refusal): Answered {
  const cwd = mkdtempSync(join(tmpdir(), "main-run-id-without-store-"));
  try {
    vi.spyOn(process, "cwd").mockReturnValue(cwd);
    const argv = argvAt(cwd);
    main(argv);
    const expected = refusal(argv);
    return {
      stdout: stdout.join(""),
      stderr: stderr.join(""),
      exitCode: process.exitCode,
      expectedStderr: expected === undefined ? undefined : expected + "\n",
      workingEntries: readdirSync(cwd),
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const OUT_OF_BALANCE = fileURLToPath(new URL("../../../tests/fixtures/evidence-observation", import.meta.url));
const TARGET = [
  "--features", join(OUT_OF_BALANCE, "features"),
  "--vitest", join(OUT_OF_BALANCE, "vitest.json"),
  "--ci", OUT_OF_BALANCE,
];
const balance = (): string[] => ["balance", ...TARGET];

let savedDir: string;
let savedReport: string;

beforeAll(() => {
  savedDir = mkdtempSync(join(tmpdir(), "main-run-id-without-store-saved-"));
  savedReport = join(savedDir, "saved.json");
  const quiet = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    runBalance([...TARGET, "--format", `json:${savedReport}`]);
  } finally {
    quiet.mockRestore();
    process.exitCode = undefined;
  }
  if (!existsSync(savedReport)) throw new Error("the out-of-balance target saved no report to re-render");
});

afterAll(() => {
  rmSync(savedDir, { recursive: true, force: true });
});

const KEEP_UNDER_NAME = APP_MESSAGES[AppMessage.KeepRunUnderName]("balance");
const RE_RENDER_WITHOUT_IT = APP_MESSAGES[AppMessage.ReRenderWithoutIt]();

const SHAPES: { shape: string; argvAt: (cwd: string) => string[]; refusal: Refusal; closing: string }[] = [
  {
    shape: "before a live balance run",
    argvAt: () => ["--run-id", "r1", ...balance()],
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a live balance run, under the report-only option",
    argvAt: () => ["--run-id", "r1", ...balance(), "--exit-zero"],
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a live balance run, under the strict option",
    argvAt: () => ["--run-id", "r1", ...balance(), "--strict"],
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a live balance run that writes its report to a file",
    argvAt: (cwd) => ["--run-id", "r1", ...balance(), "--format", `json:${join(cwd, "report.json")}`],
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a balance re-render of a saved report",
    argvAt: () => ["--run-id", "r1", "balance", "--render-from-json", savedReport],
    refusal: refusedAsReRender,
    closing: RE_RENDER_WITHOUT_IT,
  },
];

describe("[SCN-CLI-083] the host refuses --run-id given without --store as a usage fault, naming it", () => {
  describe.each(SHAPES)("$shape", ({ argvAt, refusal, closing }) => {
    it("refuses on stderr with exactly the refusal naming --run-id as naming a run that is not kept", () => {
      const answered = inTemporaryWorkingDirectory(argvAt, refusal);

      expect(answered.expectedStderr).toContain("--run-id");
      expect(answered.stderr).toBe(answered.expectedStderr);
    });

    it("closes the refusal with the way to run it that applies to this shape", () => {
      expect(inTemporaryWorkingDirectory(argvAt, refusal).stderr.split("\n").slice(-2)).toEqual([closing, ""]);
    });

    it("exits with the usage status", () => {
      expect(inTemporaryWorkingDirectory(argvAt, refusal).exitCode).toBe(2);
    });

    it("writes nothing to stdout", () => {
      expect(inTemporaryWorkingDirectory(argvAt, refusal).stdout).toBe("");
    });

    it("writes nothing to the working directory", () => {
      expect(inTemporaryWorkingDirectory(argvAt, refusal).workingEntries).toEqual([]);
    });
  });

  describe("before a command that takes no host modifier", () => {
    const argvAt = (): string[] => ["--run-id", "r1", "allocate", "CLI"];

    it("refuses with the modifiers-not-taken refusal, not the unkept-run one", () => {
      const answered = inTemporaryWorkingDirectory(argvAt, refusedAsModifiersNotTaken);

      expect(answered.stderr).toBe(answered.expectedStderr);
      expect(answered.stderr).not.toBe(`${refusedAsUnstored(argvAt()) ?? ""}\n`);
      expect(answered.exitCode).toBe(2);
      expect(answered.stdout).toBe("");
    });
  });
});
