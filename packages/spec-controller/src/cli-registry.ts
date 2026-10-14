import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

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
  {
    name: "--features",
    arg: "<dir>",
    description: APP_MESSAGES[AppMessage.FeaturesFlag](),
  },
  {
    name: "--vitest",
    arg: "<report.json>",
    description: APP_MESSAGES[AppMessage.VitestFlag](),
  },
  {
    name: "--pytest",
    arg: "<report.xml>",
    description: APP_MESSAGES[AppMessage.PytestFlag](),
  },
  {
    name: "--jest",
    arg: "<report.json>",
    description: APP_MESSAGES[AppMessage.JestFlag](),
  },
  {
    name: "--cucumber",
    arg: "<report.json>",
    description: APP_MESSAGES[AppMessage.CucumberFlag](),
  },
  {
    name: "--ci",
    arg: "<ci.yml>",
    description: APP_MESSAGES[AppMessage.CiFlag](),
  },
  {
    name: "--package-json",
    arg: "<path>",
    description: APP_MESSAGES[AppMessage.PackageJsonFlag](),
  },
  {
    name: "--ci-steps",
    arg: "<record.json>",
    description: APP_MESSAGES[AppMessage.CiStepsFlag](),
  },
  {
    name: "--target",
    arg: "<name>",
    description: APP_MESSAGES[AppMessage.TargetFlag](),
  },
  {
    name: "--source-sha",
    arg: "<sha>",
    description: APP_MESSAGES[AppMessage.SourceShaFlag](),
  },
  {
    name: "--format",
    arg: "<fmt>[:<path>]",
    repeatable: true,
    description: APP_MESSAGES[AppMessage.FormatFlag](),
  },
  {
    name: "--render-from-json",
    arg: "<path>",
    description: APP_MESSAGES[AppMessage.RenderFromJsonFlag](),
  },
  {
    name: "--strict",
    description: APP_MESSAGES[AppMessage.StrictFlag](),
  },
  {
    name: "--exit-zero",
    description: APP_MESSAGES[AppMessage.ExitZeroFlag](),
  },
  {
    name: "--help",
    aliases: ["-h"],
    description: APP_MESSAGES[AppMessage.HelpFlag](),
  },
];

const balanceConfigHelp: string[] = [
  APP_MESSAGES[AppMessage.ConfigurationHeading](),
  `  ${APP_MESSAGES[AppMessage.DeferralTagsKey]()}`,
  `      ${APP_MESSAGES[AppMessage.DeferralTagsExtend]()}`,
  `      ${APP_MESSAGES[AppMessage.DeferralTagsNeverReplace]()}`,
  `      ${APP_MESSAGES[AppMessage.BuiltInDeferralTags](DEFAULT_DEFERRAL_TAGS.map((tag) => `@${tag}`).join(", "))}`,
];

const balanceRetiredFlags: RetiredFlagSpec[] = [
  {
    name: "--measurements",
    retiredIn: "0.1.0-alpha.5",
    replacement: APP_MESSAGES[AppMessage.MeasurementsReplacement](),
  },
];

const globalFlags: FlagSpec[] = [
  {
    name: "--store",
    arg: "<root>",
    description: APP_MESSAGES[AppMessage.StoreModifier](),
  },
  {
    name: "--run-id",
    arg: "<id>",
    description: APP_MESSAGES[AppMessage.RunIdModifier](),
  },
];

export const balanceCommand: CommandSpec = {
  name: "balance",
  summary: APP_MESSAGES[AppMessage.BalanceSummary](),
  flags: balanceFlags,
  configHelp: balanceConfigHelp,
  retiredFlags: balanceRetiredFlags,
};

export const allocateCommand: CommandSpec = {
  name: "allocate",
  summary: APP_MESSAGES[AppMessage.AllocateSummary](),
  acceptsHostModifiers: false,
  positionals: [
    { name: "<FFF>", description: APP_MESSAGES[AppMessage.FeaturePartArgument]() },
  ],
  flags: [
    {
      name: "--new",
      description: APP_MESSAGES[AppMessage.NewFlag](),
    },
    { name: "--help", aliases: ["-h"], description: APP_MESSAGES[AppMessage.HelpFlag]() },
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
    `spec-controller ${command.name} — ${command.summary}`,
    ...positionalHelp(command.name, command.positionals ?? []),
    "",
    APP_MESSAGES[AppMessage.HelpOptions](),
    ...lines,
    ...(configHelp.length > 0 ? ["", ...configHelp] : []),
  ].join("\n");
}

function positionalHelp(command: string, positionals: readonly PositionalSpec[]): string[] {
  if (positionals.length === 0) return [];
  const width = Math.max(...positionals.map((positional) => positional.name.length));
  return [
    "",
    `${APP_MESSAGES[AppMessage.HelpUsage]()} spec-controller ${command} ${positionals.map((positional) => positional.name).join(" ")} [options]`,
    "",
    APP_MESSAGES[AppMessage.HelpArguments](),
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
    APP_MESSAGES[AppMessage.HelpTitle](),
    "",
    APP_MESSAGES[AppMessage.HelpUsage](),
    `  ${APP_MESSAGES[AppMessage.HelpUsageLine](modifierUsage)}`,
    "",
    APP_MESSAGES[AppMessage.HelpCommands](),
    ...commandLines,
    "",
    APP_MESSAGES[AppMessage.HelpHostModifiers](),
    ...modifierLines,
    "",
    APP_MESSAGES[AppMessage.HelpPointer](),
  ].join("\n");
}
