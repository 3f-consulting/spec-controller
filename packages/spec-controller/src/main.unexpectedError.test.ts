import { EventEmitter } from "node:events";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { installCrashGuards } from "./crashGuards.js";
import { main } from "./main.js";
import { refuse } from "./outputLocation.js";
import { crashLine, noVerdictLine } from "./crashGuards.test-utils.js";
import { forgetWhatTheProgramWrote, recordWhatTheProgramWrites, whatTheProgramWrote } from "./programOutput.test-utils.js";

interface Answered {
  stderr: string;
  exitCode: typeof process.exitCode;
}

function balance(...flags: string[]): string[] {
  const target = fileURLToPath(new URL("../../../tests/fixtures/evidence-observation", import.meta.url));
  return [
    "balance",
    "--features", join(target, "features"),
    "--vitest", join(target, "vitest.json"),
    "--ci", target,
    ...flags,
  ];
}

const FIRST_LINE = "write EPIPE";
const SECOND_LINE = "the reader closed its end of the pipe";

function closedPipe(): Error {
  return Object.assign(new Error(`${FIRST_LINE}\n${SECOND_LINE}`), { code: "EPIPE", errno: -32, syscall: "write" });
}

recordWhatTheProgramWrites();

function answer(argv: string[], onStdout: (chunk: string | Uint8Array) => boolean): Answered {
  vi.spyOn(process.stdout, "write").mockImplementation(onStdout);
  main(argv);
  return { stderr: whatTheProgramWrote().stderr, exitCode: process.exitCode };
}

const onAClosedPipe = (): never => {
  throw closedPipe();
};

describe("[CLM-CLI-101] a balance run that stops on an unexpected error exits 6 and names the error on one line, under --exit-zero too", () => {
  describe.each([
    { run: "a balance run", flags: [] },
    { run: "a balance run under --exit-zero", flags: ["--exit-zero"] },
  ])("$run whose report meets a closed pipe", ({ flags }) => {
    const argv = (): string[] => balance(...flags);

    it("exits 6", () => {
      expect(answer(argv(), onAClosedPipe).exitCode).toBe(6);
    });

    it("writes one line to stderr, naming the error's class and the first line of its message", () => {
      expect(answer(argv(), onAClosedPipe).stderr).toBe(`${crashLine("Error", FIRST_LINE, false)}\n`);
    });
  });

  describe("a usage refusal that escapes the command", () => {
    const refusing = (): never => refuse({ lines: () => "planted refusal" });

    it("exits 2, the usage code, not 6", () => {
      expect(answer([], refusing).exitCode).toBe(2);
    });

    it("writes the refusal's own message and nothing more", () => {
      expect(answer([], refusing).stderr).toBe("planted refusal\n");
    });
  });
});

function messageGetterThrows(): Error {
  return Object.defineProperty(new Error("never read"), "message", {
    get(): never {
      throw new Error("the message getter threw");
    },
  });
}

describe("[CLM-CLI-103] an error that cannot be formatted still ends the run at 6, named on one line", () => {
  describe.each([
    { thrown: "a null-prototype object", make: (): unknown => Object.create(null), name: "object", firstLine: "" },
    { thrown: "an Error whose message getter throws", make: messageGetterThrows, name: "Error", firstLine: "" },
    { thrown: "an Error whose message is not a string", make: (): unknown => Object.assign(new Error(), { message: 42 }), name: "Error", firstLine: "" },
    { thrown: "an Error whose name is a symbol", make: (): unknown => Object.assign(new Error("boom"), { name: Symbol("planted") }), name: "Error", firstLine: "boom" },
    { thrown: "an Error whose name holds a placeholder", make: (): unknown => Object.assign(new Error("boom"), { name: "{firstLine}" }), name: "{firstLine}", firstLine: "boom" },
  ])("a balance run whose report throws $thrown", ({ make, name, firstLine }) => {
    const throwing = (): never => {
      throw make();
    };

    it("exits 6", () => {
      expect(answer(balance(), throwing).exitCode).toBe(6);
    });

    it("writes one line to stderr, naming it as an unexpected error, with no stack frame", () => {
      const { stderr: said } = answer(balance(), throwing);
      expect(said.split("\n")).toHaveLength(2);
      expect(said).toMatch(/\n$/);
      expect(said.startsWith(crashLine(name, firstLine, false))).toBe(true);
      expect(said).not.toMatch(/^\s+at /m);
    });

    it("names what it can read of the error and nothing it cannot", () => {
      expect(answer(balance(), throwing).stderr).toBe(`${crashLine(name, firstLine, false)}\n`);
    });
  });

  describe("a balance run whose error line cannot be written to stderr", () => {
    const stderrThrows = (): void => {
      vi.mocked(process.stderr.write).mockImplementation(() => {
        throw closedPipe();
      });
    };

    it("exits 6", () => {
      stderrThrows();
      expect(answer(balance(), onAClosedPipe).exitCode).toBe(6);
    });
  });
});

// The guards hold the real process's exit code and write to its stderr; only their stdout is a stand-in, so the test can fail it once main has returned, the way a closed pipe does.
function afterTheVerdict(argv: string[], stdoutFails: boolean): Answered & { stdout: string } {
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
  main(argv);
  if (stdoutFails) guardedStdout.emit("error", closedPipe());
  const { stdout, stderr } = whatTheProgramWrote();
  return { stdout, stderr, exitCode: process.exitCode };
}

describe("[CLM-CLI-104] an error raised after the verdict is set keeps the verdict's exit code", () => {
  describe.each([
    { run: "a balance run", flags: [] },
    { run: "a balance run under --exit-zero", flags: ["--exit-zero"] },
  ])("$run whose stdout meets a closed pipe once its verdict is set", ({ flags }) => {
    const live = (): string[] => balance(...flags);

    const verdictWithNoThrow = (): typeof process.exitCode => {
      const { exitCode } = afterTheVerdict(live(), false);
      process.exitCode = undefined;
      forgetWhatTheProgramWrote();
      return exitCode;
    };

    it("writes its report and nothing to stderr when nothing throws, so the planted throw lands after the verdict", () => {
      const { stdout: written, stderr: said } = afterTheVerdict(live(), false);
      expect(written.length).toBeGreaterThan(0);
      expect(said).toBe("");
    });

    it("ends on the code the same run gives with no throw, never 6", () => {
      const verdict = verdictWithNoThrow();
      const { exitCode } = afterTheVerdict(live(), true);
      expect(verdict).toBeDefined();
      expect(verdict).not.toBe(6);
      expect(exitCode).toBe(verdict);
    });

    it("names the error on one line, saying it came after the verdict and never that the run gives none", () => {
      const { stderr: said } = afterTheVerdict(live(), true);
      expect(said).toBe(`${crashLine("Error", FIRST_LINE, true)}\n`);
      expect(said).not.toContain("gives no verdict");
    });
  });
});

describe("[CLM-CLI-105] an error raised after the run's own call, on stdout, on stderr or as an uncaught exception, ends a run with no verdict at 6", () => {
  describe("an allocate --help run, whose stdout then meets a closed pipe", () => {
    const argv = (): string[] => ["allocate", "--help"];

    it("exits 6, because allocate gives no verdict", () => {
      expect(afterTheVerdict(argv(), true).exitCode).toBe(6);
    });

    it("names the error on the no-verdict line alone", () => {
      expect(afterTheVerdict(argv(), true).stderr).toBe(noVerdictLine());
    });
  });
});

describe("[CLM-CLI-107] a run writes at most one crash line, and never calls a refusal's code or its own 6 a verdict", () => {
  describe.each([
    { run: "an unknown command", argv: (): string[] => ["nosuchcommand"] },
    { run: "a balance run refused for an unknown flag", argv: (): string[] => balance("--no-such-flag") },
  ])("$run, whose stdout then meets a closed pipe", ({ argv }) => {
    it("keeps the refusal's 2", () => {
      expect(afterTheVerdict(argv(), true).exitCode).toBe(2);
    });

    it("ends on one no-verdict line, never the after-verdict line", () => {
      const { stderr: said } = afterTheVerdict(argv(), true);
      expect(said.endsWith(`\n${noVerdictLine()}`)).toBe(true);
      expect(said.split(noVerdictLine())).toHaveLength(2);
      expect(said).not.toContain(crashLine("Error", FIRST_LINE, true));
    });
  });
});

