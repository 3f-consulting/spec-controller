import type { SourceFault } from "@3f-consulting/spec-controller-core";
import { AppError, AppMessage, Unreadable } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { refusal, refusals, type Refusal } from "../runEnding/refusal.js";
import type { RefusalLines } from "../runEnding/standardError.js";

export class UnreadableInput extends Error {
  readonly refusal: Refusal;

  constructor(what: Unreadable, path: string, reason: string) {
    super();
    this.refusal = refusal(AppError.CouldNotBeRead, { subject: message(what), path, reason });
  }
}

export class UnparseableFeatureFiles extends Error {
  readonly refusal: RefusalLines;

  constructor(faults: readonly SourceFault[]) {
    super();
    const corpus = message(AppMessage.FeatureCorpus);
    this.refusal = refusals(faults.map(({ file, message: text }) => refusal(AppError.CorpusFileUnparseable, { corpus, file, message: text })));
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

export function gitExited(args: readonly string[], status: number | null, stderr: string): string {
  return message(AppMessage.GitExited, { command: String(args[0]), status: String(status), said: firstLine(stderr) });
}

function firstLine(text: string): string {
  return text.split("\n")[0]!;
}
