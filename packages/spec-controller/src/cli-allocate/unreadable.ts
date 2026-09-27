/**
 * A path allocate is meant to read and cannot. It is the invocation being wrong, the same as a
 * malformed request, so it is refused as a usage error naming the path and the reason, and no code
 * is given: an answer computed without the path could hand out a code the unread path carries.
 */

/** What allocate could not read: which input it was, where (when the read had a path), and the reason. */
export class UnreadableInput extends Error {
  override readonly name = "UnreadableInput";

  constructor(
    readonly subject: string,
    readonly path: string,
    readonly reason: string,
  ) {
    super(path === "" ? `${subject} could not be read (${reason})` : `${subject} could not be read: ${path} (${reason})`);
  }
}

/**
 * The read's answer, or the refusal when the operating system refuses it. Any refusal the OS gives
 * is the same fault here: not permitted, not the kind of path the read expects, or not there. A
 * throw that carries no OS code is not a read failing, and is left to surface.
 */
export function readOrRefuse<T>(subject: string, path: string, read: () => T): T {
  try {
    return read();
  } catch (err) {
    return refuse(subject, path, err);
  }
}

/** Throw the refusal a failed read of `path` is, or the throw itself when it is not a read failing. */
export function refuse(subject: string, path: string, err: unknown): never {
  const errno = err as NodeJS.ErrnoException;
  if (!(err instanceof Error) || typeof errno.code !== "string") throw err;
  throw new UnreadableInput(subject, errno.path ?? path, err.message);
}

/** The one stderr line a refusal is written as, in allocate's usage-error form. */
export function refusalLine(refusal: UnreadableInput): string {
  return `spec-controller allocate: usage error — ${refusal.message}`;
}
