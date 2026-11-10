export function withoutSigil(value: string): string {
  return value.replace(/^@/, "");
}

export function bareTerm(value: string): string {
  return withoutSigil(value.trim()).trim();
}
