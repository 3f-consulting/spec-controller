import { chmodSync, lstatSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it, onTestFinished } from "vitest";

export function temporaryDirectory(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  onTestFinished(() => removeTemporaryDirectory(dir));
  return dir;
}

// One directory every test in a file shares, for setup too slow to repeat per test; Vitest removes it after the file's last test.
export const test = it.extend<{ sharedDirectory: string }>({
  sharedDirectory: [
    async ({}, use) => {
      const dir = mkdtempSync(join(tmpdir(), "shared-"));
      await use(dir);
      removeTemporaryDirectory(dir);
    },
    { scope: "file" },
  ],
});

function removeTemporaryDirectory(dir: string): void {
  giveOwnerAccessBack(dir);
  rmSync(dir, { recursive: true, force: true });
}

// A test that strips a mode and fails before restoring it would otherwise leave entries rmSync cannot read or unlink.
function giveOwnerAccessBack(path: string): void {
  const entry = lstatSync(path, { throwIfNoEntry: false });
  if (entry === undefined || entry.isSymbolicLink()) return;
  chmodSync(path, (entry.mode & 0o7777) | 0o700);
  if (!entry.isDirectory()) return;
  for (const name of readdirSync(path)) giveOwnerAccessBack(join(path, name));
}
