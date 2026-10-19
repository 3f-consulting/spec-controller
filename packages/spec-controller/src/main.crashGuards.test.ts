import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import * as shell from "./main.js";

interface StandInProcess extends EventEmitter {
  exitCode: number | undefined;
}

interface StandInStream extends EventEmitter {
  readonly written: string[];
  write(chunk: string): boolean;
}

function standInStream(): StandInStream {
  const written: string[] = [];
  const write = (chunk: string): boolean => {
    written.push(chunk);
    return true;
  };
  return Object.assign(new EventEmitter(), { written, write });
}

type Installer = (proc: StandInProcess, stdout: StandInStream, stderr: StandInStream) => void;

interface Guarded {
  proc: StandInProcess;
  stdout: StandInStream;
  stderr: StandInStream;
}

function guarded(exitCode?: number): Guarded {
  const install = (shell as Record<string, unknown>)["installCrashGuards"];
  expect(typeof install).toBe("function");
  const proc: StandInProcess = Object.assign(new EventEmitter(), { exitCode });
  const stdout = standInStream();
  const stderr = standInStream();
  (install as Installer)(proc, stdout, stderr);
  return { proc, stdout, stderr };
}

const FIRST_LINE = "write EPIPE";

function closedPipe(): Error {
  return Object.assign(new Error(`${FIRST_LINE}\nthe reader closed its end of the pipe`), { code: "EPIPE" });
}

const NO_VERDICT_LINE = `spec-controller stopped on an unexpected error, and gives no verdict: Error: ${FIRST_LINE}\n`;

const ARRIVALS = [
  { arrival: "an 'error' event on stdout", raise: (g: Guarded): boolean => g.stdout.emit("error", closedPipe()) },
  { arrival: "an uncaught exception", raise: (g: Guarded): boolean => g.proc.emit("uncaughtException", closedPipe(), "uncaughtException") },
  { arrival: "an unhandled rejection", raise: (g: Guarded): boolean => g.proc.emit("unhandledRejection", closedPipe(), Promise.resolve()) },
];

const ON_STDERR = { arrival: "an 'error' event on stderr", raise: (g: Guarded): boolean => g.stderr.emit("error", closedPipe()) };

afterEach(() => {
  process.exitCode = undefined;
});

describe("[SCN-CLI-105] an error raised after the run's own call, on stdout, on stderr or as an uncaught exception, ends a run with no verdict at 6", () => {
  describe.each(ARRIVALS)("$arrival, with no verdict reached", ({ raise }) => {
    it("is heard by a listener the guards installed", () => {
      expect(raise(guarded())).toBe(true);
    });

    it("sets the process's exit code to 6", () => {
      const g = guarded();
      raise(g);
      expect(g.proc.exitCode).toBe(6);
    });

    it("writes one line to stderr, naming the error, with no stack frame", () => {
      const g = guarded();
      raise(g);
      expect(g.stderr.written).toEqual([NO_VERDICT_LINE]);
    });

    it("writes nothing to stdout", () => {
      const g = guarded();
      raise(g);
      expect(g.stdout.written).toEqual([]);
    });

    it("leaves the exit code of the process the guards were not given alone", () => {
      raise(guarded());
      expect(process.exitCode).toBeUndefined();
    });
  });

  describe("an 'error' event on stderr, with no verdict reached", () => {
    it("is heard by a listener the guards installed", () => {
      expect(ON_STDERR.raise(guarded())).toBe(true);
    });

    it("sets the process's exit code to 6", () => {
      const g = guarded();
      ON_STDERR.raise(g);
      expect(g.proc.exitCode).toBe(6);
    });

    it("writes nothing, because stderr is the stream that failed", () => {
      const g = guarded();
      ON_STDERR.raise(g);
      expect(g.stderr.written).toEqual([]);
      expect(g.stdout.written).toEqual([]);
    });
  });

  describe.each([...ARRIVALS, ON_STDERR])("$arrival, after the verdict is set", ({ raise }) => {
    it.each([0, 1, 4])("keeps the verdict's exit code %i", (verdict) => {
      const g = guarded(verdict);
      raise(g);
      expect(g.proc.exitCode).toBe(verdict);
    });
  });

  it("is installed by the bin on the real process and its streams before it calls main", () => {
    const bin = readFileSync(fileURLToPath(new URL("./cli.ts", import.meta.url)), "utf8").replace(/\s+/g, " ");
    const install = bin.indexOf("installCrashGuards(process, process.stdout, process.stderr)");
    expect(install).toBeGreaterThan(-1);
    expect(bin.indexOf("main(", install)).toBeGreaterThan(install);
  });
});
