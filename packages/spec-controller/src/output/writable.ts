import { accessSync, constants, statSync } from "node:fs";
import { dirname } from "node:path";
import { whereItWillBe } from "./identity.js";

export type Unwritable = "may-not-be-written" | "is-a-folder" | "folder-does-not-exist";

const mayWrite = (path: string): boolean => {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

// Why a report cannot be written at a path, or nothing when it can: checked before anything is written.
export function whyUnwritable(path: string): Unwritable | undefined {
  const stats = statSync(path, { throwIfNoEntry: false });
  if (stats?.isDirectory()) return "is-a-folder";
  if (stats !== undefined) return mayWrite(path) ? undefined : "may-not-be-written";
  return statSync(dirname(whereItWillBe(path)), { throwIfNoEntry: false })?.isDirectory() ? undefined : "folder-does-not-exist";
}
