import CORE_TEXTS from "./messages.en.json" with { type: "json" };
import { messagesFrom } from "./message.js";

export type CoreTextCode = keyof typeof CORE_TEXTS;

export const coreText = messagesFrom<CoreTextCode, Record<never, never>>(CORE_TEXTS);
