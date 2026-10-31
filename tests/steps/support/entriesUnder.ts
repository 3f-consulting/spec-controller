import { lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";

export function entriesUnder(dir: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true })) {
    const path = join(dir, String(entry));
    const kind = lstatSync(path);
    if (kind.isSymbolicLink()) entries.set(path, `-> ${readlinkSync(path)}`);
    else if (kind.isFile()) entries.set(path, readFileSync(path, "latin1"));
  }
  return entries;
}
