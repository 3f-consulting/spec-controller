/**
 * THE ONE READING OF A COMMAND'S ARGV, and the one bounding of it against the registry.
 *
 * WHY IT IS ITS OWN MODULE. Both halves lived inside `cli-balance/cli.ts` while
 * `balance` was the only command — `parseArgs` private to it, `checkUnknownFlags` exported for
 * its own `@unit` arm. A second command needs both, and the two ways of giving it them were
 * worse than moving them: copying `parseArgs` would put a second reading of argv in a tree whose
 * whole subject is second readings, and importing them from `cli-balance/cli.ts` would have the
 * corpus command pull the entire reconcile ingest chain into memory to answer a question about
 * feature files.
 *
 * THE BOUNDING IS PER-COMMAND, which is what makes "accepted = registry = help" hold for every
 * command rather than for the one this code was written beside. `checkUnknownFlags` took the
 * registry and looked `balance` up inside itself; the command is a parameter now, exactly as it
 * became one for `renderCommandHelp`. The unknown-flag scenario is unchanged and still
 * asks about `balance`: a command added later gets the same bounding BY CONSTRUCTION.
 */

import type { CliRegistry, CommandSpec, FlagSpec, PositionalSpec } from "./cli-registry.js";

/** True when a command's argv asks for its help, wherever `--help` or `-h` stands in it. */
export function asksForHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

/**
 * Parse `--flag value` pairs from a command's argv into a record, keys with the `--` stripped.
 *
 * A flag whose next token is another flag (or absent) records the string `"true"`, which is how
 * the boolean flags — `--strict`, `--help` — are recognised: presence is what matters, so callers
 * read them with `!== undefined`.
 *
 * PERMISSIVE BY ITSELF, AND BOUNDED BY THE CALLER. It records whatever it is given — a flag no
 * registry names, the last of two copies, a word after a flag that takes none — and drops a word
 * that follows no flag. `checkArgvShape` and `checkUnknownFlags` below are what refuse those, before
 * anything reads the record. The split is deliberate — the parse has no opinion about which
 * command it is reading for, and the bounding has nothing else to do.
 */
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

/**
 * The value flags of one scope: every flag the registry gives a value placeholder (`arg`), by
 * name and alias, dashes kept. Read from the registry alone, so a value flag added later is one.
 */
export function valueFlagsOf(flags: readonly FlagSpec[]): Map<string, FlagSpec> {
  const valueFlags = new Map<string, FlagSpec>();
  for (const flag of flags) {
    if (flag.arg === undefined) continue;
    for (const name of [flag.name, ...(flag.aliases ?? [])]) valueFlags.set(name, flag);
  }
  return valueFlags;
}

/**
 * True when the token after a value flag is not a value: there is none, it is the next flag (the
 * same `--` test `parseArgs` reads a flag by), or it is empty — an unset variable, quoted.
 */
export function isMissingValue(next: string | undefined): boolean {
  return next === undefined || next === "" || next.startsWith("--");
}

/**
 * A flag that takes a value, given none, is a usage fault. It reads the
 * RAW argv, because `parseArgs` has already turned a missing value into the string "true" — which a
 * path flag then looked for on disk, `--target` recorded, and `--format` dropped on its way to a
 * verdict `--exit-zero` turned green. Returns the refusal for the first such flag, else null.
 */
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

/** The refusal for a value flag given none: the flag, the value it takes, and where the flags are listed. */
export function missingValueRefusal(given: string, flag: FlagSpec, scope: string): string {
  return (
    `The ${given} flag of '${scope}' needs a value — ${given} ${flag.arg ?? ""} — and was given none.\n` +
    `Run '${scope} --help' to see the flags this version accepts and the values they take.`
  );
}

/**
 * The shape of a command's argv, read against its registry scope: every token is a flag,
 * or the value of the flag before it, or a usage fault. Returns the refusal for the first token that
 * is neither, else null.
 */
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

/** What the walk knows as it goes: the command's flags, and which of them it has already read. */
interface Walk {
  scope: ReadonlyMap<string, FlagSpec>;
  seen: Set<FlagSpec>;
  /** The positional arguments the command takes, and how many are still to be read. */
  positionals: readonly PositionalSpec[];
  slotsLeft: number;
}

/** The positional arguments a command takes, in order; none for a command that takes flags only. */
function positionalsOf(registry: CliRegistry, command: string): readonly PositionalSpec[] {
  return registry.commands.find((c) => c.name === command)?.positionals ?? [];
}

/**
 * The positional arguments in a command's argv, in order: every word that is no flag and no flag's
 * value. A flag the registry gives no value placeholder takes none, so `--new ZZ` reads ZZ as the
 * positional, never as `--new`'s value — which `parseArgs` alone would make it.
 */
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

/** One token of the walk: the refusal it earns, or how many of the tokens after it are its value. */
function readToken(argv: readonly string[], i: number, walk: Walk, command: string): string | number {
  const token = argv[i] ?? "";
  const next = argv[i + 1];
  if (isEqualsForm(token)) return equalsFormRefusal(token, walk.scope, `spec-controller ${command}`);
  if (!isFlagShaped(token) && !walk.scope.has(token)) return positionalRead(token, walk, command);
  const flag = walk.scope.get(token);
  if (flag === undefined) return valueTokensAfter(undefined, next);
  return registeredFlagRefusal(flag, token, next, walk, command) ?? valueTokensAfter(flag, next);
}

/**
 * The refusal a registered flag earns where it stands: given a second time when the registry does not
 * mark it `repeatable` (by name or alias, one flag), or given a value it does not take.
 */
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

/** The refusal for a flag given more than once that is read once: the flag, and where. */
export function givenTwiceRefusal(given: string, scope: string): string {
  return (
    `The ${given} flag of '${scope}' was given more than once, and is read once: give it once.\n` +
    `Run '${scope} --help' to see the flags this version accepts.`
  );
}

/** Every flag of one command's scope, by name and alias, dashes kept. */
function flagScopeOf(registry: CliRegistry, command: string): Map<string, FlagSpec> {
  const scope = new Map<string, FlagSpec>();
  for (const flag of registry.commands.find((c) => c.name === command)?.flags ?? []) {
    for (const name of [flag.name, ...(flag.aliases ?? [])]) scope.set(name, flag);
  }
  return scope;
}

/** A token read as a flag whether or not the scope has it: two dashes, as `parseArgs` reads one. */
function isFlagShaped(token: string): boolean {
  return token.startsWith("--");
}

/** A flag written with its value after an `=`, as in `--format=json`: a form this CLI does not read. */
export function isEqualsForm(token: string): boolean {
  return isFlagShaped(token) && token.includes("=");
}

/**
 * The refusal for a flag written `--flag=value`: the form as given, and the
 * spelling that is read — the flag and its value as two arguments, or the flag alone when it takes
 * none. Never the unknown-flag pin advice: no version reads the form, so no pin cures it. Refused
 * rather than split, by ruling: one spelling means one reader of argv, where splitting would teach
 * every reader of it the same answer.
 */
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

/**
 * How many tokens after a flag are its value: one for a value flag given one, and — for a flag the
 * scope does not have — one for the word after it, exactly as `parseArgs` pairs them, so an unknown
 * flag and its word stay the unknown-flag check's to refuse. An empty value is consumed as one, so it
 * stays a missing value rather than becoming a stray argument.
 */
function valueTokensAfter(flag: FlagSpec | undefined, next: string | undefined): number {
  if (next === undefined || isFlagShaped(next)) return 0;
  return flag === undefined || flag.arg !== undefined ? 1 : 0;
}

/** The refusal for a value given to a flag that takes none: the flag, and the value it was given. */
function takesNoValueRefusal(flag: string, value: string, command: string): string {
  return (
    `The ${flag} flag of 'spec-controller ${command}' takes no value, and was given one: '${value}'.\n` +
    `Run 'spec-controller ${command} --help' to see the flags this version accepts and the values they take.`
  );
}

/** A word that is no flag fills the command's next positional slot, or is refused when none is left. */
function positionalRead(token: string, walk: Walk, command: string): string | number {
  if (walk.slotsLeft === 0) {
    return walk.positionals.length === 0 ? notAFlagRefusal(token, command) : extraPositionalRefusal(token, walk, command);
  }
  walk.slotsLeft--;
  return 0;
}

/** The refusal for a word beyond the positional arguments a command takes: the word, and what it takes. */
function extraPositionalRefusal(token: string, walk: Walk, command: string): string {
  const takes = walk.positionals.map((positional) => positional.name).join(" ");
  return (
    `The argument '${token}' is more than 'spec-controller ${command}' takes: it takes ${takes} once, and its flags.\n` +
    `Run 'spec-controller ${command} --help' to see what this version accepts.`
  );
}

/** The refusal for a token that is no flag and no flag's value: the token, and what the command takes. */
function notAFlagRefusal(token: string, command: string): string {
  return (
    `The argument '${token}' is not a flag, nor the value of the flag before it: ` +
    `'spec-controller ${command}' takes only flags and their values.\n` +
    `Run 'spec-controller ${command} --help' to see the flags this version accepts.`
  );
}

/**
 * A host modifier given after the command is out of place, not unknown: the
 * flag exists, so the unknown-flag advice to bump a pin to a version that accepts it is false. Returns the
 * refusal for the first such flag, else null.
 */
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

/**
 * The registry-bounded flag check at a command's CLI edge. A command accepts ONLY
 * the flags its per-command registry scope LISTS (by `name` or `alias`); an unregistered flag — a
 * typo like `--strcit`, a stray `--bogus` — is a usage error, where the permissive parse above would
 * have recorded it. It bounds flag NAMES and nothing else: a word that is no flag, a value given to a
 * flag that takes none, a second copy, a `--flag=value` form, are `checkArgvShape`'s, which runs
 * first. This is the structural teeth behind "accepted = registry
 * = help": a flag cannot affect behaviour without a registry entry, and so (by the help-completeness
 * guard) without appearing in that command's help.
 *
 * PURE and `@unit`-testable: the parsed args (keys already `--`-stripped) plus the registry and
 * the command to bound against, returning the FIRST unregistered flag as a typed usage error
 * naming it WITH its dashes — routed to stderr and the enumerated usage status 2 by the caller,
 * never 1, never a silent run — else null. The global `--store`/`--run-id` modifiers are consumed
 * by the top-level dispatcher when they come BEFORE the command; written after it they reach the
 * command, and `checkMisplacedHostModifiers` refuses them as out of place before this runs.
 *
 * A COMMAND THE REGISTRY DOES NOT NAME ACCEPTS NOTHING, which is the honest reading rather than a
 * degenerate one: an unregistered command has no scope, so every flag given to it is outside it.
 * The dispatcher refuses such a command before this is ever reached, so the case is unreachable
 * today and stated here so it cannot become a silent "accept everything" later.
 *
 * IT NAMES THE VERSION THAT REFUSED, AND THAT IS FOR THE PINNED READER.
 * A consumer pins spec-controller and then moves their own tree; the pinned reader is handed argv
 * it was published too early — or too late — to understand, and an unadorned "unknown flag" is
 * indistinguishable from a typo. Naming the running version makes version skew legible from the CI
 * log alone, and naming the bump says what to do about it. `toolVersion` is a PARAMETER rather than
 * a read performed here so this stays pure and `@unit`-testable; the callers pass
 * `resolveToolIdentity().toolVersion`, the same value the report provenance carries.
 *
 * WHY THE PRODUCT SAYS THIS AND NOT THE CONSUMER. spec-controller's own repository is a consumer of
 * its published self, and the ruling there is that it does NOT wrap itself — a dependency, a `run:`
 * step, and the verdict its exit code gives. A consumer-side translator turning exit 2 into a skew
 * refusal is exactly that forbidden wrapper, and no other adopter could write one either. So the
 * refusal is the tool's own, which makes it universal rather than local.
 *
 * EXCEPT FOR A FLAG THE COMMAND HAS RETIRED, where the bump is false advice: `retiredFlagRefusal`
 * below names the retirement and its replacement instead.
 *
 * THE STATUS DOES NOT MOVE. The caller still routes this to stderr and exit 2. A mistyped `--strcit`
 * is still a usage fault, and giving skew its own status would cost every adopter the ordinary
 * reading to serve the rarer one.
 */
export function checkUnknownFlags(
  args: Record<string, string>,
  registry: CliRegistry,
  command: string,
  toolVersion: string,
): string | null {
  // The accepted set: every flag name AND alias in THIS command's scope, with the leading dashes
  // stripped so it compares against the parse's `--`-stripped keys (e.g. "--features" and "-h"
  // become "features" and "h"). Built from the registry alone — the single source — so
  // "accepted = registry" holds by construction.
  const entry = registry.commands.find((c) => c.name === command);
  const accepted = new Set<string>();
  for (const flag of entry?.flags ?? []) {
    accepted.add(flag.name.replace(/^-+/, ""));
    for (const alias of flag.aliases ?? []) accepted.add(alias.replace(/^-+/, ""));
  }
  // The FIRST parsed flag not in the accepted set is the reported error (Object.keys is argv
  // order, so this is deterministic). The message names the flag WITH its dashes, and the command
  // whose scope refused it — a consumer running two commands needs to know which help to open.
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

/**
 * THE REFUSAL FOR A FLAG THE COMMAND HAS RETIRED, or `undefined` when the
 * flag is merely unregistered. The drift advice above is true of a flag newer than the pin and
 * false of a retired one: every earlier version accepts it and no later one will, so the only pin
 * that satisfies "bump the pin to a version that accepts it" is a downgrade back onto the route
 * the retirement removed. So this names the retirement and the replacement, and offers no pin.
 */
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
