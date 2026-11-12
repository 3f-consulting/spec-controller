import { endRunOn, UNEXPECTED_ERROR, type ExitCodeHolder } from "./exitCode.js";
import APP_TEXTS from "../messages/messages.en.json" with { type: "json" };
import { AppError, type AppErrorValues, type CrashError } from "../messages/messages.js";
import { standardError, type CodedLine, type LineWriter } from "./standardError.js";

interface CrashingProcess extends ExitCodeHolder {
  on(event: "uncaughtException" | "unhandledRejection", listener: (err: unknown) => void): unknown;
  exit(code?: number | string | null): unknown;
}

interface ErroringStream {
  on(event: "error", listener: (err: unknown) => void): unknown;
}

// A verdict is read from the run finishing, never from an exit code being set: a refusal's 2 and the guard's own 4 are codes, not verdicts.
// A run that has not finished, or has written no line, holds no mark for it.
interface RunState {
  finished?: true;
  lineWritten?: true;
}

let run: RunState = {};

export function beginRun(): void {
  run = {};
}

export function markRunFinished(): void {
  run.finished = true;
}

// An error that arrives after main has returned — a stream that fails, a throw in a later tick, a rejected promise — would otherwise reach Node's default handler and end the run at 1.
// Node treats a process past an uncaught exception as unsafe to resume, so that guard ends it once its line is written.
// The others leave the process to end when its work drains, so a report still being written is not cut short.
export function installCrashGuards(proc: CrashingProcess, stdout: ErroringStream, stderr: LineWriter): void {
  beginRun();
  const settle = (err: unknown): void => settleUnexpectedError(err, proc, stderr);
  proc.on("uncaughtException", (err) => {
    settle(err);
    proc.exit(proc.exitCode);
  });
  proc.on("unhandledRejection", settle);
  stdout.on("error", settle);
}

interface LoadedProgram {
  main(argv: string[]): unknown;
}

// The guards are installed before the program's modules are evaluated, so a module that cannot load (a broken install, say) ends the run at 4, not at Node's 1.
export async function boot(
  proc: CrashingProcess,
  stdout: ErroringStream,
  stderr: LineWriter,
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

// The code is settled first, so a value that cannot be formatted cannot leave the run on Node's 1.
// A run writes one line at most: a later error changes nothing and says nothing.
export function settleUnexpectedError(err: unknown, proc: ExitCodeHolder, stderr: LineWriter): void {
  if (run.lineWritten) return;
  run.lineWritten = true;
  settleExitCode(proc);
  standardError(stderr).error(unexpectedErrorLine(err, run.finished));
}

function settleExitCode(proc: ExitCodeHolder): void {
  if (run.finished) return;
  endRunOn(UNEXPECTED_ERROR, proc);
}

const CRASH_TEXTS: Readonly<Record<CrashError, string>> = APP_TEXTS;

function unexpectedErrorLine(err: unknown, afterVerdict: true | undefined): CodedLine {
  const code = afterVerdict ? AppError.UnexpectedErrorAfterVerdict : AppError.UnexpectedError;
  return filled(CRASH_TEXTS[code], { name: nameOf(err), firstLine: firstLineOf(err) }) as CodedLine;
}

// Both placeholders are filled in one pass, so a value holding a placeholder or a brace is printed as given.
function filled(text: string, values: AppErrorValues[CrashError]): string {
  return text.replace(/\{(name|firstLine)\}/g, (_, key: keyof typeof values) => values[key]);
}

function nameOf(err: unknown): string {
  return (err as Error | undefined)?.name ?? "";
}

function firstLineOf(err: unknown): string {
  try {
    return (err as Error).message.split("\n", 1)[0]!;
  } catch {
    return "";
  }
}
