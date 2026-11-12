import { messagesFrom, type Message } from "@3f-consulting/spec-controller-core";

import APP_TEXTS from "./messages.en.json" with { type: "json" };
import type { AppErrorValues, AppMessage, AppMessageValues, RefusalError } from "./messages.js";

export const message: Message<AppMessage | RefusalError, AppMessageValues & AppErrorValues> = messagesFrom(
  APP_TEXTS satisfies Readonly<Record<AppMessage | RefusalError, string>>,
);
