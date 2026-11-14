import { tmpdir } from "node:os";
import { join } from "node:path";

// With the working directory removed, the run never reads another folder in its place.
export function workingFolderOf(): string {
  try {
    return process.cwd();
  } catch {
    return join(tmpdir(), `spec-controller-no-working-directory-${process.pid}`);
  }
}
