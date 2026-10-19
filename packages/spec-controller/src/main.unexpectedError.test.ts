import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./main.js";
import { refuse } from "./outputLocation.js";

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

function answer(argv: string[], onStdout: () => never): Answered {
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
