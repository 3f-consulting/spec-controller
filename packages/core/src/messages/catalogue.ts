export type Catalogue = Readonly<Record<string, string>>;

export function textFor(catalogue: Catalogue, code: string): string {
  return String(catalogue[code]);
}
