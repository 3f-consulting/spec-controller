import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it, onTestFinished } from "vitest";
import { giveOwnerAccessBack } from "../../../tests/steps/support/ownerAccess.js";

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
