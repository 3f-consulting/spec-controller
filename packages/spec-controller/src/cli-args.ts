import type { CliRegistry, CommandSpec, FlagSpec, PositionalSpec } from "./cli-registry.js";

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

export function valueFlagsOf(flags: readonly FlagSpec[]): Map<string, FlagSpec> {
  const valueFlags = new Map<string, FlagSpec>();
  for (const flag of flags) {
    if (flag.arg === undefined) continue;
    for (const name of [flag.name, ...(flag.aliases ?? [])]) valueFlags.set(name, flag);
  }
  return valueFlags;
}

export function isMissingValue(next: string | undefined): boolean {
  return next === undefined || next === "" || next.startsWith("--");
}

export function checkMissingValues(
  argv: readonly string[],
  registry: CliRegistry,
  command: string,
): string | null {
  const entry = registry.commands.find((c) => c.name === command);
  const valueFlags = valueFlagsOf(entry?.flags ?? []);
  for (let i = 0; i < argv.length; i++) {
    const flag = valueFlags.get(argv[i] ?? "");
    if (flag !== undefined && isMissingValue(argv[i + 1])) {
      return missingValueRefusal(argv[i] ?? flag.name, flag, `spec-controller ${command}`);
    }
  }
  return null;
}

export function missingValueRefusal(given: string, flag: FlagSpec, scope: string): string {
  return (
    `The ${given} flag of '${scope}' needs a value — ${given} ${flag.arg ?? ""} — and was given none.\n` +
    `Run '${scope} --help' to see the flags this version accepts and the values they take.`
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
  return registry.commands.find((c) => c.name === command)?.positionals ?? [];
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
  return (
    `The ${given} flag of '${scope}' was given more than once, and is read once: give it once.\n` +
    `Run '${scope} --help' to see the flags this version accepts.`
  );
}

function flagScopeOf(registry: CliRegistry, command: string): Map<string, FlagSpec> {
  const scope = new Map<string, FlagSpec>();
  for (const flag of registry.commands.find((c) => c.name === command)?.flags ?? []) {
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
  return (
    `The ${token} form is not read by '${scope}': a flag and its value are two arguments, as in '${spelling}'.\n` +
    `Run '${scope} --help' to see the flags this version accepts.`
  );
}

function valueTokensAfter(flag: FlagSpec | undefined, next: string | undefined): number {
  if (next === undefined || isFlagShaped(next)) return 0;
  return flag === undefined || flag.arg !== undefined ? 1 : 0;
}

function takesNoValueRefusal(flag: string, value: string, command: string): string {
  return (
    `The ${flag} flag of 'spec-controller ${command}' takes no value, and was given one: '${value}'.\n` +
    `Run 'spec-controller ${command} --help' to see the flags this version accepts and the values they take.`
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
  return (
    `The argument '${token}' is more than 'spec-controller ${command}' takes: it takes ${takes} once, and its flags.\n` +
    `Run 'spec-controller ${command} --help' to see what this version accepts.`
  );
}

function notAFlagRefusal(token: string, command: string): string {
  return (
    `The argument '${token}' is not a flag, nor the value of the flag before it: ` +
    `'spec-controller ${command}' takes only flags and their values.\n` +
    `Run 'spec-controller ${command} --help' to see the flags this version accepts.`
  );
}

export function checkMisplacedHostModifiers(
  args: Record<string, string>,
  registry: CliRegistry,
  command: string,
): string | null {
  const modifiers = new Set(registry.global.map((flag) => flag.name.replace(/^-+/, "")));
  const key = Object.keys(args).find((k) => modifiers.has(k));
  if (key === undefined) return null;
  return (
    `The --${key} flag is a host modifier: it goes before the command, as in ` +
    `'spec-controller --${key} <value> ${command} …', never after it.\n` +
    `Run 'spec-controller --help' to see the host modifiers this version accepts.`
  );
}

export function checkUnknownFlags(
  args: Record<string, string>,
  registry: CliRegistry,
  command: string,
  toolVersion: string,
): string | null {
  const entry = registry.commands.find((c) => c.name === command);
  const accepted = new Set<string>();
  for (const flag of entry?.flags ?? []) {
    accepted.add(flag.name.replace(/^-+/, ""));
    for (const alias of flag.aliases ?? []) accepted.add(alias.replace(/^-+/, ""));
  }
  for (const key of Object.keys(args)) {
    if (!accepted.has(key)) {
      return (
        retiredFlagRefusal(entry, key, command, toolVersion) ??
        `Unknown flag --${key} for 'spec-controller ${command}' — this is spec-controller ` +
        `${toolVersion}, and that flag is not in its ${command} scope.\n` +
        `If this version is pinned, the pin and the tree it is reading have drifted apart: ` +
        `bump the pin to a version whose '${command}' accepts --${key}.\n` +
        `Otherwise run 'spec-controller ${command} --help' to see the flags this version accepts.`
      );
    }
  }
  return null;
}

function retiredFlagRefusal(
  entry: CommandSpec | undefined,
  key: string,
  command: string,
  toolVersion: string,
): string | undefined {
  const retired = entry?.retiredFlags?.find((flag) => flag.name.replace(/^-+/, "") === key);
  if (retired === undefined) return undefined;
  return (
    `Retired flag ${retired.name} for 'spec-controller ${command}' — retired in spec-controller ` +
    `${retired.retiredIn}, and no later version accepts it (this is spec-controller ${toolVersion}).\n` +
    `Do not pin an earlier version to get it back: that restores the route it was retired with. ` +
    `${retired.replacement}\n` +
    `Run 'spec-controller ${command} --help' to see the flags this version accepts.`
  );
}
