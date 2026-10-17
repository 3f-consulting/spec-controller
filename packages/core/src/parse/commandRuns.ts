import { commandInvokesScript } from "./checkScriptsRunInCI.js";
import type { ShellReading } from "../domain/uncitedFitnessFunctions.js";

const SCRIPT_CHAIN_DEPTH = 3;

const UP_TO_LAST_PIPE = /^.*(?<!\|)\|(?!\|)/;
const LIST_SEPARATOR = /&&|\|\||;/;
const ASSIGNMENT = /^[A-Za-z_]\w*=/;
const LAUNCHERS: readonly (readonly string[])[] = [
  ["npm", "exec"],
  ["pnpm", "exec"],
  ["pnpm", "dlx"],
  ["npx"],
  ["pnpm"],
  ["yarn"],
  ["bunx"],
  ["python", "-m"],
  ["python3", "-m"],
  ["poetry", "run"],
  ["uv", "run"],
  ["pipenv", "run"],
  ["hatch", "run"],
  ["pdm", "run"],
  ["coverage", "run", "-m"],
  ["bundle", "exec"],
];

type LineTest = (line: string, invocation: string) => boolean;

function wordsOf(text: string): readonly string[] {
  return text.trim().split(/\s+/);
}

function opensWith(words: readonly string[], phrase: string): boolean {
  return words.slice(0, wordsOf(phrase).length).join(" ") === phrase;
}

const anywhere: LineTest = (line, invocation) => {
  const words = wordsOf(line);
  return words.some((_, at) => opensWith(words.slice(at), invocation));
};

function launched(words: readonly string[]): readonly string[] {
  if (words[0] === "timeout") return launched(words.slice(2));
  const launcher = LAUNCHERS.find((phrase) => opensWith(words, phrase.join(" ")));
  return launcher === undefined ? words : launched(words.slice(launcher.length));
}

const asCommand: LineTest = (line, invocation) =>
  line.split(LIST_SEPARATOR).some((simpleCommand) => {
    const words = wordsOf(simpleCommand);
    return opensWith(launched(words.slice(words.findIndex((word) => !ASSIGNMENT.test(word)))), invocation);
  });

function runs(
  command: string,
  invocation: string,
  scripts: Readonly<Record<string, string>>,
  depth: number,
  lineRuns: LineTest
): boolean {
  if (command.split(/\r?\n/).some((line) => lineRuns(line, invocation))) return true;
  if (depth === 0) return false;
  return Object.entries(scripts).some(
    ([name, body]) =>
      commandInvokesScript(command, name) && runs(body, invocation, scripts, depth - 1, lineRuns)
  );
}

function runsBy(
  lineRuns: LineTest
): (command: string, invocation: string, scripts: Readonly<Record<string, string>>) => boolean {
  return (command, invocation, scripts) => {
    const text = wordsOf(invocation).join(" ");
    return text !== "" && runs(command, text, scripts, SCRIPT_CHAIN_DEPTH, lineRuns);
  };
}

export const commandRuns = runsBy(anywhere);

const commandRunsAsCommand = runsBy(asCommand);

function finalStages(command: string): string {
  return command
    .replace(/\\\r?\n/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(UP_TO_LAST_PIPE, ""))
    .join("\n");
}

export const shellReading: ShellReading = {
  lastStagesOf: finalStages,
  runsAsCommand: commandRunsAsCommand,
};
