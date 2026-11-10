import CORE_TEXTS from "./messages.en.json" with { type: "json" };

export type CoreTextCode = keyof typeof CORE_TEXTS;

export function coreText(code: CoreTextCode): string {
  return CORE_TEXTS[code];
}
