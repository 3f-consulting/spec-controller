import type { CliRegistry, CommandSpec, FlagSpec, PositionalSpec } from "./cliRegistry.js";
import { AppError, AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { refusal, type Refusal } from "../runEnding/refusal.js";

export function asksForHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

// A flag's value is the argument after it, unless that is a flag too; a flag given no value reads as "true".
export function parseArgs(argv: readonly string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const [i, token] of argv.entries()) {
    const value = argv[i + 1];
    if (isFlagShaped(token)) args[token.slice(2)] = value === undefined || isFlagShaped(value) ? "true" : value;
  }
  return args;
}

type ValueFlagSpec = FlagSpec & { arg: string };

function takesValue(flag: FlagSpec): flag is ValueFlagSpec {
  return flag.arg !== undefined;
}

function valueFlagsOf(flags: readonly FlagSpec[]): Map<string, ValueFlagSpec> {
  const valueFlags = new Map<string, ValueFlagSpec>();
  for (const flag of flags) {
    if (takesValue(flag)) valueFlags.set(flag.name, flag);
  }
  return valueFlags;
}

function givenValue(next: string | undefined): string | undefined {
  return next === undefined || next.startsWith("--") ? undefined : next;
}

export function checkMissingValues(
  argv: readonly string[],
  registry: CliRegistry,
  command: string,
): Refusal | null {
  const valueFlags = valueFlagsOf(commandEntry(registry, command).flags);
  for (const [i, token] of argv.entries()) {
    const flag = valueFlags.get(token);
    if (flag !== undefined && givenValue(argv[i + 1]) === undefined) {
      return missingValueRefusal(token, flag, `spec-controller ${command}`);
    }
  }
  return null;
}

function missingValueRefusal(given: string, flag: ValueFlagSpec, scope: string): Refusal {
  return refusal(AppError.MissingValue, { flag: given, scope, arg: flag.arg }, [message(AppMessage.SeeFlagsAndValues, { scope })]);
}

export function checkArgvShape(argv: readonly string[], registry: CliRegistry, command: string): Refusal | null {
  const scope = flagScopeOf(registry, command);
  const seen = new Set<FlagSpec>();
  const positionals = positionalsOf(registry, command);
  const walk: Walk = { scope, seen, takes: argumentsOf(positionals), slotsLeft: positionals.length };
  for (let i = 0; i < argv.length; i++) {
    const read = readToken(argv, i, walk, command);
    if (typeof read !== "number") return read;
    i += read;
  }
  return null;
}

interface Walk {
  scope: ReadonlyMap<string, FlagSpec>;
  seen: Set<FlagSpec>;
  takes: Arguments;
  slotsLeft: number;
}

type Arguments =
  | { readonly kind: "flags-only" }
  | { readonly kind: "some"; readonly positionals: readonly [PositionalSpec, ...(readonly PositionalSpec[])] };

const argumentsOf = (positionals: readonly PositionalSpec[]): Arguments => {
  const [first, ...rest] = positionals;
  if (first === undefined) return { kind: "flags-only" };
  return { kind: "some", positionals: [first, ...rest] };
};

function positionalsOf(registry: CliRegistry, command: string): readonly PositionalSpec[] {
  return commandEntry(registry, command).positionals ?? [];
}

type CommandEntry = Pick<CommandSpec, "flags" | "positionals">;

function commandEntry(registry: CliRegistry, command: string): CommandEntry {
  return registry.commands.find((c) => c.name === command)!;
}

export function positionalArguments(argv: readonly string[], registry: CliRegistry, command: string): string[] {
  const scope = flagScopeOf(registry, command);
  const words: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (!isFlagShaped(token)) words.push(token);
    else if (scope.get(token)?.arg !== undefined) i++;
  }
  return words;
}

function readToken(argv: readonly string[], i: number, walk: Walk, command: string): Refusal | number {
  const token = argv[i]!;
  const next = argv[i + 1];
  if (isEqualsForm(token)) return equalsFormRefusal(token, `spec-controller ${command}`);
  if (!isFlagShaped(token) && !walk.scope.has(token)) return positionalRead(token, walk, command);
  const flag = walk.scope.get(token);
  const refused = flag === undefined ? undefined : registeredFlagRefusal(flag, token, next, walk, command);
  return refused ?? valueTokensAfter(next);
}

function registeredFlagRefusal(
  flag: FlagSpec,
  token: string,
  next: string | undefined,
  walk: Walk,
  command: string,
): Refusal | undefined {
  if (walk.seen.has(flag) && flag.repeatable !== true) return givenTwiceRefusal(token, `spec-controller ${command}`);
  walk.seen.add(flag);
  // While the command still has an argument to read, the next word is that argument, not a value for this flag.
  if (flag.arg === undefined && next !== undefined && !isFlagShaped(next) && walk.slotsLeft === 0) {
    return takesNoValueRefusal(token, next, command);
  }
  return undefined;
}

function givenTwiceRefusal(given: string, scope: string): Refusal {
  return refusal(AppError.GivenTwice, { flag: given, scope }, [message(AppMessage.SeeFlags, { scope })]);
}

function flagScopeOf(registry: CliRegistry, command: string): Map<string, FlagSpec> {
  const scope = new Map<string, FlagSpec>();
  for (const flag of commandEntry(registry, command).flags) {
    scope.set(flag.name, flag);
  }
  return scope;
}

function isFlagShaped(token: string): boolean {
  return token.startsWith("--");
}

function isEqualsForm(token: string): boolean {
  return isFlagShaped(token) && token.includes("=");
}

function equalsFormRefusal(token: string, scope: string): Refusal {
  const at = token.indexOf("=");
  const spelling = `${token.slice(0, at)} ${token.slice(at + 1)}`;
  return refusal(AppError.EqualsForm, { token, scope, spelling }, [message(AppMessage.SeeFlags, { scope })]);
}

// A registered flag that takes no value has been refused if a value follows it, so a value here is the flag's.
function valueTokensAfter(next: string | undefined): number {
  return next === undefined || isFlagShaped(next) ? 0 : 1;
}

function takesNoValueRefusal(flag: string, value: string, command: string): Refusal {
  const scope = `spec-controller ${command}`;
  return refusal(AppError.TakesNoValue, { flag, scope, value }, [message(AppMessage.SeeFlagsAndValues, { scope })]);
}

function positionalRead(token: string, walk: Walk, command: string): Refusal | number {
  if (walk.slotsLeft === 0) {
    return strayArgumentRefusal(token, walk.takes, command);
  }
  walk.slotsLeft--;
  return 0;
}

function strayArgumentRefusal(token: string, takes: Arguments, command: string): Refusal {
  switch (takes.kind) {
    case "flags-only":
      return notAFlagRefusal(token, command);
    case "some":
      return extraPositionalRefusal(token, takes.positionals, command);
  }
}

function extraPositionalRefusal(token: string, positionals: readonly PositionalSpec[], command: string): Refusal {
  const takes = positionals.map((positional) => positional.name).join(" ");
  const scope = `spec-controller ${command}`;
  return refusal(AppError.ExtraArgument, { token, scope, takes }, [message(AppMessage.SeeArguments, { scope })]);
}

function notAFlagRefusal(token: string, command: string): Refusal {
  const scope = `spec-controller ${command}`;
  return refusal(AppError.NotAFlag, { token, scope }, [message(AppMessage.SeeFlags, { scope })]);
}

export function checkUnknownFlags(
  args: Record<string, string>,
  registry: CliRegistry,
  command: string,
  toolVersion: string,
): Refusal | null {
  const entry = commandEntry(registry, command);
  for (const key of Object.keys(args)) {
    if (!entry.flags.some((flag) => flag.name === `--${key}`)) {
      return unknownFlagRefusal(`--${key}`, command, toolVersion);
    }
  }
  return null;
}

function unknownFlagRefusal(flag: string, command: string, toolVersion: string): Refusal {
  const scope = `spec-controller ${command}`;
  return refusal(AppError.UnknownFlag, { flag, scope, toolVersion, command }, [
    message(AppMessage.PinDrifted, { command, flag }),
    message(AppMessage.OtherwiseSeeFlags, { scope }),
  ]);
}
