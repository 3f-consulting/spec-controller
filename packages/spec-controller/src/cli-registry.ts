/**
 * The declarative command/flag registry — the single source the CLI answers `--help`
 * from (@SCN-CLI-006). Two scopes mirror the two help surfaces:
 *
 *   - `global`   — the host modifiers recognised BEFORE the command (`--store`,
 *                  `--run-id`), consumed by the top-level dispatcher; rendered by
 *                  `spec-controller --help` (the sibling @SCN-CLI-007 surface).
 *   - `commands` — the per-command scopes; `balance`'s 9 flags (+ `--help`/`-h`),
 *                  rendered by `balance --help`.
 *
 * A flag exists ⇒ a registry entry ⇒ it appears in help, by construction — the
 * single-source discipline the completeness guard (@SCN-CLI-008) will enforce and the
 * registry-bounded parser (@SCN-CLI-009) will reject against. Flag descriptions are
 * migrated from doc/how_to_use.md's flag table, which the registry now supersedes as the
 * source of truth. Registry + renderers live in the CLI/app layer, never the domain.
 */

import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";

/** One flag in a scope: its canonical name, optional aliases, value placeholder, help. */
export interface FlagSpec {
  /** The canonical flag with dashes (e.g. "--features", "--help"). */
  name: string;
  /** Alternate spellings rendered after the name (e.g. ["-h"]); omit when none. */
  aliases?: string[];
  /** The value placeholder (e.g. "<dir>"); omit for boolean flags like `--help`. */
  arg?: string;
  /** True when the flag may be given more than once (`--format`); omit otherwise. */
  repeatable?: boolean;
  /** One-line help text — the description migrated from doc/how_to_use.md. */
  description: string;
}

/** A command's declaration: its token, a one-line summary, and its per-command flag scope. */
export interface CommandSpec {
  /** The command token (e.g. "balance"). */
  name: string;
  /** One-line summary for the top-level `spec-controller --help` (the CLI-007 surface). */
  summary: string;
  /** The command's per-command flag scope. */
  flags: FlagSpec[];
}

/** The two-scope registry: the global host-modifier scope, and the per-command scopes. */
export interface CliRegistry {
  /** Host modifiers recognised before the command — the global scope (CLI-007). */
  global: FlagSpec[];
  /** The per-command scopes. */
  commands: CommandSpec[];
}

/**
 * The `balance` command's per-command scope — its 9 reconciliation flags plus `--help`/
 * `-h`. Descriptions migrated from doc/how_to_use.md's flag table (the registry now the
 * source of truth; the doc is reconciled against it by @SCN-CLI-007/008).
 */
const balanceFlags: FlagSpec[] = [
  {
    name: "--features",
    arg: "<dir>",
    description: "Directory of Gherkin .feature files — the declared scenarios.",
  },
  {
    name: "--vitest",
    arg: "<report.json>",
    description: "A Vitest JSON report — runtime test evidence.",
  },
  {
    name: "--cucumber",
    arg: "<report.json>",
    description: "A Cucumber JSON report — runtime test evidence.",
  },
  {
    name: "--ci",
    arg: "<ci.yml>",
    description: "Your CI workflow — used to check whether @lint guards actually run over the real source.",
  },
  {
    name: "--package-json",
    arg: "<path>",
    description: "package.json — used to check a declared guard's script exists.",
  },
  {
    name: "--target",
    arg: "<name>",
    description: "A name recorded verbatim in the report's provenance (which project this run reconciled).",
  },
  {
    name: "--source-sha",
    arg: "<sha>",
    description: "Override the git commit SHA recorded in provenance (defaults to the resolved HEAD).",
  },
  {
    name: "--format",
    arg: "<fmt>[:<path>]",
    repeatable: true,
    description: "Where to send output (md or json, optionally :<path> to write to a file). Repeatable.",
  },
  {
    name: "--render-from-json",
    arg: "<path>",
    description: "Re-render Markdown from a previously saved Evidence Reconciliation JSON — no reconcile, no live inputs.",
  },
  {
    name: "--strict",
    description: "Fail the run (exit 3) when it carries Pending Items — the opt-in that escalates otherwise-run-neutral deferred obligations.",
  },
  {
    name: "--help",
    aliases: ["-h"],
    description: "Show this help and exit.",
  },
];

/** The global host-modifier scope — recognised before the command; the CLI-007 surface. */
const globalFlags: FlagSpec[] = [
  {
    name: "--store",
    arg: "<root>",
    description:
      "Store the run: write <root>/<target>/<run-id>/ with the reconciliation outputs + a run.yaml manifest. Required to store; there is no default (a default would write inside the repo).",
  },
  {
    name: "--run-id",
    arg: "<id>",
    description: "Name the stored run (default: an ISO-8601 UTC timestamp).",
  },
];

/**
 * The registry singleton — the single source both help surfaces render from.
 */
export const cliRegistry: CliRegistry = {
  global: globalFlags,
  commands: [
    {
      name: "balance",
      summary:
        "Reconcile Gherkin scenarios against test/CI evidence and emit the Evidence Reconciliation (Markdown to stdout by default).",
      flags: balanceFlags,
    },
  ],
};

/** The display label for a flag: its name, any aliases, then its arg-placeholder. */
function flagLabel(flag: FlagSpec): string {
  const names = [flag.name, ...(flag.aliases ?? [])].join(", ");
  return flag.arg !== undefined ? `${names} ${flag.arg}` : names;
}

/**
 * Render the `balance` command's per-command scope as help text: one line per registered
 * flag (name + arg-placeholder + description), driven BY the registry — so a flag that
 * exists is a flag that appears, by construction. Returns the help block WITHOUT a
 * trailing newline (the caller adds it, matching the writer's stdout convention).
 */
export function renderBalanceHelp(registry: CliRegistry): string {
  const command = registry.commands.find((c) => c.name === "balance");
  const flags = command?.flags ?? [];
  const gutter = 2;
  const labelWidth = Math.max(0, ...flags.map((f) => flagLabel(f).length));
  const lines = flags.map(
    (flag) => `  ${flagLabel(flag).padEnd(labelWidth + gutter)}${flag.description}`,
  );
  // The `specController.deferralTags` config field, with its recognised starter set SINGLE-SOURCED
  // from DEFAULT_DEFERRAL_TAGS (@SCN-PND-021 / the 3F-1405 completeness discipline — the render reads
  // the constant, never a hand-kept copy, so the documented set cannot drift from the recognised one).
  const starterSet = DEFAULT_DEFERRAL_TAGS.map((tag) => `@${tag}`).join(", ");
  const configLines = [
    "Configuration (in the target repo's package.json):",
    "  specController.deferralTags: string[]",
    "      Extra recognised deferral tags. A scenario carrying one defers every obligation it",
    "      declares to a Pending Item, extending (never replacing) the built-in set.",
    `      Built-in deferral tags: ${starterSet}`,
  ];
  return [
    `spec-controller balance — ${command?.summary ?? ""}`,
    "",
    "Options:",
    ...lines,
    "",
    ...configLines,
  ].join("\n");
}

/**
 * Render the top-level `spec-controller --help` surface (@SCN-CLI-007) FROM the registry:
 * a Commands section (each command's name + one-line summary) and a Host modifiers section
 * (each global-scope flag: name + arg-placeholder + one-line description). The global-scope
 * half of the two-scope registry — the counterpart to `renderBalanceHelp`'s per-command
 * half — so the top-level usage no longer hand-keeps (and can no longer silently drift
 * from) the command set or the host modifiers; both are sourced from `cliRegistry`.
 * Summaries and descriptions render on a single line (no wrapping) so a registered string
 * appears verbatim. Returns the block WITHOUT a trailing newline (the caller adds it).
 */
export function renderTopLevelHelp(registry: CliRegistry): string {
  const commandGutter = 4;
  const commandWidth = Math.max(0, ...registry.commands.map((c) => c.name.length));
  const commandLines = registry.commands.map(
    (command) => `  ${command.name.padEnd(commandWidth + commandGutter)}${command.summary}`,
  );
  const modifierGutter = 3;
  const modifierWidth = Math.max(0, ...registry.global.map((f) => flagLabel(f).length));
  const modifierLines = registry.global.map(
    (flag) => `  ${flagLabel(flag).padEnd(modifierWidth + modifierGutter)}${flag.description}`,
  );
  const modifierUsage = registry.global.map((flag) => `[${flagLabel(flag)}]`).join(" ");
  return [
    "spec-controller — reconcile declared behaviour against observed evidence",
    "",
    "Usage:",
    `  spec-controller ${modifierUsage} <command> [command-args]`,
    "",
    "Commands:",
    ...commandLines,
    "",
    "Host modifiers (before the command):",
    ...modifierLines,
    "",
    "Full flags, examples, and CI wiring: doc/how_to_use.md.",
  ].join("\n");
}
