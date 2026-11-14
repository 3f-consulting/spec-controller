import { accessSync, constants, statSync } from "node:fs";
import { dirname } from "node:path";
import { whereItWillBe } from "./identity.js";

export type Unwritable = "may-not-be-written" | "is-a-folder" | "folder-does-not-exist" | "leads-round-to-itself";

// Why a report cannot be written at a path, or nothing when it can: checked before anything is written.
export function whyUnwritable(path: string): Unwritable | undefined {
  try {
    const stats = statSync(path, { throwIfNoEntry: false });
    if (stats === undefined) {
      const folder = dirname(whereItWillBe(path));
      if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) return "folder-does-not-exist";
      accessSync(folder, constants.W_OK);
      return undefined;
    }
    if (stats.isDirectory()) return "is-a-folder";
    accessSync(path, constants.W_OK);
    return undefined;
  } catch (error) {
    // The system stops following links that lead round to themselves; any other refusal is a place it may not write.
    return (error as NodeJS.ErrnoException).code === "ELOOP" ? "leads-round-to-itself" : "may-not-be-written";
  }
}
