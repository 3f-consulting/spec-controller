import { accessSync, constants, statSync } from "node:fs";
import { dirname } from "node:path";
import { whereItWillBe } from "./identity.js";

export type Unwritable = "may-not-be-written" | "is-a-folder" | "folder-does-not-exist" | "leads-round-to-itself";

// Why a report cannot be written at a path, or nothing when it can: checked before anything is written.
export function whyUnwritable(path: string): Unwritable | undefined {
  try {
    const stats = statSync(path, { throwIfNoEntry: false });
    if (stats === undefined) return statSync(dirname(whereItWillBe(path)), { throwIfNoEntry: false })?.isDirectory() ? undefined : "folder-does-not-exist";
    if (stats.isDirectory()) return "is-a-folder";
    accessSync(path, constants.W_OK);
    return undefined;
  } catch (error) {
    // The system stops following links that lead round to themselves; any other refusal is a place it may not write.
    return (error as NodeJS.ErrnoException).code === "ELOOP" ? "leads-round-to-itself" : "may-not-be-written";
  }
}
