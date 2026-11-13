import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A working directory that does not exist cannot be read. The shell's record names it only while that folder does not
// exist either; otherwise the run is given a folder that does not exist, so no other folder is read in its place.
export function workingFolderOf(workingDirectory: () => string, recorded: string | undefined): string {
  try {
    return workingDirectory();
  } catch {
    return recorded && !existsSync(recorded) ? recorded : join(tmpdir(), `spec-controller-no-working-directory-${process.pid}`);
  }
}
