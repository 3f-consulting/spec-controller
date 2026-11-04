import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./main.js";
import { refuse } from "./outputLocation.js";
import { crashLine } from "./crashGuards.test-utils.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote } from "./programOutput.test-utils.js";

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

describe("[SCN-CLI-101] a balance run that stops on an unexpected error exits 6 and names the error on one line, under --exit-zero too", () => {
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

describe("[SCN-CLI-103] an error that cannot be formatted still ends the run at 6, named on one line", () => {
  describe.each([
    { thrown: "a null-prototype object", make: (): unknown => Object.create(null), name: "object", firstLine: "" },
    { thrown: "an Error whose message getter throws", make: messageGetterThrows, name: "Error", firstLine: "" },
    { thrown: "an Error whose message is not a string", make: (): unknown => Object.assign(new Error(), { message: 42 }), name: "Error", firstLine: "" },
    { thrown: "an Error whose name is a symbol", make: (): unknown => Object.assign(new Error("boom"), { name: Symbol("planted") }), name: "Error", firstLine: "boom" },
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

describe("[SCN-CLI-104] an error raised after the verdict is set keeps the verdict's exit code", () => {
  describe.each([
    { run: "a kept balance run", flags: [] },
    { run: "a kept balance run under --exit-zero", flags: ["--exit-zero"] },
  ])("$run whose run-directory line meets a closed pipe", ({ flags }) => {
    let store: string;

    beforeEach(() => {
      store = temporaryDirectory("spec-controller-kept-");
    });

    const kept = (): string[] => ["--store", store, ...balance(...flags)];

    const runDirectoryLine = (throws: boolean) => (chunk: string | Uint8Array): boolean => {
      if (throws && String(chunk).startsWith(store)) throw closedPipe();
      return true;
    };

    const verdictWithNoThrow = (): typeof process.exitCode => {
      const { exitCode } = answer(kept(), runDirectoryLine(false));
      process.exitCode = undefined;
      return exitCode;
    };

    it("prints the run directory when nothing throws, so the planted throw lands on that line", () => {
      const printed: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
        printed.push(String(chunk));
        return true;
      });
      main(kept());
      expect(printed.some((line) => line.startsWith(store))).toBe(true);
    });

    it("ends on the code the same run gives with no throw, never 6", () => {
      const verdict = verdictWithNoThrow();
      const { exitCode } = answer(kept(), runDirectoryLine(true));
      expect(verdict).toBeDefined();
      expect(verdict).not.toBe(6);
      expect(exitCode).toBe(verdict);
    });

    it("names the error on one line, saying it came after the verdict and never that the run gives none", () => {
      const { stderr: said } = answer(kept(), runDirectoryLine(true));
      expect(said).toBe(`${crashLine("Error", FIRST_LINE, true)}\n`);
      expect(said).not.toContain("gives no verdict");
    });
  });
});

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — an unexpected error before its verdict", () => {
  it("names a balance run's closed pipe with [unexpected-error] once, after the words that it stopped", () => {
    expect(answer(balance(), onAClosedPipe).stderr).toBe(
      `spec-controller stopped on an unexpected error [unexpected-error], and gives no verdict: Error: ${FIRST_LINE}\n`,
    );
  });
});

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — an unexpected error that cannot be formatted", () => {
  it("names a thrown null-prototype object with [unexpected-error] once, as the same line with nothing it cannot read", () => {
    const throwing = (): never => {
      throw Object.create(null);
    };
    expect(answer(balance(), throwing).stderr).toBe(
      "spec-controller stopped on an unexpected error [unexpected-error], and gives no verdict: object: \n",
    );
  });
});

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — an unexpected error after its verdict", () => {
  it("names a kept run's closed pipe on its run-directory line with [unexpected-error-after-verdict] once", () => {
    const store = temporaryDirectory("spec-controller-kept-");
    const onTheRunDirectoryLine = (chunk: string | Uint8Array): boolean => {
      if (String(chunk).startsWith(store)) throw closedPipe();
      return true;
    };
    expect(answer(["--store", store, ...balance()], onTheRunDirectoryLine).stderr).toBe(
      `spec-controller hit an unexpected error [unexpected-error-after-verdict] after its verdict: Error: ${FIRST_LINE}\n`,
    );
  });
});
