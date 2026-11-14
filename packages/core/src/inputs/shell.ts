import { parse } from "unbash";
import type { Command, Statement, Word } from "unbash";
import type { Scripts, ShellAnswers } from "../domain/postEvidenceObservation.js";
import shellVariants from "./shell.variants.json" with { type: "json" };

const { "CLM-OBS-009": scriptRuns, "CLM-OBS-010": launchers, "CLM-OBS-112": wrappers } = shellVariants;

const wordsIn = (text: string): string[] => text.split(" ");

// An entry saying how forms combine, as launchers chained, matches no command; the reader follows one into the next.
const formsOf = (variants: readonly string[]): string[][] => variants.map(wordsIn);

// A launcher's words, up to the command it hands on to; the list names pnpm exec before pnpm, so it is read first.
const LAUNCHERS = formsOf(launchers.variants).map((launcher) => launcher.filter((word) => word !== "<bin>"));
const SCRIPT_VARIANTS = formsOf(scriptRuns.variants);
const isOption = (word: string | undefined): boolean => word?.startsWith("-") === true;
// Each wrapper form, its command first (one opening with an option is xvfb-run's), then a gap for each value it takes
// before the command it runs, as timeout's duration, or an option that takes a value, read past with it.
const WRAPPER_FORMS = formsOf(wrappers.variants).map((form) => (isOption(form[0]) ? ["xvfb-run", ...form] : form));
const GAPS = new Map(WRAPPER_FORMS.filter(([, first]) => !isOption(first)).map(([command, ...gaps]) => [command!, gaps.length]));
const FORM_OPENINGS = new Set(WRAPPER_FORMS.map(([command, first]) => `${command} ${first}`));

// Each element of the line's && and ; lists, as the stages of its pipeline. A comment is no command.
function pipelinesOf(statements: readonly Statement[]): Command[][] {
  return statements
    .flatMap(({ command }) => (command.type === "AndOr" ? command.commands : [command]))
    .map((node) => (node.type === "Pipeline" ? node.commands : [node]).filter((stage): stage is Command => stage.type === "Command"));
}

// A command's name and arguments that are words; a command that only sets a variable has no name.
const wordsOf = ({ name, args }: Command): string[] => [name, ...args].filter((word): word is Word => word?.type === "Word").map(({ value }) => value);

const opensWith = (words: readonly string[], opening: readonly string[]): boolean => opening.every((word, at) => words[at] === word);

// The script a command runs in one of its package manager's variants, when the target has one by that name. Every
// variant's last word names its script: its <script> gap, or, as npm test's, the script itself.
function scriptRun(words: readonly string[], scripts: Scripts): string | undefined {
  for (const variant of SCRIPT_VARIANTS) {
    const named = variant.every((word, at) => word === "<script>" || word === "<name>" || word === words[at]);
    const script = words[variant.length - 1];
    if (named && Object.hasOwn(scripts, String(script))) return script;
  }
  return undefined;
}

function handedOn(words: readonly string[]): readonly string[] | undefined {
  const launcher = LAUNCHERS.find((opening) => opensWith(words, opening));
  if (launcher !== undefined) return words.slice(launcher.length);
  const gaps = GAPS.get(words[0]!);
  if (gaps === undefined) return undefined;
  let at = 1;
  while (isOption(words[at])) at += FORM_OPENINGS.has(`${words[0]} ${words[at]}`) ? 2 : 1;
  return words.slice(at + gaps);
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
