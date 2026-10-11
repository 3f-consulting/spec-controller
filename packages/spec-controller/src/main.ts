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
