/**
 * What the host does with a command before a stored run starts: dispatch it unwrapped, or wrap it
 * in the kept-run scaffold. Pure, so `cli.ts`'s dispatcher reads its answer rather than deciding.
 */

import { asksForHelp } from "./cli-args.js";
import { cliRegistry, type CommandSpec } from "./cli-registry.js";
import type { HostInvocation } from "./host.js";

/**
 * True when the host dispatches the command itself, never inside a stored run: no store was asked
 * for, or the command's help was, which is answered before the store is touched.
 */
export function dispatchesUnstored(inv: HostInvocation): boolean {
  return inv.store === undefined || asksForHelp(inv.commandArgs);
}

/**
 * The refusal for a re-render given a store or a run-id, else undefined: a re-render writes only to
 * stdout and keeps no run. It is the host's to refuse, not `balance`'s, because a stored run hands
 * `balance` a `--format` for each report file, and `balance` cannot tell that one from a `--format`
 * the operator typed; only the host knows which host modifiers were given. It names only those, so a
 * re-render given a run-id alone is never told to add the store it would refuse in turn.
 */
export function storedReRenderRefusal(inv: HostInvocation): string | undefined {
  if (inv.command !== "balance" || asksForHelp(inv.commandArgs)) return undefined;
  if (!inv.commandArgs.includes("--render-from-json")) return undefined;
  const given = [inv.store === undefined ? [] : ["--store"], inv.runId === undefined ? [] : ["--run-id"]].flat();
  if (given.length === 0) return undefined;
  return (
    `spec-controller: usage error — 'balance --render-from-json' re-renders a saved report to stdout and keeps no run, ` +
    `and was given ${given.join(", ")}: a re-render is not stored.\n` +
    `Run 'spec-controller balance --render-from-json <path>' without ${given.length === 1 ? "it" : "them"}.`
  );
}

/**
 * The refusal for a run-id given with no store, before a command that keeps a run, else undefined.
 * A run-id names a stored run, so with no store there is no run for it to name: dropping it without
 * a word would leave the operator looking later for a run that was never kept. A request for the
 * command's help is answered instead, since help keeps no run either.
 */
export function unstoredRunIdRefusal(
  inv: HostInvocation,
  commands: readonly CommandSpec[] = cliRegistry.commands,
): string | undefined {
  if (inv.runId === undefined || inv.store !== undefined || asksForHelp(inv.commandArgs)) return undefined;
  const entry = commands.find((command) => command.name === inv.command);
  if (entry === undefined || entry.acceptsHostModifiers === false) return undefined;
  return (
    `spec-controller: usage error — --run-id names a stored run, and was given '${inv.runId}' with no --store, ` +
    `so no run is kept under it.\n` +
    `To keep the run under that name, give --store <root> as well; otherwise run '${entry.name}' without --run-id.`
  );
}
