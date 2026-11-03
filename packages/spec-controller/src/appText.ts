import { messagesFrom, type Message } from "@3f-consulting/spec-controller-core";

import APP_TEXTS from "./messages.en.json" with { type: "json" };
import type { AppError, AppErrorValues, AppMessageValues, WordedAppMessage } from "./messages.js";

export const message: Message<WordedAppMessage | AppError, AppMessageValues & AppErrorValues> = messagesFrom(
  APP_TEXTS satisfies Readonly<Record<WordedAppMessage | AppError, string>>,
);
