import { After } from "@cucumber/cucumber";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const made: string[] = [];

// Each folder a scenario made is removed when it finishes, however it ends.
After(() => {
  made.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true }));
});

// A folder of its own for one scenario.
export function temporaryDirectory(prefix: string): string {
  const folder = mkdtempSync(join(tmpdir(), prefix));
  made.push(folder);
  return folder;
}
