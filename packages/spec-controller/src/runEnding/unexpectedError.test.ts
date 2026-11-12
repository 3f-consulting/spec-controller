import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boot, installCrashGuards } from "./crashGuards.js";
import { ARRIVALS, closedPipe, crashLine, noVerdictLine, standInStream, type StandInStream } from "./crashGuards.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

type Happening = { stderr: string } | { exit: unknown };

interface StandInProcess extends EventEmitter {
  exitCode: number | undefined;
  exit(code?: number | string | null): void;
}

interface Guarded {
  proc: StandInProcess;
  stdout: StandInStream;
  stderr: StandInStream;
  happened: Happening[];
}

// The stand-in's exit records the call and returns, so a test can read what the guard did after it.
function standIns(): Guarded {
  const happened: Happening[] = [];
  const proc: StandInProcess = Object.assign(new EventEmitter(), {
    exitCode: undefined,
    exit: (code?: number | string | null): void => {
      happened.push({ exit: code });
    },
  });
  const stderr = standInStream();
  const write = stderr.write;
  stderr.write = (chunk: string): boolean => {
    happened.push({ stderr: chunk });
    return write(chunk);
  };
  return { proc, stdout: standInStream(), stderr, happened };
}

function guarded(): Guarded {
  const g = standIns();
  installCrashGuards(g.proc, g.stdout, g.stderr);
  return g;
}

function messageGetterThrows(): Error {
  return Object.defineProperty(new Error("never read"), "message", {
    get(): never {
      throw new Error("the message getter threw");
    },
  });
}

const LOAD_FIRST_LINE = "Cannot find package '@3f-consulting/spec-controller-core' imported from /install/dist/main.js";

function moduleNotFound(): Error {
  return Object.assign(new Error(`${LOAD_FIRST_LINE}\nDid you mean to import "@3f-consulting/spec-controller-core/dist/index.js"?`), {
    code: "ERR_MODULE_NOT_FOUND",
  });
}

describe("the run will give no verdict, and will exit 4", () => {
  it.each([
    ["an 'error' event on stdout", 0, []],
    ["an uncaught exception", 1, [{ exit: 4 }]],
    ["an unhandled rejection", 2, []],
  ])("[CLM-CLI-176] the run met an error nothing else handles, arriving as %s", (_arrival, arrival, afterTheLine) => {
    const g = guarded();

    ARRIVALS[arrival]!.raise(g);

    expect(g.proc.exitCode).toBe(4);
    expect(g.happened).toEqual([{ stderr: noVerdictLine() }, ...afterTheLine]);
  });

  it("[CLM-CLI-177] the run met an error that cannot be formatted", () => {
    const g = guarded();

    g.proc.emit("uncaughtException", messageGetterThrows(), "uncaughtException");

    expect(g.proc.exitCode).toBe(4);
    expect(g.happened).toEqual([{ stderr: `${crashLine("Error", "", false)}\n` }, { exit: 4 }]);
  });

  it("[CLM-CLI-179] the run met an error while the program loads", async () => {
    const g = standIns();

    await boot(g.proc, g.stdout, g.stderr, [], () => Promise.reject(moduleNotFound()));

    expect(g.proc.exitCode).toBe(4);
    expect(g.stderr.written).toEqual([`${crashLine("Error", LOAD_FIRST_LINE, false)}\n`]);
    expect(g.stdout.written).toEqual([]);
  });
});

describe("a run will complain about only one unexpected error", () => {
  it("[CLM-CLI-182] a run that met two unexpected errors", () => {
    const g = guarded();
    const second = Object.assign(new Error("the second error"), { name: "RangeError" });

    g.stdout.emit("error", closedPipe());
    g.proc.emit("unhandledRejection", second, Promise.resolve());

    expect(g.stderr.written).toEqual([noVerdictLine()]);
  });
});
