import { commandInvokesScript } from "./checkScriptsRunInCI.js";

const SCRIPT_CHAIN_DEPTH = 3;

function tokenLinesOf(command: string): readonly (readonly string[])[] {
  return command
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).filter((token) => token !== ""));
}

function lineRuns(line: readonly string[], invocation: readonly string[]): boolean {
  return line.some((_, at) => invocation.every((token, i) => line[at + i] === token));
}

function runs(
  command: string,
  invocation: readonly string[],
  scripts: Readonly<Record<string, string>>,
  depth: number,
  visited: ReadonlySet<string>
): boolean {
  if (tokenLinesOf(command).some((line) => lineRuns(line, invocation))) return true;
  if (depth === 0) return false;
  return Object.entries(scripts).some(
    ([name, body]) =>
      !visited.has(name) &&
      commandInvokesScript(command, name) &&
      runs(body, invocation, scripts, depth - 1, new Set([...visited, name]))
  );
}

export function commandRuns(
  command: string,
  invocation: string,
  scripts: Readonly<Record<string, string>>
): boolean {
  const tokens = invocation.trim().split(/\s+/).filter((token) => token !== "");
  return tokens.length > 0 && runs(command, tokens, scripts, SCRIPT_CHAIN_DEPTH, new Set());
}
