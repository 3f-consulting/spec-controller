import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as guards from "./crashGuards.js";
import { standInStream, type StandInStream } from "./crashGuards.test-utils.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

interface StandInProcess extends EventEmitter {
  exitCode: number | undefined;
  exit(code?: number | string | null): void;
}

type Boot = (proc: StandInProcess, stdout: StandInStream, stderr: StandInStream, argv: string[], load: () => Promise<unknown>) => Promise<void>;

interface Booted {
  proc: StandInProcess;
  stdout: StandInStream;
  stderr: StandInStream;
}

async function booted(load: (b: Booted) => Promise<unknown>, argv: string[] = []): Promise<Booted> {
  const boot = (guards as Record<string, unknown>)["boot"];
  expect(typeof boot).toBe("function");
  const b: Booted = {
    proc: Object.assign(new EventEmitter(), { exitCode: undefined, exit: (): void => {} }),
    stdout: standInStream(),
    stderr: standInStream(),
  };
  await (boot as Boot)(b.proc, b.stdout, b.stderr, argv, () => load(b));
  return b;
}

const FIRST_LINE = "Cannot find package '@3f-consulting/spec-controller-core' imported from /install/dist/main.js";

function moduleNotFound(): Error {
  return Object.assign(new Error(`${FIRST_LINE}\nDid you mean to import "@3f-consulting/spec-controller-core/dist/index.js"?`), {
    code: "ERR_MODULE_NOT_FOUND",
  });
}

const failingLoad = (): Promise<unknown> => Promise.reject(moduleNotFound());

const noVerdictLine = (): string => `${APP_MESSAGES[AppMessage.UnexpectedError]("Error", FIRST_LINE)}\n`;

afterEach(() => {
  process.exitCode = undefined;
});

describe("[SCN-CLI-106] an error while the program loads ends the run at 6, named on one line", () => {
  describe("a load that fails because a module cannot be found", () => {
    it("sets the process's exit code to 6", async () => {
      const b = await booted(failingLoad);
      expect(b.proc.exitCode).toBe(6);
    });

    it("writes one line to stderr, naming the error, with no stack frame", async () => {
      const b = await booted(failingLoad);
      expect(b.stderr.written).toEqual([noVerdictLine()]);
    });

    it("writes nothing to stdout", async () => {
      const b = await booted(failingLoad);
      expect(b.stdout.written).toEqual([]);
    });

    it("leaves the exit code of the process the guards were not given alone", async () => {
      await booted(failingLoad);
      expect(process.exitCode).toBeUndefined();
    });
  });

  describe("a load that succeeds", () => {
    it("has the guards installed on the process and its streams before the program loads", async () => {
      const heard: number[] = [];
      await booted((b) => {
        heard.push(
          b.proc.listenerCount("uncaughtException"),
          b.proc.listenerCount("unhandledRejection"),
          b.stdout.listenerCount("error"),
          b.stderr.listenerCount("error"),
        );
        return Promise.resolve({ main: (): void => {} });
      });
      expect(heard).toEqual([1, 1, 1, 1]);
    });

    it("calls the loaded program's main once, with the argv, after it loads", async () => {
      const happened: string[] = [];
      await booted(
        () => {
          happened.push("load");
          return Promise.resolve({ main: (argv: string[]): number => happened.push(`main ${argv.join(" ")}`) });
        },
        ["balance", "--exit-zero"],
      );
      expect(happened).toEqual(["load", "main balance --exit-zero"]);
    });
  });

  describe("the bin", () => {
    it("loads the program only when boot calls the loader, and boots on the real process, its streams and the arguments after the script", async () => {
      const watched: [EventEmitter, string][] = [
        [process, "uncaughtException"],
        [process, "unhandledRejection"],
        [process.stdout, "error"],
        [process.stderr, "error"],
      ];
      const before = watched.map(([emitter, event]) => emitter.listeners(event));
      const argv = process.argv;
      process.argv = ["node", "spec-controller", "balance", "--exit-zero"];
      const boot = vi.fn();
      const main = (): void => {};
      const loadProgram = vi.fn(() => ({ main }));
      vi.resetModules();
      vi.doMock("./crashGuards.js", () => ({ boot }));
      vi.doMock("./main.js", loadProgram);
      try {
        await import("./cli.js");
        expect(loadProgram).not.toHaveBeenCalled();
        expect(boot).toHaveBeenCalledTimes(1);
        const [proc, stdout, stderr, args, load] = boot.mock.calls[0] as [unknown, unknown, unknown, unknown, () => Promise<{ main?: unknown }>];
        expect(proc).toBe(process);
        expect(stdout).toBe(process.stdout);
        expect(stderr).toBe(process.stderr);
        expect(args).toEqual(["balance", "--exit-zero"]);
        expect((await load()).main).toBe(main);
        expect(loadProgram).toHaveBeenCalledTimes(1);
      } finally {
        process.argv = argv;
        watched.forEach(([emitter, event], i) => {
          for (const listener of emitter.listeners(event)) {
            if (!before[i]?.includes(listener)) emitter.removeListener(event, listener as (...a: unknown[]) => void);
          }
        });
        vi.doUnmock("./crashGuards.js");
        vi.doUnmock("./main.js");
        vi.resetModules();
      }
    });
  });
});
