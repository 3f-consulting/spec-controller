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
export function parseHostInvocation(argv: readonly string[]): HostInvocation {
  let store: string | undefined;
  let runId: string | undefined;
  let i = 0;
  for (; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--store" && i + 1 < argv.length) {
      store = argv[i + 1];
      i++;
      continue;
    }
    if (token === "--run-id" && i + 1 < argv.length) {
      runId = argv[i + 1];
      i++;
      continue;
    }
    break; // first non-global-option token is the command
  }
  return { store, runId, command: argv[i], commandArgs: argv.slice(i + 1) };
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
