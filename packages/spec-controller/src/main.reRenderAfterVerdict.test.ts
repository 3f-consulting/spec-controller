import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installCrashGuards } from "./crashGuards.js";
import { main } from "./main.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";

interface ReRendered {
  threw: unknown;
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

const FIRST_LINE = "write EPIPE";

function closedPipe(): Error {
  return Object.assign(new Error(`${FIRST_LINE}\nthe reader closed its end of the pipe`), { code: "EPIPE", errno: -32, syscall: "write" });
}

function fixtureArgv(fixture: string): string[] {
  const dir = fileURLToPath(new URL(`../../../tests/fixtures/${fixture}`, import.meta.url));
  const argv = ["--features", join(dir, "features"), "--ci", dir];
  for (const [flag, file] of [["--vitest", "vitest.json"], ["--cucumber", "cucumber.json"], ["--package-json", "package.json"]] as const) {
    if (existsSync(join(dir, file))) argv.push(flag, join(dir, file));
  }
  return argv;
}

let scratch: string;
let stdout: string[];
let stderr: string[];

beforeEach(() => {
  scratch = temporaryDirectory("spec-controller-rerender-after-verdict-");
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

// The saved report is the product's own: a live balance run writing its JSON report.
function savedReport(fixture: string): { json: string; liveCode: typeof process.exitCode } {
  const json = join(scratch, `${fixture}.json`);
  main(["balance", ...fixtureArgv(fixture), "--format", `json:${json}`]);
  const liveCode = process.exitCode;
  process.exitCode = undefined;
  stdout.length = 0;
  stderr.length = 0;
  return { json, liveCode };
}

// The guards hold the real process's exit code and write to its stderr; only their stdout is a stand-in, so the test can fail it the way a closed pipe does.
function reRender(json: string, flags: string[], stdoutFails: boolean): ReRendered {
  const proc = Object.assign(new EventEmitter(), { exit: (): void => {} });
  Object.defineProperty(proc, "exitCode", {
    get: () => process.exitCode,
    set: (code: typeof process.exitCode) => {
      process.exitCode = code;
    },
  });
  const guardedStdout = new EventEmitter();
  const guardedStderr = Object.assign(new EventEmitter(), { write: (chunk: string): boolean => process.stderr.write(chunk) });
  installCrashGuards(proc as EventEmitter & { exitCode: number | undefined; exit(): void }, guardedStdout, guardedStderr);
  let threw: unknown;
  try {
    main(["balance", "--render-from-json", json, ...flags]);
  } catch (err) {
    threw = err;
  }
  const written = stdout.join("");
  if (stdoutFails) guardedStdout.emit("error", closedPipe());
  return { threw, stdout: written, stderr: stderr.join(""), exitCode: process.exitCode };
}

function afterVerdictLine(): string {
  return `${APP_MESSAGES[AppMessage.UnexpectedErrorAfterVerdict]("Error", FIRST_LINE)}\n`;
}

describe("[SCN-CLI-110] an error after a re-rendered report's verdict keeps that verdict, named on one line", () => {
  describe.each([
    { saved: "a balanced report", fixture: "balanced", flags: [], verdict: 0 },
    { saved: "an out-of-balance report", fixture: "evidence-observation", flags: [], verdict: 1 },
    { saved: "an unsound report", fixture: "every-outcome-corpus", flags: [], verdict: 4 },
    { saved: "an out-of-balance report under --exit-zero", fixture: "evidence-observation", flags: ["--exit-zero"], verdict: 0 },
  ])("a re-render of $saved whose stdout fails once the report is written", ({ fixture, flags, verdict }) => {
    it("re-renders from a report the live run saved, ending on the same code when nothing fails", () => {
      const { json, liveCode } = savedReport(fixture);
      const { exitCode, stdout: written, stderr: said } = reRender(json, flags, false);
      expect(written.length).toBeGreaterThan(0);
      expect(said).toBe("");
      expect(exitCode).toBe(verdict);
      if (flags.length === 0) expect(liveCode).toBe(verdict);
    });

    it("returns from main rather than throwing", () => {
      const { json } = savedReport(fixture);
      expect(reRender(json, flags, true).threw).toBeUndefined();
    });

    it(`ends on the saved report's verdict, ${verdict}, never 6`, () => {
      const { json } = savedReport(fixture);
      expect(reRender(json, flags, true).exitCode).toBe(verdict);
    });

    it("writes one line to stderr, saying the error came after the verdict and never that the run gives none", () => {
      const { json } = savedReport(fixture);
      const { stderr: said } = reRender(json, flags, true);
      expect(said).toBe(afterVerdictLine());
      expect(said).not.toContain("gives no verdict");
    });
  });
});
