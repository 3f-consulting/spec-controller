/**
 * DOES THIS COMMAND RUN THAT — the one comparison every recognition rule on this axis makes, and
 * it is made in one place because two of them now make it.
 *
 * WHOLE TOKENS, NEVER A SUBSTRING, and that is the whole of what keeps a recognition rule safe.
 * Measured over 113 `run:` steps in five real pipelines (3F-3343) the substring form recognises 2
 * and BOTH are false: one of them is the reconciler's own `balance` step, matched on the filename
 * `vitest.json` inside its `--vitest` argument. Excluding a fitness check as something else is the
 * one direction this axis cannot tolerate, because it is silent.
 *
 * THE SCRIPT HOP IS THE RULE, NOT A REFINEMENT OF IT. Over those same 113 steps the first clause
 * ALONE recognises zero: every pipeline in the portfolio invokes its runner through a
 * `package.json` script alias, and the binary's name is in the workflow only inside a path. A rule
 * that resolved a step's command to the executable it runs could not be built from the workflow,
 * because the executable is not there.
 *
 * WHICH SCRIPT A COMMAND INVOKES IS THE PRODUCT'S OWN QUESTION, already answered —
 * `commandInvokesScript`, the exact package-manager invocation a static check's enforcement is
 * read through. Asking it a second way here would let two readers disagree about what `pnpm test`
 * invokes.
 *
 * AN INVOCATION OF MORE THAN ONE TOKEN IS MATCHED ADJACENT AND IN ORDER, which is what lets a
 * caller name a tool AND the command it is being run for. `spec-controller balance` is the
 * reconciler; `spec-controller help` is the same binary doing something else — so a rule comparing
 * the binary alone would take an ordinary step of a pipeline off the books. Per LINE, because two commands on two lines are two commands.
 *
 * Its own module rather than a private helper of the runner rule: the reconciler asks the same
 * question (`parse/reconcilerSteps`), and a second implementation of "does this command run that"
 * is a second chance for the two to answer differently about one step.
 */

import { commandInvokesScript } from "./checkScriptsRunInCI.js";

/**
 * How deep a script-to-script chain is followed before the walk gives up.
 *
 * THREE RATHER THAN UNBOUNDED, and the number is a judgement stated once. A chain deeper than
 * three hops is not a shape any pipeline in the portfolio has, and the manifest being walked was
 * written by the consumer — an input this tool does not control, so it does not walk it without a
 * bound.
 *
 * AND IT IS THIS BOUND, NOT THE VISITED SET BELOW, THAT MAKES A CYCLIC MANIFEST TERMINATE —
 * measured rather than reasoned: deleting the visited set leaves every arm of this rule green,
 * because a chain that loops back exhausts the depth exactly as a long one does. The set is kept
 * because the technical design names it and because it stops a manifest whose scripts cite each
 * other being re-tread inside that budget; what it cannot do is change an answer, so no arm reds
 * on its removal. Said out loud because a comment claiming a guarantee its code does not hold is
 * the kind of thing nothing typechecks.
 */
const SCRIPT_CHAIN_DEPTH = 3;

/** A command's whole shell tokens, one array per line — the unit every comparison here is over. */
function tokenLinesOf(command: string): readonly (readonly string[])[] {
  return command
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).filter((token) => token !== ""));
}

/** Do these tokens occur, in this order and adjacent, among a line's? */
function lineRuns(line: readonly string[], invocation: readonly string[]): boolean {
  return line.some((_, at) => invocation.every((token, i) => line[at + i] === token));
}

/** The recursion: this command's own tokens, then the manifest scripts it invokes. */
function runs(
  command: string,
  invocation: readonly string[],
  scripts: Readonly<Record<string, string>>,
  depth: number,
  visited: ReadonlySet<string>
): boolean {
  if (tokenLinesOf(command).some((line) => lineRuns(line, invocation))) return true;
  if (depth === 0) return false;
  return Object.entries(scripts).some(
    ([name, body]) =>
      !visited.has(name) &&
      commandInvokesScript(command, name) &&
      runs(body, invocation, scripts, depth - 1, new Set([...visited, name]))
  );
}

/**
 * Does this command run the named invocation — itself, or through the manifest scripts it invokes?
 *
 * AN INVOCATION OF NO TOKENS RUNS NOWHERE, which is the guard rather than a formality: an empty
 * token list occurs at every position of every command, so a reader taking it as a match would
 * recognise every step of every pipeline it was handed. A caller that has been told no invocation
 * has been told nothing, and nothing is what it gets back.
 */
export function commandRuns(
  command: string,
  invocation: string,
  scripts: Readonly<Record<string, string>>
): boolean {
  const tokens = invocation.trim().split(/\s+/).filter((token) => token !== "");
  return tokens.length > 0 && runs(command, tokens, scripts, SCRIPT_CHAIN_DEPTH, new Set());
}
