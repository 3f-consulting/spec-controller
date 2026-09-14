/**
 * THE ONE READING OF A COMMAND'S ARGV, and the one bounding of it against the registry.
 *
 * WHY IT IS ITS OWN MODULE (3F-3300). Both halves lived inside `cli-balance/cli.ts` while
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
 * became one for `renderCommandHelp` (3F-3298). @SCN-CLI-009's scenario is unchanged and still
 * asks about `balance`: what a second command gets is the same bounding BY CONSTRUCTION, and the
 * residual — that an unregistered flag to `tags` is unproven by a scenario of its own — is named
 * on 3F-3286 rather than left silent.
 */

import type { CliRegistry } from "./cli-registry.js";

/**
 * Parse `--flag value` pairs from a command's argv into a record, keys with the `--` stripped.
 *
 * A flag whose next token is another flag (or absent) records the string `"true"`, which is how
 * the boolean flags — `--strict`, `--help` — are recognised: presence is what matters, so callers
 * read them with `!== undefined`.
 *
 * PERMISSIVE BY ITSELF, AND BOUNDED BY THE CALLER. It records whatever it is given, including a
 * flag no registry names; `checkUnknownFlags` below is what turns that into a usage error. The
 * split is deliberate — the parse has no opinion about which command it is reading for, and the
 * bounding has nothing else to do.
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
 * The registry-bounded flag check at a command's CLI edge (@SCN-CLI-009). A command accepts ONLY
 * the flags its per-command registry scope LISTS (by `name` or `alias`); an unregistered flag — a
 * typo like `--strcit`, a stray `--bogus` — is a usage error, NOT silently swallowed the way the
 * permissive parse above would leave it. This is the structural teeth behind "accepted = registry
 * = help": a flag cannot affect behaviour without a registry entry, and so (by @SCN-CLI-008's
 * guard) without appearing in that command's help.
 *
 * PURE and `@unit`-testable: the parsed args (keys already `--`-stripped) plus the registry and
 * the command to bound against, returning the FIRST unregistered flag as a typed usage error
 * naming it WITH its dashes — routed to stderr and the enumerated usage status 2 by the caller,
 * never 1, never a silent run — else null. The global `--store`/`--run-id` modifiers never reach
 * here: the top-level dispatcher consumes them BEFORE any command is dispatched, so a bounded
 * parse sees only the command's own args.
 *
 * A COMMAND THE REGISTRY DOES NOT NAME ACCEPTS NOTHING, which is the honest reading rather than a
 * degenerate one: an unregistered command has no scope, so every flag given to it is outside it.
 * The dispatcher refuses such a command before this is ever reached, so the case is unreachable
 * today and stated here so it cannot become a silent "accept everything" later.
 *
 * IT NAMES THE VERSION THAT REFUSED, AND THAT IS FOR THE PINNED READER (3F-3105, @SCN-SLF-008).
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
