import type { SourceFault } from "@3f-consulting/spec-controller-core";
import { AppError, AppMessage, Unreadable } from "../messages.js";
import { message } from "../appText.js";
import { refusal, refusals, type Refusal } from "../refusal.js";
import type { RefusalLines } from "../standardError.js";

const UNREADABLE_SUBJECTS: Readonly<Record<Unreadable, string>> = Object.fromEntries(
  Object.values(Unreadable).map((code) => [code, message(code)]),
) as Record<Unreadable, string>;

export class UnreadableInput extends Error {
  override readonly name = "UnreadableInput";
  readonly subject: string;
  readonly refusal: Refusal;

  constructor(
    what: Unreadable,
    readonly path: string,
    readonly reason: string,
  ) {
    const subject = UNREADABLE_SUBJECTS[what];
    const refused =
      what === Unreadable.WorkingDirectory
        ? refusal(AppError.WorkingDirectoryUnreadable, { subject, reason })
        : refusal(AppError.CouldNotBeRead, { subject, path, reason });
    super(refused.lines("allocate"));
    this.subject = subject;
    this.refusal = refused;
  }
}

export class UnparseableFeatureFiles extends Error {
  override readonly name = "UnparseableFeatureFiles";
  readonly refusal: RefusalLines;

  constructor(readonly faults: readonly SourceFault[]) {
    const refused = refusals(
      faults.map(({ file, message: text }) =>
        refusal(AppError.CorpusFileUnparseable, { corpus: UNREADABLE_SUBJECTS[Unreadable.FeatureCorpus], file, message: text }),
      ),
    );
    super(refused.lines("allocate"));
    this.refusal = refused;
  }
}

export function readOrRefuse<T>(what: Unreadable, path: string, read: () => T): T {
  try {
    return read();
  } catch (err) {
    return refuse(what, path, err);
  }
}

export function refuse(what: Unreadable, path: string, err: unknown): never {
  const errno = err as NodeJS.ErrnoException;
  if (!(err instanceof Error) || typeof errno.code !== "string") throw err;
  throw new UnreadableInput(what, errno.path ?? path, err.message);
}

export function refusalLine(refused: UnreadableInput | UnparseableFeatureFiles): RefusalLines {
  return refused.refusal;
}

export function gitExited(args: readonly string[], status: number | null, stderr: string): string {
  return message(AppMessage.GitExited, { command: String(args[0]), status: String(status), said: firstLine(stderr) });
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? "";
}
