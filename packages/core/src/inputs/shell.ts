import { parse } from "unbash";
import type { Command, Statement } from "unbash";
import type { Scripts, ShellAnswers } from "../domain/postEvidenceObservation.js";
import shellVariants from "./shell.variants.json" with { type: "json" };

const wordsIn = (text: string): string[] => text.split(" ");

// A launcher's words, up to the command it hands on to. A longer launcher is tried first, so pnpm exec is read before pnpm.
const LAUNCHERS = shellVariants["CLM-OBS-010"].variants.map((launcher) => wordsIn(launcher).filter((word) => word !== "<bin>")).sort((one, other) => other.length - one.length);
const SCRIPT_VARIANTS = shellVariants["CLM-OBS-009"].variants.map(wordsIn);
// A wrapper's words: its command, then a gap for each value it takes before the command it runs, as timeout's duration.
const WRAPPERS = shellVariants["CLM-OBS-112"].variants.map(wordsIn);
// What a wrapper's options take is that wrapper's own: xvfb-run's are read past with their values.
const OPTIONS_TAKING_A_VALUE: Readonly<Record<string, readonly string[]>> = { "xvfb-run": ["-n", "-s", "-e", "-f", "-p", "-w"], timeout: [] };

// Each element of the line's && and ; lists, as the stages of its pipeline. A comment is no command.
function pipelinesOf(statements: readonly Statement[]): Command[][] {
  return statements
    .flatMap(({ command }) => (command.type === "AndOr" ? command.commands : [command]))
    .map((node) => (node.type === "Pipeline" ? node.commands : [node]).filter((stage): stage is Command => stage.type === "Command"));
}

const wordsOf = ({ name, args }: Command): string[] => (name === undefined ? [] : [name.value, ...args.flatMap((arg) => (arg.type === "Word" ? [arg.value] : []))]);

const opensWith = (words: readonly string[], opening: readonly string[]): boolean => opening.every((word, at) => words[at] === word);

// The script a command runs in one of its package manager's variants, when the target has a script by that name. A
// variant with no <script> gap, such as npm test, runs the script its last word names.
function scriptRun(words: readonly string[], scripts: Scripts): string | undefined {
  for (const variant of SCRIPT_VARIANTS) {
    if (words.length < variant.length) continue;
    const named = variant.every((word, at) => word === "<script>" || word === "<name>" || word === words[at]);
    const script = variant.includes("<script>") ? words[variant.indexOf("<script>")] : variant.at(-1);
    if (named && script !== undefined && Object.hasOwn(scripts, script)) return script;
  }
  return undefined;
}

// The command a launcher or a wrapper hands on to: the word after a launcher, or the first word past a wrapper's options and their values.
function handedOn(words: readonly string[]): readonly string[] | undefined {
  const launcher = LAUNCHERS.find((opening) => words.length > opening.length && opensWith(words, opening));
  if (launcher !== undefined) return words.slice(launcher.length);
  const wrapper = WRAPPERS.find(([command]) => command === words[0]);
  if (wrapper === undefined) return undefined;
  let at = 1;
  while (words[at]?.startsWith("-")) at += OPTIONS_TAKING_A_VALUE[wrapper[0]!]!.includes(words[at]!) ? 2 : 1;
  at += wrapper.length - 1;
  return at < words.length ? words.slice(at) : undefined;
}

function runs(words: readonly string[], program: readonly string[], scripts: Scripts, followed: Set<string>): boolean {
  if (opensWith(words, program)) return true;
  const script = scriptRun(words, scripts);
  if (script !== undefined && !followed.has(script)) {
    followed.add(script);
    return invokesThrough(scripts[script]!, program, scripts, followed);
  }
  const rest = handedOn(words);
  return rest !== undefined && runs(rest, program, scripts, followed);
}

function invokesThrough(commandLine: string, program: readonly string[], scripts: Scripts, followed: Set<string>): boolean {
  return pipelinesOf(parse(commandLine).commands).some((stages) => {
    const last = stages.at(-1);
    return last !== undefined && runs(wordsOf(last), program, scripts, followed);
  });
}

// The reconciler is found in any command of the line, through launchers and wrappers, never through a script.
const invokesAnywhere = (commandLine: string, program: string): boolean =>
  pipelinesOf(parse(commandLine).commands).some((stages) => stages.some((stage) => runs(wordsOf(stage), wordsIn(program), {}, new Set())));

// A runner is found only as the last command of a pipeline, through launchers, wrappers and the target's scripts.
const invokesAsCommand = (commandLine: string, program: string, scripts: Scripts): boolean => invokesThrough(commandLine, wordsIn(program), scripts, new Set());

export const shellAnswers: ShellAnswers = { invokesAnywhere, invokesAsCommand };
