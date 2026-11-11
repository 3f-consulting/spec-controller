import { forEachChild, parse } from "unbash";
import type { Command, Pipeline, SyntaxNode, Word } from "unbash";
import type { ShellReading } from "../domain/postEvidenceObservation.js";

const SCRIPT_CHAIN_DEPTH = 3;

const ASSIGNMENT = /[A-Za-z_]\w*=/;
type Words = readonly [string, ...(readonly string[])];

type Whitespace = " " | "\t" | "\n" | "\r" | "\v" | "\f";

type OneWord<Word> = Word extends "" | `${string}${Whitespace}${string}` ? never : Word;

// A row's words are matched one per command word: an empty word or one holding whitespace could never match, and a row with no words would match every command.
type OneWordEach<T extends Words> = { readonly [At in keyof T]: OneWord<T[At]> };

interface CommandPrefix {
  readonly words: Words;
  readonly operands: number;
  readonly valued: readonly string[];
  // Options whose value is itself the command to run, written as one word.
  readonly splits?: readonly string[];
}

const launcher = <const T extends Words>(words: T & OneWordEach<T>, ...valued: readonly string[]): CommandPrefix => ({
  words,
  operands: 0,
  valued,
});

const YARN_FOREACH = launcher(["yarn", "workspaces", "foreach"], "--from", "--include", "--exclude", "-j", "--jobs");

// Each row's options that take the next word as their value, from the command's own documentation.
// A row matches a command opening with its words; the first row to match is read, so a longer phrase comes before its first word.
const COMMAND_PREFIXES: readonly CommandPrefix[] = [
  { ...launcher(["timeout"], "-k", "--kill-after", "-s", "--signal"), operands: 1 },
  launcher(["npm", "exec"], "--package", "-w", "--workspace", "-c", "--call"),
  launcher(["pnpm", "exec"], "--resume-from"),
  launcher(["pnpm", "dlx"], "--package", "--allow-build"),
  launcher(["npx"], "--package", "-p", "-w", "--workspace", "-c", "--call"),
  launcher(["pnpm"]),
  launcher(["yarn", "exec"]),
  launcher(["yarn", "dlx"], "-p", "--package"),
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
  { ...launcher(["env"], "-u", "--unset", "-C", "--chdir"), splits: ["-S", "--split-string"] },
  launcher(["nice"], "-n", "--adjustment"),
  launcher(["nohup"]),
  launcher(["time"], "-f", "--format", "-o", "--output"),
  launcher(["command"]),
  launcher(["exec"], "-a"),
  launcher(
    ["xargs"],
    "-a", "--arg-file", "-d", "--delimiter", "-E", "-I", "-L", "-n", "--max-args", "-P", "--max-procs", "-s", "--max-chars", "--process-slot-var"
  ),
  launcher(["stdbuf"], "-i", "--input", "-o", "--output", "-e", "--error"),
  launcher(
    ["sudo"],
    "-u", "--user", "-g", "--group", "-C", "--close-from", "-D", "--chdir", "--host", "-p", "--prompt", "-r", "--role", "-t", "--type", "-T", "--command-timeout", "-U", "--other-user", "-R", "--chroot"
  ),
  launcher(["cross-env"]),
  launcher(["dotenv"], "-e"),
  launcher(["xvfb-run"], "-e", "--error-file", "-f", "--auth-file", "-n", "--server-num", "-p", "--xauth-protocol", "-s", "--server-args", "-w", "--wait"),
  launcher(["nyc"], "-r", "--reporter", "--report-dir", "-t", "--temp-dir", "-n", "--include", "-x", "--exclude", "-e", "--extension", "-i", "--require", "--cwd", "--nycrc-path"),
  launcher(["c8"], "-r", "--reporter", "-o", "--reports-dir", "--report-dir", "-n", "--include", "-x", "--exclude", "-e", "--extension", "--temp-directory", "--src"),
  { ...launcher(["flock"], "-E", "--conflict-exit-code", "-w", "--wait", "--timeout"), operands: 1 },
];

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

interface SimpleCommand {
  readonly words: readonly string[];
  readonly piped: boolean;
}

const NOTHING: readonly SimpleCommand[] = [];

const isWord = (part: Command["suffix"][number]): part is Word => part.type === "Word";

type Descriptors<Held> = ReadonlyMap<number, Held>;

// Each descriptor a command writes to, and whether a pipe another command reads takes what it writes there.
type Outputs = Descriptors<boolean>;

const UNPIPED: Outputs = new Map();

const pointing = <Held>(held: Descriptors<Held>, descriptor: number, value: Held): Descriptors<Held> =>
  new Map([...held, [descriptor, value]]);

// A command's words are its name and arguments, quotes removed; its assignments and redirections are not words.
function simple(command: Command, inherited: Outputs): readonly SimpleCommand[] {
  if (command.name === undefined) return NOTHING;
  const words: [string, ...string[]] = [command.name.value, ...command.suffix.filter(isWord).map((word) => word.value)];
  return [{ words, piped: inherited.get(1) ?? false }];
}

// Whether the walk enters each kind of node: those that hold commands. A word, an assignment, a redirection or an expression holds
// commands only inside a substitution, and no command inside one is run as the step's. A new kind of node fails the build until it is decided.
const ENTERED = {
  Script: true,
  Statement: true,
  CompoundList: true,
  AndOr: true,
  Pipeline: true,
  Command: true,
  Redirected: true,
  If: true,
  Elif: true,
  For: true,
  ArithmeticFor: true,
  Select: true,
  While: true,
  Case: true,
  CaseItem: true,
  Subshell: true,
  BraceGroup: true,
  Function: true,
  Coproc: true,
  Time: false,
  Negation: false,
  Word: false,
  Literal: false,
  Glob: false,
  SingleQuoted: false,
  DoubleQuoted: false,
  AnsiCQuoted: false,
  LocaleString: false,
  SimpleExpansion: false,
  ParameterExpansion: false,
  CommandExpansion: false,
  ArithmeticExpansion: false,
  ProcessSubstitution: false,
  ExtendedGlob: false,
  BraceExpansion: false,
  Assignment: false,
  ArrayValue: false,
  Redirect: false,
  HereString: false,
  HereDoc: false,
  FileDescriptor: false,
  FileDescriptorVariable: false,
  HereDocDelimiter: false,
  HereDocBody: false,
  ArithmeticBinary: false,
  ArithmeticUnary: false,
  ArithmeticTernary: false,
  ArithmeticGroup: false,
  ArithmeticWord: false,
  ArithmeticCommandExpansion: false,
  ArithmeticCommand: false,
  TestCommand: false,
  TestUnary: false,
  TestBinary: false,
  TestLogical: false,
  TestNot: false,
  TestGroup: false,
  Default: false,
  Remove: false,
  Replace: false,
  Slice: false,
  CaseModification: false,
  Transform: false,
  Names: false,
  Unknown: false,
} as const satisfies Record<SyntaxNode["type"], boolean>;

function childrenOf(node: SyntaxNode): readonly SyntaxNode[] {
  const children: SyntaxNode[] = [];
  forEachChild(node, (child) => {
    if (ENTERED[child.type]) children.push(child);
  });
  return children;
}

// Every stage of a pipeline but the last writes its stdout to a pipe.
function pipeline(node: Pipeline, outputs: Outputs): readonly SimpleCommand[] {
  const last = node.commands.length - 1;
  return node.commands.flatMap((stage, at) => walk(stage, at < last ? pointing(outputs, 1, true) : outputs));
}

// A command or process substitution is held inside the word it opens, so no command inside it is read.
// A coprocess writes its stdout to a pipe the shell reads.
function walk(node: SyntaxNode, outputs: Outputs): readonly SimpleCommand[] {
  if (node.type === "Command") return simple(node, outputs);
  if (node.type === "Pipeline") return pipeline(node, outputs);
  if (node.type === "Coproc") return walk(node.body, pointing(outputs, 1, true));
  return childrenOf(node).flatMap((child) => walk(child, outputs));
}

// The simple commands the shell runs from the text, each as its words, and whether a pipe reads its output.
function simpleCommands(text: string): readonly SimpleCommand[] {
  return walk(parse(text), UNPIPED);
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

const WHITESPACE = /\s+/;

function commandAfter(words: readonly string[], at: number, prefix: CommandPrefix): readonly string[] {
  const word = words[at];
  if (prefix.splits?.includes(String(word))) return [...(words[at + 1] ?? "").split(WHITESPACE).filter((part) => part !== ""), ...words.slice(at + 2)];
  if (word === undefined || !(word.startsWith("-") || ASSIGNMENT.test(word))) return words.slice(at + prefix.operands);
  return commandAfter(words, at + (prefix.valued.includes(word) ? 2 : 1), prefix);
}

function passedOn(words: readonly string[]): readonly string[] | undefined {
  const prefix = COMMAND_PREFIXES.find((row) => opensWith(words, row.words));
  return prefix === undefined ? undefined : commandAfter(words, prefix.words.length, prefix);
}

// The command a step's words run, past every launcher and wrapper with its options.
function launched(words: readonly string[]): readonly string[] {
  const next = passedOn(words);
  return next === undefined ? words : launched(next);
}

// The scripts a command runs: those its own words name, then those of each command it hands on to.
function scriptsRunBy(head: readonly string[]): readonly (string | undefined)[] {
  const next = passedOn(head);
  return [scriptsNamedBy(head), next === undefined ? undefined : scriptsRunBy(next)].flat();
}

type Heads = (command: string) => readonly (readonly string[])[];

const headsOf: Heads = (command) => simpleCommands(command).map(({ words }) => words);

// Only a pipeline's last stage is read as the command a step runs: what a pipe reads is another command's output.
const lastStageHeadsOf: Heads = (command) =>
  simpleCommands(command)
    .filter(({ piped }) => !piped)
    .map(({ words }) => words);

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
  if (depth === 0) return false;
  const run = reading.heads(command).flatMap(scriptsRunBy);
  return entries.some(([name, body]) => run.includes(name) && runs(body, invocation, scripts, depth - 1, reading));
}

function runsBy(
  reading: Reading
): (command: string, invocation: string, scripts: Readonly<Record<string, string>>) => boolean {
  return (command, invocation, scripts) => {
    const words = wordsOf(invocation);
    return String(words) !== "" && runs(command, words, scripts, SCRIPT_CHAIN_DEPTH, reading);
  };
}

export const shellReading: ShellReading = {
  runsAnywhere: runsBy(anywhere),
  runsAsCommand: runsBy(asCommand),
};
