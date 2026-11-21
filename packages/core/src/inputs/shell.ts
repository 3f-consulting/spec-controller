import { forEachChild, parse } from "unbash";
import type { Command, CommandNode, Statement, SyntaxNode, Word } from "unbash";
import type { ReportLocation } from "../domain/configuration.js";
import type { Scripts, ShellAnswers } from "../domain/postEvidenceObservation.js";
import { defaultLocationsOf, knownRunners, reportsIn } from "./runners.js";
import shellVariants from "./shell.variants.json" with { type: "json" };

const { "script-runs": scriptRuns, launchers, wrappers, "swallow-fallbacks": swallowFallbacks, "swallow-set-forms": swallowSetForms } = shellVariants;

const wordsIn = (text: string): string[] => text.split(" ");

// A launcher's words, up to the command it hands on to; the list names pnpm exec before pnpm, so it is read first.
const LAUNCHERS = launchers.variants.map((launcher) => launcher.split(" ").filter((word) => word !== "<bin>"));
const SCRIPT_VARIANTS = scriptRuns.variants.map((variant) => variant.split(" "));
// A wrapper's words: its command, then a gap for each value it takes before the command it runs, as timeout's duration.
const WRAPPERS = wrappers.variants.map((wrapper) => wrapper.split(" "));
// A wrapper's options that take a value are read past with it.
const OPTIONS_TAKING_A_VALUE: Readonly<Record<string, readonly string[]>> = { "xvfb-run": ["-n", "-s", "-e", "-f", "-p", "-w"], timeout: ["-k", "-s"] };

// Each element of the line's && and ; lists, as its pipeline's stages; a compound stage, such as a loop, runs no runner.
function pipelinesOf(statements: readonly Statement[]): (readonly CommandNode[])[] {
  return statements
    .flatMap(({ command }) => (command.type === "AndOr" ? command.commands : [command]))
    .map((node) => (node.type === "Pipeline" ? node.commands : [node]));
}

const isCommand = (stage: CommandNode | undefined): stage is Command => stage?.type === "Command";

// A command's name and arguments that are words; a command that only sets a variable has no name.
const wordsOf = ({ name, args }: Command): string[] => [name, ...args].filter((word): word is Word => word?.type === "Word").map(({ value }) => value);

const opensWith = (words: readonly string[], opening: readonly string[]): boolean => opening.every((word, at) => words[at] === word);

// The script a command runs in one of its package manager's variants, when the target has one by that name, with the words
// after it, which its last command takes. Every variant's last word names its script: its <script> gap, or the script itself, as in npm test.
function scriptRun(words: readonly string[], scripts: Scripts): { readonly script: string; readonly after: readonly string[] } | undefined {
  for (const variant of SCRIPT_VARIANTS) {
    const named = variant.every((word, at) => word === "<script>" || word === "<name>" || word === words[at]);
    const script = words[variant.length - 1];
    if (named && Object.hasOwn(scripts, String(script))) return { script: script!, after: words.slice(variant.length) };
  }
  return undefined;
}

function handedOn(words: readonly string[]): readonly string[] | undefined {
  const launcher = LAUNCHERS.find((opening) => opensWith(words, opening));
  if (launcher !== undefined) return words.slice(launcher.length);
  const wrapper = WRAPPERS.find(([command]) => command === words[0]);
  if (wrapper === undefined) return undefined;
  let at = 1;
  while (words[at]?.startsWith("-")) at += OPTIONS_TAKING_A_VALUE[wrapper[0]!]!.includes(words[at]!) ? 2 : 1;
  return words.slice(at + wrapper.length - 1);
}

// The words of each time the words run the program, from its own, through launchers, wrappers and scripts, none followed inside itself.
function invocationsIn(words: readonly string[], program: readonly string[], scripts: Scripts, followed: ReadonlySet<string>): (readonly string[])[] {
  if (opensWith(words, program)) return [words];
  const run = scriptRun(words, scripts);
  if (run !== undefined && !followed.has(run.script)) return invocationsThrough(scripts[run.script]!, program, scripts, new Set([...followed, run.script]), run.after);
  const rest = handedOn(words);
  return rest === undefined ? [] : invocationsIn(rest, program, scripts, followed);
}

function invocationsThrough(commandLine: string, program: readonly string[], scripts: Scripts, followed: ReadonlySet<string>, after: readonly string[] = []): (readonly string[])[] {
  const pipelines = pipelinesOf(parse(commandLine).commands);
  return pipelines.flatMap((stages, at) => {
    const last = stages.at(-1);
    const passed = at === pipelines.length - 1 ? after : [];
    return isCommand(last) ? invocationsIn([...wordsOf(last), ...passed], program, scripts, followed) : [];
  });
}

const RECONCILER = wordsIn("spec-controller balance");

// The reconciler is found in any command of the line, through launchers and wrappers, never through a script.
const invokesTheReconciler = (commandLine: string): boolean =>
  pipelinesOf(parse(commandLine).commands).some((stages) => stages.some((stage) => isCommand(stage) && invocationsIn(wordsOf(stage), RECONCILER, {}, new Set()).length > 0));

// A runner is found only as the last command of a pipeline, through launchers, wrappers and the target's scripts.
const invokesAsCommand = (commandLine: string, program: string, scripts: Scripts): boolean => invocationsThrough(commandLine, wordsIn(program), scripts, new Set()).length > 0;

const reportsNamed = (commandLine: string, runner: string, scripts: Scripts, environment: Readonly<Record<string, string>>): ReportLocation[] =>
  invocationsThrough(commandLine, wordsIn(runner), scripts, new Set())
    .flatMap((args) => reportsIn(runner, args, environment))
    .filter((report, at, all) => all.findIndex(({ path }) => path === report.path) === at);

// A runner's default report locations, for a command that runs it.
const defaultReportsOf = (commandLine: string, runner: string, scripts: Scripts): ReportLocation[] => {
  const locations = defaultLocationsOf(runner);
  return locations.length > 0 && invokesAsCommand(commandLine, runner, scripts) ? locations : [];
};

const SWALLOW_SET_COMMANDS = swallowSetForms.variants.map((form) => `set ${form}`);

const isOneOf = (node: SyntaxNode, lines: readonly string[]): boolean => node.type === "Command" && lines.includes(wordsOf(node).join(" "));

const swallowsHere = (node: SyntaxNode): boolean =>
  node.type === "AndOr" ? node.commands.some((command, at) => node.operators[at - 1] === "||" && (isOneOf(command, swallowFallbacks.variants) || (command.type === "Command" && wordsOf(command).length === 0))) : isOneOf(node, SWALLOW_SET_COMMANDS);

function nodesOf(node: SyntaxNode): SyntaxNode[] {
  const found = [node];
  forEachChild(node, (child) => found.push(...nodesOf(child)));
  return found;
}

function scriptReached(words: readonly string[], scripts: Scripts): ReturnType<typeof scriptRun> {
  const rest = handedOn(words);
  return scriptRun(words, scripts) ?? (rest === undefined ? undefined : scriptReached(rest, scripts));
}

function swallowsIn(commandLine: string, scripts: Scripts, followed: ReadonlySet<string>): boolean {
  return nodesOf(parse(commandLine)).some((node) => {
    if (swallowsHere(node)) return true;
    const run = node.type === "Command" ? scriptReached(wordsOf(node), scripts) : undefined;
    return run !== undefined && !followed.has(run.script) && swallowsIn(scripts[run.script]!, scripts, new Set([...followed, run.script]));
  });
}

const swallowsFailure = (commandLine: string, scripts: Scripts): boolean => swallowsIn(commandLine, scripts, new Set());

export const shellAnswers: ShellAnswers = { invokesTheReconciler, invokesAsCommand, swallowsFailure, reportsNamed, defaultReportsOf, knownRunners };
