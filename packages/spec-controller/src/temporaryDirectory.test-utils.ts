import { chmodSync, lstatSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";

// A test may take a read permission away; it is given back before the folder is removed. A link is left as it is.
function giveOwnerAccessBack(path: string): void {
  if (lstatSync(path).isSymbolicLink()) return;
  chmodSync(path, 0o700);
  if (statSync(path).isDirectory()) readdirSync(path).forEach((name) => giveOwnerAccessBack(join(path, name)));
}

// A folder of its own for one test, removed when that test finishes, however it ends.
export function temporaryDirectory(prefix: string): string {
  const folder = mkdtempSync(join(tmpdir(), prefix));
  onTestFinished(() => {
    giveOwnerAccessBack(folder);
    rmSync(folder, { recursive: true, force: true });
  });
  return folder;
}
