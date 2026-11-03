import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import type { ShownError } from "./refusal.js";

const entryWords = message as (code: AppError, values: object) => string;

// The words a refusal prints after its usage-error prefix, the entry and then each pointer line, or its absence as it is.
export function shownText<Absent extends null | undefined>(shown: ShownError | Absent): string | Absent {
  return shown === null || shown === undefined ? (shown as Absent) : wordsOf(shown);
}

function wordsOf(shown: ShownError): string {
  return typeof shown === "string" ? shown : [entryWords(shown.code, shown.values), ...shown.pointers].join("\n");
}

export function withShownRefusal<Read extends { readonly refusal?: ShownError }>(read: Read): Omit<Read, "refusal"> & { refusal?: string } {
  const { refusal, ...rest } = read;
  return refusal === undefined ? rest : { ...rest, refusal: wordsOf(refusal) };
}

// A refusal's words as the printer shows them: after its command's usage-error prefix and its code, or the tool's at the host's scope.
export function printedRefusal(code: AppError, words: string, command?: string): string {
  return command === undefined
    ? message(AppMessage.CodedHostUsageError, { code, message: words })
    : message(AppMessage.CodedUsageError, { command, code, message: words });
}

export interface ErrorCodesShown {
  readonly opening: readonly string[];
  readonly after: readonly string[];
}

// Every error code a text shows, as `[<code>]` or as the code span leading an entry, once for each time it shows: on its first line, and on the lines after it.
export function errorCodesShown(text: string): ErrorCodesShown {
  const [opening = "", ...after] = text.split("\n");
  return { opening: codesIn(opening), after: after.flatMap(codesIn) };
}

function codesIn(line: string): string[] {
  return Object.values(AppError).flatMap((code) => [
    ...line.split(`[${code}]`).slice(1).map(() => code),
    ...(line.trimStart().startsWith(`- \`${code}\``) ? [code] : []),
  ]);
}
