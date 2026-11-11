import { runBalance } from "./balance.js";
import { runAllocate } from "./allocate.js";
import { parseHostInvocation, answerUnknownCommand, type HostInvocation } from "../runRequest/host.js";
import { cliRegistry, renderTopLevelHelp } from "../runRequest/cliRegistry.js";
import { settlingRefusal } from "../output/outputLocation.js";
import { beginRun, markRunFinished, settleUnexpectedError } from "../runEnding/crashGuards.js";
import { endRunOn, USAGE_REFUSAL } from "../runEnding/exitCode.js";
import { standardError } from "../runEnding/standardError.js";

function runCommand(command: string, argv: string[]): boolean {
  switch (command) {
    case "balance":
      return runBalance(argv);
    case "allocate":
      runAllocate(argv);
      return false;
    default: {
      const answer = answerUnknownCommand(command, renderTopLevelHelp(cliRegistry));
      standardError(process.stderr).error(answer.refusal);
      endRunOn({ kind: "answer", code: answer.exitCode });
      return false;
    }
  }
}

function refuseLeadingFaults(inv: HostInvocation): boolean {
  if (inv.refusal === undefined) return false;
  standardError(process.stderr).error(inv.refusal);
  endRunOn(USAGE_REFUSAL);
  return true;
}

export function main(hostArgv: string[]): void {
  beginRun();
  try {
    settlingRefusal(() => run(hostArgv), undefined);
  } catch (err) {
    settleUnexpectedError(err, process, process.stderr);
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

  if (runCommand(command, inv.commandArgs)) markRunFinished();
}

function asksForHelp(command: string): boolean {
  return command === "help" || command === "--help" || command === "-h";
}
