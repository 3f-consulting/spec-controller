import { commandInvokesScript } from "./checkScriptsRunInCI.js";

const SCRIPT_CHAIN_DEPTH = 3;

const LIST_SEPARATOR = /&&|\|\||;/;
const ASSIGNMENT = /^[A-Za-z_]\w*=/;
const LAUNCHERS = ["npm exec", "pnpm exec", "pnpm dlx", "npx", "pnpm", "yarn", "bunx"];

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
  const launcher = LAUNCHERS.find((phrase) => opensWith(words, phrase));
  return launcher === undefined ? words : launched(words.slice(wordsOf(launcher).length));
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

export const commandRunsAsCommand = runsBy(asCommand);
