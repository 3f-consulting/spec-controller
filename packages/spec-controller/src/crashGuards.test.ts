import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { installCrashGuards, markRunFinished } from "./crashGuards.js";
import { endRunOn, USAGE_REFUSAL } from "./exitCode.js";
import { ARRIVALS, closedPipe, crashLine, FIRST_LINE, noVerdictLine } from "./crashGuards.test-utils.js";

type Happening = { stderr: string } | { exit: unknown };

interface StandInProcess extends EventEmitter {
  exitCode: number | undefined;
  exit(code?: number | string | null): void;
}

interface StandInStream extends EventEmitter {
  readonly written: string[];
  write(chunk: string): boolean;
}

function standInStream(record: (chunk: string) => void = () => {}): StandInStream {
  const written: string[] = [];
  const write = (chunk: string): boolean => {
    written.push(chunk);
    record(chunk);
    return true;
  };
  return Object.assign(new EventEmitter(), { written, write });
}

interface Guarded {
  proc: StandInProcess;
  stdout: StandInStream;
  stderr: StandInStream;
  happened: Happening[];
}

// The stand-in's exit records the call and returns, so a test can read what the guard did after it.
function guarded(exitCode?: number): Guarded {
  const happened: Happening[] = [];
  const exit = (code?: number | string | null): void => {
    happened.push({ exit: code });
  };
  const proc: StandInProcess = Object.assign(new EventEmitter(), { exitCode, exit });
  const stdout = standInStream();
  const stderr = standInStream((chunk) => happened.push({ stderr: chunk }));
  installCrashGuards(proc, stdout, stderr);
  return { proc, stdout, stderr, happened };
}

function refused(): Guarded {
  const g = guarded();
  endRunOn(USAGE_REFUSAL, g.proc);
  return g;
}

const afterVerdictLine = (): string => `${crashLine("Error", FIRST_LINE, true)}\n`;

const onStderr = (g: Guarded): boolean => g.stderr.emit("error", closedPipe());

afterEach(() => {
  process.exitCode = undefined;
});

describe("[CLM-CLI-107] a run writes at most one crash line, and never calls a refusal's code or its own 6 a verdict", () => {
  describe.each(ARRIVALS)("$arrival, then", ({ raise: raiseFirst }) => {
    describe.each(ARRIVALS)("$arrival, with no verdict reached", ({ raise: raiseSecond }) => {
      it("ends at 6", () => {
        const g = guarded();
        raiseFirst(g);
        raiseSecond(g);
        expect(g.proc.exitCode).toBe(6);
      });

      it("writes exactly one line, the no-verdict line", () => {
        const g = guarded();
        raiseFirst(g);
        raiseSecond(g);
        expect(g.stderr.written).toEqual([noVerdictLine()]);
      });
    });
  });

  describe.each(ARRIVALS)("$arrival after the guard's own 6", ({ raise }) => {
    it("keeps 6 and writes no second line", () => {
      const g = guarded();
      raise(g);
      const before = [...g.stderr.written];
      raise(g);
      expect(g.proc.exitCode).toBe(6);
      expect(g.stderr.written).toEqual(before);
    });

    it("after a 6 set when stderr failed, writes the no-verdict line, never the after-verdict line", () => {
      const g = guarded();
      onStderr(g);
      raise(g);
      expect(g.proc.exitCode).toBe(6);
      expect(g.stderr.written).toEqual([noVerdictLine()]);
    });
  });

  describe.each(ARRIVALS)("$arrival after a refusal's 2", ({ raise }) => {
    it("keeps 2", () => {
      const g = refused();
      raise(g);
      expect(g.proc.exitCode).toBe(2);
    });

    it("writes the no-verdict line once, even when a second error follows", () => {
      const g = refused();
      raise(g);
      raise(g);
      expect(g.stderr.written).toEqual([noVerdictLine()]);
    });
  });

  describe.each(ARRIVALS)("$arrival after the run finished on its verdict", ({ raise }) => {
    it.each([0, 1, 3, 4, 5])("keeps the verdict's %i and writes the after-verdict line once, even when a second error follows", (verdict) => {
      const g = guarded(verdict);
      markRunFinished();
      raise(g);
      raise(g);
      expect(g.proc.exitCode).toBe(verdict);
      expect(g.stderr.written).toEqual([afterVerdictLine()]);
    });
  });

  it("begins each run unfinished, with no line written", () => {
    const earlier = guarded(1);
    markRunFinished();
    ARRIVALS[0]!.raise(earlier);
    const g = guarded();
    ARRIVALS[0]!.raise(g);
    expect(g.proc.exitCode).toBe(6);
    expect(g.stderr.written).toEqual([noVerdictLine()]);
  });
});

const exits = (g: Guarded): unknown[] => g.happened.flatMap((h) => ("exit" in h ? [h.exit] : []));

const uncaught = ARRIVALS[1]!.raise;

describe("[CLM-CLI-108] an uncaught error ends the process once its line is written, on 6 or on the verdict kept", () => {
  it("with no verdict reached, ends the process at 6, once, after the no-verdict line", () => {
    const g = guarded();
    uncaught(g);
    expect(g.happened).toEqual([{ stderr: noVerdictLine() }, { exit: 6 }]);
  });

  it.each([0, 1, 3, 4, 5])("after the run finished on its verdict, ends the process on the verdict's %i, once, after the after-verdict line", (verdict) => {
    const g = guarded(verdict);
    markRunFinished();
    uncaught(g);
    expect(g.happened).toEqual([{ stderr: afterVerdictLine() }, { exit: verdict }]);
  });

  it("after a refusal's 2, ends the process on 2, once, after the no-verdict line", () => {
    const g = refused();
    uncaught(g);
    expect(g.happened).toEqual([{ stderr: noVerdictLine() }, { exit: 2 }]);
  });

  it("after an earlier error already wrote the run's line, ends the process at 6 with no second line", () => {
    const g = guarded();
    ARRIVALS[0]!.raise(g);
    uncaught(g);
    expect(g.happened).toEqual([{ stderr: noVerdictLine() }, { exit: 6 }]);
  });

  it("when stderr cannot be written, still ends the process at 6", () => {
    const g = guarded();
    g.stderr.write = (): boolean => {
      throw closedPipe();
    };
    uncaught(g);
    expect(exits(g)).toEqual([6]);
  });

  describe.each([ARRIVALS[0]!, ARRIVALS[2]!, { arrival: "an 'error' event on stderr", raise: onStderr }])("$arrival", ({ raise }) => {
    it("settles the code and leaves the process to drain, never ending it", () => {
      const g = guarded();
      raise(g);
      expect(g.proc.exitCode).toBe(6);
      expect(exits(g)).toEqual([]);
    });
  });
});
