import {
  asksForHelp,
  equalsFormRefusal,
  givenTwiceRefusal,
  givenValue,
  isEqualsForm,
  missingValueRefusal,
  valueFlagsOf,
  type ValueFlagSpec,
} from "./cliArgs.js";
import { cliRegistry, type CommandSpec, type FlagSpec } from "./cliRegistry.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { refusal, type Refusal } from "./refusal.js";
import { USAGE_EXIT_CODE } from "./exitCode.js";

export interface HostInvocation {
  store?: string;
  runId?: string;
  command?: string;
  commandArgs: string[];
  refusal?: Refusal;
}

export function parseHostInvocation(
  argv: readonly string[],
  globalFlags: readonly FlagSpec[] = cliRegistry.global,
  commands: readonly string[] = cliRegistry.commands.map((command) => command.name),
): HostInvocation {
  const read = readHostTokens(argv, globalFlags, commands);
  const help = argv.slice(0, hostTokenCount(argv, read)).find((token) => TOP_LEVEL_HELP.has(token));
  return help === undefined ? read : { command: help, commandArgs: [] };
}

function hostTokenCount(argv: readonly string[], read: HostInvocation): number {
  if (read.refusal !== undefined || read.command === undefined) return argv.length;
  return argv.length - read.commandArgs.length - 1;
}

function readHostTokens(
  argv: readonly string[],
  globalFlags: readonly FlagSpec[],
  commands: readonly string[],
): HostInvocation {
  const modifiers = valueFlagsOf(globalFlags);
  const values = new Map<string, string>();
  let i = 0;
  for (; i < argv.length; i++) {
    const token = argv[i] ?? "";
    const modifier = modifiers.get(token);
    if (modifier === undefined) {
      const refusal = leadingFlagRefusal(token, modifiers, globalFlags);
      if (refusal !== undefined) return { commandArgs: [], refusal };
      break;
    }
    const read = readModifier(token, modifier, argv.slice(i + 1, i + 3), { values, commands });
    if ("refusal" in read) return { commandArgs: [], refusal: read.refusal };
    values.set(modifier.name, read.value);
    i++;
  }
  if (i === argv.length && values.size > 0) return { commandArgs: [], refusal: noCommandRefusal([...values.keys()]) };
  return {
    store: values.get("--store"),
    runId: values.get("--run-id"),
    command: argv[i],
    commandArgs: argv.slice(i + 1),
  };
}

interface HostRead {
  values: ReadonlyMap<string, string>;
  commands: readonly string[];
}

type ModifierRead = { value: string } | { refusal: Refusal };

function readModifier(
  token: string,
  modifier: ValueFlagSpec,
  [next, after]: readonly string[],
  read: HostRead,
): ModifierRead {
  if (read.values.has(modifier.name)) return { refusal: givenTwiceRefusal(token, "spec-controller") };
  const value = givenValue(next);
  if (value === undefined) return { refusal: missingValueRefusal(token, modifier, "spec-controller") };
  if (read.commands.includes(value) && (after === undefined || after.startsWith("-"))) {
    return { refusal: commandAsValueRefusal(token, modifier, value) };
  }
  return { value };
}

function noCommandRefusal(given: readonly string[]): Refusal {
  return refusal(AppError.NoCommandAfterModifiers, { modifiers: given.join(", ") }, [message(AppMessage.SeeCommandsAndModifiers)]);
}

function commandAsValueRefusal(token: string, modifier: ValueFlagSpec, command: string): Refusal {
  return refusal(AppError.ModifierTookCommand, { modifier: token, command }, [
    `${message(AppMessage.GiveModifierItsOwnValue, { modifier: token, arg: modifier.arg, command })} ` +
      message(AppMessage.SeeCommandsAndModifiers),
  ]);
}

function leadingFlagRefusal(
  token: string,
  modifiers: ReadonlyMap<string, FlagSpec>,
  globalFlags: readonly FlagSpec[],
): Refusal | undefined {
  if (isEqualsForm(token)) return equalsFormRefusal(token, modifiers, "spec-controller");
  if (isFlagOutOfPlace(token)) return flagBeforeCommandRefusal(token, globalFlags);
  return undefined;
}

const TOP_LEVEL_HELP: ReadonlySet<string> = new Set(["--help", "-h"]);

function isFlagOutOfPlace(token: string): boolean {
  return token.length > 1 && token.startsWith("-") && !TOP_LEVEL_HELP.has(token);
}

function flagBeforeCommandRefusal(flag: string, globalFlags: readonly FlagSpec[]): Refusal {
  const modifiers = globalFlags.map((modifier) => modifier.name).join(", ");
  return refusal(AppError.FlagBeforeCommand, { flag, modifiers }, [message(AppMessage.SeeCommandsAndModifiers)]);
}

export function wrapCommandArgv(commandArgs: readonly string[], formatSpecs: readonly string[]): string[] {
  return [...commandArgs, ...formatSpecs.flatMap((spec) => ["--format", spec])];
}

export function peekFlag(argv: readonly string[], name: string): string | undefined {
  const flag = `--${name}`;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag) {
      const value = argv[i + 1];
      return value !== undefined && !value.startsWith("--") ? value : undefined;
    }
  }
  return undefined;
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

export function modifiersNotTakenRefusal(
  inv: HostInvocation,
  commands: readonly CommandSpec[] = cliRegistry.commands,
): Refusal | undefined {
  const entry = commands.find((command) => command.name === inv.command);
  if (entry?.acceptsHostModifiers !== false || asksForHelp(inv.commandArgs)) return undefined;
  const given = [inv.store === undefined ? [] : ["--store"], inv.runId === undefined ? [] : ["--run-id"]].flat();
  if (given.length === 0) return undefined;
  return refusal(
    AppError.ModifiersNotTaken,
    { command: entry.name, modifiers: given.join(", ") },
    [message(AppMessage.RunWithoutModifiers, { command: entry.name })],
  );
}

export function formatFilePaths(argv: readonly string[]): string[] {
  const paths: string[] = [];
  argv.forEach((token, index) => {
    const value = argv[index + 1];
    if (token !== "--format" || value === undefined) return;
    const colon = value.indexOf(":");
    if (colon !== -1) paths.push(value.slice(colon + 1));
  });
  return paths;
}
