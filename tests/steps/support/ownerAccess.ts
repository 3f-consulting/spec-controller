import { chmodSync, lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A test or scenario that strips a mode and fails before restoring it would otherwise leave entries rmSync cannot read or unlink.
export function giveOwnerAccessBack(path: string): void {
  const entry = lstatSync(path, { throwIfNoEntry: false });
  if (entry === undefined || entry.isSymbolicLink()) return;
  chmodSync(path, (entry.mode & 0o7777) | 0o700);
  if (!entry.isDirectory()) return;
  for (const name of readdirSync(path)) giveOwnerAccessBack(join(path, name));
}
