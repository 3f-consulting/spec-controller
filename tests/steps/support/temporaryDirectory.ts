import { After } from "@cucumber/cucumber";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { giveOwnerAccessBack } from "./ownerAccess.js";
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
