import { messagesFrom, type Message } from "@3f-consulting/spec-controller-core";

import APP_TEXTS from "./messages.en.json" with { type: "json" };
import type { AppErrorValues, AppMessageValues, RefusalError, WordedAppMessage } from "./messages.js";

export const message: Message<WordedAppMessage | RefusalError, AppMessageValues & AppErrorValues> = messagesFrom(
  APP_TEXTS satisfies Readonly<Record<WordedAppMessage | RefusalError, string>>,
);
