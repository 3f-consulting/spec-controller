export function withoutSigil(value: string): string {
  return value.startsWith("@") ? value.slice(1) : value;
}

export function bareTerm(value: string): string {
  return withoutSigil(value.trim());
}
