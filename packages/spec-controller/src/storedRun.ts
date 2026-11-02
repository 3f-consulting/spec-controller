import { asksForHelp } from "./cliArgs.js";
import { cliRegistry, type CommandSpec } from "./cliRegistry.js";
import type { HostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

export function dispatchesUnstored(inv: HostInvocation): boolean {
  return inv.store === undefined || asksForHelp(inv.commandArgs);
}

export function storedReRenderRefusal(inv: HostInvocation): string | undefined {
  if (inv.command !== "balance" || asksForHelp(inv.commandArgs)) return undefined;
  if (!inv.commandArgs.includes("--render-from-json")) return undefined;
  const given = [inv.store === undefined ? [] : ["--store"], inv.runId === undefined ? [] : ["--run-id"]].flat();
  if (given.length === 0) return undefined;
  return (
    `${APP_MESSAGES[AppMessage.HostUsageError](APP_MESSAGES[AppMessage.ReRenderNotStored](given.join(", ")))}\n` +
    APP_MESSAGES[given.length === 1 ? AppMessage.ReRenderWithoutIt : AppMessage.ReRenderWithoutThem]()
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
    `${APP_MESSAGES[AppMessage.HostUsageError](APP_MESSAGES[AppMessage.RunIdWithoutStore](inv.runId))}\n` +
    APP_MESSAGES[AppMessage.KeepRunUnderName](entry.name)
  );
}
