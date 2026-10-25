import type { ShellReading } from "../domain/uncitedFitnessFunctions.js";

const SCRIPT_CHAIN_DEPTH = 3;

const UP_TO_LAST_PIPE = /^.*(?<!\|)\|(?!\|)/;
const COMMAND_SEPARATOR = /&&|;|\|/;
const BACKGROUND = /(?<!>)&/;
const ASSIGNMENT = /^[A-Za-z_]\w*=/;
type Words = readonly [string, ...(readonly string[])];

type Whitespace = " " | "\t" | "\n" | "\r" | "\v" | "\f";

type OneWord<Word> = Word extends "" | `${string}${Whitespace}${string}` ? never : Word;

// A row's words are matched one per command word: an empty word or one holding whitespace could never match, and a row with no words would match every command.
type OneWordEach<T extends Words> = { readonly [At in keyof T]: OneWord<T[At]> };

interface CommandPrefix {
  readonly words: Words;
  readonly launcher: boolean;
  readonly operands: number;
  readonly valued: readonly string[];
}

const launcher = <const T extends Words>(words: T & OneWordEach<T>, ...valued: readonly string[]): CommandPrefix => ({
  words,
  launcher: true,
  operands: 0,
  valued,
});

const runsNext = <const T extends Words>(words: T & OneWordEach<T>, ...valued: readonly string[]): CommandPrefix => ({
  words,
  launcher: false,
  operands: 0,
  valued,
});

const YARN_FOREACH = runsNext(["yarn", "workspaces", "foreach"], "--from", "--include", "--exclude", "-j", "--jobs");

const SHELL_WORDS = ["!", "(", "{", "if", "then", "elif", "else", "while", "until", "do"] as const;

// Each row's options that take the next word as their value, from the command's own documentation.
// A row matches a command opening with its words; the first row to match is read, so a longer phrase comes before its first word.
const COMMAND_PREFIXES: readonly CommandPrefix[] = [
  { ...launcher(["timeout"], "-k", "--kill-after", "-s", "--signal"), operands: 1 },
  launcher(["npm", "exec"], "--package", "-w", "--workspace", "-c", "--call"),
  launcher(["pnpm", "exec"], "--resume-from"),
  launcher(["pnpm", "dlx"], "--package", "--allow-build"),
  launcher(["npx"], "--package", "-p", "-w", "--workspace", "-c", "--call"),
  launcher(["pnpm"]),
  runsNext(["yarn", "exec"]),
  runsNext(["yarn", "dlx"], "-p", "--package"),
  YARN_FOREACH,
  launcher(["yarn"]),
  launcher(["bunx"], "-p", "--package"),
  launcher(["python", "-m"]),
  launcher(["python3", "-m"]),
  launcher(["poetry", "run"]),
  launcher(["uv", "run"], "--with", "--with-editable", "--with-requirements", "--python", "-p", "--directory", "--project", "--package", "--extra", "--group", "--env-file"),
  launcher(["pipenv", "run"]),
  launcher(["hatch", "run"]),
  launcher(["pdm", "run"]),
  launcher(["coverage", "run", "-m"]),
  launcher(["bundle", "exec"]),
  runsNext(["env"], "-u", "--unset", "-C", "--chdir", "-S", "--split-string"),
  runsNext(["nice"], "-n", "--adjustment"),
  runsNext(["nohup"]),
  runsNext(["time"], "-f", "--format", "-o", "--output"),
  runsNext(["command"]),
  runsNext(["exec"], "-a"),
  runsNext(
    ["xargs"],
    "-a", "--arg-file", "-d", "--delimiter", "-E", "-I", "-L", "-n", "--max-args", "-P", "--max-procs", "-s", "--max-chars", "--process-slot-var"
  ),
  runsNext(["stdbuf"], "-i", "--input", "-o", "--output", "-e", "--error"),
  runsNext(
    ["sudo"],
    "-u", "--user", "-g", "--group", "-C", "--close-from", "-D", "--chdir", "--host", "-p", "--prompt", "-r", "--role", "-t", "--type", "-T", "--command-timeout", "-U", "--other-user", "-R", "--chroot"
  ),
  runsNext(["cross-env"]),
  runsNext(["dotenv"], "-e"),
  runsNext(["xvfb-run"], "-e", "--error-file", "-f", "--auth-file", "-n", "--server-num", "-p", "--xauth-protocol", "-s", "--server-args", "-w", "--wait"),
  runsNext(["nyc"], "-r", "--reporter", "--report-dir", "-t", "--temp-dir", "-n", "--include", "-x", "--exclude", "-e", "--extension", "-i", "--require", "--cwd", "--nycrc-path"),
  runsNext(["c8"], "-r", "--reporter", "-o", "--reports-dir", "--report-dir", "-n", "--include", "-x", "--exclude", "-e", "--extension", "--temp-directory", "--src"),
  { ...runsNext(["flock"], "-E", "--conflict-exit-code", "-w", "--wait", "--timeout"), operands: 1 },
  ...SHELL_WORDS.map((word) => runsNext([word])),
];

const LAUNCHERS = COMMAND_PREFIXES.filter((prefix) => prefix.launcher);

interface ScriptInvocations {
  readonly runWords: readonly string[];
  readonly runsBareName: boolean;
  readonly testShortcuts?: readonly string[];
  readonly selections?: ReadonlyMap<string | undefined, number>;
  readonly eachWorkspace?: CommandPrefix;
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
      eachWorkspace: YARN_FOREACH,
    },
  ],
]);

type LineTest = (line: string, invocation: readonly string[]) => boolean;

function wordsOf(text: string): readonly string[] {
  return text.trim().split(/\s+/);
}

const opensAt = (words: readonly string[], prefix: readonly string[], from: number): boolean =>
  prefix.every((word, at) => words[from + at] === word);

const opensWith = (words: readonly string[], prefix: readonly string[]): boolean => opensAt(words, prefix, 0);

const anywhere: LineTest = (line, invocation) => {
  const words = wordsOf(line);
  return words.some((_, at) => opensAt(words, invocation, at));
};

// A ( that opens a word opens a subshell, and a ) that ends one closes it; a ( after $, <, > or = opens a substitution, left as it is.
const subshellsSpaced = (line: string): string => line.replace(/(^|\s)\(/g, "$1( ").replace(/\)(?=[\s;&|]|$)/g, " )");

function commandHeads(line: string): readonly (readonly string[])[] {
  return subshellsSpaced(line).split(COMMAND_SEPARATOR).map((command) => {
    const words = wordsOf(command);
    return words.slice(words.findIndex((word) => !ASSIGNMENT.test(word)));
  });
}

function handedOn(words: readonly string[]): readonly string[] | undefined {
  const prefix = LAUNCHERS.find((row) => opensWith(words, row.words));
  return prefix === undefined ? undefined : words.slice(prefix.words.length + prefix.operands);
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
  const each = invocations.eachWorkspace;
  if (each !== undefined && opensWith(head, each.words)) {
    const [word, next] = head.slice(pastOptions(head, each.words.length, each));
    return isOneOf(invocations.runWords, word) ? [next] : undefined;
  }
  const [word, next] = head.slice(afterSelections(head, 1, invocations));
  if (isOneOf(invocations.runWords, word)) return [next];
  return [isOneOf(invocations.testShortcuts, word) ? "test" : undefined, invocations.runsBareName ? word : undefined];
}

function pastOptions(words: readonly string[], at: number, prefix: CommandPrefix): number {
  const word = words[at];
  if (word === undefined || !(word.startsWith("-") || ASSIGNMENT.test(word))) return at;
  return pastOptions(words, at + (prefix.valued.includes(word) ? 2 : 1), prefix);
}

function passedOn(words: readonly string[]): readonly string[] | undefined {
  const prefix = COMMAND_PREFIXES.find((row) => opensWith(words, row.words));
  return prefix === undefined ? undefined : words.slice(pastOptions(words, prefix.words.length, prefix) + prefix.operands);
}

function runsScript(head: readonly string[], script: string): boolean {
  if (scriptsNamedBy(head)?.includes(script) === true) return true;
  const next = passedOn(head);
  return next !== undefined && runsScript(next, script);
}

const QUOTED = /"[^"]*"|'[^']*'/g;

const quotedSeparatorsBlanked = (line: string): string =>
  line.replace(QUOTED, (quoted) => quoted.replace(/[&;|]/g, " "));

function headsOf(command: string): readonly (readonly string[])[] {
  return command
    .split(/\r?\n/)
    .flatMap((line) => quotedSeparatorsBlanked(line).split(BACKGROUND).flatMap(commandHeads));
}

export function commandInvokesScript(command: string, script: string): boolean {
  return headsOf(command).some((head) => runsScript(head, script));
}

const asCommand: LineTest = (line, invocation) =>
  commandHeads(line).some((head) => opensWith(launched(head), invocation));

function runs(
  command: string,
  invocation: readonly string[],
  scripts: Readonly<Record<string, string>>,
  depth: number,
  lineRuns: LineTest
): boolean {
  if (command.split(/\r?\n/).some((line) => lineRuns(line, invocation))) return true;
  const entries = Object.entries(scripts);
  if (depth === 0 || entries.length === 0) return false;
  const heads = headsOf(command);
  return entries.some(
    ([name, body]) =>
      heads.some((head) => runsScript(head, name)) && runs(body, invocation, scripts, depth - 1, lineRuns)
  );
}

function runsBy(
  lineRuns: LineTest
): (command: string, invocation: string, scripts: Readonly<Record<string, string>>) => boolean {
  return (command, invocation, scripts) => {
    const words = wordsOf(invocation);
    return words.join(" ") !== "" && runs(command, words, scripts, SCRIPT_CHAIN_DEPTH, lineRuns);
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
