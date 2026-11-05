import { BUILT_IN_DEFERRAL_TAGS } from "@3f-consulting/spec-controller-core";
import { AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { EVIDENCE_INPUTS } from "./cli-balance/evidenceInputs.js";

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

interface RetiredFlagSpec {
  name: string;
  retiredIn: string;
  replacement: string;
}

export interface CliRegistry {
  global: FlagSpec[];
  commands: CommandSpec[];
}

const balanceFlags: FlagSpec[] = [
  ...EVIDENCE_INPUTS.map(({ flag, arg, description }) => ({ name: `--${flag}`, arg, description: message(description) })),
  {
    name: "--target",
    arg: "<name>",
    description: message(AppMessage.TargetFlag),
  },
  {
    name: "--source-sha",
    arg: "<sha>",
    description: message(AppMessage.SourceShaFlag),
  },
  {
    name: "--format",
    arg: "<fmt>[:<path>]",
    repeatable: true,
    description: message(AppMessage.FormatFlag),
  },
  {
    name: "--render-from-json",
    arg: "<path>",
    description: message(AppMessage.RenderFromJsonFlag),
  },
  {
    name: "--strict",
    description: message(AppMessage.StrictFlag),
  },
  {
    name: "--exit-zero",
    description: message(AppMessage.ExitZeroFlag),
  },
  {
    name: "--help",
    aliases: ["-h"],
    description: message(AppMessage.HelpFlag),
  },
];

function explainingLines(entry: string): string[] {
  return entry.split("\n").map((line) => `      ${line}`);
}

const balanceConfigHelp: string[] = [
  message(AppMessage.ConfigurationHeading),
  `  ${message(AppMessage.DeferralTagsKey)}`,
  ...explainingLines(message(AppMessage.DeferralTagsExplanation)),
  ...explainingLines(message(AppMessage.BuiltInDeferralTags, { tags: BUILT_IN_DEFERRAL_TAGS.map((tag) => `@${tag}`).join(", ") })),
];

const balanceRetiredFlags: RetiredFlagSpec[] = [
  {
    name: "--measurements",
    retiredIn: "0.1.0-alpha.5",
    replacement: message(AppMessage.MeasurementsReplacement),
  },
];

const globalFlags: FlagSpec[] = [
  {
    name: "--store",
    arg: "<root>",
    description: message(AppMessage.StoreModifier),
  },
  {
    name: "--run-id",
    arg: "<id>",
    description: message(AppMessage.RunIdModifier),
  },
];

export const balanceCommand: CommandSpec = {
  name: "balance",
  summary: message(AppMessage.BalanceSummary),
  flags: balanceFlags,
  configHelp: balanceConfigHelp,
  retiredFlags: balanceRetiredFlags,
};

export const allocateCommand: CommandSpec = {
  name: "allocate",
  summary: message(AppMessage.AllocateSummary),
  acceptsHostModifiers: false,
  positionals: [
    { name: "<FFF>", description: message(AppMessage.FeaturePartArgument) },
  ],
  flags: [
    {
      name: "--new",
      description: message(AppMessage.NewFlag),
    },
    { name: "--help", aliases: ["-h"], description: message(AppMessage.HelpFlag) },
  ],
};

export const cliRegistry: CliRegistry = {
  global: globalFlags,
  commands: [balanceCommand, allocateCommand],
};

function flagLabel(flag: FlagSpec): string {
  const names = [flag.name, ...(flag.aliases ?? [])].join(", ");
  return flag.arg !== undefined ? `${names} ${flag.arg}` : names;
}

export function renderCommandHelp(command: CommandSpec): string {
  const flags = command.flags;
  const gutter = 2;
  const labelWidth = Math.max(0, ...flags.map((f) => flagLabel(f).length));
  const lines = flags.map(
    (flag) => `  ${flagLabel(flag).padEnd(labelWidth + gutter)}${flag.description}`,
  );
  const configHelp = command.configHelp ?? [];
  return [
    message(AppMessage.HelpCommandTitle, { command: command.name, summary: command.summary }),
    ...positionalHelp(command.name, command.positionals ?? []),
    "",
    message(AppMessage.HelpOptions),
    ...lines,
    ...(configHelp.length > 0 ? ["", ...configHelp] : []),
  ].join("\n");
}

function positionalHelp(command: string, positionals: readonly PositionalSpec[]): string[] {
  if (positionals.length === 0) return [];
  const width = Math.max(...positionals.map((positional) => positional.name.length));
  return [
    "",
    `${message(AppMessage.HelpUsage)} ${message(AppMessage.HelpCommandUsageLine, { command, arguments: positionals.map((positional) => positional.name).join(" ") })}`,
    "",
    message(AppMessage.HelpArguments),
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
    message(AppMessage.HelpTitle),
    "",
    message(AppMessage.HelpUsage),
    `  ${message(AppMessage.HelpUsageLine, { modifierUsage })}`,
    "",
    message(AppMessage.HelpCommands),
    ...commandLines,
    "",
    message(AppMessage.HelpHostModifiers),
    ...modifierLines,
    "",
    message(AppMessage.HelpPointer),
  ].join("\n");
}
