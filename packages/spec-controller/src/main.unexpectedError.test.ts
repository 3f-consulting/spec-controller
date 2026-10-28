import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./main.js";
import { refuse } from "./outputLocation.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";

interface Answered {
  threw: unknown;
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

let stderr: string[];

beforeEach(() => {
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function answer(argv: string[], onStdout: (chunk: string | Uint8Array) => boolean): Answered {
  vi.spyOn(process.stdout, "write").mockImplementation(onStdout);
  let threw: unknown;
  try {
    main(argv);
  } catch (err) {
    threw = err;
  }
  return { threw, stderr: stderr.join(""), exitCode: process.exitCode };
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

    it("returns from main rather than throwing", () => {
      expect(answer(argv(), onAClosedPipe).threw).toBeUndefined();
    });

    it("exits 6", () => {
      expect(answer(argv(), onAClosedPipe).exitCode).toBe(6);
    });

    it("writes one line to stderr, naming the error's class and the first line of its message", () => {
      const { stderr: said } = answer(argv(), onAClosedPipe);
      expect(said.split("\n")).toHaveLength(2);
      expect(said).toMatch(/\n$/);
      expect(said).toContain(`Error: ${FIRST_LINE}`);
    });

    it("writes neither the rest of the message nor a stack frame", () => {
      const { stderr: said } = answer(argv(), onAClosedPipe);
      expect(said).not.toContain(SECOND_LINE);
      expect(said).not.toMatch(/^\s+at /m);
    });
  });

  describe("a usage refusal that escapes the command", () => {
    const refusing = (): never => refuse("planted refusal");

    it("returns from main rather than throwing", () => {
      expect(answer([], refusing).threw).toBeUndefined();
    });

    it("exits 2, the usage code, not 6", () => {
      expect(answer([], refusing).exitCode).toBe(2);
    });

    it("writes the refusal's own message and nothing more", () => {
      expect(answer([], refusing).stderr).toBe("planted refusal\n");
    });
  });
});

const UNEXPECTED_ERROR_LINE = "spec-controller stopped on an unexpected error, and gives no verdict: ";

function messageGetterThrows(): Error {
  return Object.defineProperty(new Error("never read"), "message", {
    get(): never {
      throw new Error("the message getter threw");
    },
  });
}

describe("[SCN-CLI-103] an error that cannot be formatted still ends the run at 6, named on one line", () => {
  describe.each([
    { thrown: "a null-prototype object", make: (): unknown => Object.create(null), named: "object: " },
    { thrown: "an Error whose message getter throws", make: messageGetterThrows, named: "Error: " },
    { thrown: "an Error whose message is not a string", make: (): unknown => Object.assign(new Error(), { message: 42 }), named: "Error: " },
    { thrown: "an Error whose name is a symbol", make: (): unknown => Object.assign(new Error("boom"), { name: Symbol("planted") }), named: "Error: boom" },
  ])("a balance run whose report throws $thrown", ({ make, named }) => {
    const throwing = (): never => {
      throw make();
    };

    it("returns from main rather than throwing", () => {
      expect(answer(balance(), throwing).threw).toBeUndefined();
    });

    it("exits 6", () => {
      expect(answer(balance(), throwing).exitCode).toBe(6);
    });

    it("writes one line to stderr, naming it as an unexpected error, with no stack frame", () => {
      const { stderr: said } = answer(balance(), throwing);
      expect(said.split("\n")).toHaveLength(2);
      expect(said).toMatch(/\n$/);
      expect(said.startsWith(UNEXPECTED_ERROR_LINE)).toBe(true);
      expect(said).not.toMatch(/^\s+at /m);
    });

    it("names what it can read of the error and nothing it cannot", () => {
      expect(answer(balance(), throwing).stderr).toBe(`${UNEXPECTED_ERROR_LINE}${named}\n`);
    });
  });

  describe("a balance run whose error line cannot be written to stderr", () => {
    const stderrThrows = (): void => {
      vi.mocked(process.stderr.write).mockImplementation(() => {
        throw closedPipe();
      });
    };

    it("returns from main rather than throwing", () => {
      stderrThrows();
      expect(answer(balance(), onAClosedPipe).threw).toBeUndefined();
    });

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

    it("returns from main rather than throwing", () => {
      expect(answer(kept(), runDirectoryLine(true)).threw).toBeUndefined();
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
      expect(said).toBe(`spec-controller hit an unexpected error after its verdict: Error: ${FIRST_LINE}\n`);
      expect(said).not.toContain("gives no verdict");
    });
  });
});
