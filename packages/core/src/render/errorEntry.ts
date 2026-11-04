import type { CoreError } from "./messages.js";

export const errorEntry = (code: CoreError, words: string): string => `- \`${code}\` — ${words}`;
