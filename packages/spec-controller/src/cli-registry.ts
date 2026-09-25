/**
 * The data-driven command/flag registry — the single source the CLI answers `--help`
 * from (@SCN-CLI-006). Two scopes mirror the two help surfaces:
 *
 *   - `global`   — the host modifiers recognised BEFORE the command (`--store`,
 *                  `--run-id`), consumed by the top-level dispatcher; rendered by
 *                  `spec-controller --help` (the sibling @SCN-CLI-007 surface).
 *   - `commands` — the per-command scopes; each command's own flags (+ `--help`/`-h`),
 *                  rendered by `<command> --help`. No count is written here: @SCN-CLI-008 holds
 *                  registry and render together whatever the number is, and a figure repeated in
 *                  prose is one nothing reads (3F-3277).
 *
 * A flag exists ⇒ a registry entry ⇒ it appears in help, by construction — the
 * single-source discipline the completeness guard (@SCN-CLI-008) will enforce and the
 * registry-bounded parser (@SCN-CLI-009) will reject against. Registry + renderers live in the
 * CLI/app layer, never the domain.
 *
 * THE REGISTRY IS THE SOURCE OF TRUTH FOR A FLAG'S DESCRIPTION AND NOTHING RECONCILES THE DOC
 * AGAINST IT. This docblock used to say the doc was reconciled by @SCN-CLI-007/008; it is not —
 * those two are about the registry and the two RENDERERS, and nothing in `tests/` or `features/`
 * reads doc/how_to_use.md at all (3F-3256 deleted the checks that read documentation). So the
 * flag table in that page is kept in step by hand, and it has drifted in BOTH directions before
 * now: ahead of the registry on one sentence and behind it on the next (3F-3083).
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

/** A positional argument a command takes: its placeholder, and what it is. */
export interface PositionalSpec {
  /** The placeholder as help shows it (e.g. "<FFF>"). */
  name: string;
  /** One-line help text. */
  description: string;
}

/** A command: its token, a one-line summary, its per-command flag scope, and any config it reads. */
export interface CommandSpec {
  /** The command token (e.g. "balance"). */
  name: string;
  /** One-line summary for the top-level `spec-controller --help` (the CLI-007 surface). */
  summary: string;
  /** The command's per-command flag scope. */
  flags: FlagSpec[];
  /** The positional arguments the command takes, in order, each once. Omit when it takes flags only. */
  positionals?: PositionalSpec[];
  /** False for a command that keeps no run, so the host refuses `--store`/`--run-id` before it. Omit otherwise. */
  acceptsHostModifiers?: false;
  /**
   * Trailing help lines documenting `package.json` config THIS command reads, rendered
   * verbatim after the flag list. It lives on the command's entry rather than in the
   * renderer because a config field belongs to whichever command consumes it: appended
   * unconditionally, `balance`'s `specController.deferralTags` block would document, under
   * every later command, a field that command does not read (3F-3298). Omit when none.
   */
  configHelp?: string[];
  /**
   * Flags this command once accepted and no longer does (3F-3528). Refused like any flag
   * outside `flags`, but as retired: a flag every earlier version accepts and no later one will
   * cannot be cured by bumping a pin, only by moving to what replaced it. Never read by the help
   * renderers, so a retired flag cannot reach `--help` or become accepted by being listed here.
   * APPEND-ONLY. Omit when none.
   */
  retiredFlags?: RetiredFlagSpec[];
}

/** A flag a command has retired: what it was, the first version to refuse it, and its successor. */
export interface RetiredFlagSpec {
  /** The retired flag with dashes (e.g. "--measurements"). */
  name: string;
  /** The first published version whose command no longer accepted it. */
  retiredIn: string;
  /** One sentence naming what a consumer does instead. */
  replacement: string;
}

/** The two-scope registry: the global host-modifier scope, and the per-command scopes. */
export interface CliRegistry {
  /** Host modifiers recognised before the command — the global scope (CLI-007). */
  global: FlagSpec[];
  /** The per-command scopes. */
  commands: CommandSpec[];
}

/**
 * The `balance` command's per-command scope — its reconciliation flags plus `--help`/`-h`.
 * This registry is where a flag's description LIVES; doc/how_to_use.md's flag table restates it
 * by hand, reconciled by nobody (see the header).
 */
const balanceFlags: FlagSpec[] = [
  {
    name: "--features",
    arg: "<dir>",
    description:
      "Directory of Gherkin .feature files — the scenarios, and the `@`-tags naming what each must prove (@unit, @integration, @fitness, …).",
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
    description:
      "Your CI workflows — a file, or a directory of them (default .github/workflows). Where a static check you have not converted is found running over the real source, and where a check step's `id:` supplies the @SCN its result cites.",
  },
  {
    name: "--package-json",
    arg: "<path>",
    description:
      "The target's package.json — its `scripts`, and its specController.runners and specController.notChecks. A fitness check is declared by its @fitness scenario and the CI step whose id: is that scenario's @SCN; no manifest key names one.",
  },
  {
    name: "--ci-steps",
    arg: "<record.json>",
    description:
      "The CI run's own record of what each of its steps did — your pipeline's `toJSON(steps)` dump, evidence for the converted fitness checks. Omit it if you have converted none.",
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
    name: "--exit-zero",
    description: "Print the same report but exit 0 on an out-of-balance or scenario-code-error (1) or --strict pending (3) verdict — the on-ramp before gating. Usage (2), unsound (4) and nothing-to-reconcile (5) still fail.",
  },
  {
    name: "--help",
    aliases: ["-h"],
    description: "Show this help and exit.",
  },
];

/**
 * `balance`'s config block: the `specController.deferralTags` field it reads, with its
 * recognised starter set SINGLE-SOURCED from DEFAULT_DEFERRAL_TAGS (@SCN-PND-021 / the
 * 3F-1405 completeness discipline — the lines are built FROM the constant, never a
 * hand-kept copy, so the documented set cannot drift from the recognised one). It hangs
 * off balance's registry entry, not off the renderer, so it renders under `balance --help`
 * and under nothing else.
 */
const balanceConfigHelp: string[] = [
  "Configuration (in the target repo's package.json):",
  "  specController.deferralTags: string[]",
  "      Extra recognised deferral tags. A scenario carrying one defers every obligation it",
  "      names to a Pending Item, extending (never replacing) the built-in set.",
  `      Built-in deferral tags: ${DEFAULT_DEFERRAL_TAGS.map((tag) => `@${tag}`).join(", ")}`,
];

/**
 * The flags `balance` has retired. `--measurements` left with the measured route at 3F-3506: no
 * number reaches the ledger, and a fitness check is credited by its own CI step's outcome.
 */
const balanceRetiredFlags: RetiredFlagSpec[] = [
  {
    name: "--measurements",
    retiredIn: "0.1.0-alpha.5",
    replacement:
      "A fitness check is credited by the outcome of its own CI step: put the check's @SCN on that step's `id:` and hand balance the run's step record with --ci-steps.",
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
      configHelp: balanceConfigHelp,
      retiredFlags: balanceRetiredFlags,
    },
    {
      name: "allocate",
      summary:
        "Print the next @SCN code for a feature part: one past the highest the repository has ever carried, the code alone on stdout.",
      acceptsHostModifiers: false,
      positionals: [
        { name: "<FFF>", description: "The feature part: a feature file's header code, two to five of A-Z and 0-9." },
      ],
      flags: [
        {
          name: "--new",
          description:
            "Start a part no feature file's header carries yet: its first code, or one past any number the repository already carries for it.",
        },
        { name: "--help", aliases: ["-h"], description: "Show this help and exit." },
      ],
    },
  ],
};

/** The display label for a flag: its name, any aliases, then its arg-placeholder. */
function flagLabel(flag: FlagSpec): string {
  const names = [flag.name, ...(flag.aliases ?? [])].join(", ");
  return flag.arg !== undefined ? `${names} ${flag.arg}` : names;
}

/**
 * Render THE NAMED command's per-command scope as help text: one line per registered flag
 * (name + arg-placeholder + description), then whatever config lines that command's entry
 * carries — driven BY the registry, so a flag that exists is a flag that appears, by
 * construction. Returns the help block WITHOUT a trailing newline (the caller adds it,
 * matching the writer's stdout convention).
 *
 * THE COMMAND IS A PARAMETER (3F-3298). It used to be the literal `"balance"`, found by name
 * inside this function, which is what the single registered command made look general. A
 * second command had no help surface at all under that signature — not an empty one; there
 * was no argument by which to ask. What the renderer covers is now the registry's shape
 * rather than the command set's size on the day it was written.
 */
export function renderCommandHelp(registry: CliRegistry, command: string): string {
  const entry = registry.commands.find((c) => c.name === command);
  const flags = entry?.flags ?? [];
  const gutter = 2;
  const labelWidth = Math.max(0, ...flags.map((f) => flagLabel(f).length));
  const lines = flags.map(
    (flag) => `  ${flagLabel(flag).padEnd(labelWidth + gutter)}${flag.description}`,
  );
  const configHelp = entry?.configHelp ?? [];
  return [
    `spec-controller ${command} — ${entry?.summary ?? ""}`,
    ...positionalHelp(command, entry?.positionals ?? []),
    "",
    "Options:",
    ...lines,
    ...(configHelp.length > 0 ? ["", ...configHelp] : []),
  ].join("\n");
}

/** A command's usage line and its arguments, one line each; nothing for a command that takes flags only. */
function positionalHelp(command: string, positionals: readonly PositionalSpec[]): string[] {
  if (positionals.length === 0) return [];
  const width = Math.max(...positionals.map((positional) => positional.name.length));
  return [
    "",
    `Usage: spec-controller ${command} ${positionals.map((positional) => positional.name).join(" ")} [options]`,
    "",
    "Arguments:",
    ...positionals.map((positional) => `  ${positional.name.padEnd(width + 2)}${positional.description}`),
  ];
}

/**
 * Render the top-level `spec-controller --help` surface (@SCN-CLI-007) FROM the registry:
 * a Commands section (each command's name + one-line summary) and a Host modifiers section
 * (each global-scope flag: name + arg-placeholder + one-line description). The global-scope
 * half of the two-scope registry — the counterpart to `renderCommandHelp`'s per-command
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
    "spec-controller — reconcile scenarios against observed evidence",
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
