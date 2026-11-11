import { AppMessage, type AppError } from "./messages.js";
import { message } from "./appText.js";

// A refusal's words as the printer shows them: after its command's usage-error prefix and its code, or the tool's at the host's scope.
export function printedRefusal(code: AppError, words: string, command?: string): string {
  return command === undefined
    ? message(AppMessage.CodedHostUsageError, { code, message: words })
    : message(AppMessage.CodedUsageError, { command, code, message: words });
}
