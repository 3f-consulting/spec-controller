export function withoutSigil(value: string): string {
  return value.replace(/^@/, "");
}

export function bareTerm(value: string): string {
  return withoutSigil(value.trim()).trim();
}

export function bareTerms(values: readonly string[]): string[] {
  return values.map(bareTerm).filter((term) => term !== "");
}
