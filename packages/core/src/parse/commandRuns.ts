import type { ShellReading } from "../domain/uncitedFitnessFunctions.js";

const SCRIPT_CHAIN_DEPTH = 3;

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

function wordsOf(text: string): readonly string[] {
  return text.trim().split(/\s+/);
}

const opensAt = (words: readonly string[], prefix: readonly string[], from: number): boolean =>
  prefix.every((word, at) => words[from + at] === word);

const opensWith = (words: readonly string[], prefix: readonly string[]): boolean => opensAt(words, prefix, 0);

const namedOnLine = (line: string, invocation: readonly string[]): boolean => {
  const words = wordsOf(line);
  return words.some((_, at) => opensAt(words, invocation, at));
};

const pastAssignments = (words: readonly string[]): readonly string[] =>
  words.slice(words.findIndex((word) => !ASSIGNMENT.test(word)));

const JOINED_LINE = /\\\r?\n/g;
const SEPARATORS = "&|;()\n";
const REDIRECTION = /&>|[<>]&|>>|[<>]/y;
const FILE_DESCRIPTOR = /^\d+$/;
const PLAIN = /[^\s&|;()<>'"\\`$]+/y;
const ESCAPED_IN_DOUBLE_QUOTES = '"\\$`';
const EXPANSIONS = ["$(", "${", "<(", ">("];
const EXPANSIONS_IN_DOUBLE_QUOTES = ["$(", "${"];

function pastQuote(text: string, from: number, quote: string): number {
  const end = text.indexOf(quote, from);
  return end === -1 ? text.length : end + 1;
}

function pastBalanced(text: string, from: number, open: string, close: string): number {
  let depth = 1;
  let at = from;
  while (at < text.length && depth > 0) {
    const char = text[at];
    if (char === "\\") at += 2;
    else if (char === "'" || char === "`") at = pastQuote(text, at + 1, char);
    else if (char === '"') at = doubleQuoted(text, at + 1)[1];
    else {
      if (char === open) depth += 1;
      if (char === close) depth -= 1;
      at += 1;
    }
  }
  return Math.min(at, text.length);
}

// A substitution or parameter is held whole inside the word it opens, so no command inside it is read.
function expansionEnd(text: string, at: number, openers: readonly string[]): number | undefined {
  if (text[at] === "`") return pastQuote(text, at + 1, "`");
  const opener = openers.find((each) => text.startsWith(each, at));
  if (opener === undefined) return undefined;
  const open = opener.slice(-1);
  return pastBalanced(text, at + opener.length, open, open === "{" ? "}" : ")");
}

function doubleQuotedPart(text: string, at: number): readonly [string, number] {
  const char = text.charAt(at);
  if (char === "\\") {
    const next = text.charAt(at + 1);
    return [ESCAPED_IN_DOUBLE_QUOTES.includes(next) ? next : char + next, at + 2];
  }
  const end = expansionEnd(text, at, EXPANSIONS_IN_DOUBLE_QUOTES);
  return end === undefined ? [char, at + 1] : [text.slice(at, end), end];
}

function doubleQuoted(text: string, from: number): readonly [string, number] {
  let value = "";
  let at = from;
  while (at < text.length && text[at] !== '"') {
    const [part, next] = doubleQuotedPart(text, at);
    value += part;
    at = next;
  }
  return [value, Math.min(at + 1, text.length)];
}

interface WordPart {
  readonly kind: "part";
  readonly value: string;
  readonly quoted: boolean;
  readonly end: number;
}

interface Mark {
  readonly kind: "break" | "redirection";
  readonly end: number;
}

interface Separator {
  readonly kind: "separator";
  readonly pipe: boolean;
  readonly end: number;
}

type Token = WordPart | Mark | Separator;

type ReadToken = (text: string, at: number, word: string | undefined) => Token | undefined;

const part = (value: string, quoted: boolean, end: number): WordPart => ({ kind: "part", value, quoted, end });

const blank: ReadToken = (text, at) => {
  const char = text.charAt(at);
  return char !== "\n" && /\s/.test(char) ? { kind: "break", end: at + 1 } : undefined;
};

const comment: ReadToken = (text, at, word) => {
  if (text[at] !== "#" || word !== undefined) return undefined;
  const end = text.indexOf("\n", at);
  return { kind: "break", end: end === -1 ? text.length : end };
};

const escaped: ReadToken = (text, at) => (text[at] === "\\" ? part(text.charAt(at + 1), true, at + 2) : undefined);

const singleQuoted: ReadToken = (text, at) => {
  if (text[at] !== "'") return undefined;
  const close = text.indexOf("'", at + 1);
  const end = close === -1 ? text.length : close;
  return part(text.slice(at + 1, end), true, end + 1);
};

const doubleQuotedWord: ReadToken = (text, at) => {
  if (text[at] !== '"') return undefined;
  const [value, end] = doubleQuoted(text, at + 1);
  return part(value, true, end);
};

const expansion: ReadToken = (text, at, word) => {
  const end =
    text[at] === "(" && word?.endsWith("=") === true
      ? pastBalanced(text, at + 1, "(", ")")
      : expansionEnd(text, at, EXPANSIONS);
  return end === undefined ? undefined : part(text.slice(at, end), false, end);
};

const redirection: ReadToken = (text, at) => {
  REDIRECTION.lastIndex = at;
  const operator = REDIRECTION.exec(text)?.[0];
  return operator === undefined ? undefined : { kind: "redirection", end: at + operator.length };
};

// A | hands the command's output to the next, and |& its errors too; || runs the next only if the command fails.
// The second character of || or |& is read as a separator of its own, which ends no command, since none has begun.
const separator: ReadToken = (text, at) => {
  const char = text.charAt(at);
  if (!SEPARATORS.includes(char)) return undefined;
  return { kind: "separator", pipe: char === "|" && text.charAt(at + 1) !== "|", end: at + 1 };
};

function plain(text: string, at: number): WordPart {
  PLAIN.lastIndex = at;
  const run = PLAIN.exec(text)?.[0] ?? text.charAt(at);
  return part(run, false, at + run.length);
}

const READS: readonly ReadToken[] = [blank, comment, escaped, singleQuoted, doubleQuotedWord, expansion, redirection, separator];

function nextToken(text: string, at: number, word: string | undefined): Token {
  for (const read of READS) {
    const token = read(text, at, word);
    if (token !== undefined) return token;
  }
  return plain(text, at);
}

interface SimpleCommand {
  readonly words: readonly string[];
  readonly piped: boolean;
}

// The simple commands the shell runs from the text, each as its words with their quotes removed, and whether a pipe reads its output.
// A redirection's target word is dropped, and a quote that never closes runs to the end of the text, as the shell reads up to its syntax error.
function simpleCommands(text: string): readonly SimpleCommand[] {
  const source = text.replace(JOINED_LINE, " ");
  const commands: SimpleCommand[] = [];
  let words: string[] = [];
  let word: string | undefined;
  let quoted = false;
  let target = false;
  const endWord = (): void => {
    if (word !== undefined) {
      if (!target) words.push(word);
      target = false;
    }
    word = undefined;
    quoted = false;
  };
  const endCommand = (piped: boolean): void => {
    endWord();
    target = false;
    if (words.length > 0) commands.push({ words, piped });
    words = [];
  };
  let at = 0;
  while (at < source.length) {
    const token = nextToken(source, at, word);
    if (token.kind === "part") {
      word = (word ?? "") + token.value;
      quoted ||= token.quoted;
    } else if (token.kind === "separator") endCommand(token.pipe);
    else {
      if (token.kind === "redirection" && !quoted && FILE_DESCRIPTOR.test(word ?? "")) word = undefined;
      endWord();
      target ||= token.kind === "redirection";
    }
    at = token.end;
  }
  endCommand(false);
  return commands;
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
    return scriptsNamedBy([each.words[0], ...head.slice(pastOptions(head, each.words.length, each))]);
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

// The scripts a command runs: those its own words name, then those of each command it hands on to.
function scriptsRunBy(head: readonly string[]): readonly (string | undefined)[] {
  const next = passedOn(head);
  return [scriptsNamedBy(head), next === undefined ? undefined : scriptsRunBy(next)].flat();
}

type Heads = (command: string) => readonly (readonly string[])[];

const headsOf: Heads = (command) => simpleCommands(command).map(({ words }) => pastAssignments(words));

// Only a pipeline's last stage is read as the command a step runs: what a pipe reads is another command's output.
const lastStageHeadsOf: Heads = (command) =>
  simpleCommands(command)
    .filter(({ piped }) => !piped)
    .map(({ words }) => pastAssignments(words));

export function commandInvokesScript(command: string, script: string): boolean {
  return headsOf(command).some((head) => scriptsRunBy(head).includes(script));
}

interface Reading {
  readonly names: (command: string, invocation: readonly string[]) => boolean;
  readonly heads: Heads;
}

const anywhere: Reading = {
  names: (command, invocation) => command.split(/\r?\n/).some((line) => namedOnLine(line, invocation)),
  heads: headsOf,
};

const asCommand: Reading = {
  names: (command, invocation) => lastStageHeadsOf(command).some((head) => opensWith(launched(head), invocation)),
  heads: lastStageHeadsOf,
};

function runs(
  command: string,
  invocation: readonly string[],
  scripts: Readonly<Record<string, string>>,
  depth: number,
  reading: Reading
): boolean {
  if (reading.names(command, invocation)) return true;
  const entries = Object.entries(scripts);
  if (depth === 0 || entries.length === 0) return false;
  const run = reading.heads(command).flatMap(scriptsRunBy);
  return entries.some(([name, body]) => run.includes(name) && runs(body, invocation, scripts, depth - 1, reading));
}

function runsBy(
  reading: Reading
): (command: string, invocation: string, scripts: Readonly<Record<string, string>>) => boolean {
  return (command, invocation, scripts) => {
    const words = wordsOf(invocation);
    return words.join(" ") !== "" && runs(command, words, scripts, SCRIPT_CHAIN_DEPTH, reading);
  };
}

export const commandRuns = runsBy(anywhere);

export const shellReading: ShellReading = {
  runsAsCommand: runsBy(asCommand),
};
