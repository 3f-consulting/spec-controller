import { codeSpan } from "./codeSpan.js";

const ROW_SEPARATOR = /; |: | \/ |, /;

export function reportedName(text: string): string {
  const name = text.replace(/\s+/g, " ").trim();
  return ROW_SEPARATOR.test(name) ? codeSpan(name) : name;
}
