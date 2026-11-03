import { message } from "./appText.js";
import { AppMessage, type AppErrorValues, type RefusalError } from "./messages.js";
import type { RefusalLines } from "./standardError.js";

type ValuesOf<C extends RefusalError> = C extends keyof AppErrorValues ? AppErrorValues[C] : Readonly<Record<never, never>>;

export type Refusal = {
  readonly [C in RefusalError]: {
    readonly code: C;
    readonly values: ValuesOf<C>;
    readonly pointers: readonly string[];
  };
}[RefusalError] &
  RefusalLines;

// An error given as its words carries no code, and is printed as it is.
export type ShownError = Refusal | string;

type RefusalFields = Omit<Refusal, keyof RefusalLines>;

// A refusal's lines are its prototype's, so the refusal itself holds only its code, values and pointers.
const PRINTED_REFUSAL: RefusalLines = {
  // A refusal opens with the usage-error prefix of its command, or of the tool at the host's scope, and its code; its pointer lines carry none.
  lines(this: RefusalFields, command?: string): string {
    return [openingLine(this.code, words(this.code, this.values), command), ...this.pointers].join("\n");
  },
};

export function refusal<C extends RefusalError>(code: C, values: ValuesOf<C>, pointers: readonly string[] = []): Refusal {
  return Object.assign(Object.create(PRINTED_REFUSAL) as RefusalLines, { code, values, pointers }) as Refusal;
}

const words = message as (code: RefusalError, values: object) => string;

function openingLine(code: RefusalError, text: string, command: string | undefined): string {
  return command === undefined
    ? message(AppMessage.CodedHostUsageError, { code, message: text })
    : message(AppMessage.CodedUsageError, { command, code, message: text });
}
