import { asksForHelp } from "./cli-args.js";
import { cliRegistry, type CommandSpec } from "./cli-registry.js";
import type { HostInvocation } from "./host.js";

export function dispatchesUnstored(inv: HostInvocation): boolean {
  return inv.store === undefined || asksForHelp(inv.commandArgs);
}

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
