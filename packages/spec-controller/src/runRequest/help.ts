import { textFor } from "@3f-consulting/spec-controller-core";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { COMMANDS, type Command, type Flag } from "./flags.js";

const text = (code: string): string => textFor(appCatalogue, code);

// Each entry on a line of its own, its description in a column after it.
function listed(entries: readonly (readonly [string, string])[]): string[] {
  const width = Math.max(...entries.map(([label]) => label.length)) + 2;
  return entries.map(([label, description]) => `  ${label.padEnd(width)}${description}`);
}

const labelOf = ({ name, short, value }: Flag): string => `${short === undefined ? "" : `-${short}, `}--${name}${value === undefined ? "" : ` ${value}`}`;

// The commands, or one command's flags; help runs nothing.
export function helpText(about?: Command): string {
  const lines =
    about === undefined
      ? [text("help-usage"), "", text("help-commands"), ...listed(Object.keys(COMMANDS).map((command) => [command, text(`command-${command}`)]))]
      : [text(`help-${about}-usage`), "", text("help-flags"), ...listed(COMMANDS[about].map((flag) => [labelOf(flag), text(`flag-${flag.name}`)]))];
  return `${lines.join("\n")}\n`;
}
