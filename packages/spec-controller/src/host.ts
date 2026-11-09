import { equalsFormRefusal, isEqualsForm } from "./cliArgs.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { refusal, type Refusal } from "./refusal.js";
import { USAGE_EXIT_CODE } from "./exitCode.js";

export interface HostInvocation {
  command?: string;
  commandArgs: string[];
  refusal?: Refusal;
}

export function parseHostInvocation(argv: readonly string[]): HostInvocation {
  const [first, ...rest] = argv;
  if (first === undefined) return { commandArgs: [] };
  const refusal = leadingFlagRefusal(first);
  if (refusal === undefined) return { command: first, commandArgs: rest };
  const help = argv.find((token) => TOP_LEVEL_HELP.has(token));
  return help === undefined ? { commandArgs: [], refusal } : { command: help, commandArgs: [] };
}

function leadingFlagRefusal(token: string): Refusal | undefined {
  if (isEqualsForm(token)) return equalsFormRefusal(token, new Map(), "spec-controller");
  if (isFlagOutOfPlace(token)) return flagBeforeCommandRefusal(token);
  return undefined;
}

const TOP_LEVEL_HELP: ReadonlySet<string> = new Set(["--help", "-h"]);

function isFlagOutOfPlace(token: string): boolean {
  return token.length > 1 && token.startsWith("-") && !TOP_LEVEL_HELP.has(token);
}

function flagBeforeCommandRefusal(flag: string): Refusal {
  return refusal(AppError.FlagBeforeCommand, { flag }, [message(AppMessage.SeeCommands)]);
}

export interface UnknownCommandAnswer {
  exitCode: number;
  refusal: Refusal;
}

export function answerUnknownCommand(command: string, help: string): UnknownCommandAnswer {
  return {
    exitCode: USAGE_EXIT_CODE,
    refusal: refusal(AppError.UnknownCommand, { command }, ["", help]),
  };
}
