import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";

export interface FlagSpec {
  name: string;
  aliases?: string[];
  arg?: string;
  repeatable?: boolean;
  description: string;
}

export interface PositionalSpec {
  name: string;
  description: string;
}

export interface CommandSpec {
  name: string;
  summary: string;
  flags: FlagSpec[];
  positionals?: PositionalSpec[];
  acceptsHostModifiers?: false;
  configHelp?: string[];
  retiredFlags?: RetiredFlagSpec[];
}

export interface RetiredFlagSpec {
  name: string;
  retiredIn: string;
  replacement: string;
}

export interface CliRegistry {
  global: FlagSpec[];
  commands: CommandSpec[];
}

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
      "The target's package.json — its `scripts`, and its specController.runners, specController.notChecks and specController.deferralTags. A fitness check is declared by its @fitness scenario and the CI step whose id: is that scenario's @SCN; no manifest key names one.",
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

const balanceConfigHelp: string[] = [
  "Configuration (in the target repo's package.json):",
  "  specController.deferralTags: string[]",
  "      Extra recognised deferral tags. A scenario carrying one defers every obligation it",
  "      names to a Pending Item, extending (never replacing) the built-in set.",
  `      Built-in deferral tags: ${DEFAULT_DEFERRAL_TAGS.map((tag) => `@${tag}`).join(", ")}`,
];

const balanceRetiredFlags: RetiredFlagSpec[] = [
  {
    name: "--measurements",
    retiredIn: "0.1.0-alpha.5",
    replacement:
      "A fitness check is credited by the outcome of its own CI step: put the check's @SCN on that step's `id:` and hand balance the run's step record with --ci-steps.",
  },
];

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
    description:
      "Name the stored run (default: an ISO-8601 UTC timestamp). Read only with --store: given without it, the run is refused, since no run would be kept under the name.",
  },
];

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

function flagLabel(flag: FlagSpec): string {
  const names = [flag.name, ...(flag.aliases ?? [])].join(", ");
  return flag.arg !== undefined ? `${names} ${flag.arg}` : names;
}

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
