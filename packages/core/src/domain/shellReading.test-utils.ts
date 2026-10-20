import type { ShellReading } from "./uncitedFitnessFunctions.js";

const scriptOf = (command: string, scripts: Readonly<Record<string, string>>): string =>
  scripts[command.replace(/^pnpm /, "")] ?? command;

export const runsAsCommand: ShellReading["runsAsCommand"] = (commandText, invocation, scripts) =>
  scriptOf(commandText, scripts).startsWith(invocation);
