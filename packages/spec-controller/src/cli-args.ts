import type { CliRegistry, CommandSpec, FlagSpec, PositionalSpec } from "./cli-registry.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

export function asksForHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

export function parseArgs(argv: readonly string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a !== undefined && a.startsWith("--")) {
      const key = a.slice(2);
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        args[key] = value;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

export type ValueFlagSpec = FlagSpec & { arg: string };

function takesValue(flag: FlagSpec): flag is ValueFlagSpec {
  return flag.arg !== undefined;
}

export function valueFlagsOf(flags: readonly FlagSpec[]): Map<string, ValueFlagSpec> {
  const valueFlags = new Map<string, ValueFlagSpec>();
  for (const flag of flags) {
    if (!takesValue(flag)) continue;
    for (const name of [flag.name, ...(flag.aliases ?? [])]) valueFlags.set(name, flag);
  }
  return valueFlags;
}

export function givenValue(next: string | undefined): string | undefined {
  return next === undefined || next === "" || next.startsWith("--") ? undefined : next;
}

export function checkMissingValues(
  argv: readonly string[],
  registry: CliRegistry,
  command: string,
): string | null {
  const valueFlags = valueFlagsOf(commandEntry(registry, command).flags);
  for (const [i, token] of argv.entries()) {
    const flag = valueFlags.get(token);
    if (flag !== undefined && givenValue(argv[i + 1]) === undefined) {
      return missingValueRefusal(token, flag, `spec-controller ${command}`);
    }
  }
  return null;
}

export function missingValueRefusal(given: string, flag: ValueFlagSpec, scope: string): string {
  return (
    `${APP_MESSAGES[AppMessage.MissingValue](given, scope, flag.arg)}\n` +
    APP_MESSAGES[AppMessage.SeeFlagsAndValues](scope)
  );
}

export function checkArgvShape(argv: readonly string[], registry: CliRegistry, command: string): string | null {
  const scope = flagScopeOf(registry, command);
  const seen = new Set<FlagSpec>();
  const positionals = positionalsOf(registry, command);
  const walk: Walk = { scope, seen, positionals, slotsLeft: positionals.length };
  for (let i = 0; i < argv.length; i++) {
    const read = readToken(argv, i, walk, command);
    if (typeof read === "string") return read;
    i += read;
  }
  return null;
}

interface Walk {
  scope: ReadonlyMap<string, FlagSpec>;
  seen: Set<FlagSpec>;
  positionals: readonly PositionalSpec[];
  slotsLeft: number;
}

function positionalsOf(registry: CliRegistry, command: string): readonly PositionalSpec[] {
  return commandEntry(registry, command).positionals ?? [];
}

type CommandEntry = Pick<CommandSpec, "flags" | "positionals" | "retiredFlags">;

function commandEntry(registry: CliRegistry, command: string): CommandEntry {
  return registry.commands.find((c) => c.name === command) ?? { flags: [] };
}

function bareName(name: string): string {
  return name.replace(/^-+/, "");
}

export function positionalArguments(argv: readonly string[], registry: CliRegistry, command: string): string[] {
  const scope = flagScopeOf(registry, command);
  const words: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";
    if (!isFlagShaped(token)) words.push(token);
    else if (scope.get(token)?.arg !== undefined) i++;
  }
  return words;
}

function readToken(argv: readonly string[], i: number, walk: Walk, command: string): string | number {
  const token = argv[i] ?? "";
  const next = argv[i + 1];
  if (isEqualsForm(token)) return equalsFormRefusal(token, walk.scope, `spec-controller ${command}`);
  if (!isFlagShaped(token) && !walk.scope.has(token)) return positionalRead(token, walk, command);
  const flag = walk.scope.get(token);
  if (flag === undefined) return valueTokensAfter(undefined, next);
  return registeredFlagRefusal(flag, token, next, walk, command) ?? valueTokensAfter(flag, next);
}

function registeredFlagRefusal(
  flag: FlagSpec,
  token: string,
  next: string | undefined,
  walk: Walk,
  command: string,
): string | undefined {
  if (walk.seen.has(flag) && flag.repeatable !== true) return givenTwiceRefusal(token, `spec-controller ${command}`);
  walk.seen.add(flag);
  if (flag.arg === undefined && next !== undefined && !isFlagShaped(next) && !walk.scope.has(next) && walk.slotsLeft === 0) {
    return takesNoValueRefusal(token, next, command);
  }
  return undefined;
}

export function givenTwiceRefusal(given: string, scope: string): string {
  return `${APP_MESSAGES[AppMessage.GivenTwice](given, scope)}\n${APP_MESSAGES[AppMessage.SeeFlags](scope)}`;
}

function flagScopeOf(registry: CliRegistry, command: string): Map<string, FlagSpec> {
  const scope = new Map<string, FlagSpec>();
  for (const flag of commandEntry(registry, command).flags) {
    for (const name of [flag.name, ...(flag.aliases ?? [])]) scope.set(name, flag);
  }
  return scope;
}

function isFlagShaped(token: string): boolean {
  return token.startsWith("--");
}

export function isEqualsForm(token: string): boolean {
  return isFlagShaped(token) && token.includes("=");
}

export function equalsFormRefusal(token: string, flags: ReadonlyMap<string, FlagSpec>, scope: string): string {
  const at = token.indexOf("=");
  const name = token.slice(0, at);
  const value = token.slice(at + 1);
  const flag = flags.get(name);
  const spelling =
    flag !== undefined && flag.arg === undefined ? name : `${name} ${value === "" ? (flag?.arg ?? "<value>") : value}`;
  return `${APP_MESSAGES[AppMessage.EqualsForm](token, scope, spelling)}\n${APP_MESSAGES[AppMessage.SeeFlags](scope)}`;
}

function valueTokensAfter(flag: FlagSpec | undefined, next: string | undefined): number {
  if (next === undefined || isFlagShaped(next)) return 0;
  return flag === undefined || flag.arg !== undefined ? 1 : 0;
}

function takesNoValueRefusal(flag: string, value: string, command: string): string {
  const scope = `spec-controller ${command}`;
  return (
    `${APP_MESSAGES[AppMessage.TakesNoValue](flag, scope, value)}\n` +
    APP_MESSAGES[AppMessage.SeeFlagsAndValues](scope)
  );
}

function positionalRead(token: string, walk: Walk, command: string): string | number {
  if (walk.slotsLeft === 0) {
    return walk.positionals.length === 0 ? notAFlagRefusal(token, command) : extraPositionalRefusal(token, walk, command);
  }
  walk.slotsLeft--;
  return 0;
}

function extraPositionalRefusal(token: string, walk: Walk, command: string): string {
  const takes = walk.positionals.map((positional) => positional.name).join(" ");
  const scope = `spec-controller ${command}`;
  return `${APP_MESSAGES[AppMessage.ExtraArgument](token, scope, takes)}\n${APP_MESSAGES[AppMessage.SeeArguments](scope)}`;
}

function notAFlagRefusal(token: string, command: string): string {
  const scope = `spec-controller ${command}`;
  return `${APP_MESSAGES[AppMessage.NotAFlag](token, scope)}\n${APP_MESSAGES[AppMessage.SeeFlags](scope)}`;
}

export function checkMisplacedHostModifiers(
  args: Record<string, string>,
  registry: CliRegistry,
  command: string,
): string | null {
  const modifiers = new Set(registry.global.map((flag) => bareName(flag.name)));
  const key = Object.keys(args).find((k) => modifiers.has(k));
  if (key === undefined) return null;
  return `${APP_MESSAGES[AppMessage.MisplacedModifier](`--${key}`, command)}\n${APP_MESSAGES[AppMessage.SeeModifiers]()}`;
}

export function checkUnknownFlags(
  args: Record<string, string>,
  registry: CliRegistry,
  command: string,
  toolVersion: string,
): string | null {
  const entry = commandEntry(registry, command);
  const accepted = new Set<string>();
  for (const flag of entry.flags) {
    accepted.add(bareName(flag.name));
    for (const alias of flag.aliases ?? []) accepted.add(bareName(alias));
  }
  for (const key of Object.keys(args)) {
    if (!accepted.has(key)) {
      return retiredFlagRefusal(entry, key, command, toolVersion) ?? unknownFlagRefusal(`--${key}`, command, toolVersion);
    }
  }
  return null;
}

function unknownFlagRefusal(flag: string, command: string, toolVersion: string): string {
  const scope = `spec-controller ${command}`;
  return (
    `${APP_MESSAGES[AppMessage.UnknownFlag](flag, scope, toolVersion, command)}\n` +
    `${APP_MESSAGES[AppMessage.PinDrifted](command, flag)}\n` +
    APP_MESSAGES[AppMessage.OtherwiseSeeFlags](scope)
  );
}

function retiredFlagRefusal(
  entry: CommandEntry,
  key: string,
  command: string,
  toolVersion: string,
): string | undefined {
  const retired = entry.retiredFlags?.find((flag) => bareName(flag.name) === key);
  if (retired === undefined) return undefined;
  const scope = `spec-controller ${command}`;
  return (
    `${APP_MESSAGES[AppMessage.RetiredFlag](retired.name, scope, retired.retiredIn, toolVersion)}\n` +
    `${APP_MESSAGES[AppMessage.DoNotPinRetired]()} ${retired.replacement}\n` +
    APP_MESSAGES[AppMessage.SeeFlags](scope)
  );
}
