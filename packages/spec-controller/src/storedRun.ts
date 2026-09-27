/**
 * What the host does with a command before a stored run starts: dispatch it unwrapped, or wrap it
 * in the kept-run scaffold. Pure, so `cli.ts`'s dispatcher reads its answer rather than deciding.
 */

import { asksForHelp } from "./cli-args.js";
import type { HostInvocation } from "./host.js";

/**
 * True when the host dispatches the command itself, never inside a stored run: no store was asked
 * for, or the command's help was, which is answered before the store is touched.
 */
export function dispatchesUnstored(inv: HostInvocation): boolean {
  return inv.store === undefined || asksForHelp(inv.commandArgs);
}

/**
 * The refusal for a re-render given a store, else undefined: a re-render writes only to stdout and
 * keeps no run. It is the host's to refuse, not `balance`'s, because a stored run hands `balance` a
 * `--format` for each report file, and `balance` cannot tell that one from a `--format` the operator
 * typed; only the host knows which host modifiers were given.
 */
export function storedReRenderRefusal(inv: HostInvocation): string | undefined {
  if (dispatchesUnstored(inv) || inv.command !== "balance") return undefined;
  if (!inv.commandArgs.includes("--render-from-json")) return undefined;
  const given = inv.runId === undefined ? ["--store"] : ["--store", "--run-id"];
  return (
    `spec-controller: usage error — 'balance --render-from-json' re-renders a saved report to stdout and keeps no run, ` +
    `and was given ${given.join(", ")}: a re-render is not stored.\n` +
    `Run 'spec-controller balance --render-from-json <path>' without ${given.length === 1 ? "it" : "them"}.`
  );
}
