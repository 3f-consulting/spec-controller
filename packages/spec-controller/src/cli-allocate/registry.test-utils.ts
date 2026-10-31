import { cliRegistry, type CliRegistry, type PositionalSpec } from "../cli-registry.js";

export function withAllocatePositional(positional: PositionalSpec): CliRegistry {
  return {
    ...cliRegistry,
    commands: cliRegistry.commands.map((command) =>
      command.name === "allocate" ? { ...command, positionals: [...(command.positionals ?? []), positional] } : command,
    ),
  };
}
