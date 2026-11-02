import { cliRegistry, type CliRegistry, type PositionalSpec } from "../cliRegistry.js";

export function withAllocatePositional(positional: PositionalSpec): CliRegistry {
  return {
    ...cliRegistry,
    commands: cliRegistry.commands.map((command) =>
      command.name === "allocate" ? { ...command, positionals: [...(command.positionals ?? []), positional] } : command,
    ),
  };
}
