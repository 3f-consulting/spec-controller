import { commandInvokesScript } from "./checkScriptsRunInCI.js";

const SCRIPT_CHAIN_DEPTH = 3;

// Edge whitespace leaves an empty token, which no invocation token equals.
function tokenLinesOf(command: string): readonly (readonly string[])[] {
  return command.split(/\r?\n/).map((line) => line.split(/\s+/));
}

function lineRuns(line: readonly string[], invocation: readonly string[]): boolean {
  return line.some((_, at) => invocation.every((token, i) => line[at + i] === token));
}

function runs(
  command: string,
  invocation: readonly string[],
  scripts: Readonly<Record<string, string>>,
  depth: number
): boolean {
  if (tokenLinesOf(command).some((line) => lineRuns(line, invocation))) return true;
  if (depth === 0) return false;
  return Object.entries(scripts).some(
    ([name, body]) =>
      commandInvokesScript(command, name) && runs(body, invocation, scripts, depth - 1)
  );
}

export function commandRuns(
  command: string,
  invocation: string,
  scripts: Readonly<Record<string, string>>
): boolean {
  const text = invocation.trim();
  return text !== "" && runs(command, text.split(/\s+/), scripts, SCRIPT_CHAIN_DEPTH);
}
