import type { ShellReading } from "../domain/uncitedFitnessFunctions.js";

const SCRIPT_CHAIN_DEPTH = 3;

const UP_TO_LAST_PIPE = /^.*(?<!\|)\|(?!\|)/;
const COMMAND_SEPARATOR = /&&|;|\|/;
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

interface ScriptInvocations {
  readonly runWords: readonly string[];
  readonly runsBareName: boolean;
  readonly testShortcuts?: readonly string[];
  readonly selections?: ReadonlyMap<string | undefined, number>;
  readonly optionsUpToRun?: string;
}

const SCRIPT_INVOCATIONS = new Map<string | undefined, ScriptInvocations>([
  // https://docs.npmjs.com/cli/commands/npm-run-script (aliases: run, rum, urn) and https://docs.npmjs.com/cli/commands/npm-test (aliases: tst, t)
  ["npm", { runWords: ["run", "run-script", "rum", "urn"], runsBareName: false, testShortcuts: ["test", "t", "tst"] }],
  // https://pnpm.io/cli/run and https://pnpm.io/cli/test (aliases: run test, t, tst); test itself is read as a bare name.
  // Selections, each with the words of its value: https://pnpm.io/filtering (--filter, -F) and https://pnpm.io/cli/recursive (-r)
  [
    "pnpm",
    {
      runWords: ["run"],
      runsBareName: true,
      testShortcuts: ["t", "tst"],
      selections: new Map([
        ["--filter", 1],
        ["-F", 1],
        ["-r", 0],
        ["--recursive", 0],
      ]),
    },
  ],
  // https://yarnpkg.com/cli/run, https://yarnpkg.com/cli/workspace and https://yarnpkg.com/cli/workspaces/foreach
  [
    "yarn",
    {
      runWords: ["run"],
      runsBareName: true,
      selections: new Map([["workspace", 1]]),
      optionsUpToRun: "workspaces foreach",
    },
  ],
]);

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

function commandHeads(line: string): readonly (readonly string[])[] {
  return line.split(COMMAND_SEPARATOR).map((command) => {
    const words = wordsOf(command);
    return words.slice(words.findIndex((word) => !ASSIGNMENT.test(word)));
  });
}

function handedOn(words: readonly string[]): readonly string[] | undefined {
  if (words[0] === "timeout") return words.slice(2);
  const launcher = LAUNCHERS.find((phrase) => opensWith(words, phrase.join(" ")));
  return launcher === undefined ? undefined : words.slice(launcher.length);
}

function launched(words: readonly string[]): readonly string[] {
  const next = handedOn(words);
  return next === undefined ? words : launched(next);
}

const isOneOf = (words: readonly string[] | undefined, word: string | undefined): boolean =>
  words?.some((each) => each === word) === true;

function afterSelections(head: readonly string[], at: number, invocations: ScriptInvocations): number {
  const option = head[at]?.replace(/=.*/, "");
  const valueWords = invocations.selections?.get(option);
  if (valueWords === undefined) return at;
  return afterSelections(head, at + (option === head[at] ? 1 + valueWords : 1), invocations);
}

function scriptsNamedBy(head: readonly string[]): readonly (string | undefined)[] | undefined {
  const invocations = SCRIPT_INVOCATIONS.get(head[0]);
  if (invocations === undefined) return undefined;
  const command = head.slice(afterSelections(head, 1, invocations));
  const foreach = invocations.optionsUpToRun !== undefined && opensWith(command, invocations.optionsUpToRun);
  const [word, next] = foreach ? command.slice(command.indexOf("run")) : command;
  if (isOneOf(invocations.runWords, word)) return [next];
  return [isOneOf(invocations.testShortcuts, word) ? "test" : undefined, invocations.runsBareName ? word : undefined];
}

function runsScript(head: readonly string[], script: string): boolean {
  if (scriptsNamedBy(head)?.includes(script) === true) return true;
  const next = handedOn(head);
  return next !== undefined && runsScript(next, script);
}

export function commandInvokesScript(command: string, script: string): boolean {
  return command.split(/\r?\n/).some((line) => commandHeads(line).some((head) => runsScript(head, script)));
}

const asCommand: LineTest = (line, invocation) =>
  commandHeads(line).some((head) => opensWith(launched(head), invocation));

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
