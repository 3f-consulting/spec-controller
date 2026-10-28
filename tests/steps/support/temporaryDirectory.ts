import { After } from "@cucumber/cucumber";
import { chmodSync, lstatSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SpecControllerWorld } from "./world.js";

export function temporaryDirectory(world: SpecControllerWorld, prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  world.temporaryDirectories.push(dir);
  return dir;
}

// Every step file that makes a directory imports this module before it registers its own hooks, and Cucumber runs
// After hooks in reverse order of registration, so this removal runs after each file's own hooks have restored modes.
After(function (this: SpecControllerWorld) {
  for (const dir of this.temporaryDirectories.splice(0)) {
    giveOwnerAccessBack(dir);
    rmSync(dir, { recursive: true, force: true });
  }
});

// A scenario that strips a mode and fails before restoring it would otherwise leave entries rmSync cannot read or unlink.
function giveOwnerAccessBack(path: string): void {
  const entry = lstatSync(path, { throwIfNoEntry: false });
  if (entry === undefined || entry.isSymbolicLink()) return;
  chmodSync(path, (entry.mode & 0o7777) | 0o700);
  if (!entry.isDirectory()) return;
  for (const name of readdirSync(path)) giveOwnerAccessBack(join(path, name));
}
