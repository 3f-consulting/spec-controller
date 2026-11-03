import { asksForHelp } from "./cliArgs.js";
import { cliRegistry, type CommandSpec } from "./cliRegistry.js";
import type { HostInvocation } from "./host.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { refusal, type Refusal } from "./refusal.js";

export function dispatchesUnstored(inv: HostInvocation): boolean {
  return inv.store === undefined || asksForHelp(inv.commandArgs);
}

export function storedReRenderRefusal(inv: HostInvocation): Refusal | undefined {
  if (inv.command !== "balance" || asksForHelp(inv.commandArgs)) return undefined;
  if (!inv.commandArgs.includes("--render-from-json")) return undefined;
  const given = [inv.store === undefined ? [] : ["--store"], inv.runId === undefined ? [] : ["--run-id"]].flat();
  if (given.length === 0) return undefined;
  return refusal(
    AppError.ReRenderNotStored,
    { modifiers: given.join(", ") },
    [message(given.length === 1 ? AppMessage.ReRenderWithoutIt : AppMessage.ReRenderWithoutThem)],
  );
}

export function unstoredRunIdRefusal(
  inv: HostInvocation,
  commands: readonly CommandSpec[] = cliRegistry.commands,
): Refusal | undefined {
  if (inv.runId === undefined || inv.store !== undefined || asksForHelp(inv.commandArgs)) return undefined;
  const entry = commands.find((command) => command.name === inv.command);
  if (entry === undefined || entry.acceptsHostModifiers === false) return undefined;
  return refusal(
    AppError.RunIdWithoutStore,
    { runId: inv.runId },
    [message(AppMessage.KeepRunUnderName, { command: entry.name })],
  );
}
