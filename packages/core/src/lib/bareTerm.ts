export function bareTerm(value: string): string {
  return value.trim().replace(/^@/, "").trim();
}
