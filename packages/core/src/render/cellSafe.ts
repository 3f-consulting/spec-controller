export function cellSafe(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}
