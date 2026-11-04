import CORE_TEXTS from "./messages.en.json" with { type: "json" };
import { messagesFrom, type Message } from "./message.js";
import type { CoreMessageValues, WordedCoreMessage } from "./messages.js";

export { CORE_TEXTS };

export const coreMessage: Message<WordedCoreMessage, CoreMessageValues> = messagesFrom(
  CORE_TEXTS satisfies Readonly<Record<WordedCoreMessage, string>>,
);
