import { closeSync, constants, openSync, unlinkSync } from "node:fs";

const USAGE_EXIT_CODE = 2;

export function unwritableRefusal(subject: string, path: string, err: unknown): string {
  const reason = err instanceof Error ? err.message : String(err);
  return `${subject}: ${path} (${reason})`;
}

/**
 * The catch sits on the one write it guards rather than on the process, so a refusal can only ever
 * name a location this call was asked to write, and a crash anywhere else is not dressed up as one.
 */
export function writeOrRefuse(subject: string, path: string, write: () => void): void {
  try {
    write();
  } catch (err) {
    process.stderr.write(unwritableRefusal(subject, path, err) + "\n");
    process.exit(USAGE_EXIT_CODE);
  }
}

/**
 * Throws the operating system's own error when `path` cannot be written as a file, and leaves the
 * path as it found it: an existing file is opened write-only without truncation (not "r+", which
 * would also demand read permission), and an absent one is created exclusively and removed again,
 * so a missing, read-only or non-directory parent answers with its real reason instead of one this
 * module would have to invent.
 */
export function probeWritable(path: string): void {
  try {
    closeSync(openSync(path, constants.O_WRONLY));
    return;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  closeSync(openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL));
  unlinkSync(path);
}
