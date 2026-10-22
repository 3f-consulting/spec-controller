import { endRunOn, forgetRunEnding, UNEXPECTED_ERROR, usageRefusalSet, type ExitCodeHolder } from "./exitCode.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

interface LineWriter {
  write(chunk: string): unknown;
}

interface CrashingProcess extends ExitCodeHolder {
  on(event: "uncaughtException" | "unhandledRejection", listener: (err: unknown) => void): unknown;
  exit(code?: number | string | null): unknown;
}

interface ErroringStream {
  on(event: "error", listener: (err: unknown) => void): unknown;
}

// A verdict is read from the run finishing, never from an exit code being set: a refusal's 2 and the guard's own 6 are codes, not verdicts.
interface RunState {
  finished: boolean;
  lineWritten: boolean;
}

let run: RunState = { finished: false, lineWritten: false };

export function beginRun(): void {
  run = { finished: false, lineWritten: false };
  forgetRunEnding();
}

export function markRunFinished(): void {
  run.finished = true;
}

// An error that arrives after main has returned — a stream that fails, a throw in a later tick, a rejected promise — would otherwise reach Node's default handler and end the run at 1.
// Node treats a process past an uncaught exception as unsafe to resume, so that guard ends it once its line is written.
// The others leave the process to end when its work drains, so a report still being written is not cut short.
export function installCrashGuards(proc: CrashingProcess, stdout: ErroringStream, stderr: ErroringStream & LineWriter): void {
  beginRun();
  const settle = (err: unknown): void => settleUnexpectedError(err, proc, stderr);
  proc.on("uncaughtException", (err) => {
    settle(err);
    proc.exit(proc.exitCode);
  });
  proc.on("unhandledRejection", settle);
  stdout.on("error", settle);
  stderr.on("error", () => {
    settleExitCode(proc);
  });
}

interface LoadedProgram {
  main(argv: string[]): unknown;
}

// The guards are installed before the program's modules are evaluated, so a module that cannot load (a broken install, say) ends the run at 6, not at Node's 1.
export async function boot(
  proc: CrashingProcess,
  stdout: ErroringStream,
  stderr: ErroringStream & LineWriter,
  argv: string[],
  load: () => Promise<unknown>,
): Promise<void> {
  installCrashGuards(proc, stdout, stderr);
  let program: unknown;
  try {
    program = await load();
  } catch (err) {
    settleUnexpectedError(err, proc, stderr);
    return;
  }
  (program as LoadedProgram).main(argv);
}

// The code is settled first, so neither a value that cannot be formatted nor a stderr that cannot be written can leave the run on Node's 1.
// A run writes one line at most: a later error changes nothing and says nothing.
export function settleUnexpectedError(err: unknown, proc: ExitCodeHolder, stderr: LineWriter): void {
  if (run.lineWritten) return;
  run.lineWritten = true;
  settleExitCode(proc);
  try {
    stderr.write(unexpectedErrorLine(err, run.finished) + "\n");
  } catch {
    // stderr is what failed, and the exit code already says the run stopped.
  }
}

function settleExitCode(proc: ExitCodeHolder): void {
  if (run.finished || usageRefusalSet()) return;
  endRunOn(UNEXPECTED_ERROR, proc);
}

function unexpectedErrorLine(err: unknown, afterVerdict: boolean): string {
  const message = afterVerdict ? AppMessage.UnexpectedErrorAfterVerdict : AppMessage.UnexpectedError;
  return APP_MESSAGES[message](nameOf(err), firstLineOf(err));
}

function nameOf(err: unknown): string {
  if (!(err instanceof Error)) return typeof err;
  const name = readOrUndefined(() => err.name);
  return typeof name === "string" ? name : Error.name;
}

function firstLineOf(err: unknown): string {
  const message = readOrUndefined(() => (err instanceof Error ? err.message : String(err)));
  return typeof message === "string" ? (message.split("\n", 1)[0] ?? "") : "";
}

function readOrUndefined(read: () => unknown): unknown {
  try {
    return read();
  } catch {
    return undefined;
  }
}
