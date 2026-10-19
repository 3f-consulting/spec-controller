import { dirname } from "node:path";

import { runBalance } from "./cli-balance/cli.js";
import { inputsReadBy, NODE_INPUT_READER } from "./cli-balance/inputsRead.js";
import { parseArgs } from "./cli-args.js";
import { runAllocate } from "./cli-allocate/cli.js";
import { resolveSourceSha, resolveToolIdentity } from "./run-management/resolveRunInputs.js";
import {
  executeKeptRun,
  resolveRunId,
  type KeptRunSpec,
  type RouteOutputs,
  type RunManifestMeta,
} from "./run-management/keptRun.js";
import {
  parseHostInvocation,
  wrapCommandArgv,
  peekFlag,
  formatFilePaths,
  answerUnknownCommand,
  modifiersNotTakenRefusal,
  type HostInvocation,
} from "./host.js";
import { cliRegistry, renderTopLevelHelp } from "./cli-registry.js";
import { dispatchesUnstored, storedReRenderRefusal, unstoredRunIdRefusal } from "./storedRun.js";
import { settlingRefusal } from "./outputLocation.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

// A process outcome, not a verdict: the ledger was never finished, so no verdict code may stand for it.
const UNEXPECTED_ERROR_EXIT_CODE = 6;

function runCommand(command: string, argv: string[], ownRunDir?: string): boolean {
  switch (command) {
    case "balance":
      return runBalance(argv, ownRunDir);
    case "allocate":
      runAllocate(argv);
      return false;
    default: {
      const answer = answerUnknownCommand(command, renderTopLevelHelp(cliRegistry));
      process.stderr.write(answer.stderr);
      process.exitCode = answer.exitCode;
      return false;
    }
  }
}

function refuseLeadingFaults(inv: HostInvocation): boolean {
  const refusal = leadingRefusal(inv);
  if (refusal === undefined) return false;
  process.stderr.write(refusal + "\n");
  process.exitCode = 2;
  return true;
}

function leadingRefusal(inv: HostInvocation): string | undefined {
  return inv.refusal ?? modifiersNotTakenRefusal(inv) ?? storedReRenderRefusal(inv) ?? unstoredRunIdRefusal(inv);
}

export function main(hostArgv: string[]): void {
  try {
    settlingRefusal(() => run(hostArgv), undefined);
  } catch (err) {
    settleUnexpectedError(err, process, process.stderr);
  }
}

interface ExitCodeHolder {
  exitCode?: number | string | null | undefined;
}

interface LineWriter {
  write(chunk: string): unknown;
}

interface CrashingProcess extends ExitCodeHolder {
  on(event: "uncaughtException" | "unhandledRejection", listener: (err: unknown) => void): unknown;
}

interface ErroringStream {
  on(event: "error", listener: (err: unknown) => void): unknown;
}

// An error that arrives after main has returned — a stream that fails, a throw in a later tick, a rejected promise — would otherwise reach Node's default handler and end the run at 1.
// The guards never call exit: the process ends when its work drains, so a report still being written is not cut short.
export function installCrashGuards(proc: CrashingProcess, stdout: ErroringStream, stderr: ErroringStream & LineWriter): void {
  const settle = (err: unknown): void => settleUnexpectedError(err, proc, stderr);
  proc.on("uncaughtException", settle);
  proc.on("unhandledRejection", settle);
  stdout.on("error", settle);
  stderr.on("error", () => {
    settleExitCode(proc);
  });
}

// The code is settled first, so neither a value that cannot be formatted nor a stderr that cannot be written can leave the run on Node's 1.
// A code already set is a verdict or a refusal the run reached, and it stands.
function settleUnexpectedError(err: unknown, proc: ExitCodeHolder, stderr: LineWriter): void {
  const afterVerdict = settleExitCode(proc);
  try {
    stderr.write(unexpectedErrorLine(err, afterVerdict) + "\n");
  } catch {
    // stderr is what failed, and the exit code already says the run stopped.
  }
}

// Answers whether a verdict was already reached.
function settleExitCode(proc: ExitCodeHolder): boolean {
  const afterVerdict = proc.exitCode != null;
  proc.exitCode ??= UNEXPECTED_ERROR_EXIT_CODE;
  return afterVerdict;
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

function run(hostArgv: string[]): void {
  const inv = parseHostInvocation(hostArgv);
  if (refuseLeadingFaults(inv)) return;
  const command = inv.command;

  if (command === undefined || asksForHelp(command)) {
    process.stdout.write(renderTopLevelHelp(cliRegistry) + "\n");
    return;
  }

  dispatch(inv, command);
}

function asksForHelp(command: string): boolean {
  return command === "help" || command === "--help" || command === "-h";
}

function dispatch(inv: HostInvocation, command: string): void {
  if (dispatchesUnstored(inv) || inv.store === undefined) {
    runCommand(command, inv.commandArgs);
    return;
  }
  runKept(inv, command, inv.store);
}

function runKept(inv: HostInvocation, command: string, storeRoot: string): void {
  const runId = resolveRunId({ runId: inv.runId, now: new Date() });
  const target = peekFlag(inv.commandArgs, "target") ?? "unknown-target";
  const sourceSha = sourceShaOf(inv.commandArgs);

  const spec: KeptRunSpec = {
    storeRoot,
    target,
    runId,
    formatPaths: formatFilePaths(inv.commandArgs),
    inputs: inputsReadBy(parseArgs(inv.commandArgs), NODE_INPUT_READER),
  };
  const meta = manifestMeta(sourceSha);

  const route: RouteOutputs = (formatSpecs, runDir) => runCommand(command, wrapCommandArgv(inv.commandArgs, [...formatSpecs]), runDir);
  const plan = settlingRefusal(() => executeKeptRun(spec, meta, route), undefined);

  if (plan !== undefined) process.stdout.write(plan.runDir + "\n");
}

function sourceShaOf(commandArgs: string[]): string {
  const features = peekFlag(commandArgs, "features");
  return (
    resolveSourceSha({
      sourceSha: peekFlag(commandArgs, "source-sha"),
      targetDir: features !== undefined ? dirname(features) : undefined,
    }) ?? "unknown"
  );
}

function manifestMeta(sourceSha: string): RunManifestMeta {
  const toolIdentity = resolveToolIdentity();
  return {
    sourceSha,
    toolSha: toolIdentity.toolSha ?? "unknown",
    toolVersion: toolIdentity.toolVersion,
    mode: "balance",
    date: new Date().toISOString(),
  };
}
