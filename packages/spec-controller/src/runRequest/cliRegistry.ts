import { AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { EVIDENCE_INPUTS } from "./evidenceInputs.js";

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
  positional?: PositionalSpec;
}

export interface CliRegistry {
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

export const balanceCommand: CommandSpec = {
  name: "balance",
  summary: message(AppMessage.BalanceSummary),
  flags: balanceFlags,
};

export const allocateCommand: CommandSpec = {
  name: "allocate",
  summary: message(AppMessage.AllocateSummary),
  positional: { name: "<FFF>", description: message(AppMessage.FeaturePartArgument) },
  flags: [
    {
      name: "--new",
      description: message(AppMessage.NewFlag),
    },
    { name: "--help", aliases: ["-h"], description: message(AppMessage.HelpFlag) },
  ],
};

export const cliRegistry: CliRegistry = {
  commands: [balanceCommand, allocateCommand],
};

function flagLabel(flag: FlagSpec): string {
  const names = [flag.name, ...(flag.aliases ?? [])].join(", ");
  return flag.arg !== undefined ? `${names} ${flag.arg}` : names;
}

function entries(listed: readonly { name: string; description: string }[]): string {
  return listed.map(({ name, description }) => message(AppMessage.HelpEntry, { name, description })).join("\n");
}

export function renderCommandHelp(command: CommandSpec): string {
  return message(AppMessage.CommandHelp, {
    command: command.name,
    summary: command.summary,
    arguments: argumentHelp(command.name, command.positional),
    options: entries(command.flags.map((flag) => ({ name: flagLabel(flag), description: flag.description }))),
  });
}

function argumentHelp(command: string, positional: PositionalSpec | undefined): string {
  if (positional === undefined) return "";
  return message(AppMessage.CommandHelpArguments, {
    command,
    arguments: positional.name,
    entries: entries([positional]),
  });
}

export function renderTopLevelHelp(registry: CliRegistry): string {
  return message(AppMessage.Help, {
    commands: entries(registry.commands.map((command) => ({ name: command.name, description: command.summary }))),
  });
}
