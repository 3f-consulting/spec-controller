import { forEachChild, parse } from "unbash";
import type { Command, HereDoc, Pipeline, Redirect, Redirection, SyntaxNode, Word } from "unbash";
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

interface SimpleCommand {
  readonly words: readonly string[];
  readonly piped: boolean;
}

const NOTHING: readonly SimpleCommand[] = [];

const SHELLS = new Set(["bash", "sh"]);

const isWord = (part: Command["suffix"][number]): part is Word => part.type === "Word";

type Descriptors<Held> = ReadonlyMap<number, Held>;

// Each descriptor a command writes to, and whether a pipe another command reads takes what it writes there.
type Outputs = Descriptors<boolean>;

const UNPIPED: Outputs = new Map();

const ONTO_STDOUT = new Set([">", ">>", ">|", ">&", "&>", "&>>"]);

const duplicates = (redirection: Redirection): redirection is Redirect =>
  redirection.operator === ">&" || redirection.operator === "<&";

const pointing = <Held>(held: Descriptors<Held>, descriptor: number, value: Held): Descriptors<Held> =>
  new Map([...held, [descriptor, value]]);

const DESCRIPTOR_OR_CLOSE = /^(\d+-?|-)$/;

// &>, &>> and a >& with no descriptor whose word is no descriptor number and not - send both stdout and stderr to the file.
const toFileWithErrors = (redirection: Redirection): boolean =>
  redirection.operator === "&>" ||
  redirection.operator === "&>>" ||
  (redirection.operator === ">&" &&
    redirection.descriptor === undefined &&
    !DESCRIPTOR_OR_CLOSE.test(redirection.target?.value ?? ""));

// Each redirection points one descriptor at what it opens, or at what the descriptor it duplicates holds; a {var}> allocation moves none of the standard ones.
function redirectedOnce<Held>(held: Descriptors<Held>, redirection: Redirection, opened: Held): Descriptors<Held> {
  const { descriptor } = redirection;
  if (descriptor?.type === "FileDescriptorVariable") return held;
  if (toFileWithErrors(redirection)) return pointing(pointing(held, 1, opened), 2, opened);
  const number = descriptor?.value ?? (ONTO_STDOUT.has(redirection.operator) ? 1 : 0);
  const source = duplicates(redirection) ? Number.parseInt(redirection.target?.value ?? "", 10) : Number.NaN;
  return pointing(held, number, held.get(source) ?? opened);
}

const redirected = (outputs: Outputs, redirections: readonly Redirection[]): Outputs =>
  redirections.reduce((held, redirection) => redirectedOnce(held, redirection, false), outputs);

const NO_HERE_DOCUMENTS: Descriptors<HereDoc | undefined> = new Map();

// The here-document a command's stdin holds once its redirections apply, if any.
const stdinHereDocument = (redirections: readonly Redirection[]): HereDoc | undefined =>
  redirections
    .reduce(
      (held, redirection) => redirectedOnce(held, redirection, redirection.type === "HereDoc" ? redirection : undefined),
      NO_HERE_DOCUMENTS,
    )
    .get(0);

// A here-document fed to bash or sh, given only options, is that shell's script when it is the shell's stdin.
function shellScripts(command: Command, [name, ...args]: readonly [string, ...string[]], outputs: Outputs): readonly SimpleCommand[] {
  if (!SHELLS.has(name) || !args.every((arg) => arg.startsWith("-"))) return NOTHING;
  const script = stdinHereDocument(command.redirects);
  return script === undefined ? NOTHING : walk(parse(script.body.text), outputs);
}

// A command's words are its name and arguments, quotes removed; its assignments and redirections are not words.
function simple(command: Command, inherited: Outputs): readonly SimpleCommand[] {
  if (command.name === undefined) return NOTHING;
  const outputs = redirected(inherited, command.redirects);
  const words: [string, ...string[]] = [command.name.value, ...command.suffix.filter(isWord).map((word) => word.value)];
  return [{ words, piped: outputs.get(1) ?? false }, ...shellScripts(command, words, outputs)];
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

// Every stage of a pipeline but the last writes its stdout to a pipe before its own redirections apply; |& joins stderr to it only after them.
function pipeline(node: Pipeline, outputs: Outputs): readonly SimpleCommand[] {
  const last = node.commands.length - 1;
  return node.commands.flatMap((stage, at) => walk(stage, at < last ? pointing(outputs, 1, true) : outputs));
}

// A command or process substitution is held inside the word it opens, so no command inside it is read.
// A coprocess writes its stdout to a pipe the shell reads, before its own redirections apply.
function walk(node: SyntaxNode, outputs: Outputs): readonly SimpleCommand[] {
  if (node.type === "Command") return simple(node, outputs);
  if (node.type === "Pipeline") return pipeline(node, outputs);
  if (node.type === "Coproc") return walk(node.body, pointing(outputs, 1, true));
  if (node.type === "Redirected") return walk(node.command, redirected(outputs, node.redirects));
  return childrenOf(node).flatMap((child) => walk(child, outputs));
}

const READ = new Map<string, readonly SimpleCommand[]>();

// The simple commands the shell runs from the text, each as its words, and whether a pipe reads its output. Each distinct text is parsed once.
function simpleCommands(text: string): readonly SimpleCommand[] {
  const known = READ.get(text);
  if (known !== undefined) return known;
  const commands = walk(parse(text), UNPIPED);
  READ.set(text, commands);
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

const headsOf: Heads = (command) => simpleCommands(command).map(({ words }) => words);

// Only a pipeline's last stage is read as the command a step runs: what a pipe reads is another command's output.
const lastStageHeadsOf: Heads = (command) =>
  simpleCommands(command)
    .filter(({ piped }) => !piped)
    .map(({ words }) => words);

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
