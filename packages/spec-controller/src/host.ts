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
 *
 * @SCN-RMG-004 — features/run-management.feature.
 */

import { isMissingValue, missingValueRefusal, valueFlagsOf } from "./cli-args.js";
import { cliRegistry, type FlagSpec } from "./cli-registry.js";

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
   * any command or stored run starts (@SCN-CLI-059).
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
 */
export function parseHostInvocation(
  argv: readonly string[],
  globalFlags: readonly FlagSpec[] = cliRegistry.global,
): HostInvocation {
  // The modifiers and the values they take are the registry's global scope, never a list kept here
  // (@SCN-CLI-059): a modifier added later is read, and refused without its value, by construction.
  const modifiers = valueFlagsOf(globalFlags);
  const values = new Map<string, string>();
  let i = 0;
  for (; i < argv.length; i++) {
    const token = argv[i] ?? "";
    const modifier = modifiers.get(token);
    if (modifier === undefined) {
      // Any other flag here is out of place, never a command (@SCN-CLI-060): `--exit-zero balance`
      // used to answer `unknown command "--exit-zero"`. The top-level help stays where it was.
      if (isFlagOutOfPlace(token)) return { commandArgs: [], refusal: flagBeforeCommandRefusal(token, globalFlags) };
      break; // first non-modifier token is the command
    }
    const value = argv[i + 1];
    // A modifier given no value is refused, never handed the next token: `--store --run-id r1`
    // used to store under a directory called `--run-id`, and an empty `--store` under the cwd.
    if (isMissingValue(value)) {
      return { commandArgs: [], refusal: missingValueRefusal(token, modifier, "spec-controller") };
    }
    values.set(modifier.name, value ?? "");
    i++;
  }
  return {
    store: values.get("--store"),
    runId: values.get("--run-id"),
    command: argv[i],
    commandArgs: argv.slice(i + 1),
  };
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
 * (packages/spec-controller/README.md), which `--exit-zero` never masks (3F-3649).
 *
 * @SCN-CLI-056 @SCN-CLI-057 — features/cli-balance.feature.
 */
export function answerUnknownCommand(command: string, help: string): UnknownCommandAnswer {
  return {
    exitCode: 2,
    stderr: `spec-controller: unknown command "${command}".\n\n${help}\n`,
  };
}
