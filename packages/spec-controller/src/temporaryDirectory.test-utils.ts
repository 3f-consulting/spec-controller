import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";
import { giveOwnerAccessBack } from "../../../tests/steps/support/ownerAccess.js";

export function temporaryDirectory(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  onTestFinished(() => removeTemporaryDirectory(dir));
  return dir;
}

function removeTemporaryDirectory(dir: string): void {
  giveOwnerAccessBack(dir);
  rmSync(dir, { recursive: true, force: true });
}
