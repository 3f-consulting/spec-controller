import {
  asksForHelp,
  equalsFormRefusal,
  givenTwiceRefusal,
  isEqualsForm,
  isMissingValue,
  missingValueRefusal,
  valueFlagsOf,
} from "./cli-args.js";
import { cliRegistry, type CommandSpec, type FlagSpec } from "./cli-registry.js";

export interface HostInvocation {
  store?: string;
  runId?: string;
  command?: string;
  commandArgs: string[];
  refusal?: string;
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
    const value = argv[i + 1];
    const refusal = modifierRefusal(token, modifier, argv.slice(i + 1, i + 3), { values, commands });
    if (refusal !== undefined) return { commandArgs: [], refusal };
    values.set(modifier.name, value ?? "");
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

function modifierRefusal(
  token: string,
  modifier: FlagSpec,
  [value, after]: readonly string[],
  read: HostRead,
): string | undefined {
  if (read.values.has(modifier.name)) return givenTwiceRefusal(token, "spec-controller");
  if (isMissingValue(value)) return missingValueRefusal(token, modifier, "spec-controller");
  if (read.commands.includes(value ?? "") && (after === undefined || after.startsWith("-"))) {
    return commandAsValueRefusal(token, modifier, value ?? "");
  }
  return undefined;
}

function noCommandRefusal(given: readonly string[]): string {
  return (
    `No command followed the host modifiers given (${given.join(", ")}), so nothing ran: ` +
    `a host modifier needs a command after it, or --help.\n` +
    `Run 'spec-controller --help' to see the commands and host modifiers this version accepts.`
  );
}

function commandAsValueRefusal(token: string, modifier: FlagSpec, command: string): string {
  return (
    `The ${token} host modifier took '${command}', a command, as its value, and left no command to run.\n` +
    `Give ${token} its own value, as in 'spec-controller ${token} ${modifier.arg ?? ""} ${command} …'. ` +
    `Run 'spec-controller --help' to see the commands and host modifiers this version accepts.`
  );
}

function leadingFlagRefusal(
  token: string,
  modifiers: ReadonlyMap<string, FlagSpec>,
  globalFlags: readonly FlagSpec[],
): string | undefined {
  if (isEqualsForm(token)) return equalsFormRefusal(token, modifiers, "spec-controller");
  if (isFlagOutOfPlace(token)) return flagBeforeCommandRefusal(token, globalFlags);
  return undefined;
}

const TOP_LEVEL_HELP: ReadonlySet<string> = new Set(["--help", "-h"]);

function isFlagOutOfPlace(token: string): boolean {
  return token.length > 1 && token.startsWith("-") && !TOP_LEVEL_HELP.has(token);
}

function flagBeforeCommandRefusal(flag: string, globalFlags: readonly FlagSpec[]): string {
  const modifiers = globalFlags.map((modifier) => modifier.name).join(", ");
  return (
    `The ${flag} flag was given before the command. Before the command, spec-controller takes ` +
    `only its host modifiers (${modifiers}); a command's own flags go after it, as in ` +
    `'spec-controller <command> ${flag}'.\n` +
    `Run 'spec-controller --help' to see the commands and host modifiers this version accepts.`
  );
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
  stderr: string;
}

export function answerUnknownCommand(command: string, help: string): UnknownCommandAnswer {
  return {
    exitCode: 2,
    stderr: `spec-controller: unknown command "${command}".\n\n${help}\n`,
  };
}

export function modifiersNotTakenRefusal(
  inv: HostInvocation,
  commands: readonly CommandSpec[] = cliRegistry.commands,
): string | undefined {
  const entry = commands.find((command) => command.name === inv.command);
  if (entry?.acceptsHostModifiers !== false || asksForHelp(inv.commandArgs)) return undefined;
  const given = [inv.store === undefined ? [] : ["--store"], inv.runId === undefined ? [] : ["--run-id"]].flat();
  if (given.length === 0) return undefined;
  return (
    `spec-controller: usage error — '${entry.name}' takes no host modifier, and was given ${given.join(", ")}: ` +
    `it answers a query and keeps no run.\n` +
    `Run 'spec-controller ${entry.name} …' without them.`
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
