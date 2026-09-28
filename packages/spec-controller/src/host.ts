/**
 * The host-invocation parse — the pure half of the `spec-controller` command host.
 *
 * The shipped binary is `spec-controller [--store <root>] [--run-id <id>] <command>
 * [command-args]`. `--store` / `--run-id` are CROSS-CUTTING host options recognised
 * ONLY in leading position, before the command: storage applies across balance /
 * analyse / migrate, so it belongs at the host (wrapping any command via the kept-run
 * scaffold), not as a peer command and never as a flag inside `balance`. This module
 * holds the pure rules the impure dispatcher (`cli.ts`) drives — parsing the leading
 * options, building the wrapped command argv, and peeking the conventional provenance
 * flags — so the whole host contract is `@unit`-testable with no IO.
 */

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

/** A parsed host invocation: leading global options, then the command and its clean args. */
export interface HostInvocation {
  /** The injected store root from a leading `--store <root>`, or undefined (no store). */
  store?: string;
  /** The mnemonic from a leading `--run-id <id>`, or undefined (→ the timestamp default). */
  runId?: string;
  /** The command token (e.g. "balance"), or undefined when none was given. */
  command?: string;
  /** The command's own args — everything after the command token, verbatim. */
  commandArgs: string[];
  /**
   * The usage fault in the leading tokens, when there is one: the host refuses it at exit 2 before
   * any command or stored run starts.
   */
  refusal?: string;
}

/**
 * Parse the host argv into its leading global options (`--store`, `--run-id`) and the
 * command + its clean args. Global options are recognised ONLY before the command: the
 * first token that is not a consumed global option (or its value) is the command, and
 * everything after it is the command's own args, verbatim. So `--store /s balance
 * --features f` yields the store + `balance` + `[--features, f]`, while `balance --store
 * /s` leaves `--store` in the command's args (a `--store` AFTER the command is the
 * command's own arg, never a host store directive) — the "global before command" contract.
 * A modifier with nothing after it is refused; an empty argv is the bare help. A `--help` or `-h`
 * among the host's own tokens answers the top-level help ahead of any refusal beside it.
 */
export function parseHostInvocation(
  argv: readonly string[],
  globalFlags: readonly FlagSpec[] = cliRegistry.global,
  commands: readonly string[] = cliRegistry.commands.map((command) => command.name),
): HostInvocation {
  const read = readHostTokens(argv, globalFlags, commands);
  const help = argv.slice(0, hostTokenCount(argv, read)).find((token) => TOP_LEVEL_HELP.has(token));
  return help === undefined ? read : { command: help, commandArgs: [] };
}

/**
 * How many leading tokens are the host's own: those before the command it hands the rest to, or
 * every token when it hands them to none, because it refused one or found no command.
 */
function hostTokenCount(argv: readonly string[], read: HostInvocation): number {
  if (read.refusal !== undefined || read.command === undefined) return argv.length;
  return argv.length - read.commandArgs.length - 1;
}

/** The host's tokens read in order: its modifiers, then the command and the command's own args. */
function readHostTokens(
  argv: readonly string[],
  globalFlags: readonly FlagSpec[],
  commands: readonly string[],
): HostInvocation {
  // The modifiers and the values they take are the registry's global scope, never a list kept here:
  // a modifier added later is read, and refused without its value, by construction.
  const modifiers = valueFlagsOf(globalFlags);
  const values = new Map<string, string>();
  let i = 0;
  for (; i < argv.length; i++) {
    const token = argv[i] ?? "";
    const modifier = modifiers.get(token);
    if (modifier === undefined) {
      const refusal = leadingFlagRefusal(token, modifiers, globalFlags);
      if (refusal !== undefined) return { commandArgs: [], refusal };
      break; // first non-modifier token is the command
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

/** What the host has read so far, and the commands the registry carries. */
interface HostRead {
  values: ReadonlyMap<string, string>;
  commands: readonly string[];
}

/**
 * The refusal a modifier earns where it stands, else undefined; `ahead` is its value and the token
 * after it. Given twice, it is never read as its last value: `--store A --store B` used
 * to store under B without a word. Given no value, it is never handed the next token:
 * `--store --run-id r1` used to store under a directory called `--run-id`. Given the command as its
 * value with no command after it, it has eaten the command: `--store balance
 * --features f` used to blame `--features`, and `--store balance` alone answered help at exit 0. A
 * command name followed by the command is still a value: `--store balance balance …` is read.
 */
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

/**
 * The refusal for host modifiers with nothing after them: every modifier given, in one line, and the
 * fix. Given last, `--store <root>` used to answer the top-level help at exit 0 having
 * run nothing, a false green for a CI step that lost its command word. Help after a
 * modifier is a command here, and a bare `spec-controller` never reaches this.
 */
function noCommandRefusal(given: readonly string[]): string {
  return (
    `No command followed the host modifiers given (${given.join(", ")}), so nothing ran: ` +
    `a host modifier needs a command after it, or --help.\n` +
    `Run 'spec-controller --help' to see the commands and host modifiers this version accepts.`
  );
}

/** The refusal for a modifier that took the command as its value: the modifier, the command, and the fix. */
function commandAsValueRefusal(token: string, modifier: FlagSpec, command: string): string {
  return (
    `The ${token} host modifier took '${command}', a command, as its value, and left no command to run.\n` +
    `Give ${token} its own value, as in 'spec-controller ${token} ${modifier.arg ?? ""} ${command} …'. ` +
    `Run 'spec-controller --help' to see the commands and host modifiers this version accepts.`
  );
}

/**
 * The refusal a leading token that is no modifier earns, else undefined (it is the command). A
 * modifier written `--store=<root>` is a form that is not read, never a flag out of
 * place; any other flag here is out of place, never a command: `--exit-zero balance`
 * used to answer `unknown command "--exit-zero"`. The top-level help stays where it was.
 */
function leadingFlagRefusal(
  token: string,
  modifiers: ReadonlyMap<string, FlagSpec>,
  globalFlags: readonly FlagSpec[],
): string | undefined {
  if (isEqualsForm(token)) return equalsFormRefusal(token, modifiers, "spec-controller");
  if (isFlagOutOfPlace(token)) return flagBeforeCommandRefusal(token, globalFlags);
  return undefined;
}

/** The help the host answers in the command's place, which is the one flag it takes there. */
const TOP_LEVEL_HELP: ReadonlySet<string> = new Set(["--help", "-h"]);

/** True for a flag-shaped token that is not the top-level help. */
function isFlagOutOfPlace(token: string): boolean {
  return token.length > 1 && token.startsWith("-") && !TOP_LEVEL_HELP.has(token);
}

/** The refusal for a flag given before the command: the flag, what goes there, and where it goes. */
function flagBeforeCommandRefusal(flag: string, globalFlags: readonly FlagSpec[]): string {
  const modifiers = globalFlags.map((modifier) => modifier.name).join(", ");
  return (
    `The ${flag} flag was given before the command. Before the command, spec-controller takes ` +
    `only its host modifiers (${modifiers}); a command's own flags go after it, as in ` +
    `'spec-controller <command> ${flag}'.\n` +
    `Run 'spec-controller --help' to see the commands and host modifiers this version accepts.`
  );
}

/**
 * Build the wrapped command argv: the command's clean args followed by a repeated
 * `--format <spec>` per store-dir output spec. Pure — the impure runner hands the result
 * straight to the command, so the command's OWN writer produces the stored artefacts
 * (byte-identical to a bare `--format` run; no writer duplication).
 */
export function wrapCommandArgv(commandArgs: readonly string[], formatSpecs: readonly string[]): string[] {
  return [...commandArgs, ...formatSpecs.flatMap((spec) => ["--format", spec])];
}

/**
 * Read a `--<name> <value>` flag's value from an arg list WITHOUT consuming it — the host
 * peeks the conventional cross-cutting provenance flags (`--target`, `--features`,
 * `--source-sha`) to name the run dir + stamp run.yaml, while the command still receives
 * them in its own args. Returns undefined when the flag is absent or has no value.
 */
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

/** The host's answer to a command it does not know: what goes to stderr, and the status. */
export interface UnknownCommandAnswer {
  exitCode: number;
  stderr: string;
}

/**
 * Answer a command the registry does not carry. It is given the command token and the rendered
 * help, never the command's args, so no flag after the command can change the answer.
 *
 * An unknown command is a usage fault, so it exits 2, the published usage code
 * (packages/spec-controller/README.md), which `--exit-zero` never masks.
 */
export function answerUnknownCommand(command: string, help: string): UnknownCommandAnswer {
  return {
    exitCode: 2,
    stderr: `spec-controller: unknown command "${command}".\n\n${help}\n`,
  };
}

/**
 * The refusal for host modifiers given before a command that takes none, else undefined. A request
 * for that command's own help is answered instead, wherever the help token stands among its args:
 * help runs nothing and keeps no run, so there is nothing for the modifiers to be refused from.
 */
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

/**
 * The file paths a command's own `--format` values name: each value's text after its first colon,
 * as `planOutput` reads it. A value with no colon goes to stdout and names no file.
 */
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
