import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// With the working directory removed, the run never reads another folder in its place: the shell's record names it only while it is gone too.
export function workingFolderOf(workingDirectory: () => string, recorded: string | undefined): string {
  try {
    return workingDirectory();
  } catch {
    return recorded && !existsSync(recorded) ? recorded : join(tmpdir(), `spec-controller-no-working-directory-${process.pid}`);
  }
}
